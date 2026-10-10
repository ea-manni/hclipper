"""
hclipper Core Engine
~~~~~~~~~~~~~~~~~~~~

High-performance, local-first media engine for transforming long-form videos
into optimized 9:16 vertical shorts with AI face-tracking, cadence pause trimming,
broadcast loudness mastering, animated subtitles, and multi-platform publishing.
"""

__version__ = "1.0.0"
__author__ = "hclipper contributors"

import shutil
import subprocess
from pathlib import Path

# Base project paths
ENGINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ENGINE_DIR.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
MODELS_DIR = ASSETS_DIR / "models"
FONTS_DIR = ASSETS_DIR / "fonts"
AUDIO_DIR = ASSETS_DIR / "audio"
BRANDING_DIR = ASSETS_DIR / "branding"

DEFAULT_MODEL_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"

def detect_hardware_acceleration() -> str:
    """
    Detect available hardware encoders for FFmpeg.
    Returns 'h264_qsv', 'h264_nvenc', 'h264_amf', or falls back to 'libx264'.
    """
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        return "libx264"

    try:
        res = subprocess.run(
            [ffmpeg_bin, "-encoders"],
            capture_output=True,
            text=True,
            timeout=5
        )
        stdout = res.stdout.lower()
        if "h264_qsv" in stdout:
            return "h264_qsv"
        elif "h264_nvenc" in stdout:
            return "h264_nvenc"
        elif "h264_amf" in stdout:
            return "h264_amf"
    except Exception:
        pass

    return "libx264"

HARDWARE_ENCODER = detect_hardware_acceleration()
