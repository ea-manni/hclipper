"""
hclipper Subtitles & Visual Branding Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Generates stylized, mobile-safe animated subtitles (Advanced SubStation Alpha .ass)
and branded overlays (frosted hook banners, social pills) for vertical shorts.
"""

import os
import re
import html
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Callable
import shutil

from PIL import Image, ImageDraw, ImageFont

from engine import FONTS_DIR, BRANDING_DIR, HARDWARE_ENCODER

class SubtitleEngine:
    """
    Handles speech transcription, mobile safe-zone subtitle styling,
    karaoke word highlights, and header hook banners.
    """

    def __init__(self, font_name: str = "Segoe UI Black"):
        self.font_name = font_name
        self.font_path = FONTS_DIR / "SegoeUI-Black.ttf"
        if not self.font_path.exists():
            self.font_path = Path("C:/Windows/Fonts/segoeuib.ttf")

    @staticmethod
    def parse_vtt_file(vtt_path: str) -> List[Dict[str, Any]]:
        """Parses a WebVTT (.vtt) file into timed dialogue cues with rolling window deduplication."""
        if not os.path.exists(vtt_path):
            return []

        with open(vtt_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        def vtt_to_sec(ts: str) -> float:
            parts = ts.strip().replace(",", ".").split(":")
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + float(parts[1])
            return 0.0

        time_pattern = re.compile(
            r'(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)'
        )

        cues = []
        i = 0
        prev_text = ""

        while i < len(lines):
            m = time_pattern.search(lines[i])
            if m:
                s_sec = vtt_to_sec(m.group(1))
                e_sec = vtt_to_sec(m.group(2))
                i += 1
                cue_lines = []
                while i < len(lines) and not time_pattern.search(lines[i]) and lines[i].strip():
                    raw = html.unescape(re.sub(r'<[^>]+>', '', lines[i])).strip()
                    if (raw and not raw.isdigit() and not raw.startswith('WEBVTT') 
                            and not raw.startswith('NOTE') and not raw.startswith('Kind:') 
                            and not raw.startswith('Language:')):
                        cue_lines.append(raw)
                    i += 1

                # Skip micro flash cues (< 0.08s)
                if e_sec - s_sec < 0.08:
                    continue

                clean_lines = [cl for cl in cue_lines if cl != prev_text]
                text = ' '.join(clean_lines).strip()
                if not text and cue_lines:
                    text = cue_lines[-1]

                if text:
                    p_words = prev_text.split()
                    c_words = text.split()
                    overlap = 0
                    for k in range(min(len(p_words), len(c_words)), 0, -1):
                        if p_words[-k:] == c_words[:k]:
                            overlap = k
                            break
                    if overlap > 0:
                        text = ' '.join(c_words[overlap:])

                    if text:
                        cues.append({
                            "start": s_sec,
                            "end": e_sec,
                            "text": text
                        })
                        prev_text = cue_lines[-1] if cue_lines else text
                continue
            i += 1

        return cues

    def transcribe_with_whisper(
        self,
        audio_or_video: str,
        model_size: str = "base"
    ) -> List[Dict[str, Any]]:
        """
        Transcribes speech using faster-whisper if available.
        Returns cues with start, end, and text.
        """
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError(
                "faster-whisper is not installed. Run 'pip install faster-whisper' "
                "or supply a pre-extracted .vtt/.srt subtitle file."
            )

        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, _ = model.transcribe(str(audio_or_video), word_timestamps=True)

        cues = []
        for segment in segments:
            cues.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "words": [
                    {"word": w.word.strip(), "start": w.start, "end": w.end}
                    for w in (segment.words or [])
                ]
            })
        return cues

    @staticmethod
    def _sec_to_ass(s: float) -> str:
        s = max(0.0, s)
        h = int(s // 3600)
        m = int((s % 3600) // 60)
        sec = s % 60
        return f"{h}:{m:02d}:{sec:05.2f}"

    def generate_ass(
        self,
        cues: List[Dict[str, Any]],
        output_ass_path: str,
        style_preset: str = "tiktok_bold",
        clip_start_offset: float = 0.0,
        clip_duration: Optional[float] = None,
        highlight_color: Optional[str] = None
    ) -> str:
        """
        Builds Advanced SubStation Alpha (.ass) subtitle file formatted for
        the 9:16 vertical safe zone with dynamic progressive word-by-word karaoke
        underlining and user-selected visual styling preset.
        """
        preset = (style_preset or "tiktok_bold").lower()
        if preset == "dynamic_pop":
            active_color = highlight_color or "&H00FFFF00&"  # Electric Neon Cyan (BGR)
            style_primary = "&H00FFFFFF&"
            font_size = 54
            margin_v = 730
            outline = 5
            shadow = 2
        elif preset == "clean_white":
            active_color = highlight_color or "&H00FFFFFF&"
            style_primary = "&H00DDDDDD&"
            font_size = 50
            margin_v = 740
            outline = 4
            shadow = 1
        else:  # tiktok_bold
            active_color = highlight_color or "&H0000D4FF&"  # Vibrant Gold (BGR)
            style_primary = "&H00FFFFFF&"
            font_size = 52
            margin_v = 740
            outline = 5
            shadow = 2

        dialogues = []

        # Check whether cues are relative to clip (start near 0) or absolute to source video
        is_already_relative = False
        if cues and clip_start_offset > 0.5:
            first_cue_start = cues[0].get("start", 0.0)
            if first_cue_start < clip_start_offset:
                is_already_relative = True

        effective_offset = 0.0 if is_already_relative else clip_start_offset

        for cue in cues:
            start = cue.get("start", 0.0) - effective_offset
            end = cue.get("end", 0.0) - effective_offset

            if start < 0.0 and end < 0.2:
                continue
            if clip_duration and start >= clip_duration:
                continue

            rel_s = max(0.0, start)
            rel_e = min(clip_duration, end) if clip_duration else end

            txt = cue.get("text", "").replace('>>', '').strip()
            txt = re.sub(r'\[.*?\]', '', txt).strip()

            if not txt or rel_e <= rel_s + 0.15:
                continue

            raw_words = [w for w in txt.upper().split() if w]
            if not raw_words:
                continue

            cue_words = cue.get("words", [])
            has_word_ts = isinstance(cue_words, list) and len(cue_words) == len(raw_words)

            chunk_size = 4
            word_chunks = [raw_words[i:i + chunk_size] for i in range(0, len(raw_words), chunk_size)]
            
            total_duration = max(0.2, rel_e - rel_s)
            time_per_word = total_duration / len(raw_words)

            word_idx = 0
            for chunk in word_chunks:
                chunk_len = len(chunk)
                for i in range(chunk_len):
                    if has_word_ts:
                        w_obj = cue_words[word_idx]
                        w_start = max(rel_s, w_obj.get("start", rel_s + word_idx * time_per_word) - effective_offset)
                        w_end = min(rel_e, w_obj.get("end", w_start + time_per_word) - effective_offset)
                    else:
                        w_start = rel_s + word_idx * time_per_word
                        w_end = rel_s + (word_idx + 1) * time_per_word

                    if w_end <= w_start:
                        w_end = w_start + 0.1

                    phrase_parts = []
                    for ci, cw in enumerate(chunk):
                        if ci == i:
                            if preset == "dynamic_pop":
                                phrase_parts.append(f"{{\\c{active_color}}}{{\\u1}}{{\\fscx112\\fscy112}}{cw}{{\\fscx100\\fscy100}}{{\\u0}}{{\\c{style_primary}}}")
                            elif preset == "clean_white":
                                phrase_parts.append(f"{{\\c{active_color}}}{{\\u1}}{cw}{{\\u0}}{{\\c{style_primary}}}")
                            else:  # tiktok_bold
                                phrase_parts.append(f"{{\\c{active_color}}}{{\\u1}}{cw}{{\\u0}}{{\\c{style_primary}}}")
                        else:
                            phrase_parts.append(cw)

                    formatted_line = " ".join(phrase_parts)
                    dialogues.append(
                        f"Dialogue: 0,{self._sec_to_ass(w_start)},{self._sec_to_ass(w_end)},Default,,0,0,0,,{formatted_line}"
                    )
                    word_idx += 1

        ass_content = f"""[Script Info]
Title: hclipper Auto Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{self.font_name},{font_size},{style_primary},{active_color},&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,{outline},{shadow},2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(dialogues) + "\n"

        Path(output_ass_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

        return str(Path(output_ass_path).resolve())

    def create_hook_banner(
        self,
        headline_text: str,
        output_png: str,
        banner_style: str = "frosted_gold",
        width: int = 1080,
        height: int = 1920,
        banner_top: int = 160,
        banner_height: int = 210,
        bg_opacity: int = 190,
        social_pill_text: Optional[str] = None
    ) -> str:
        """
        Draws a modern frosted glass header banner with high-contrast
        bold typography, user-selected visual theme, and optional social handle badge.
        """
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        # Determine theme colors
        style = (banner_style or "frosted_gold").lower()
        if style == "cyber_neon":
            bg_fill = (6, 11, 24, min(bg_opacity + 20, 255))
            top_border = (6, 182, 212, 255)       # Cyan
            bottom_border = (168, 85, 247, 220)    # Purple
            text_fill = (103, 232, 249, 255)       # Electric cyan
            shadow_fill = (0, 0, 0, 220)
        elif style == "clean_minimal":
            bg_fill = (20, 24, 33, 175)
            top_border = (255, 255, 255, 120)     # Clean white
            bottom_border = (255, 255, 255, 60)
            text_fill = (255, 255, 255, 255)       # Pure white
            shadow_fill = (0, 0, 0, 180)
        elif style == "viral_warning":
            bg_fill = (245, 190, 11, 245)          # Warning yellow
            top_border = (251, 191, 36, 255)
            bottom_border = (180, 83, 9, 255)
            text_fill = (15, 23, 42, 255)          # Pure dark text
            shadow_fill = (255, 255, 255, 60)
        else:  # frosted_gold
            bg_fill = (10, 12, 16, bg_opacity)
            top_border = (212, 175, 55, 200)      # Gold
            bottom_border = (212, 175, 55, 140)
            text_fill = (245, 200, 66, 255)       # Gold
            shadow_fill = (0, 0, 0, 200)

        # Frosted banner background
        banner_box = [0, banner_top, width, banner_top + banner_height]
        banner_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        bd = ImageDraw.Draw(banner_layer)
        bd.rectangle(banner_box, fill=bg_fill)

        # Accent top and bottom borders
        bd.line([(0, banner_top), (width, banner_top)], fill=top_border, width=3)
        bd.line([(0, banner_top + banner_height), (width, banner_top + banner_height)], fill=bottom_border, width=2)
        img = Image.alpha_composite(img, banner_layer)

        # Text rendering
        draw = ImageDraw.Draw(img)
        font_file = str(self.font_path) if self.font_path.exists() else "C:/Windows/Fonts/segoeuib.ttf"
        font = ImageFont.truetype(font_file, 56)

        headline = headline_text.upper().strip()
        # Wrap words to max 2 lines
        words = headline.split()
        lines = []
        cur = []
        for w in words:
            if len(" ".join(cur + [w])) > 24 and cur:
                lines.append(" ".join(cur))
                cur = [w]
            else:
                cur.append(w)
        if cur:
            lines.append(" ".join(cur))

        line_height = 68
        total_text_h = len(lines) * line_height
        start_y = banner_top + (banner_height - total_text_h) // 2

        for idx, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_w = bbox[2] - bbox[0]
            x = (width - text_w) // 2
            y = start_y + idx * line_height

            # Drop shadow
            draw.text((x + 2, y + 2), line, font=font, fill=shadow_fill)
            # Primary headline text
            draw.text((x, y), line, font=font, fill=text_fill)

        # Bottom Social Pill Badge if specified
        if social_pill_text and social_pill_text.strip():
            pill_str = social_pill_text.strip()
            pill_font = ImageFont.truetype(font_file, 34)
            pill_bbox = draw.textbbox((0, 0), pill_str, font=pill_font)
            pill_text_w = pill_bbox[2] - pill_bbox[0]
            pill_w = pill_text_w + 64
            pill_h = 58
            pill_x = (width - pill_w) // 2
            pill_y = height - 260

            pill_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            pbd = ImageDraw.Draw(pill_layer)
            # Rounded frosted glass pill
            pbd.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=29, fill=(8, 12, 20, 220), outline=top_border, width=2)
            img = Image.alpha_composite(img, pill_layer)

            draw = ImageDraw.Draw(img)
            # Text inside pill
            draw.text((pill_x + 32, pill_y + 11), pill_str, font=pill_font, fill=(240, 245, 255, 255))

        Path(output_png).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_png)
        return str(Path(output_png).resolve())

    def burn_subtitles_and_branding(
        self,
        video_path: str,
        output_path: str,
        ass_path: Optional[str] = None,
        banner_png: Optional[str] = None,
        banner_duration: str = "first_5s",
        audio_dsp_options: Optional[Dict[str, Any]] = None,
        encoder: Optional[str] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        Composites styled ASS animated subtitles, frosted hook banner overlay,
        and broadcast audio DSP (highpass + denoise + -14 LUFS loudness)
        onto a vertical short video using hardware-accelerated FFmpeg.
        """
        ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
        src_vid = Path(video_path).resolve()
        if not src_vid.exists():
            raise FileNotFoundError(f"Source video for compositing not found: {video_path}")

        out_path = Path(output_path).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)

        inputs = ["-i", str(src_vid)]
        filter_parts = []
        next_v = "[0:v]"

        # 1. Hook Banner Overlay Filter
        if banner_png and Path(banner_png).exists():
            banner_resolved = Path(banner_png).resolve()
            inputs.extend(["-i", str(banner_resolved)])

            if banner_duration == "first_3s":
                overlay_clause = "overlay=0:0:enable='lte(t,3.0)':eof_action=repeat"
            elif banner_duration == "first_5s":
                overlay_clause = "overlay=0:0:enable='lte(t,5.0)':eof_action=repeat"
            else:  # full_clip
                overlay_clause = "overlay=0:0:eof_action=repeat"

            filter_parts.append(f"{next_v}[1:v]{overlay_clause}[v_banner]")
            next_v = "[v_banner]"

        # 2. ASS Subtitles Burn-in Filter
        if ass_path and Path(ass_path).exists():
            ass_resolved = Path(ass_path).resolve()
            # Escape path for FFmpeg filter argument
            norm_ass = str(ass_resolved).replace("\\", "/").replace(":", "\\:")
            norm_fonts = str(FONTS_DIR.resolve()).replace("\\", "/").replace(":", "\\:")
            ass_filter = f"ass='{norm_ass}':fontsdir='{norm_fonts}'"
            filter_parts.append(f"{next_v}{ass_filter}[v_sub]")
            next_v = "[v_sub]"

        # Final video output pad
        v_map = next_v

        # 3. Audio DSP Mastering Filter Chain
        audio_filters = []
        if audio_dsp_options:
            if audio_dsp_options.get("highpass", False) or audio_dsp_options.get("denoise", False):
                audio_filters.append("highpass=f=80")
            if audio_dsp_options.get("denoise", False):
                audio_filters.append("afftdn=nf=-25:tn=1")
            if audio_dsp_options.get("loudnorm", True):
                audio_filters.append("acompressor=threshold=-21dB:ratio=3.5:attack=15:release=180:makeup=2.5dB")
                audio_filters.append("loudnorm=I=-14:LRA=7:TP=-1.0")

        # Select encoder (hardware QSV/NVENC with libx264 fallback)
        encoders_to_try = []
        chosen_enc = encoder or HARDWARE_ENCODER
        if chosen_enc and chosen_enc != "libx264":
            encoders_to_try.append(chosen_enc)
        encoders_to_try.append("libx264")

        success = False
        last_err = ""

        for enc in encoders_to_try:
            vcodec_args = ["-c:v", enc]
            if enc == "h264_qsv":
                vcodec_args.extend(["-global_quality", "22"])
            elif enc == "h264_nvenc":
                vcodec_args.extend(["-cq", "22", "-preset", "p4"])
            else:
                vcodec_args.extend(["-crf", "20", "-preset", "fast"])

            cmd = [
                str(ffmpeg_bin), "-y",
                *inputs
            ]

            if filter_parts:
                full_vf = ";".join(filter_parts)
                cmd.extend(["-filter_complex", full_vf, "-map", v_map])
            else:
                cmd.extend(["-map", "0:v"])

            # Map audio
            cmd.append("-map")
            cmd.append("0:a?")

            if audio_filters:
                cmd.extend(["-af", ",".join(audio_filters)])

            cmd.extend([
                *vcodec_args,
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                str(out_path)
            ])

            if progress_callback:
                progress_callback({"phase": "compositing", "percent": 75.0, "encoder": enc})

            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and out_path.exists() and out_path.stat().st_size > 5000:
                success = True
                break
            else:
                last_err = res.stderr[-500:] if res.stderr else "Unknown FFmpeg error"

        if success and progress_callback:
            progress_callback({"phase": "completed", "percent": 100.0, "output": str(out_path)})

        if not success:
            raise RuntimeError(f"FFmpeg composite failed on all encoders: {last_err}")

        return True

