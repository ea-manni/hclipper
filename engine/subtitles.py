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
from typing import List, Dict, Any, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont

from engine import FONTS_DIR, BRANDING_DIR

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
        highlight_color: str = "&H0000D4FF&"  # Vibrant Gold in ASS BGR format
    ) -> str:
        """
        Builds Advanced SubStation Alpha (.ass) subtitle file formatted for
        the 9:16 vertical safe zone (avoiding mobile platform UI overlay elements).
        """
        margin_v = 740  # Sits naturally in upper lower-third safe zone
        font_size = 52
        outline = 5
        shadow = 2

        dialogues = []
        last_text = ""

        for cue in cues:
            start = cue["start"] - clip_start_offset
            end = cue["end"] - clip_start_offset

            if start < 0.0 and end < 0.2:
                continue
            if clip_duration and start >= clip_duration:
                continue

            rel_s = max(0.0, start)
            rel_e = min(clip_duration, end) if clip_duration else end

            txt = cue["text"].replace('>>', '').strip()
            txt = re.sub(r'\[.*?\]', '', txt).strip()

            if not txt or txt == last_text or rel_e <= rel_s + 0.15:
                continue

            # Break long lines to ~26-28 chars max
            words = txt.upper().split()
            lines = []
            cur_line = []
            cur_len = 0
            for w in words:
                if cur_len + len(w) + 1 > 26 and cur_line:
                    lines.append(" ".join(cur_line))
                    cur_line = [w]
                    cur_len = len(w)
                else:
                    cur_line.append(w)
                    cur_len += len(w) + 1
            if cur_line:
                lines.append(" ".join(cur_line))

            formatted_txt = "\\N".join(lines)

            # Optional pop animation tag if requested
            if style_preset == "dynamic_pop":
                formatted_txt = f"{{\\t(0,70,\\fscx112\\fscy112)}}{{\\t(70,140,\\fscx100\\fscy100)}}{formatted_txt}"

            dialogues.append(
                f"Dialogue: 0,{self._sec_to_ass(rel_s)},{self._sec_to_ass(rel_e)},Default,,0,0,0,,{formatted_txt}"
            )
            last_text = txt

        ass_content = f"""[Script Info]
Title: hclipper Auto Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{self.font_name},{font_size},&H00FFFFFF,{highlight_color},&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,{outline},{shadow},2,60,60,{margin_v},1

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
        bg_opacity: int = 190
    ) -> str:
        """
        Draws a modern frosted glass header banner with high-contrast
        bold typography and user-selected visual theme.
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

        Path(output_png).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_png)
        return str(Path(output_png).resolve())
