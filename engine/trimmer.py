"""
hclipper Timeline & Trimming Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Provides waveform peak data generation for Wavesurfer.js, millisecond-accurate
stream trimming, and cadence-preserving pause compression.
"""

import os
import re
import math
import struct
import shutil
import subprocess
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

from engine import HARDWARE_ENCODER

class TimelineTrimmer:
    """
    Handles audio/video time manipulation, waveform extraction,
    and intelligent breathing-cadence silence compression.
    """

    def __init__(self, encoder: Optional[str] = None):
        self.encoder = encoder or HARDWARE_ENCODER
        self.ffprobe_bin = shutil.which("ffprobe") or "ffprobe"
        self.ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"

    def get_duration(self, media_path: str) -> float:
        """Get media duration in seconds via ffprobe."""
        cmd = [
            self.ffprobe_bin,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(media_path)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0 or not res.stdout.strip():
            raise RuntimeError(f"Could not probe duration for {media_path}: {res.stderr}")
        return float(res.stdout.strip())

    def generate_waveform_peaks(self, media_path: str, points: int = 800) -> List[float]:
        """
        Generate normalized waveform peak array [0.0 - 1.0] for instant
        waveform visualization in Wavesurfer.js.
        Extracts downsampled 8kHz 16-bit mono PCM stream.
        """
        target_points = max(100, min(5000, points))
        # Extract downsampled audio to raw pcm via pipe
        cmd = [
            self.ffmpeg_bin,
            "-i", str(media_path),
            "-ac", "1",
            "-ar", "8000",
            "-f", "s16le",
            "-acodec", "pcm_s16le",
            "-"
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        raw_pcm, _ = proc.communicate()

        if not raw_pcm:
            return [0.0] * target_points

        sample_count = len(raw_pcm) // 2
        if sample_count == 0:
            return [0.0] * target_points

        samples = struct.unpack(f"<{sample_count}h", raw_pcm)
        chunk_size = max(1, sample_count // target_points)

        peaks = []
        max_seen = 1.0

        for i in range(0, sample_count, chunk_size):
            chunk = samples[i:i + chunk_size]
            if not chunk:
                break
            peak = max(abs(s) for s in chunk)
            peaks.append(float(peak))
            if peak > max_seen:
                max_seen = float(peak)

        # Normalize to 0.0 - 1.0
        normalized = [round(p / max_seen, 4) for p in peaks]
        # Pad or slice to target length
        if len(normalized) > target_points:
            normalized = normalized[:target_points]
        while len(normalized) < target_points:
            normalized.append(0.0)

        return normalized

    def cut_range(
        self,
        input_path: str,
        output_path: str,
        start_sec: float,
        end_sec: float,
        reencode: bool = False
    ) -> bool:
        """
        Extract an in-out cut range.
        If reencode is False, attempts fast stream copy (-c copy).
        If reencode is True, encodes using hardware acceleration.
        """
        duration = max(0.1, end_sec - start_sec)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        if not reencode:
            cmd = [
                self.ffmpeg_bin,
                "-ss", f"{start_sec:.3f}",
                "-i", str(input_path),
                "-t", f"{duration:.3f}",
                "-c", "copy",
                "-avoid_negative_ts", "make_zero",
                "-y", str(output_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                return True

        # Fallback / explicit re-encode
        vcodec_args = ["-c:v", self.encoder]
        if self.encoder == "h264_qsv":
            vcodec_args.extend(["-global_quality", "22"])
        elif self.encoder == "h264_nvenc":
            vcodec_args.extend(["-cq", "22", "-preset", "p4"])
        else:
            vcodec_args.extend(["-crf", "20", "-preset", "fast"])

        cmd = [
            self.ffmpeg_bin,
            "-ss", f"{start_sec:.3f}",
            "-i", str(input_path),
            "-t", f"{duration:.3f}",
            *vcodec_args,
            "-c:a", "aac",
            "-b:a", "192k",
            "-y", str(output_path)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0

    def cadence_silence_trim(
        self,
        input_path: str,
        output_path: str,
        noise_threshold: str = "-33dB",
        min_silence: float = 0.75,
        cushion_before: float = 0.18,
        cushion_after: float = 0.16,
        max_cut_time: Optional[float] = None,
        start_sec: Optional[float] = None,
        end_sec: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Detects dead air (> min_silence) and contracts it,
        preserving cushion_before + cushion_after (~0.34s) to keep
        natural human speech rhythm intact.
        If start_sec and end_sec are provided, operates only on that bounded clip segment.
        """
        temp_slice = None
        work_path = input_path
        if start_sec is not None and end_sec is not None:
            import tempfile
            temp_slice = Path(tempfile.gettempdir()) / f"cadence_slice_{os.getpid()}_{int(start_sec)}_{int(end_sec)}.mp4"
            cut_ok = self.cut_range(input_path, str(temp_slice), start_sec, end_sec, reencode=False)
            if cut_ok and temp_slice.exists():
                work_path = str(temp_slice)

        def _cleanup():
            if temp_slice and temp_slice.exists():
                try:
                    temp_slice.unlink()
                except Exception:
                    pass

        total_dur = self.get_duration(work_path)
        speech_end_limit = total_dur if max_cut_time is None else max(0.0, total_dur - max_cut_time)

        # Run silencedetect filter
        detect_cmd = [
            self.ffmpeg_bin,
            "-i", str(work_path),
            "-af", f"silencedetect=noise={noise_threshold}:d={min_silence}",
            "-f", "null", "-"
        ]
        res = subprocess.run(detect_cmd, capture_output=True, text=True)

        s_starts = [float(x) for x in re.findall(r'silence_start:\s*([0-9.]+)', res.stderr)]
        s_ends = [float(x) for x in re.findall(r'silence_end:\s*([0-9.]+)', res.stderr)]

        if not s_starts or not s_ends:
            _cleanup()
            shutil.copy2(input_path, output_path)
            return {
                "original_duration": total_dur,
                "trimmed_duration": total_dur,
                "time_saved": 0.0,
                "segments_kept": [(0.0, total_dur)],
                "trimmed": False
            }

        pairs = list(zip(s_starts, s_ends))
        speech_pauses = []
        for s, e in pairs:
            if s >= speech_end_limit - 1.0:
                continue
            e = min(e, speech_end_limit)
            dur = e - s
            if dur >= min_silence:
                speech_pauses.append((s, e, dur))

        if not speech_pauses:
            _cleanup()
            shutil.copy2(input_path, output_path)
            return {
                "original_duration": total_dur,
                "trimmed_duration": total_dur,
                "time_saved": 0.0,
                "segments_kept": [(0.0, total_dur)],
                "trimmed": False
            }

        # Build kept segments
        keep_segments: List[Tuple[float, float]] = []
        cur_pos = 0.0
        total_trimmed = 0.0

        for s, e, dur in speech_pauses:
            seg_end = min(total_dur, s + cushion_before)
            if seg_end > cur_pos + 0.05:
                keep_segments.append((cur_pos, seg_end))

            trimmed_amount = max(0.0, (e - cushion_after) - (s + cushion_before))
            total_trimmed += trimmed_amount
            cur_pos = max(seg_end, e - cushion_after)

        if cur_pos < total_dur:
            keep_segments.append((cur_pos, total_dur))

        # Build FFmpeg filter complex
        filter_parts = []
        interleaved = []
        for i, (start, end) in enumerate(keep_segments):
            filter_parts.append(f"[0:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS[v{i}];")
            seg_len = end - start
            fade_out_st = max(0.0, seg_len - 0.008)
            filter_parts.append(
                f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,"
                f"afade=t=in:st=0:d=0.006,afade=t=out:st={fade_out_st:.3f}:d=0.006[a{i}];"
            )
            interleaved.append(f"[v{i}][a{i}]")

        n = len(keep_segments)
        concat_filter = f"{''.join(interleaved)}concat=n={n}:v=1:a=1[outv][outa]"
        full_filter = "".join(filter_parts) + concat_filter

        vcodec_args = ["-c:v", self.encoder]
        if self.encoder == "h264_qsv":
            vcodec_args.extend(["-global_quality", "22"])
        elif self.encoder == "h264_nvenc":
            vcodec_args.extend(["-cq", "22", "-preset", "p4"])
        else:
            vcodec_args.extend(["-crf", "20", "-preset", "fast"])

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        render_cmd = [
            self.ffmpeg_bin,
            "-i", str(work_path),
            "-filter_complex", full_filter,
            "-map", "[outv]", "-map", "[outa]",
            *vcodec_args,
            "-c:a", "aac", "-b:a", "192k",
            str(output_path), "-y"
        ]

        try:
            res = subprocess.run(render_cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg trim error: {res.stderr[-600:]}")

            new_dur = self.get_duration(output_path)
            return {
                "original_duration": total_dur,
                "trimmed_duration": new_dur,
                "time_saved": round(total_dur - new_dur, 2),
                "segments_kept": keep_segments,
                "trimmed": True
            }
        finally:
            _cleanup()

    @staticmethod
    def remap_timestamp(orig_sec: float, keep_segments: List[Tuple[float, float]]) -> Optional[float]:
        """
        Remap an original timeline timestamp to the new trimmed timeline.
        Returns None if the timestamp fell entirely within a trimmed pause.
        """
        accumulated = 0.0
        for start, end in keep_segments:
            if orig_sec < start:
                # Fell inside a cut section
                return accumulated
            if start <= orig_sec <= end:
                return accumulated + (orig_sec - start)
            accumulated += (end - start)
        return accumulated
