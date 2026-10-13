import sys
from pathlib import Path

# Add project root
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

from engine.motion.pipeline import DynamicMotionPipeline

cues = [
    {
        "id": "h0",
        "type": "kinetic_hook",
        "start": 0.0,
        "duration": 3.5,
        "position": "pos-top-center",
        "headline": "WHY PURPOSE PRECEDES PROVISION IN LIFE",
        "highlightWord": "PURPOSE",
        "sfx": "whoosh"
    },
    {
        "id": "lt1",
        "type": "lower_third",
        "start": 4.0,
        "duration": 3.8,
        "position": "pos-bottom-left",
        "speaker": "Pastor Bankie",
        "topic": "Divine Foundation",
        "sfx": "pop"
    },
    {
        "id": "chat2",
        "type": "chat_bubble",
        "start": 9.0,
        "duration": 3.5,
        "position": "pos-floating-right",
        "sender": "Ella",
        "text": "I'll give you 5k for every kg gained",
        "platform": "whatsapp",
        "sfx": "pop"
    },
    {
        "id": "money3",
        "type": "currency_badge",
        "start": 14.0,
        "duration": 3.5,
        "position": "pos-floating-left",
        "currency": "₦",
        "amount": "30,000",
        "label": "DIVINE PROVISION",
        "sfx": "kaching"
    },
    {
        "id": "brand4",
        "type": "brand_stickers",
        "start": 19.0,
        "duration": 3.2,
        "position": "pos-upper-center",
        "brands": ["Bolt", "inDrive"],
        "sfx": "whoosh"
    },
    {
        "id": "math5",
        "type": "conceptual_math",
        "start": 23.0,
        "duration": 3.2,
        "position": "pos-floating-right",
        "formula": "dy / dx = ?",
        "subtext": "Math is not mathing",
        "sfx": "scratch"
    },
    {
        "id": "outro6",
        "type": "outro_cta",
        "start": 26.5,
        "duration": 3.5,
        "position": "pos-bottom-center",
        "handle": "FOLLOW @PASTORBANKIE",
        "sfx": "pop"
    }
]

pipe = DynamicMotionPipeline()
pipe.process_clip(
    video_path="clips/Clip1_Discover_Calling.mp4",
    output_path="clips/Clip1_Full_Bespoke_Motion.mp4",
    custom_cues=cues
)
print("Finished rendering Clip1_Full_Bespoke_Motion.mp4 successfully!")
