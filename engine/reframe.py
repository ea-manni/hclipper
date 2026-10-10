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
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Scans video frames, detects face centers using YuNet, and generates
        a jitter-free horizontal crop coordinate (crop_x) for every frame.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Target crop width for vertical 9:16, 1:1, or 16:9
        crop_w = int(height * aspect_ratio[0] / aspect_ratio[1])
        if crop_w % 2 != 0:
            crop_w += 1
        crop_w = min(crop_w, width)
        max_x = max(0, width - crop_w)
        default_center = width // 2

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

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % step_frames == 0:
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

            if progress_callback and frame_idx % 30 == 0:
                pct = round((frame_idx / total_frames) * 50.0, 1)
                progress_callback({
                    "phase": "tracking",
                    "frame": frame_idx,
                    "total_frames": total_frames,
                    "percent": pct
                })

            frame_idx += 1

        cap.release()

        # Step 2: Interpolate center X across all frames
        centers_per_frame: List[int] = []
        current_val = raw_detections.get(0, default_center)
        for f in range(total_frames):
            if f in raw_detections:
                current_val = raw_detections[f]
            centers_per_frame.append(current_val)

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
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        Renders the smoothed vertical 9:16 crop using dynamic frame streaming
        and FFmpeg hardware encoding.
        """
        if not trajectory_data:
            trajectory_data = self.compute_crop_trajectory(
                video_path,
                aspect_ratio=(out_width, out_height),
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

        ffmpeg_cmd = [
            self.ffmpeg_bin, "-y",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", f"{crop_w}x{src_h}",
            "-pix_fmt", "bgr24",
            "-r", str(fps),
            "-i", "-",  # pipe from stdin
            "-i", str(video_path),  # audio source
            "-vf", f"scale={out_width}:{out_height}:flags=lanczos",
            "-map", "0:v",
            "-map", "1:a?",
            *vcodec_args,
            "-c:a", "aac",
            "-b:a", "192k",
            str(output_path)
        ]

        proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        cap = cv2.VideoCapture(str(video_path))

        for f in range(total_frames):
            ret, frame = cap.read()
            if not ret:
                break

            cx = trajectory[f] if f < len(trajectory) else trajectory[-1]
            crop_frame = frame[:, cx:cx + crop_w]
            proc.stdin.write(crop_frame.tobytes())

            if progress_callback and f % 30 == 0:
                pct = 50.0 + round((f / total_frames) * 50.0, 1)
                progress_callback({
                    "phase": "rendering",
                    "frame": f,
                    "total_frames": total_frames,
                    "percent": min(99.0, pct)
                })

        cap.release()
        proc.stdin.close()
        proc.wait()

        if progress_callback:
            progress_callback({"phase": "completed", "percent": 100.0, "output": output_path})

        return proc.returncode == 0
