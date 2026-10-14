"""
hclipper End-to-End Dynamic Motion Design Pipeline
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Orchestrates multi-cue semantic analysis, bespoke procedural asset generation,
deterministic headless rendering, and audio SFX punctuation into a finished clip.
"""

import os
import sys
import json
import wave
import subprocess
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engine import BIN_DIR
from engine.motion.sfx import ensure_sfx_library
from engine.motion.cue_detector import MotionCueDetector

class DynamicMotionPipeline:
    def __init__(self):
        self.motion_dir = Path(__file__).resolve().parent
        self.templates_dir = self.motion_dir / "templates"
        self.sfx_dir = ensure_sfx_library()
        self.detector = MotionCueDetector()

        self.ffmpeg_bin = BIN_DIR / "ffmpeg.exe"
        if not self.ffmpeg_bin.exists():
            self.ffmpeg_bin = Path("ffmpeg")

    def build_sfx_audio_track(self, cues: List[Dict[str, Any]], total_duration: float, output_wav: Path):
        """
        Creates a synchronized audio track containing all tactile sound effects
        (pencil_scribble, marker_squeak, keyboard_click, paper_slide, warm_chime, etc.)
        placed at the exact timestamps where visual motion assets enter.
        """
        sr = 44100
        total_samples = int(total_duration * sr)
        master_buffer = np.zeros(total_samples, dtype=np.float32)

        sfx_cache = {}
        for sfx_file in self.sfx_dir.glob("*.wav"):
            sfx_name = sfx_file.stem
            try:
                with wave.open(str(sfx_file), "rb") as wf:
                    frames = wf.readframes(wf.getnframes())
                    data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                    sfx_cache[sfx_name] = data
            except Exception as e:
                print(f"[DynamicMotionPipeline] Warning: Could not load SFX {sfx_file.name}: {e}")

        for cue in cues:
            start_s = float(cue.get("sfx_time", cue.get("start", 0.0)))
            sfx_type = cue.get("sfx", "pop")
            if sfx_type in sfx_cache:
                sfx_data = sfx_cache[sfx_type]
                start_sample = int(start_s * sr)
                end_sample = min(start_sample + len(sfx_data), total_samples)
                length = end_sample - start_sample
                if length > 0:
                    master_buffer[start_sample:end_sample] += sfx_data[:length] * 0.70 # -3.1dB mix level

        # Normalize with safety headroom
        peak = np.max(np.abs(master_buffer))
        if peak > 0.95:
            master_buffer = (master_buffer / peak) * 0.90

        int_buffer = (master_buffer * 32767).astype(np.int16)
        with wave.open(str(output_wav), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(int_buffer.tobytes())

    def process_clip(
        self,
        video_path: str,
        output_path: str,
        transcript_cues: Optional[List[Dict[str, Any]]] = None,
        clip_headline: str = "",
        speaker: str = "",
        topic: str = "",
        custom_cues: Optional[List[Dict[str, Any]]] = None,
        template_name: str = "human_motion.html",
        subtitle_ass_path: Optional[str] = None
    ) -> str:
        """
        Executes full multi-cue dynamic motion synthesis:
        1. Analyzes transcript cues to dispatch bespoke assets.
        2. Renders deterministic transparent motion overlay via headless Chromium.
        3. Generates synchronized SFX track.
        4. Blends video + overlay + dialogue + SFX + optional subtitles into final output.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Source video not found: {video_path}")

        temp_dir = self.motion_dir / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Get video duration via ffprobe
        probe_cmd = [
            str(BIN_DIR / "ffprobe.exe" if (BIN_DIR / "ffprobe.exe").exists() else "ffprobe"),
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        duration_out = subprocess.check_output(probe_cmd, text=True).strip()
        duration = float(duration_out) if duration_out else 30.0

        # Generate or use provided cues dynamically
        if custom_cues:
            cues = custom_cues
        else:
            cues = self.detector.detect_cues(transcript_cues or [], clip_duration=duration)
            for c in cues:
                if c.get("type") in ("kinetic_hook", "handwritten_hook"):
                    words = (clip_headline or "SERMON INSIGHT").upper().split()
                    c["headline"] = clip_headline.upper()
                    c["highlightWord"] = words[0] if words else "PURPOSE"
                    c["title"] = " ".join(words[:4]) if len(words) >= 4 else (clip_headline.upper())
                    c["subtitle"] = " ".join(words[4:]) if len(words) > 4 else (topic or "")
                elif c.get("type") in ("lower_third", "editorial_speaker"):
                    c["speaker"] = speaker or "Preacher"
                    c["topic"] = topic or "Sermon Highlight"

        print(f"[DynamicMotionPipeline] Scheduled {len(cues)} bespoke motion events for {duration:.1f}s clip:")
        for idx, c in enumerate(cues):
            print(f"  #{idx + 1} @ {c['start']:.1f}s - {c['type']} [SFX: {c.get('sfx')} @ {c.get('sfx_time', c['start']):.1f}s]")

        manifest_config = {
            "duration": duration,
            "speaker": speaker,
            "topic": topic,
            "cues": cues
        }

        overlay_mov = temp_dir / "motion_overlay_master.mov"
        sfx_wav = temp_dir / "sfx_track_master.wav"

        # 1. Generate SFX Audio Track
        print(f"[DynamicMotionPipeline] Synthesizing synchronized SFX audio track...", flush=True)
        print(f"__HCLIPPER_JSON__{json.dumps({'event': 'motion_progress', 'phase': 'sfx', 'percent': 5, 'detail': 'Synthesizing tactile SFX audio track...'})}", flush=True)
        self.build_sfx_audio_track(cues, duration, sfx_wav)

        # 2. Render Headless Multi-Cue Motion Canvas
        canvas_html = self.templates_dir / template_name
        render_script = self.motion_dir / "render.mjs"

        config_file = temp_dir / "manifest_config.json"
        with open(config_file, "w", encoding="utf-8") as cf:
            json.dump(manifest_config, cf, ensure_ascii=False)

        render_cmd = [
            "node",
            str(render_script),
            "--html", str(canvas_html),
            "--output", str(overlay_mov),
            "--fps", "30",
            "--subsample", "1",
            "--config", str(config_file)
        ]

        print(f"[DynamicMotionPipeline] Rendering full-duration motion canvas via headless Chromium ({template_name})...", flush=True)
        proc = subprocess.Popen(
            render_cmd,
            cwd=str(self.motion_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in iter(proc.stdout.readline, ''):
            line_str = line.strip()
            if not line_str:
                continue
            if "__HCLIPPER_JSON__" in line_str:
                print(line_str, flush=True)
            elif "Progress:" in line_str or "[Motion Studio]" in line_str:
                print(f"[DynamicMotionPipeline] {line_str}", flush=True)

        proc.stdout.close()
        ret = proc.wait()
        if ret != 0 or not overlay_mov.exists():
            raise RuntimeError(f"Motion canvas render failed with exit code {ret}")

        # 3. Composite Final Video with Overlay, Subtitles, and SFX Audio
        print(f"[DynamicMotionPipeline] Compositing master video with transparent overlay and SFX...", flush=True)
        print(f"__HCLIPPER_JSON__{json.dumps({'event': 'motion_progress', 'phase': 'compositing', 'percent': 88, 'detail': 'Compositing master video with transparent overlay and SFX...'})}", flush=True)
        
        filter_parts = [
            "[0:v][1:v]overlay=0:0:eof_action=pass[v_motion]"
        ]
        next_v = "[v_motion]"

        if subtitle_ass_path and os.path.exists(subtitle_ass_path):
            from engine import PROJECT_ROOT
            fonts_dir = PROJECT_ROOT / "assets" / "fonts"
            norm_ass = str(Path(subtitle_ass_path).resolve()).replace("\\", "/").replace(":", "\\:")
            norm_fonts = str(fonts_dir.resolve()).replace("\\", "/").replace(":", "\\:")
            filter_parts.append(f"{next_v}ass='{norm_ass}':fontsdir='{norm_fonts}'[v_subs]")
            next_v = "[v_subs]"

        filter_parts.append("[0:a][2:a]amix=inputs=2:duration=first:dropout_transition=2[outa]")
        full_filter = ";".join(filter_parts)

        # Hardware acceleration check (Intel QSV -> libx264)
        encoders = ["h264_qsv", "libx264"]
        success = False

        for enc in encoders:
            v_args = ["-c:v", enc]
            if enc == "h264_qsv":
                v_args.extend(["-global_quality", "22"])
            else:
                v_args.extend(["-crf", "18", "-preset", "fast"])

            composite_cmd = [
                str(self.ffmpeg_bin),
                "-y",
                "-i", video_path,
                "-i", str(overlay_mov),
                "-i", str(sfx_wav),
                "-filter_complex", full_filter,
                "-map", next_v,
                "-map", "[outa]",
                *v_args,
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]

            comp_res = subprocess.run(composite_cmd, capture_output=True, text=True)
            if comp_res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 5000:
                success = True
                break

        if not success:
            raise RuntimeError(f"FFmpeg composite failed: {comp_res.stderr}")

        print(f"__HCLIPPER_JSON__{json.dumps({'event': 'motion_progress', 'phase': 'completed', 'percent': 100, 'output': output_path, 'detail': 'Master dynamic motion clip rendered successfully!'})}", flush=True)

        # Clean temporary files
        try:
            if overlay_mov.exists(): overlay_mov.unlink()
            if sfx_wav.exists(): sfx_wav.unlink()
        except Exception:
            pass

        print(f"[DynamicMotionPipeline] Completed! Master viral video saved -> {output_path}")
        return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pipeline.py <input_video> <output_video>")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    pipe = DynamicMotionPipeline()
    pipe.process_clip(inp, out)
