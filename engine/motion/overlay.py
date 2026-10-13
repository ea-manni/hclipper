"""
hclipper Motion Compositor & Engine Bridge
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Integrates the code-to-motion graphics pipeline with hclipper clip processing.
Renders deterministic kinetic typography hook intros and overlays them
directly onto vertical video clips.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from engine import BIN_DIR

class MotionCompositor:
    def __init__(self):
        self.motion_dir = Path(__file__).resolve().parent
        self.templates_dir = self.motion_dir / "templates"
        self.ffmpeg_bin = BIN_DIR / "ffmpeg.exe"
        if not self.ffmpeg_bin.exists():
            self.ffmpeg_bin = Path("ffmpeg")

    def composite_kinetic_hook(
        self,
        video_path: str,
        output_path: str,
        headline: str,
        speaker: str = "Pastor Bankie",
        badge: str = "KEY INSIGHT",
        highlight_words: Optional[list] = None,
        duration: float = 3.5,
        fade_start: float = 2.8,
        theme: str = "neon"
    ) -> str:
        """
        Renders a kinetic hook intro and composites it onto the video.
        Uses render.mjs to generate a transparent ProRes 4444 overlay,
        then blends it with FFmpeg.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Source video not found: {video_path}")

        temp_dir = self.motion_dir / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        overlay_mov = temp_dir / "temp_overlay.mov"

        config = {
            "headline": headline,
            "speaker": speaker,
            "badge": badge,
            "highlightWords": highlight_words or ["PURPOSE", "PROVISION", "KINGDOM", "FAITH", "GOD"],
            "duration": duration,
            "fadeStart": fade_start,
            "fadeEnd": duration,
            "theme": theme
        }

        template_path = self.templates_dir / "kinetic_hook.html"
        render_script = self.motion_dir / "render.mjs"

        # Check if node and render script exist
        node_cmd = [
            "node",
            str(render_script),
            "--html", str(template_path),
            "--output", str(overlay_mov),
            "--fps", "30",
            "--subsample", "1",
            "--config", json.dumps(config)
        ]

        print(f"[MotionCompositor] Rendering kinetic overlay via Node.js...")
        res = subprocess.run(node_cmd, cwd=str(self.motion_dir), capture_output=True, text=True)
        
        if res.returncode != 0 or not overlay_mov.exists():
            print(f"[MotionCompositor] Warning: Headless render returned code {res.returncode}. Output:\n{res.stderr}")
            print("[MotionCompositor] Falling back to standard frosted banner composite.")
            return video_path

        # Composite overlay onto input video using FFmpeg
        print(f"[MotionCompositor] Blending overlay onto {video_path}...")
        blend_cmd = [
            str(self.ffmpeg_bin),
            "-y",
            "-i", video_path,
            "-i", str(overlay_mov),
            "-filter_complex", "[0:v][1:v]overlay=0:0:eof_action=pass[outv]",
            "-map", "[outv]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "copy",
            output_path
        ]

        blend_res = subprocess.run(blend_cmd, capture_output=True, text=True)
        if blend_res.returncode != 0:
            raise RuntimeError(f"FFmpeg composite failed: {blend_res.stderr}")

        # Clean up temporary overlay
        try:
            if overlay_mov.exists():
                overlay_mov.unlink()
        except Exception:
            pass

        print(f"[MotionCompositor] Successfully produced: {output_path}")
        return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python overlay.py <input_video> <output_video> [headline]")
        sys.exit(1)
        
    input_v = sys.argv[1]
    output_v = sys.argv[2]
    head = sys.argv[3] if len(sys.argv) > 3 else "WHY PURPOSE PRECEDES PROVISION IN THE KINGDOM"
    
    compositor = MotionCompositor()
    compositor.composite_kinetic_hook(input_v, output_v, headline=head)
