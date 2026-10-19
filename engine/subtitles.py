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
from typing import List, Dict, Any, Optional, Tuple, Callable, Union
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from engine import FONTS_DIR, BRANDING_DIR, HARDWARE_ENCODER, BIN_DIR

class SubtitleEngine:
    """
    Handles speech transcription, mobile safe-zone subtitle styling,
    karaoke word highlights, and header hook banners.
    """

    def __init__(self, font_name: str = "Segoe UI"):
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
        model_size: str = "base",
        language: Optional[str] = "en",
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

        # Decode audio directly via local FFmpeg to avoid PyAV open() version incompatibilities
        ffmpeg_bin = BIN_DIR / "ffmpeg.exe" if (BIN_DIR / "ffmpeg.exe").exists() else Path("ffmpeg")
        cmd = [
            str(ffmpeg_bin),
            "-nostdin",
            "-threads", "0",
            "-i", str(audio_or_video),
            "-f", "s16le",
            "-ac", "1",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-"
        ]
        try:
            raw_audio = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
            audio_array = np.frombuffer(raw_audio, np.int16).flatten().astype(np.float32) / 32768.0
        except Exception as e:
            print(f"[SubtitleEngine] Warning: FFmpeg audio decode failed ({e}), falling back to direct path", flush=True)
            audio_array = str(audio_or_video)

        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, _ = model.transcribe(
            audio_array,
            word_timestamps=True,
            language=language,
            vad_filter=True,
        )

        cues = []
        last_log = 0.0
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
            if segment.end - last_log >= 30.0:
                mins = int(segment.end // 60)
                secs = int(segment.end % 60)
                print(f"[transcribe] Whisper transcribed audio up to {mins:02d}:{secs:02d}...", flush=True)
                last_log = segment.end
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
            font_size = 60
            margin_v = 750
            outline = 1
            shadow = 3
        elif preset == "clean_white":
            active_color = highlight_color or "&H0024BFFB&"  # Soft gold highlight
            style_primary = "&H00FFFFFF&"
            font_size = 58
            margin_v = 750
            outline = 1
            shadow = 3
        else:  # tiktok_bold (Live Design Style)
            active_color = highlight_color or "&H0024BFFB&"  # Amber Gold (#FBBF24 / BGR: &H0024BFFB&)
            style_primary = "&H00FFFFFF&"
            font_size = 60
            margin_v = 750
            outline = 1
            shadow = 3

        dialogues = []

        # Check whether cues are relative to clip (start near 0) or absolute to source video
        is_already_relative = False
        if cues and clip_start_offset > 0.5:
            first_cue_start = cues[0].get("start", 0.0)
            if first_cue_start < clip_start_offset:
                is_already_relative = True

        effective_offset = 0.0 if is_already_relative else clip_start_offset

        # 1. Clean and normalize cue timestamps
        cleaned_cues = []
        for c in sorted(cues, key=lambda x: float(x.get("start", 0.0))):
            s = float(c.get("start", 0.0)) - effective_offset
            e = float(c.get("end", s + 2.0)) - effective_offset
            txt = c.get("text", "").replace('>>', '').strip()
            txt = re.sub(r'\[.*?\]|\(.*?\)', '', txt).strip()

            if not txt:
                continue
            if s < 0.0 and e < 0.15:
                continue
            if clip_duration and s >= clip_duration:
                continue

            rel_s = max(0.0, s)
            rel_e = min(clip_duration, e) if clip_duration else e
            if rel_e <= rel_s + 0.1:
                rel_e = rel_s + 1.2

            cleaned_cues.append({
                **c,
                "clean_start": rel_s,
                "clean_end": rel_e,
                "clean_text": txt
            })

        # 2. Prevent overlapping/lagging cues: clamp end to next cue's start
        for idx in range(len(cleaned_cues)):
            if idx + 1 < len(cleaned_cues):
                next_start = cleaned_cues[idx + 1]["clean_start"]
                if next_start > cleaned_cues[idx]["clean_start"]:
                    cleaned_cues[idx]["clean_end"] = min(cleaned_cues[idx]["clean_end"], next_start)

        # 3. Generate progressive word-by-word dialogue lines
        for cue in cleaned_cues:
            rel_s = cue["clean_start"]
            rel_e = cue["clean_end"]
            txt = cue["clean_text"]

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
                            phrase_parts.append(f"{{\\c{active_color}}}{{\\u1}}{{\\fscx108\\fscy108}}{cw}{{\\fscx100\\fscy100}}{{\\u0}}{{\\c{style_primary}}}")
                        else:
                            phrase_parts.append(cw)

                    formatted_line = "{\\blur2.5}" + " ".join(phrase_parts)
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
Style: Default,{self.font_name},{font_size},{style_primary},{active_color},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,{outline},{shadow},2,60,60,{margin_v},1

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
        social_pill_text: Optional[str] = None,
        social_platforms: Optional[Union[List[str], str]] = None,
        social_handles_json: Optional[Union[str, List[Dict[str, Any]]]] = None
    ) -> str:
        """
        Draws a modern frosted glass header banner with high-contrast
        bold typography, user-selected visual theme, and official platform social pill badge
        with crisp vector logos (TikTok, Instagram, YouTube) matching the Live Design.
        """
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        font_file = str(self.font_path) if self.font_path.exists() else "C:/Windows/Fonts/segoeuib.ttf"

        # 1. Render Top Header Banner if headline_text is non-empty
        headline = (headline_text or "").upper().strip()
        if headline:
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
            font = ImageFont.truetype(font_file, 56)

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

                draw.text((x + 2, y + 2), line, font=font, fill=shadow_fill)
                draw.text((x, y), line, font=font, fill=text_fill)

        # 2. Bottom Social Pill Badges (multi-capsule layout matching Live Design preview)
        raw_capsules = []
        if social_handles_json:
            try:
                if isinstance(social_handles_json, str):
                    raw_capsules = json.loads(social_handles_json)
                elif isinstance(social_handles_json, list):
                    raw_capsules = social_handles_json
            except Exception:
                raw_capsules = []

        if not raw_capsules and social_pill_text and social_pill_text.strip():
            raw_str = social_pill_text.strip()
            # If JSON passed in social_pill_text
            if raw_str.startswith("[") and raw_str.endswith("]"):
                try:
                    raw_capsules = json.loads(raw_str)
                except Exception:
                    raw_capsules = []

            if not raw_capsules:
                # Split on bullet separator if present
                parts = [p.strip() for p in raw_str.split("•") if p.strip()]
                if social_platforms is None:
                    plat_list = ["tiktok", "instagram", "youtube"]
                elif isinstance(social_platforms, str):
                    plat_list = [p.strip().lower() for p in social_platforms.split(",") if p.strip()]
                else:
                    plat_list = [str(p).strip().lower() for p in social_platforms if str(p).strip()]

                if len(parts) <= 1:
                    raw_capsules.append({"handle": parts[0] if parts else raw_str, "platforms": plat_list})
                else:
                    for i, p in enumerate(parts):
                        assigned_plat = [plat_list[i]] if i < len(plat_list) else plat_list
                        raw_capsules.append({"handle": p, "platforms": assigned_plat})

        if raw_capsules:
            icons_dir = BRANDING_DIR / "icons"
            if not icons_dir.exists():
                icons_dir = Path("assets/branding/icons")

            icon_size = 26
            pill_font = ImageFont.truetype(font_file, 26)
            dummy_draw = ImageDraw.Draw(img)

            capsule_items = []
            for item in raw_capsules:
                h_name = str(item.get("handle", "")).strip()
                if not h_name:
                    continue
                h_clean = f"@{h_name.lstrip('@')}"
                p_names = item.get("platforms", [])
                if isinstance(p_names, str):
                    p_names = [p.strip().lower() for p in p_names.split(",") if p.strip()]

                c_icons = []
                for p_name in p_names:
                    ic_path = icons_dir / f"{str(p_name).lower()}.png"
                    if ic_path.exists():
                        try:
                            ic = Image.open(ic_path).convert("RGBA")
                            ic = ic.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                            c_icons.append(ic)
                        except Exception:
                            pass

                bbox = dummy_draw.textbbox((0, 0), h_clean, font=pill_font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                icons_total_w = len(c_icons) * icon_size + max(0, len(c_icons) - 1) * 8 if c_icons else 0
                padding_x = 20
                pill_w = icons_total_w + (12 if c_icons else 0) + text_w + (padding_x * 2)

                capsule_items.append({
                    "handle": h_clean,
                    "icons": c_icons,
                    "bbox": bbox,
                    "text_w": text_w,
                    "text_h": text_h,
                    "icons_w": icons_total_w,
                    "pill_w": pill_w,
                    "padding_x": padding_x
                })

            if capsule_items:
                pill_h = 52
                gap_between = 14
                total_w = sum(c["pill_w"] for c in capsule_items) + (len(capsule_items) - 1) * gap_between
                start_x = (width - total_w) // 2
                pill_y = height - 120  # Safe zone bottom offset

                pill_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                pbd = ImageDraw.Draw(pill_layer)

                cur_x = start_x
                for c in capsule_items:
                    pw = c["pill_w"]
                    # Drop shadow
                    pbd.rounded_rectangle(
                        [cur_x, pill_y + 2, cur_x + pw, pill_y + pill_h + 2],
                        radius=pill_h // 2,
                        fill=(0, 0, 0, 95)
                    )
                    # Frosted glass capsule: bg-black/80 backdrop-blur-md border border-white/20
                    pbd.rounded_rectangle(
                        [cur_x, pill_y, cur_x + pw, pill_y + pill_h],
                        radius=pill_h // 2,
                        fill=(10, 14, 22, 215),
                        outline=(255, 255, 255, 45),
                        width=1
                    )
                    cur_x += pw + gap_between

                img = Image.alpha_composite(img, pill_layer)
                draw = ImageDraw.Draw(img)

                cur_x = start_x
                for c in capsule_items:
                    px = cur_x + c["padding_x"]
                    icon_y = pill_y + (pill_h - icon_size) // 2
                    for ic in c["icons"]:
                        img.alpha_composite(ic, (px, icon_y))
                        px += icon_size + 8
                    if c["icons"]:
                        px += (12 - 8)

                    text_y = pill_y + (pill_h - c["text_h"]) // 2 - c["bbox"][1]
                    draw.text((px + 1, text_y + 1), c["handle"], font=pill_font, fill=(0, 0, 0, 180))
                    draw.text((px, text_y), c["handle"], font=pill_font, fill=(245, 248, 255, 250))
                    cur_x += c["pill_w"] + gap_between

        Path(output_png).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_png)
        return str(Path(output_png).resolve())

    def generate_live_overlay_manifest(
        self,
        cues: List[Dict[str, Any]],
        clip_duration: Optional[float],
        output_dir: str,
        style_preset: str = "tiktok_bold",
        clip_start_offset: float = 0.0,
        width: int = 1080,
        height: int = 1920
    ) -> str:
        """
        Generates pixel-identical Live Design subtitle frames (with rounded pill badge,
        subtle glow borders, active word underline accent, and soft text drop shadow)
        and outputs an FFmpeg concat demuxer manifest.txt.
        """
        out_p = Path(output_dir)
        out_p.mkdir(parents=True, exist_ok=True)

        font_file = str(self.font_path) if self.font_path.exists() else "C:/Windows/Fonts/segoeuib.ttf"
        font_size = 56
        font = ImageFont.truetype(font_file, font_size)

        empty_frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        empty_path = out_p / "empty.png"
        empty_frame.save(empty_path, compress_level=1)

        is_already_relative = False
        if cues and clip_start_offset > 0.5:
            first_cue_start = cues[0].get("start", 0.0)
            if first_cue_start < clip_start_offset:
                is_already_relative = True

        effective_offset = 0.0 if is_already_relative else clip_start_offset

        # 1. Clean cues
        clean_cues = []
        for c in sorted(cues, key=lambda x: float(x.get("start", 0.0))):
            s = float(c.get("start", 0.0)) - effective_offset
            e = float(c.get("end", s + 2.0)) - effective_offset
            txt = c.get("text", "").replace(">>", "").strip()
            txt = re.sub(r'\[.*?\]|\(.*?\)', '', txt).strip()

            if not txt:
                continue
            if s < 0.0 and e < 0.15:
                continue
            if clip_duration and s >= clip_duration:
                continue

            rel_s = max(0.0, s)
            rel_e = min(clip_duration, e) if clip_duration else e
            if rel_e <= rel_s + 0.1:
                rel_e = rel_s + 1.2

            clean_cues.append({
                "clean_start": rel_s,
                "clean_end": rel_e,
                "clean_text": txt,
                "words": c.get("words")
            })

        # 2. Prevent overlapping cues
        for idx in range(len(clean_cues) - 1):
            if clean_cues[idx]["clean_end"] > clean_cues[idx + 1]["clean_start"]:
                clean_cues[idx]["clean_end"] = max(clean_cues[idx]["clean_start"] + 0.2, clean_cues[idx + 1]["clean_start"])

        # Preset styling matching Live Design in SubtitlesView.tsx
        preset = (style_preset or "tiktok_bold").lower()
        if preset == "dynamic_pop":
            active_text = (103, 232, 249, 255)      # text-cyan-300
            active_border = (34, 211, 238, 255)    # border-cyan-400
            active_bg = (8, 47, 73, 245)           # bg-cyan-950/95
            glow_c1 = (6, 182, 212, 45)
            glow_c2 = (6, 182, 212, 95)
        elif preset == "clean_white":
            active_text = (252, 211, 77, 255)     # text-amber-300
            active_border = (252, 211, 77, 255)
            active_bg = None
            glow_c1 = None
            glow_c2 = None
        else:  # tiktok_bold
            active_text = (251, 191, 36, 255)     # text-amber-400
            active_border = (245, 158, 11, 200)   # ring-amber-400/50
            active_bg = (10, 10, 10, 220)          # bg-black/85
            glow_c1 = (245, 158, 11, 40)
            glow_c2 = (245, 158, 11, 85)

        white_text = (255, 255, 255, 255)
        shadow_color = (0, 0, 0, 220)

        word_gap = 18
        line_height = 80
        max_line_width = 860
        center_y = 1060

        dummy_draw = ImageDraw.Draw(empty_frame)
        timeline_events = []
        frame_counter = 0

        for cue in clean_cues:
            words = [w.strip() for w in cue["clean_text"].upper().split() if w.strip()]
            if not words:
                continue

            c_start = cue["clean_start"]
            c_end = cue["clean_end"]
            dur = max(0.15, c_end - c_start)
            num_words = len(words)
            time_per_word = dur / num_words

            cue_words = cue.get("words", [])
            has_word_ts = isinstance(cue_words, list) and len(cue_words) == num_words

            # Wrap words into lines
            lines = []
            cur_line = []
            cur_w = 0
            for w in words:
                bbox = dummy_draw.textbbox((0, 0), w, font=font)
                w_len = (bbox[2] - bbox[0]) + 28
                if cur_w + w_len + word_gap > max_line_width and cur_line:
                    lines.append(cur_line)
                    cur_line = [w]
                    cur_w = w_len
                else:
                    cur_line.append(w)
                    cur_w += w_len + word_gap
            if cur_line:
                lines.append(cur_line)

            total_block_h = len(lines) * line_height
            block_start_y = center_y - (total_block_h // 2)

            for active_idx in range(num_words):
                if has_word_ts:
                    w_obj = cue_words[active_idx]
                    w_s = max(c_start, float(w_obj.get("start", c_start + active_idx * time_per_word)) - effective_offset)
                    w_e = min(c_end, float(w_obj.get("end", w_s + time_per_word)) - effective_offset)
                else:
                    w_s = c_start + (active_idx * time_per_word)
                    w_e = c_start + ((active_idx + 1) * time_per_word)
                if active_idx == num_words - 1:
                    w_e = c_end

                if w_e <= w_s:
                    w_e = w_s + 0.1

                img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                draw = ImageDraw.Draw(img)

                flat_w_idx = 0
                for l_idx, line_words in enumerate(lines):
                    word_measurements = []
                    for w in line_words:
                        bbox = draw.textbbox((0, 0), w, font=font)
                        w_w = bbox[2] - bbox[0]
                        is_act = (flat_w_idx + len(word_measurements) == active_idx)
                        if is_act and active_bg:
                            w_w += 28
                        word_measurements.append(w_w)

                    total_w = sum(word_measurements) + (len(line_words) - 1) * word_gap
                    start_x = (width - total_w) // 2
                    y = block_start_y + l_idx * line_height

                    cur_x = start_x
                    for w_pos, w in enumerate(line_words):
                        is_active = (flat_w_idx == active_idx)
                        w_w = word_measurements[w_pos]

                        if is_active:
                            if active_bg:
                                pill_x0 = cur_x
                                pill_y0 = y - 6
                                pill_x1 = cur_x + w_w
                                pill_y1 = y + font_size + 4

                                if glow_c1:
                                    draw.rounded_rectangle([pill_x0 - 4, pill_y0 - 4, pill_x1 + 4, pill_y1 + 4], radius=14, outline=glow_c1, width=3)
                                if glow_c2:
                                    draw.rounded_rectangle([pill_x0 - 2, pill_y0 - 2, pill_x1 + 2, pill_y1 + 2], radius=12, outline=glow_c2, width=2)

                                draw.rounded_rectangle([pill_x0, pill_y0, pill_x1, pill_y1], radius=10, fill=active_bg, outline=active_border, width=2)
                                draw.rectangle([pill_x0 + 8, pill_y1 - 5, pill_x1 - 8, pill_y1 - 1], fill=active_border)
                                draw.text((cur_x + 14, y), w, font=font, fill=active_text)
                            else:
                                draw.rectangle([cur_x + 2, y + font_size + 2, cur_x + w_w - 2, y + font_size + 6], fill=active_border)
                                draw.text((cur_x, y), w, font=font, fill=active_text)
                        else:
                            draw.text((cur_x + 2, y + 3), w, font=font, fill=shadow_color)
                            draw.text((cur_x, y), w, font=font, fill=white_text)

                        cur_x += w_w + word_gap
                        flat_w_idx += 1

                frame_filename = f"f_{frame_counter:04d}.png"
                frame_path = out_p / frame_filename
                img.save(frame_path, compress_level=1)
                timeline_events.append((w_s, w_e, frame_filename))
                frame_counter += 1

        manifest_path = out_p / "manifest.txt"
        current_time = 0.0
        manifest_lines = ["ffconcat version 1.0\n"]

        for ev_start, ev_end, ev_file in timeline_events:
            gap = ev_start - current_time
            if gap > 0.05:
                manifest_lines.append(f"file '{empty_path.name}'\n")
                manifest_lines.append(f"duration {gap:.3f}\n")
                current_time = ev_start

            dur = ev_end - ev_start
            if dur > 0.02:
                manifest_lines.append(f"file '{ev_file}'\n")
                manifest_lines.append(f"duration {dur:.3f}\n")
                current_time = ev_end

        if clip_duration and clip_duration > current_time:
            gap = clip_duration - current_time
            manifest_lines.append(f"file '{empty_path.name}'\n")
            manifest_lines.append(f"duration {gap:.3f}\n")

        with open(manifest_path, "w", encoding="utf-8") as f:
            f.writelines(manifest_lines)

        return str(manifest_path.resolve())

    def burn_subtitles_and_branding(
        self,
        video_path: str,
        output_path: str,
        ass_path: Optional[str] = None,
        subtitle_manifest: Optional[str] = None,
        banner_png: Optional[str] = None,
        banner_duration: str = "first_5s",
        audio_dsp_options: Optional[Dict[str, Any]] = None,
        encoder: Optional[str] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        Composites styled Live Design subtitle overlays (or ASS subtitles),
        frosted hook banner overlay, and broadcast audio DSP onto a vertical short video.
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
        input_idx = 1

        # 1. Hook Banner Overlay Filter
        if banner_png and Path(banner_png).exists():
            banner_resolved = Path(banner_png).resolve()
            inputs.extend(["-i", str(banner_resolved)])

            if banner_duration == "first_3s":
                overlay_clause = "overlay=0:0:enable='lte(t,3.0)':eof_action=pass"
            elif banner_duration == "first_5s":
                overlay_clause = "overlay=0:0:enable='lte(t,5.0)':eof_action=pass"
            else:  # full_clip
                overlay_clause = "overlay=0:0:eof_action=pass"

            filter_parts.append(f"{next_v}[{input_idx}:v]{overlay_clause}[v_banner]")
            next_v = "[v_banner]"
            input_idx += 1

        # 2. Live Design Subtitle Overlay Filter (Pixel-identical to Live Design preview)
        if subtitle_manifest and Path(subtitle_manifest).exists():
            inputs.extend(["-f", "concat", "-safe", "0", "-i", str(Path(subtitle_manifest).resolve())])
            filter_parts.append(f"{next_v}[{input_idx}:v]overlay=0:0:eof_action=pass[v_sub]")
            next_v = "[v_sub]"
            input_idx += 1
        elif ass_path and Path(ass_path).exists():
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
                "-shortest",
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

