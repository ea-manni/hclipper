"""
hclipper Audio DSP & Vocal Mastering Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Implements broadcast-grade vocal processing chains (highpass rumble filter,
afftdn FFT noise suppression, dynamic compression, -14 LUFS standard loudness)
and worship/ambient background music ducking.
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

from engine import HARDWARE_ENCODER

class AudioDSP:
    """
    Applies vocal cleaning, dynamic leveling, social loudness mastering,
    and background music bed ducking.
    """

    def __init__(self, ffmpeg_bin: Optional[str] = None):
        self.ffmpeg_bin = ffmpeg_bin or shutil.which("ffmpeg") or "ffmpeg"

    @staticmethod
    def get_vocal_filter_chain(
        highpass_freq: int = 80,
        denoise_db: int = -25,
        target_lufs: float = -14.0,
        compress: bool = True
    ) -> str:
        """
        Builds an FFmpeg audio filter string for clean, intelligible vocal clarity.
        """
        filters = []
        # 1. Highpass filter to eliminate HVAC / stage rumble
        if highpass_freq > 0:
            filters.append(f"highpass=f={highpass_freq}")

        # 2. FFT denoiser for room echo / air hiss
        if denoise_db:
            filters.append(f"afftdn=nf={denoise_db}:tn=1")

        # 3. Dynamic vocal compressor for leveling peaks and soft phrases
        if compress:
            filters.append("acompressor=threshold=-21dB:ratio=3.5:attack=15:release=180:makeup=2.5dB")

        # 4. Social platform EBU R128 loudness normalization (-14 LUFS)
        filters.append(f"loudnorm=I={target_lufs}:LRA=7:TP=-1.0")

        return ",".join(filters)

    def process_speech_track(
        self,
        input_media: str,
        output_media: str,
        target_lufs: float = -14.0,
        denoise: bool = True
    ) -> bool:
        """
        Processes and normalizes speech audio within a video or audio file.
        Leaves video stream untouched (-c:v copy if container permits).
        """
        vocal_filter = self.get_vocal_filter_chain(
            highpass_freq=80,
            denoise_db=-25 if denoise else 0,
            target_lufs=target_lufs
        )

        Path(output_media).parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            self.ffmpeg_bin,
            "-i", str(input_media),
            "-c:v", "copy",
            "-af", vocal_filter,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "48000",
            "-y", str(output_media)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0

    def mix_speech_and_music(
        self,
        speech_video: str,
        music_path: str,
        output_video: str,
        music_volume: float = 0.08,
        total_duration: float = 0.0,
        outro_pad_sec: float = 0.0,
        fade_out_lead: float = 1.5
    ) -> bool:
        """
        Mixes speech track with background ambient music bed.
        Loops music bed seamlessly and fades in/out gracefully.
        """
        Path(output_video).parent.mkdir(parents=True, exist_ok=True)

        dur_arg = []
        if total_duration > 0:
            dur_arg = ["-t", f"{total_duration:.3f}"]

        fade_out_st = max(0.0, total_duration - fade_out_lead) if total_duration > 0 else 60.0

        speech_pad_filter = f"apad=pad_dur={outro_pad_sec}" if outro_pad_sec > 0 else "anull"
        music_filter = (
            f"aformat=sample_rates=48000:channel_layouts=stereo,"
            f"volume={music_volume},"
            f"afade=t=in:st=0:d=2.0,afade=t=out:st={fade_out_st:.3f}:d={fade_out_lead}"
        )

        filter_complex = (
            f"[0:a]aformat=sample_rates=48000:channel_layouts=stereo,{speech_pad_filter}[sp];"
            f"[1:a]{music_filter}[bg];"
            f"[sp][bg]amix=inputs=2:duration=first:dropout_transition=2[out_a]"
        )

        cmd = [
            self.ffmpeg_bin,
            "-i", str(speech_video),
            "-stream_loop", "-1",
            "-i", str(music_path),
            "-filter_complex", filter_complex,
            "-map", "0:v",
            "-map", "[out_a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "48000",
            *dur_arg,
            "-y", str(output_video)
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0
