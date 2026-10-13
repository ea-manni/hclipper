"""
hclipper Semantic Motion Cue Detector
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Analyzes timed speech cues (WebVTT or Whisper transcripts) to automatically identify
semantic trigger moments and dispatch bespoke visual motion assets & sound effects:
- Chat messages (WhatsApp/iMessage)
- Currency & Wealth Badges
- Brand/App stickers (Bolt, inDrive, Uber)
- Conceptual Math / Thinking overlays
- Scripture / Wisdom Plaques
- Warning & High-Impact Callout Stamps
"""

import re
from typing import List, Dict, Any, Optional

class MotionCueDetector:
    def __init__(self):
        # Lexical pattern matchers
        self.money_pattern = re.compile(r'\b(\$|₦|£|€)?\s*(\d+[kK]?|\d+,\d+|\d+)\s*(dollars|naira|bucks|pounds|k|n)?\b', re.IGNORECASE)
        self.currency_words = re.compile(r'\b(money|wealth|provision|profit|cash|salary|paid|dollars|naira|pounds)\b', re.IGNORECASE)
        self.brands_pattern = re.compile(r'\b(bolt|indrive|uber|youtube|tiktok|instagram|whatsapp|google|twitter)\b', re.IGNORECASE)
        self.math_pattern = re.compile(r'\b(math|calculate|calculating|formula|logic|derivative|reasoning|equation|fraction)\b', re.IGNORECASE)
        self.scripture_pattern = re.compile(r'\b(proverbs?|psalms?|genesis|matthew|john|romans|corinthians|scripture|bible|verse|commandment)\b', re.IGNORECASE)
        self.warning_pattern = re.compile(r'\b(warning|trap|danger|mistake|stop|never|beware)\b', re.IGNORECASE)
        self.message_pattern = re.compile(r'\b(said to me|told me|texted|replied|sent me|dm|message|chat)\b', re.IGNORECASE)

    def detect_cues(self, transcript_cues: List[Dict[str, Any]], clip_duration: float = 30.0) -> List[Dict[str, Any]]:
        """
        Scans timed cues and outputs a scheduled manifest of bespoke motion assets.
        Ensures assets are paced naturally (spacing >= 3.0s between events).
        """
        detected_cues = []
        last_cue_time = -4.0 # Enforce minimum 3.5s cooldown between visual popups

        # 1. Initial Hook Banner Cue (Always starts at t = 0.0s)
        detected_cues.append({
            "id": "cue_hook_0",
            "type": "kinetic_hook",
            "start": 0.0,
            "duration": min(3.5, clip_duration),
            "position": "top-center",
            "sfx": "whoosh"
        })
        last_cue_time = 3.5

        # 2. Lower-third speaker intro (Paced at t = 4.0s - 7.5s if clip is > 10s)
        if clip_duration >= 10.0:
            detected_cues.append({
                "id": "cue_lower_third_1",
                "type": "lower_third",
                "start": 4.0,
                "duration": 3.8,
                "position": "bottom-left",
                "sfx": "pop"
            })
            last_cue_time = 7.8

        # 3. Semantic keyword inspection across dialogue cues
        position_toggle = "floating-right"

        for cue in transcript_cues:
            start_t = float(cue.get("start", 0.0))
            end_t = float(cue.get("end", start_t + 2.0))
            text = cue.get("text", "").strip()
            if not text:
                continue

            # Respect minimum pacing gap so the screen isn't overwhelmed
            if start_t - last_cue_time < 3.2:
                continue

            # Check: Warning / Trap
            if self.warning_pattern.search(text):
                detected_cues.append({
                    "id": f"cue_warn_{len(detected_cues)}",
                    "type": "warning_stamp",
                    "start": round(start_t, 2),
                    "duration": 3.0,
                    "position": "upper-center",
                    "sfx": "scratch",
                    "headline": text.upper()[:36]
                })
                last_cue_time = start_t + 3.0
                continue

            # Check: Scripture / Wisdom
            if self.scripture_pattern.search(text):
                detected_cues.append({
                    "id": f"cue_scripture_{len(detected_cues)}",
                    "type": "scripture_plaque",
                    "start": round(start_t, 2),
                    "duration": 4.0,
                    "position": "upper-center",
                    "sfx": "chime",
                    "reference": "DIVINE INSIGHT",
                    "text": text[:64]
                })
                last_cue_time = start_t + 4.0
                continue

            # Check: Math / Logic / Calculation
            if self.math_pattern.search(text):
                detected_cues.append({
                    "id": f"cue_math_{len(detected_cues)}",
                    "type": "conceptual_math",
                    "start": round(start_t, 2),
                    "duration": 3.2,
                    "position": "floating-left",
                    "sfx": "scratch",
                    "formula": "dy / dx = ?",
                    "subtext": "Math is not mathing"
                })
                last_cue_time = start_t + 3.2
                continue

            # Check: Brand / App mentions
            brand_matches = self.brands_pattern.findall(text)
            if brand_matches:
                unique_brands = list(dict.fromkeys([b.capitalize() for b in brand_matches]))
                detected_cues.append({
                    "id": f"cue_brand_{len(detected_cues)}",
                    "type": "brand_stickers",
                    "start": round(start_t, 2),
                    "duration": 3.0,
                    "position": "upper-center",
                    "sfx": "whoosh",
                    "brands": unique_brands
                })
                last_cue_time = start_t + 3.0
                continue

            # Check: Chat / Messages / DMs
            if self.message_pattern.search(text):
                detected_cues.append({
                    "id": f"cue_chat_{len(detected_cues)}",
                    "type": "chat_bubble",
                    "start": round(start_t, 2),
                    "duration": 3.5,
                    "position": position_toggle,
                    "sfx": "pop",
                    "sender": "Friend",
                    "text": text[:55],
                    "platform": "whatsapp"
                })
                position_toggle = "floating-left" if position_toggle == "floating-right" else "floating-right"
                last_cue_time = start_t + 3.5
                continue

            # Check: Money / Spoken Currency
            num_match = self.money_pattern.search(text)
            if num_match:
                matched_str = num_match.group(0).strip()
                currency_sym = "₦" if ("naira" in text.lower() or "₦" in matched_str) else "$"
                amt = re.sub(r'[^\d,kKMmbB]', '', matched_str)
                if amt:
                    detected_cues.append({
                        "id": f"cue_money_{len(detected_cues)}",
                        "type": "currency_badge",
                        "start": round(start_t, 2),
                        "duration": 3.0,
                        "position": "floating-right",
                        "sfx": "kaching",
                        "currency": currency_sym,
                        "amount": amt,
                        "label": "VALUE & METRIC"
                    })
                    last_cue_time = start_t + 3.0
                    continue

        # 4. Outro Call-To-Action (Last 4 seconds if clip > 18s)
        if clip_duration >= 18.0:
            detected_cues.append({
                "id": f"cue_outro_{len(detected_cues)}",
                "type": "outro_cta",
                "start": max(0.0, clip_duration - 4.2),
                "duration": 3.8,
                "position": "bottom-center",
                "sfx": "pop"
            })

        return detected_cues
