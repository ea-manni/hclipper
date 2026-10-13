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
        clip_headline: str = "WHAT YOU PURSUE GOD WILL FULFILL",
        speaker: str = "Pastor David Ogbueli",
        topic: str = "Dominion City · Destiny & Calling",
        custom_cues: Optional[List[Dict[str, Any]]] = None,
        template_name: str = "human_motion.html"
    ) -> str:
        """
        Executes full multi-cue dynamic motion synthesis:
        1. Analyzes transcript cues to dispatch bespoke assets.
        2. Renders deterministic transparent motion overlay via headless Chromium.
        3. Generates synchronized SFX track.
        4. Blends video + overlay + dialogue + SFX into final output.
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

        # Generate or use provided cues
        if custom_cues:
            cues = custom_cues
        elif template_name == "human_motion.html":
            # Bespoke human-engaging motion events matching Pastor David Ogbueli's sermon
            cues = [
                {
                    "id": "cue_hook_scribble",
                    "type": "handwritten_hook",
                    "start": 0.0,
                    "sfx_time": 0.3,
                    "duration": 3.8,
                    "sfx": "pencil_scribble",
                    "title": "WHAT YOU PURSUE...",
                    "subtitle": "...God Will Fulfill"
                },
                {
                    "id": "cue_speaker_lower_third",
                    "type": "editorial_speaker",
                    "start": 4.2,
                    "sfx_time": 4.2,
                    "duration": 4.0,
                    "sfx": "paper_slide",
                    "speaker": speaker,
                    "topic": topic
                },
                {
                    "id": "cue_strikeout_misconception",
                    "type": "strikeout",
                    "start": 10.5,
                    "sfx_time": 11.8,
                    "duration": 4.7,
                    "sfx": "red_scratch",
                    "quote": "Rolls-Royce & 50 Houses"
                },
                {
                    "id": "cue_highlighter_emphasis",
                    "type": "highlighter_sweep",
                    "start": 19.5,
                    "sfx_time": 20.8,
                    "duration": 6.0,
                    "sfx": "marker_squeak",
                    "keyword": "IS AN ART & A SKILL"
                },
                {
                    "id": "cue_sub_thud_emphasis",
                    "type": "sound_accent",
                    "start": 22.2,
                    "sfx_time": 22.2,
                    "duration": 1.0,
                    "sfx": "sub_thud"
                },
                {
                    "id": "cue_scripture_wisdom",
                    "type": "scripture_wisdom",
                    "start": 25.8,
                    "sfx_time": 26.0,
                    "duration": 4.0,
                    "sfx": "warm_chime",
                    "verse": "Ask what I shall give thee — 1 Kings 3:5"
                }
            ]
        else:
            cues = self.detector.detect_cues(transcript_cues or [], clip_duration=duration)
            for c in cues:
                if c.get("type") == "kinetic_hook":
                    c["headline"] = clip_headline.upper()
                    c["highlightWord"] = clip_headline.upper().split()[0] if clip_headline else "PURPOSE"
                elif c.get("type") == "lower_third":
                    c["speaker"] = speaker
                    c["topic"] = topic

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
        print(f"[DynamicMotionPipeline] Synthesizing synchronized SFX audio track...")
        self.build_sfx_audio_track(cues, duration, sfx_wav)

        # 2. Render Headless Multi-Cue Motion Canvas
        canvas_html = self.templates_dir / template_name
        render_script = self.motion_dir / "render.mjs"

        render_cmd = [
            "node",
            str(render_script),
            "--html", str(canvas_html),
            "--output", str(overlay_mov),
            "--fps", "30",
            "--subsample", "1",
            "--config", json.dumps(manifest_config)
        ]

        print(f"[DynamicMotionPipeline] Rendering full-duration motion canvas via headless Chromium ({template_name})...")
        res = subprocess.run(render_cmd, cwd=str(self.motion_dir), capture_output=True, text=True)
        if res.returncode != 0 or not overlay_mov.exists():
            print(f"[DynamicMotionPipeline] Render error: {res.stderr}")
            raise RuntimeError(f"Motion canvas render failed: {res.stderr}")

        # 3. Composite Final Video with Overlay and SFX Audio
        print(f"[DynamicMotionPipeline] Compositing master video with transparent overlay and SFX...")
        composite_cmd = [
            str(self.ffmpeg_bin),
            "-y",
            "-i", video_path,
            "-i", str(overlay_mov),
            "-i", str(sfx_wav),
            "-filter_complex",
            "[0:v][1:v]overlay=0:0:eof_action=pass[outv];"
            "[0:a][2:a]amix=inputs=2:duration=first:dropout_transition=2[outa]",
            "-map", "[outv]",
            "-map", "[outa]",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]

        comp_res = subprocess.run(composite_cmd, capture_output=True, text=True)
        if comp_res.returncode != 0:
            raise RuntimeError(f"FFmpeg composite failed: {comp_res.stderr}")

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
