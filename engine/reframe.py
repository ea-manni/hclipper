"""
hclipper AI Auto-Reframing Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Converts horizontal (16:9) video footage to vertical (9:16) shorts using
lightweight CPU-accelerated YuNet ONNX face detection and cinematic camera
physics (deadzone damping + exponential smoothing).
"""

import os
import time
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Callable

import cv2
import numpy as np

from engine import DEFAULT_MODEL_PATH, HARDWARE_ENCODER

class AutoReframer:
    """
    Tracks human subjects across frames and calculates smooth
    9:16 vertical crop windows with zero camera jitter.
    """

    def __init__(self, model_path: Optional[str] = None, encoder: Optional[str] = None):
        self.model_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        if not self.model_path.exists():
            raise FileNotFoundError(f"YuNet ONNX model not found at {self.model_path}")
        self.encoder = encoder or HARDWARE_ENCODER
        self.ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"

    def compute_crop_trajectory(
        self,
        video_path: str,
        step_frames: int = 3,
        aspect_ratio: Tuple[int, int] = (9, 16),
        deadzone: float = 25.0,
        smooth_factor: float = 0.06,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Scans video frames, detects face centers using YuNet, and generates
        a jitter-free horizontal crop coordinate (crop_x) for every frame.
        Supports fast targeted clipping via start_time and end_time.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        file_total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Handle clip time sub-range if specified
        if start_time is not None and end_time is not None:
            start_f = max(0, int(float(start_time) * fps))
            end_f = min(file_total_frames, int(float(end_time) * fps))
            total_frames = max(1, end_f - start_f)
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)
        else:
            start_f = 0
            total_frames = file_total_frames

        # Target crop width for vertical 9:16, 1:1, or 16:9
        crop_w = int(height * aspect_ratio[0] / aspect_ratio[1])
        if crop_w % 2 != 0:
            crop_w += 1
        crop_w = min(crop_w, width)
        max_x = max(0, width - crop_w)
        default_center = width // 2

        # For long videos (> 3000 frames), adaptively sample ~3-4 times per second
        # to prevent 20-minute decoding stalls while preserving smooth human tracking
        effective_step = step_frames
        if total_frames > 3000:
            effective_step = max(step_frames, int(fps * 0.35))

        # Initialize YuNet detector
        detector = cv2.FaceDetectorYN_create(
            str(self.model_path),
            "",
            (width, height),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5
        )

        raw_detections: Dict[int, int] = {}
        last_cx = default_center
        frame_idx = 0

        while frame_idx < total_frames:
            if frame_idx % effective_step == 0:
                ret, frame = cap.read()
                if not ret:
                    break
                detector.setInputSize((frame.shape[1], frame.shape[0]))
                _, faces = detector.detect(frame)
                if faces is not None and len(faces) > 0:
                    box = faces[0][:4].astype(int)
                    cx = box[0] + box[2] // 2
                    # Suppress sudden wild outliers (gestures / brief occlusions)
                    if abs(cx - last_cx) > 160:
                        cx = int(last_cx * 0.7 + cx * 0.3)
                    last_cx = cx
                raw_detections[frame_idx] = last_cx
            else:
                ret = cap.grab()
                if not ret:
                    break

            if progress_callback and frame_idx % 60 == 0:
                pct = round((frame_idx / total_frames) * 50.0, 1)
                progress_callback({
                    "phase": "tracking",
                    "frame": frame_idx,
                    "total_frames": total_frames,
                    "percent": pct
                })

            frame_idx += 1

        cap.release()

        # Step 2: Linear interpolation of center X across all frames
        sorted_keys = sorted(raw_detections.keys())
        centers_per_frame: List[int] = []
        if not sorted_keys:
            centers_per_frame = [default_center] * total_frames
        else:
            first_key = sorted_keys[0]
            last_key = sorted_keys[-1]
            for f in range(total_frames):
                if f <= first_key:
                    centers_per_frame.append(raw_detections[first_key])
                elif f >= last_key:
                    centers_per_frame.append(raw_detections[last_key])
                else:
                    # Find surrounding keyframes
                    # Since sorted_keys is sorted and spaced by effective_step:
                    idx = f // effective_step
                    idx = min(idx, len(sorted_keys) - 2)
                    k1 = sorted_keys[idx]
                    k2 = sorted_keys[idx + 1] if idx + 1 < len(sorted_keys) else k1
                    if k1 == k2:
                        centers_per_frame.append(raw_detections[k1])
                    else:
                        ratio = (f - k1) / (k2 - k1)
                        v = int(raw_detections[k1] * (1.0 - ratio) + raw_detections[k2] * ratio)
                        centers_per_frame.append(v)

        # Step 3: Deadzone + Exponential Smoothing Physics
        smoothed_crop_x: List[int] = []
        initial_cam_x = float(np.clip(centers_per_frame[0] - crop_w // 2, 0, max_x))
        cam_x = initial_cam_x

        for target_center in centers_per_frame:
            ideal_cam_x = float(np.clip(target_center - crop_w // 2, 0, max_x))
            diff = ideal_cam_x - cam_x
            if abs(diff) > deadzone:
                sign = 1.0 if diff > 0 else -1.0
                excess = abs(diff) - deadzone
                cam_x += sign * excess * smooth_factor
            cam_x = float(np.clip(cam_x, 0, max_x))
            smoothed_crop_x.append(int(round(cam_x)))

        return {
            "fps": fps,
            "total_frames": total_frames,
            "src_width": width,
            "src_height": height,
            "crop_w": crop_w,
            "crop_h": height,
            "max_x": max_x,
            "trajectory": smoothed_crop_x
        }

    def render_reframed_video(
        self,
        video_path: str,
        output_path: str,
        trajectory_data: Optional[Dict[str, Any]] = None,
        out_width: int = 1080,
        out_height: int = 1920,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        Renders the smoothed vertical 9:16 crop using native hardware-accelerated
        FFmpeg filtergraph (sendcmd + crop + scale) directly on the GPU/encoder.
        Supports ultra-fast targeted short-form clip rendering via start_time and end_time.
        """
        import tempfile

        if not trajectory_data:
            trajectory_data = self.compute_crop_trajectory(
                video_path,
                aspect_ratio=(out_width, out_height),
                start_time=start_time,
                end_time=end_time,
                progress_callback=progress_callback
            )

        trajectory = trajectory_data["trajectory"]
        fps = trajectory_data["fps"]
        crop_w = trajectory_data["crop_w"]
        src_h = trajectory_data["src_height"]
        total_frames = trajectory_data["total_frames"]

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        vcodec_args = ["-c:v", self.encoder]
        if self.encoder == "h264_qsv":
            vcodec_args.extend(["-global_quality", "22"])
        elif self.encoder == "h264_nvenc":
            vcodec_args.extend(["-cq", "22", "-preset", "p4"])
        else:
            vcodec_args.extend(["-crf", "20", "-preset", "fast"])

        # Group trajectory into piecewise intervals to drive FFmpeg sendcmd natively
        intervals = []
        cur_start = 0
        cur_val = trajectory[0]
        max_duration_frames = int(fps * 2.0)

        for f in range(1, total_frames):
            val = trajectory[f] if f < len(trajectory) else trajectory[-1]
            if abs(val - cur_val) >= 2 or (f - cur_start) >= max_duration_frames:
                intervals.append((cur_start, f, cur_val))
                cur_start = f
                cur_val = val
        intervals.append((cur_start, total_frames, cur_val))

        # Write sendcmd script to temporary text file
        temp_cmd_file = None
        try:
            with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as tf:
                temp_cmd_file = tf.name
                for start_f, end_f, x_coord in intervals:
                    t_start = max(0.0, start_f / fps)
                    t_end = min(total_frames / fps, end_f / fps)
                    tf.write(f"{t_start:.3f}-{t_end:.3f} [enter] crop x {x_coord};\n")

            escaped_cmd_path = temp_cmd_file.replace("\\", "/").replace(":", "\\:")
            vf = f"sendcmd=f='{escaped_cmd_path}',crop=w={crop_w}:h={src_h}:x={trajectory[0]},scale={out_width}:{out_height}:flags=lanczos"

            seek_args = []
            if start_time is not None and end_time is not None:
                seek_args = ["-ss", f"{float(start_time):.3f}", "-to", f"{float(end_time):.3f}"]

            ffmpeg_cmd = [
                self.ffmpeg_bin, "-y",
                *seek_args,
                "-i", str(video_path),
                "-vf", vf,
                "-map", "0:v",
                "-map", "0:a?",
                *vcodec_args,
                "-c:a", "aac",
                "-b:a", "192k",
                "-progress", "pipe:1",
                str(output_path)
            ]

            proc = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1
            )

            for line in proc.stdout:
                line = line.strip()
                if line.startswith("frame="):
                    try:
                        curr_f = int(line.split("=")[1])
                        pct = min(99.0, 50.0 + round((curr_f / total_frames) * 50.0, 1))
                        if progress_callback:
                            progress_callback({
                                "phase": "rendering",
                                "frame": curr_f,
                                "total_frames": total_frames,
                                "percent": pct
                            })
                    except (ValueError, IndexError):
                        pass

            proc.wait()
            success = (proc.returncode == 0)

        except Exception as e:
            success = False
        finally:
            if temp_cmd_file and os.path.exists(temp_cmd_file):
                try:
                    os.unlink(temp_cmd_file)
                except Exception:
                    pass

        if success and progress_callback:
            progress_callback({"phase": "completed", "percent": 100.0, "output": output_path})

        return success
