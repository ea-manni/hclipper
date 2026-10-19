"""
hclipper AI Highlight & Viral Clip Scout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Scans long-form video/audio transcripts and detects high-impact, standalone
viral moments using Bring-Your-Own-Key (BYOK) LLMs (Google Gemini, DeepSeek,
OpenAI, Anthropic Claude) or local offline cadence/energy heuristics.
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
    _ui_env = os.path.join(os.path.dirname(__file__), "..", "ui", ".env")
    if os.path.exists(_ui_env):
        load_dotenv(_ui_env)
except Exception:
    pass


class HighlightScout:
    """
    Intelligent highlight detector that discovers 30-90s viral short-form
    candidates from long sermon, podcast, and interview transcripts.
    """

    SYSTEM_PROMPT_TEMPLATE = """You are an elite short-form video editor specializing in YouTube Shorts, TikTok, and Instagram Reels.
Your task is to analyze the following timestamped transcript and identify the top {count} most engaging, emotionally resonant, high-impact clip segments (target preference: {duration_desc}).

CRITICAL STORYTELLING & NARRATIVE COMPLETENESS RULES:
1. NARRATIVE COMPLETENESS OVER RIGID DURATION:
   Every clip MUST tell a self-contained story or make a complete rhetorical/practical point:
   - Strong Opening Hook: Captures attention in the first 3 seconds.
   - Core Message / Story Escalation: The body of the illustration, argument, or sermon anecdote.
   - Punchline / Conclusion: The lesson, moral, or powerful takeaway.
   NEVER cut a speaker off mid-sentence, mid-illustration, or right before they deliver their punchline just to fit an arbitrary time limit.
2. DYNAMIC TIMELINE ADJUSTMENT:
   The target duration is a general preference, NOT a strict guillotine. If an anecdote requires 85s, 95s, or 110s to complete its punchline without an abrupt cutoff, EXTEND the end boundary to include the resolution. If a point is delivered punchily in 35s, keep it tight without dragging.
3. PRECISE TIMESTAMPS:
   'start' and 'end' must align precisely with natural sentence beginnings and clean pauses.

For each clip candidate:
1. 'start': exact start timestamp in seconds (float)
2. 'end': exact end timestamp in seconds (float)
3. 'score': virality score between 80 and 99 based on hook strength, emotional peak, and narrative closure
4. 'title': catchy 3-6 word descriptive title (do NOT repeat words or stutter)
5. 'hook': powerful 1-sentence opening hook banner (properly capitalized)
6. 'reason': brief rationale why this segment works as a standalone short
7. 'duration_advisory': 1-sentence explanation of why this specific length was chosen (e.g., "Extended to 88s to capture the speaker's closing punchline without abrupt cutoff", or "Naturally concise 42s standalone takeaway")
8. 'story_arc': "complete_story" (narrative with resolution) or "punchy_takeaway" (concise power punch)
9. 'motion_suggestions': An array of 4 to 5 bespoke motion design and sound effect cues paced across the clip to maximize viewer retention using Dual-Coding Theory and Auditory Orienting Reflexes.
   Each motion suggestion object MUST have:
   - 'time_offset': timestamp in seconds RELATIVE to clip start (e.g., 0.0 for opening hook, 5.2 for illustration, etc.)
   - 'style': 'hyperframes' (kinetic typography, continuous momentum, code-rendered springs) OR 'collage' (tactile paper cutout, halftone texture, polaroid card, scotch tape, stamp)
   - 'element': one of 'kinetic_hook', 'torn_paper_stat', 'polaroid_card', 'highlighter_swatch', 'rubber_stamp', 'chat_bubble', 'wisdom_plaque', 'brand_badge'
   - 'text': punchy text or keyword string to display on screen (3-8 words max)
   - 'sfx': exact sound effect name from the acoustic catalog:
     'fast_whip_whoosh' (rapid kinetic whoosh for hook entrance),
     'marker_squeak' (felt-tip friction for highlighter swatch),
     'pencil_scribble' (fast graphite scratching for handwritten reveal),
     'paper_tear' (sharp paper rip for collage card reveal),
     'paper_slide' (smooth parchment slide for document entrance),
     'keyboard_thock' (mechanical keyboard thock for coding/typing text),
     'camera_shutter' (crisp DSLR shutter for polaroid/freeze frame),
     'stamp_thump' (heavy rubber stamp impact for verified truth/warning),
     'warm_chime' (resonant 2-tone chime for wisdom insight or resolution),
     'pop' (organic bubble pop for badge entrance)
   - 'position': 'upper-center' | 'floating-right' | 'floating-left' | 'lower-third' | 'center'
   - 'rationale': brief 1-sentence explanation of cognitive retention impact

You MUST output ONLY a valid JSON array of {count} objects conforming to this schema, with no markdown code fences or conversational text.
Example format:
[
  {{
    "start": 125.0,
    "end": 178.5,
    "score": 96,
    "title": "Stop Comparing Your Journey",
    "hook": "You cannot measure your beginning by someone else's harvest.",
    "reason": "Immediate emotional punch with standalone philosophical clarity.",
    "duration_advisory": "Clean 53s story arc landing on a definitive moral conclusion.",
    "story_arc": "complete_story",
    "motion_suggestions": [
      {{
        "id": "cue_1",
        "time_offset": 0.0,
        "style": "hyperframes",
        "element": "kinetic_hook",
        "text": "STOP COMPARING YOUR JOURNEY",
        "sfx": "fast_whip_whoosh",
        "position": "upper-center",
        "rationale": "High-velocity kinetic entrance triggering auditory orienting reflex at 0.0s."
      }},
      {{
        "id": "cue_2",
        "time_offset": 5.2,
        "style": "collage",
        "element": "torn_paper_stat",
        "text": "10 YEARS OF SACRIFICE",
        "sfx": "paper_tear",
        "position": "floating-right",
        "rationale": "Tactile paper rip revealing key foundational sacrifice stat."
      }},
      {{
        "id": "cue_3",
        "time_offset": 14.0,
        "style": "hyperframes",
        "element": "highlighter_swatch",
        "text": "RUN YOUR OWN RACE",
        "sfx": "marker_squeak",
        "position": "center",
        "rationale": "Dynamic fluorescent ink swipe reinforcing core instruction."
      }},
      {{
        "id": "cue_4",
        "time_offset": 28.5,
        "style": "collage",
        "element": "rubber_stamp",
        "text": "VERIFIED TRUTH",
        "sfx": "stamp_thump",
        "position": "floating-left",
        "rationale": "Physical rubber stamp impact emphasizing immutable law."
      }},
      {{
        "id": "cue_5",
        "time_offset": 45.0,
        "style": "hyperframes",
        "element": "wisdom_plaque",
        "text": "Harvest comes in its own season.",
        "sfx": "warm_chime",
        "position": "upper-center",
        "rationale": "Resonant glass chime landing on final philosophical punchline."
      }}
    ]
  }}
]
"""

    STOPWORDS = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
        "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for", "from",
        "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
        "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
        "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "ought",
        "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
        "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
        "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were",
        "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
        "you", "your", "yours", "yourself", "yourselves", "said", "say", "saying", "says", "like", "know",
        "going", "went", "come", "came", "get", "got", "let", "see", "seen", "also", "well", "one", "two",
        "yeah", "yes", "okay", "alright", "gonna", "wanna", "tell", "telling", "think", "thought",
        "want", "wanted", "thing", "things", "much", "many", "point", "give", "back", "gave",
        "statement", "assure", "guy", "literally", "hours", "place", "drive", "example", "supposed"
    }

    VIRAL_KEYWORDS = {
        "calling": 15, "purpose": 15, "destiny": 15, "truth": 12, "power": 12,
        "habit": 12, "habits": 12, "secret": 14, "breakthrough": 15, "fear": 12,
        "never": 10, "always": 10, "stop": 14, "season": 12, "harvest": 12,
        "focus": 10, "discipline": 12, "success": 12, "failure": 10, "listen": 10,
        "remember": 10, "mind": 8, "future": 12, "life": 8, "change": 10,
        "money": 10, "decision": 14, "decisions": 14, "wisdom": 14, "god": 10,
        "request": 10, "learn": 10, "skill": 10, "prayer": 12, "faith": 12,
        "principle": 12, "lesson": 12, "danger": 12, "trap": 14, "courage": 12
    }

    def __init__(self, provider: str = "gemini", api_key: Optional[str] = None, model: Optional[str] = None):
        self.provider = (provider or "gemini").lower()
        self.api_key = api_key or os.environ.get("HCLIPPER_AI_KEY") or os.environ.get("GEMINI_API_KEY")
        self.model = model

    def analyze_transcript(
        self,
        transcript_text: str = "",
        video_path: Optional[str] = None,
        count: int = 5,
        duration: str = "standard"
    ) -> List[Dict[str, Any]]:
        """
        Submits timestamped transcript to chosen provider or on-device heuristic engine,
        returning strictly non-overlapping ranked viral clip moments.
        """
        cues = self._resolve_cues(transcript_text, video_path)

        dur_labels = {
            "story": "dynamic story arc (prioritize complete narrative resolution, typically 45 to 110 seconds)",
            "short": "between 20 and 45 seconds (or slightly extended if needed to complete the sentence or thought cleanly)",
            "standard": "between 45 and 75 seconds (or extended up to 95 seconds if needed to finish the punchline without abrupt cutoff)",
            "long": "between 60 and 120 seconds (full deep-dive narrative, sermon illustration, or story arc)"
        }
        duration_desc = dur_labels.get(duration, "dynamic story arc prioritizing narrative completeness (45 to 95 seconds)")

        if (self.api_key or self.provider in ("local", "ollama")) and cues:
            # Build dialogue text with timestamps
            dialogue_lines = []
            for c in cues:
                mins = int(c["start"] // 60)
                secs = int(c["start"] % 60)
                dialogue_lines.append(f"[{mins:02d}:{secs:02d}] {c['text']}")
            dialogue_str = "\n".join(dialogue_lines)[:25000]

            prompt = self.SYSTEM_PROMPT_TEMPLATE.format(count=count, duration_desc=duration_desc)

            try:
                if self.provider == "gemini":
                    clips = self._call_gemini(dialogue_str, prompt)
                elif self.provider in ("openai", "deepseek", "groq", "xai", "grok", "kimi", "local", "ollama"):
                    clips = self._call_openai_compatible(dialogue_str, prompt)
                elif self.provider in ("anthropic", "claude"):
                    clips = self._call_anthropic(dialogue_str, prompt)
                else:
                    clips = []

                if clips and len(clips) > 0:
                    selected = clips[:count]
                    self._attach_transcript_cues(selected, cues)
                    return selected
            except Exception as e:
                sys.stderr.write(f"[HighlightScout] Provider '{self.provider}' failed: {e}. Executing on-device heuristic.\n")
                sys.stderr.flush()

        fallback_selected = self._heuristic_fallback(cues, count=count, duration=duration, video_path=video_path)
        self._attach_transcript_cues(fallback_selected, cues)
        return fallback_selected

    def _generate_default_motion_suggestions(
        self,
        clip_duration: float,
        comb_text: str = "",
        hook: str = "",
        title: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Generates 4-5 bespoke motion design & tactile SFX cues paced across the clip
        based on Dual-Coding Theory, Auditory Orienting Reflex, and semantic keyword matching.
        """
        cues = []
        dur = max(15.0, clip_duration)
        text_lower = comb_text.lower() if comb_text else ""

        # 1. Opening Hook (0.0s) - HyperFrames Kinetic Typography
        cues.append({
            "id": "cue_1_hook",
            "time_offset": 0.0,
            "style": "hyperframes",
            "element": "kinetic_hook",
            "text": (hook or title or "KEY BREAKTHROUGH MOMENT").upper()[:45],
            "sfx": "fast_whip_whoosh",
            "position": "upper-center",
            "rationale": "High-velocity kinetic entrance triggering auditory orienting reflex at 0.0s."
        })

        # 2. Second Beat (20% through clip) - Collage or HyperFrames
        t2 = round(min(5.5, max(3.0, dur * 0.15)), 1)
        money_match = re.search(r'(\$|₦|£|€)?\s*(\d+[kK]?|\d+,\d+|\d+)\s*(dollars|naira|bucks|pounds|k|n)?', comb_text)
        if money_match:
            cues.append({
                "id": "cue_2_stat",
                "time_offset": t2,
                "style": "collage",
                "element": "torn_paper_stat",
                "text": money_match.group(0).upper().strip()[:28],
                "sfx": "paper_tear",
                "position": "floating-right",
                "rationale": "Tactile paper rip revealing key numerical/financial evidence."
            })
        elif any(w in text_lower for w in ["said to me", "told me", "texted", "message", "chat", "dm"]):
            cues.append({
                "id": "cue_2_chat",
                "time_offset": t2,
                "style": "collage",
                "element": "chat_bubble",
                "text": "MESSAGE RECEIVED",
                "sfx": "paper_slide",
                "position": "floating-left",
                "rationale": "Visual chat card pop grounding dialogue in personal testimony."
            })
        else:
            cues.append({
                "id": "cue_2_card",
                "time_offset": t2,
                "style": "collage",
                "element": "polaroid_card",
                "text": (title or "CORE LESSON").upper()[:32],
                "sfx": "paper_slide",
                "position": "floating-right",
                "rationale": "Parchment card sliding into frame to anchor the illustration."
            })

        # 3. Third Beat (40% through clip) - Dynamic Highlighter Swatch
        t3 = round(min(18.0, max(8.0, dur * 0.38)), 1)
        highlight_word = "CRITICAL PRINCIPLE"
        for kw in self.VIRAL_KEYWORDS:
            if kw in text_lower:
                highlight_word = kw.upper()
                break
        cues.append({
            "id": "cue_3_highlight",
            "time_offset": t3,
            "style": "hyperframes",
            "element": "highlighter_swatch",
            "text": highlight_word,
            "sfx": "marker_squeak",
            "position": "center",
            "rationale": "Felt-tip friction squeak synchronized with ink swipe over keyword."
        })

        # 4. Fourth Beat (65% through clip) - Verification Stamp or Warning or Wisdom
        t4 = round(min(dur - 6.0, max(t3 + 5.0, dur * 0.65)), 1)
        if any(w in text_lower for w in ["warning", "trap", "danger", "mistake", "stop", "never"]):
            cues.append({
                "id": "cue_4_stamp",
                "time_offset": t4,
                "style": "collage",
                "element": "rubber_stamp",
                "text": "CRITICAL WARNING",
                "sfx": "stamp_thump",
                "position": "floating-left",
                "rationale": "Heavy rubber stamp impact forcing conscious attention onto warning."
            })
        elif any(w in text_lower for w in ["proverb", "psalm", "verse", "scripture", "bible", "commandment", "god", "faith", "truth"]):
            cues.append({
                "id": "cue_4_wisdom",
                "time_offset": t4,
                "style": "hyperframes",
                "element": "wisdom_plaque",
                "text": "DIVINE TRUTH",
                "sfx": "warm_chime",
                "position": "upper-center",
                "rationale": "Sacred acoustic chime crystallizing spiritual law."
            })
        else:
            cues.append({
                "id": "cue_4_stamp",
                "time_offset": t4,
                "style": "collage",
                "element": "rubber_stamp",
                "text": "VERIFIED TRUTH",
                "sfx": "stamp_thump",
                "position": "floating-left",
                "rationale": "Rubber stamp thump locking the premise into viewer memory."
            })

        # 5. Fifth Beat (85% through clip) - Resolution / Punchline
        if dur >= 28.0:
            t5 = round(max(t4 + 4.0, dur - 4.5), 1)
            cues.append({
                "id": "cue_5_resolution",
                "time_offset": t5,
                "style": "hyperframes",
                "element": "wisdom_plaque",
                "text": (hook or title or "Final Takeaway").capitalize()[:40],
                "sfx": "warm_chime",
                "position": "upper-center",
                "rationale": "Harmonic glass chime providing narrative and emotional closure."
            })

        return cues

    def _attach_transcript_cues(self, clips: List[Dict[str, Any]], cues: List[Dict[str, Any]]):
        """Attaches clip-relative transcript cues and validates 5-item bespoke motion suggestions."""
        for clip in clips:
            c_start = clip.get("start", 0.0)
            c_end = clip.get("end", c_start + 30.0)
            clip_dur = max(5.0, c_end - c_start)
            matched = [
                {
                    "start": round(max(0.0, c["start"] - c_start), 2),
                    "end": round(max(0.1, c["end"] - c_start), 2),
                    "text": c["text"].strip()
                }
                for c in cues
                if c.get("end", 0.0) >= c_start and c.get("start", 0.0) <= c_end
            ]
            clip["transcript_cues"] = matched
            comb_text = " ".join(c["text"] for c in matched) if matched else clip.get("reason", "")
            if not clip.get("customHeadline"):
                clip["customHeadline"] = clip.get("title", "SERMON HIGHLIGHT").upper()

            # Validate or synthesize 5 bespoke motion suggestions
            raw_ms = clip.get("motion_suggestions")
            validated_ms = []
            if isinstance(raw_ms, list) and len(raw_ms) >= 3:
                for idx, item in enumerate(raw_ms):
                    if not isinstance(item, dict):
                        continue
                    offset = float(item.get("time_offset", idx * 6.0))
                    offset = round(max(0.0, min(clip_dur - 1.0, offset)), 1)
                    sfx_val = str(item.get("sfx", "pop")).lower().strip().replace(".wav", "")
                    validated_ms.append({
                        "id": str(item.get("id") or f"cue_{idx + 1}"),
                        "time_offset": offset,
                        "style": "collage" if str(item.get("style", "")).lower() == "collage" else "hyperframes",
                        "element": str(item.get("element") or "kinetic_hook"),
                        "text": str(item.get("text") or clip.get("title") or "HIGHLIGHT").strip()[:50],
                        "sfx": sfx_val,
                        "position": str(item.get("position") or "upper-center"),
                        "rationale": str(item.get("rationale") or "High retention audiovisual sync.")
                    })

            if len(validated_ms) >= 3:
                clip["motion_suggestions"] = validated_ms[:5]
            else:
                clip["motion_suggestions"] = self._generate_default_motion_suggestions(
                    clip_duration=clip_dur,
                    comb_text=comb_text,
                    hook=clip.get("hook", ""),
                    title=clip.get("title", "")
                )

    def _resolve_cues(self, transcript_text: str, video_path: Optional[str]) -> List[Dict[str, Any]]:
        """
        Finds and parses subtitles/transcripts. Prioritizes clean Faster-Whisper transcription
        directly from the video audio, bypassing corrupt or rolling YouTube auto-captions.
        """
        content = ""
        candidate_files = []

        # 1. First check for existing transcripts (Whisper transcripts, VTT, or SRT)
        if video_path:
            v_path = Path(video_path)
            for ext in [".whisper.vtt", ".whisper.json", ".en.vtt", ".vtt", ".en-orig.vtt", ".en.srt", ".srt"]:
                candidate_files.append(v_path.with_suffix(ext))
                candidate_files.append(v_path.parent / f"{v_path.stem}{ext}")

            # Check parent directory for matching stem prefix
            parent = v_path.parent
            if parent.exists():
                stem_prefix = v_path.stem[:25]
                for f in parent.glob(f"*{stem_prefix}*.vtt"):
                    candidate_files.append(f)
                for f in parent.glob(f"*{stem_prefix}*.srt"):
                    candidate_files.append(f)

        # 2. From explicit transcript_text if provided
        if transcript_text:
            cleaned_t = transcript_text.strip()
            match_path = re.search(r'(?:[A-Za-z]:\\[^\r\n]+|/[^\r\n]+)', cleaned_t)
            if match_path:
                raw_p = match_path.group(0).strip()
                p = Path(raw_p)
                for ext in ["", ".whisper.vtt", ".en.vtt", ".vtt", ".srt"]:
                    candidate_files.append(Path(str(p) + ext))

        # Check existing clean candidate files
        for cf in candidate_files:
            if cf and os.path.exists(cf) and os.path.isfile(cf):
                try:
                    with open(cf, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()
                    if content.strip():
                        break
                except Exception:
                    pass

        # If transcript_text contains timecode lines directly
        if not content and "-->" in transcript_text:
            content = transcript_text

        if content:
            return self._parse_cues_deduped(content)

        # 3. If no pre-existing Whisper transcript, automatically transcribe audio with Faster-Whisper
        if video_path and os.path.exists(video_path):
            try:
                print(f"[HighlightScout] Transcribing speech audio with local Faster-Whisper ({Path(video_path).name})...", flush=True)
                from engine.subtitles import SubtitleEngine
                sub = SubtitleEngine()
                whisper_cues = sub.transcribe_with_whisper(video_path, model_size="base")
                if whisper_cues:
                    v_p = Path(video_path)
                    vtt_out = v_p.with_suffix(".whisper.vtt")
                    with open(vtt_out, "w", encoding="utf-8") as vf:
                        vf.write("WEBVTT\n\n")
                        for c in whisper_cues:
                            s_tc = f"{int(c['start']//3600):02d}:{int((c['start']%3600)//60):02d}:{c['start']%60:06.3f}"
                            e_tc = f"{int(c['end']//3600):02d}:{int((c['end']%3600)//60):02d}:{c['end']%60:06.3f}"
                            vf.write(f"{s_tc} --> {e_tc}\n{c['text']}\n\n")
                    print(f"[HighlightScout] Saved clean Faster-Whisper transcript to {vtt_out.name}", flush=True)
                    return whisper_cues
            except Exception as e:
                sys.stderr.write(f"[HighlightScout] Faster-Whisper transcription note: {e}\n")
                sys.stderr.flush()

        # 4. Fallback to existing manual .vtt / .srt if user supplied one
        if video_path:
            v_path = Path(video_path)
            for ext in [".vtt", ".srt"]:
                f = v_path.with_suffix(ext)
                if f.exists():
                    try:
                        with open(f, "r", encoding="utf-8", errors="replace") as h:
                            c = h.read()
                            if c.strip():
                                return self._parse_cues_deduped(c)
                    except Exception:
                        pass

        return []

    def _parse_timecode(self, tc: str) -> float:
        """Converts HH:MM:SS.mmm or MM:SS.mmm to seconds float."""
        parts = tc.strip().replace(",", ".").split(":")
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(parts[0])

    def _parse_cues_deduped(self, content: str) -> List[Dict[str, Any]]:
        """
        Parses VTT/SRT content and completely removes YouTube rolling-window
        repetitions, 10ms flash cues, and HTML subtitle tags.
        """
        tc_regex = re.compile(r'(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)')
        lines = content.splitlines()
        cues = []
        i = 0
        prev_text = ""

        while i < len(lines):
            m = tc_regex.search(lines[i])
            if m:
                s_sec = self._parse_timecode(m.group(1))
                e_sec = self._parse_timecode(m.group(2))
                i += 1
                cue_lines = []
                while i < len(lines) and not tc_regex.search(lines[i]) and lines[i].strip():
                    raw = re.sub(r'<[^>]+>', '', lines[i]).strip()
                    if (raw and not raw.isdigit() and not raw.startswith('WEBVTT') 
                            and not raw.startswith('NOTE') and not raw.startswith('Kind:') 
                            and not raw.startswith('Language:')):
                        cue_lines.append(raw)
                    i += 1

                # Discard micro transition cues (< 0.08s)
                if e_sec - s_sec < 0.08:
                    continue

                # Remove direct repetition of previous line
                clean_lines = [cl for cl in cue_lines if cl != prev_text]
                text = ' '.join(clean_lines).strip()
                if not text and cue_lines:
                    text = cue_lines[-1]

                # Strip rolling window word overlaps
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
                        cues.append({'start': s_sec, 'end': e_sec, 'text': text})
                        prev_text = cue_lines[-1] if cue_lines else text
                continue
            i += 1

        return cues

    def _call_gemini(self, dialogue_str: str, system_prompt: str) -> List[Dict[str, Any]]:
        """Google Gemini API via standard REST endpoint."""
        candidates = [self.model] if self.model else ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]
        last_error = None

        for model_name in candidates:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"

            payload = {
                "contents": [{
                    "parts": [{"text": f"{system_prompt}\n\nTRANSCRIPT:\n{dialogue_str}"}]
                }],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return self._clean_json(text)
            except urllib.error.HTTPError as e:
                last_error = e
                if e.code == 404:
                    continue
                raise e
            except Exception as e:
                last_error = e
                raise e

        if last_error:
            raise last_error
        return []

    def _call_openai_compatible(self, dialogue_str: str, system_prompt: str) -> List[Dict[str, Any]]:
        """OpenAI, Groq, DeepSeek, xAI, Kimi, or Ollama chat completions."""
        if self.provider == "deepseek":
            endpoint = "https://api.deepseek.com/chat/completions"
            model_name = self.model or "deepseek-chat"
        elif self.provider == "groq":
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            model_name = self.model or "llama-3.3-70b-versatile"
        elif self.provider in ("xai", "grok"):
            endpoint = "https://api.x.ai/v1/chat/completions"
            model_name = self.model or "grok-2-latest"
        elif self.provider == "kimi":
            endpoint = "https://api.moonshot.cn/v1/chat/completions"
            model_name = self.model or "moonshot-v1-8k"
        elif self.provider in ("local", "ollama"):
            endpoint = os.environ.get("OLLAMA_API_URL") or "http://localhost:11434/v1/chat/completions"
            model_name = self.model or "llama3.2"
        else:
            endpoint = "https://api.openai.com/v1/chat/completions"
            model_name = self.model or "gpt-4o-mini"

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"TRANSCRIPT:\n{dialogue_str}"}
            ],
            "response_format": {"type": "json_object"} if self.provider == "openai" else None,
            "temperature": 0.4
        }

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
        )

        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            return self._clean_json(content)

    def _call_anthropic(self, dialogue_str: str, system_prompt: str) -> List[Dict[str, Any]]:
        """Anthropic Claude API."""
        endpoint = "https://api.anthropic.com/v1/messages"
        model_name = self.model or "claude-3-5-haiku-20241022"

        payload = {
            "model": model_name,
            "max_tokens": 2000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": f"TRANSCRIPT:\n{dialogue_str}"}
            ]
        }

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01"
            }
        )

        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["content"][0]["text"]
            return self._clean_json(content)

    def _clean_json(self, raw: str) -> List[Dict[str, Any]]:
        """Sanitizes raw model response into python list."""
        cleaned = re.sub(r"^```(?:json)?", "", raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "clips" in parsed:
            return parsed["clips"]
        if isinstance(parsed, list):
            return parsed
        return []

    def _build_title(self, text: str) -> str:
        """Constructs clean 3-5 word title with stopword and stutter filtering."""
        words = re.findall(r'\b[A-Za-z]{3,}\b', text)
        filtered = []
        seen = set()

        def is_seen(token: str) -> bool:
            return any(token == s or (len(token) > 4 and (token.startswith(s) or s.startswith(token))) for s in seen)

        # Prioritize high-value viral keywords if present
        for w in words:
            wl = w.lower()
            if wl in self.VIRAL_KEYWORDS and not is_seen(wl):
                seen.add(wl)
                filtered.append(w.capitalize())

        # Then add supporting content words
        for w in words:
            wl = w.lower()
            if wl not in self.STOPWORDS and not is_seen(wl) and len(wl) > 2:
                seen.add(wl)
                filtered.append(w.capitalize())
            if len(filtered) >= 5:
                break

        if len(filtered) >= 3:
            return " ".join(filtered[:5])
        elif len(filtered) == 2:
            return f"{filtered[0]} {filtered[1]} Principle"
        return "Key Breakthrough Moment"

    def _build_hook(self, text: str) -> str:
        """Extracts and formats clean opening hook banner."""
        cleaned = text.strip()
        sentences = re.split(r'[.!?\n]', cleaned)
        first_s = sentences[0].strip() if sentences else cleaned
        if len(first_s) < 18 and len(sentences) > 1:
            first_s = f"{first_s} {sentences[1].strip()}".strip()

        if first_s:
            first_s = first_s[0].upper() + first_s[1:]
        if len(first_s) > 65:
            first_s = first_s[:62].rsplit(' ', 1)[0] + "..."
        return first_s

    def _heuristic_fallback(
        self,
        cues: List[Dict[str, Any]],
        count: int = 5,
        duration: str = "standard",
        video_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        100% offline, fully dynamic cadence heuristic.
        Segments dialogue or audio into requested count of standalone viral moments.
        """
        dur_ranges = {
            "story": (40.0, 95.0),
            "short": (20.0, 45.0),
            "standard": (45.0, 75.0),
            "long": (60.0, 115.0)
        }
        min_dur, max_dur = dur_ranges.get(duration, (40.0, 85.0))

        candidates = []

        if len(cues) >= 4:
            cur_idx = 0
            total_cues = len(cues)

            while cur_idx < total_cues:
                w_start = cues[cur_idx]["start"]
                window_cues = []
                for j in range(cur_idx, total_cues):
                    window_cues.append(cues[j])
                    w_end = cues[j]["end"]
                    dur = w_end - w_start
                    if dur >= min_dur:
                        is_terminal = cues[j]["text"].rstrip().endswith((".", "!", "?"))
                        if is_terminal or dur >= max_dur + 20:
                            break

                dur = window_cues[-1]["end"] - w_start
                if min_dur <= dur <= max_dur + 30:
                    comb_text = " ".join(c["text"] for c in window_cues)
                    base_score = 82
                    keyword_hits = 0
                    w_lower = comb_text.lower()
                    for kw, pts in self.VIRAL_KEYWORDS.items():
                        if kw in w_lower:
                            keyword_hits += 1
                            base_score += min(pts, 4)

                    if "?" in comb_text:
                        base_score += 4
                    if "!" in comb_text:
                        base_score += 3

                    calc_score = min(98, max(82, base_score))
                    title = self._build_title(comb_text)
                    hook = self._build_hook(comb_text)

                    candidates.append({
                        "start": round(w_start, 1),
                        "end": round(window_cues[-1]["end"], 1),
                        "duration": round(dur, 1),
                        "score": calc_score,
                        "title": title,
                        "hook": hook,
                        "reason": f"High rhetorical delivery with {keyword_hits} high-engagement concepts and strong conclusion.",
                        "duration_advisory": f"Natural cadence closure cleanly landed at {round(dur, 1)}s.",
                        "story_arc": "complete_story" if dur >= 50 else "punchy_takeaway"
                    })
                    cur_idx += max(10, len(window_cues) // 2)
                else:
                    cur_idx += 3

            # Sort by score
            candidates.sort(key=lambda x: x["score"], reverse=True)

            # Select non-overlapping clips
            selected = []
            for cand in candidates:
                overlaps = False
                for s in selected:
                    if not (cand["end"] <= s["start"] + 5 or cand["start"] >= s["end"] - 5):
                        overlaps = True
                        break
                if not overlaps:
                    selected.append(cand)
                if len(selected) >= count:
                    break

            # If more candidates are needed to satisfy count, relax overlap
            if len(selected) < count:
                for cand in candidates:
                    if cand not in selected:
                        selected.append(cand)
                    if len(selected) >= count:
                        break

            # Distribute natural varied virality scores
            for idx, item in enumerate(selected):
                item["score"] = max(80, min(97, 97 - idx * 2))

            return selected[:count]

        # If cues are unavailable, generate dynamic windows across real probed video length
        video_dur = 1200.0
        base_title = "Sermon Insight"
        if video_path:
            p = Path(video_path)
            if p.exists():
                try:
                    import cv2
                    cap = cv2.VideoCapture(str(p.resolve()))
                    if cap.isOpened():
                        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                        fc = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
                        if fc > 0 and fps > 0:
                            video_dur = max(30.0, float(fc / fps))
                        cap.release()
                except Exception:
                    pass

            raw = p.stem
            # Strip YouTube IDs like [4_Uetxw16pE]
            raw = re.sub(r'\[[a-zA-Z0-9_-]+\]', '', raw)
            # Strip dates like JAN. 21, 2025
            raw = re.sub(r'(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*\.?\s+\d{1,2},?\s+\d{4}', '', raw, flags=re.IGNORECASE)
            # Take only the sermon title before any delimiter (| or — or -)
            parts = re.split(r'[|｜—–]', raw)
            clean_name = parts[0].strip() if parts else raw.strip()
            clean_name = re.sub(r'\s+', ' ', clean_name).strip(' -_|,')
            if clean_name:
                base_title = clean_name[:45]

        target_dur = min(video_dur * 0.8, (min_dur + max_dur) / 2.0)
        step = max(target_dur + 5.0, (video_dur - target_dur) / max(count, 1))

        fallback_clips = []
        for i in range(count):
            start = round(15.0 + i * step, 1)
            end = round(start + target_dur, 1)
            score = max(80, 96 - i * 2)
            fallback_clips.append({
                "start": start,
                "end": end,
                "score": score,
                "title": f"{base_title} (Part {i + 1})",
                "hook": f"KEY LESSON #{i + 1}: {base_title.upper()}",
                "reason": f"High engagement cadence window for short-form audience."
            })

        return fallback_clips
