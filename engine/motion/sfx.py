import os
import math
import wave
import struct
import numpy as np
from pathlib import Path

SFX_DIR = Path(__file__).resolve().parent / "sfx"
SFX_DIR.mkdir(parents=True, exist_ok=True)

def write_wav(filename: Path, samples: np.ndarray, sample_rate: int = 44100):
    """Writes a float numpy array [-1.0, 1.0] to a 16-bit PCM WAV file with headroom normalization."""
    peak = np.max(np.abs(samples))
    if peak > 0:
        samples = (samples / peak) * 0.85
    int_samples = (samples * 32767).astype(np.int16)

    with wave.open(str(filename), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_samples.tobytes())

def generate_pencil_scribble():
    """
    Generates an authentic acoustic pencil/graphite paper scribble.
    Models the multi-stroke friction of cursive writing on bond paper:
    gritty bandpassed texture (1200-4800Hz) modulated across 3 rapid cursive loops.
    """
    sr = 44100
    duration = 0.42
    t = np.linspace(0, duration, int(sr * duration), False)
    
    # 3 distinct cursive writing micro-strokes
    stroke_env = (
        0.8 * np.exp(-((t - 0.08) ** 2) / 0.0015) +
        0.9 * np.exp(-((t - 0.20) ** 2) / 0.0020) +
        0.7 * np.exp(-((t - 0.32) ** 2) / 0.0018)
    )
    
    # Texture: Granular noise filtered around graphite frequencies
    noise = np.random.uniform(-1, 1, len(t))
    # Add subtle high-frequency paper tooth (grain)
    grain = np.sin(2 * np.pi * 3200 * t + np.random.uniform(-0.5, 0.5, len(t))) * 0.3
    # Low desk resonance
    desk = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 8) * 0.15
    
    samples = (noise * 0.65 + grain * 0.35 + desk) * stroke_env
    write_wav(SFX_DIR / "pencil_scribble.wav", samples, sr)

def generate_marker_squeak():
    """
    Generates a realistic felt-tip highlighter glide on paper.
    Features wet felt friction with a subtle characteristic squeak whistle.
    """
    sr = 44100
    duration = 0.35
    t = np.linspace(0, duration, int(sr * duration), False)
    
    # Envelope: steady swipe with soft attack and quick release
    envelope = np.sin(np.pi * np.clip(t / duration, 0, 1)) ** 1.5
    
    # Felt friction noise
    noise = np.random.uniform(-1, 1, len(t))
    # Subtle friction squeak at 2600Hz modulated by pressure
    squeak_freq = 2600 + 400 * np.sin(2 * np.pi * 14 * t)
    squeak = np.sin(2 * np.pi * np.cumsum(squeak_freq) / sr) * 0.25
    
    samples = (noise * 0.70 + squeak * 0.30) * envelope
    write_wav(SFX_DIR / "marker_squeak.wav", samples, sr)

def generate_keyboard_click():
    """
    Generates a crisp mechanical keyboard switch click (Cherry MX Blue/Brown).
    Combines sharp micro-transient click with plastic keycap bottom-out.
    """
    sr = 44100
    duration = 0.09
    t = np.linspace(0, duration, int(sr * duration), False)
    
    # Sharp click transient (3800Hz decaying in 8ms)
    click = np.sin(2 * np.pi * 3800 * t) * np.exp(-t * 220)
    # Keycap bottom-out housing resonance (680Hz decaying in 35ms)
    bottom = np.sin(2 * np.pi * 680 * t) * np.exp(-t * 65)
    # Micro noise burst
    noise = np.random.uniform(-0.5, 0.5, len(t)) * np.exp(-t * 180)
    
    samples = click * 0.55 + bottom * 0.35 + noise * 0.20
    write_wav(SFX_DIR / "keyboard_click.wav", samples, sr)

def generate_keyboard_thock():
    """
    Generates a deep, lubed mechanical keyboard 'thock' (Spacebar / Enter).
    Low-frequency wooden-plastic acoustic resonance.
    """
    sr = 44100
    duration = 0.12
    t = np.linspace(0, duration, int(sr * duration), False)
    
    thock = np.sin(2 * np.pi * 320 * t) * np.exp(-t * 40)
    sub = np.sin(2 * np.pi * 160 * t) * np.exp(-t * 30) * 0.4
    click = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 190) * 0.3
    
    samples = thock * 0.6 + sub * 0.3 + click * 0.2
    write_wav(SFX_DIR / "keyboard_thock.wav", samples, sr)

def generate_paper_slide():
    """
    Generates a soft, smooth parchment / heavy paper card sliding onto a desk.
    """
    sr = 44100
    duration = 0.32
    t = np.linspace(0, duration, int(sr * duration), False)
    
    envelope = np.sin(np.pi * (t / duration)) ** 2
    # Filtered friction
    noise = np.random.uniform(-1, 1, len(t))
    # Low friction body
    body = np.sin(2 * np.pi * 450 * t) * 0.15
    samples = (noise * 0.8 + body) * envelope
    write_wav(SFX_DIR / "paper_slide.wav", samples, sr)

def generate_warm_chime():
    """
    Generates an ethereal sacred glass chime for divine principles & scriptures.
    Harmonic triad: C6 (1046Hz), E6 (1318Hz), G6 (1568Hz), B6 (1975Hz).
    """
    sr = 44100
    duration = 0.90
    t = np.linspace(0, duration, int(sr * duration), False)
    
    c6 = 0.45 * np.sin(2 * np.pi * 1046.50 * t) * np.exp(-t * 4.5)
    e6 = 0.35 * np.sin(2 * np.pi * 1318.51 * t) * np.exp(-t * 5.0)
    g6 = 0.25 * np.sin(2 * np.pi * 1567.98 * t) * np.exp(-t * 5.5)
    b6 = 0.15 * np.sin(2 * np.pi * 1975.53 * t) * np.exp(-t * 6.5)
    
    samples = c6 + e6 + g6 + b6
    write_wav(SFX_DIR / "warm_chime.wav", samples, sr)

def generate_sub_thud():
    """
    Generates a deep 48Hz cinematic sub-bass thud for gravity & truth impact.
    """
    sr = 44100
    duration = 0.55
    t = np.linspace(0, duration, int(sr * duration), False)
    
    pitch = 55 * np.exp(-t * 3.5) + 38
    phase = 2 * np.pi * np.cumsum(pitch) / sr
    env = np.exp(-t * 6.0)
    
    samples = np.sin(phase) * env
    write_wav(SFX_DIR / "sub_thud.wav", samples, sr)

def generate_red_scratch():
    """
    Generates a rapid pencil / marker strikeout scratch for crossing out misconceptions.
    """
    sr = 44100
    duration = 0.24
    t = np.linspace(0, duration, int(sr * duration), False)
    
    # 2 quick sharp scratches
    burst = 0.8 * np.exp(-((t - 0.05) ** 2) / 0.001) + 0.9 * np.exp(-((t - 0.15) ** 2) / 0.001)
    noise = np.random.uniform(-1, 1, len(t))
    samples = noise * burst
    write_wav(SFX_DIR / "red_scratch.wav", samples, sr)

def generate_bubble_pop():
    """Generates a pleasant, round bubble pop sound for UI stickers."""
    sr = 44100
    duration = 0.12
    t = np.linspace(0, duration, int(sr * duration), False)
    freq = 300 + 900 * np.exp(-t * 45)
    phase = 2 * np.pi * np.cumsum(freq) / sr
    envelope = np.exp(-t * 35)
    samples = np.sin(phase) * envelope
    write_wav(SFX_DIR / "pop.wav", samples, sr)

def generate_whoosh():
    """Generates a smooth aerodynamic whoosh."""
    sr = 44100
    duration = 0.28
    t = np.linspace(0, duration, int(sr * duration), False)
    noise = np.random.uniform(-1, 1, len(t))
    envelope = np.sin(np.pi * (t / duration)) ** 2
    sweep_freq = 250 + 550 * np.sin(np.pi * (t / duration))
    sweep = np.sin(2 * np.pi * np.cumsum(sweep_freq) / sr)
    samples = (0.7 * noise + 0.3 * sweep) * envelope
    write_wav(SFX_DIR / "whoosh.wav", samples, sr)

def generate_fast_whip_whoosh():
    """Generates a high-velocity aerodynamic whip-whoosh for kinetic hook entrances."""
    sr = 44100
    duration = 0.22
    t = np.linspace(0, duration, int(sr * duration), False)
    noise = np.random.uniform(-1, 1, len(t))
    envelope = np.sin(np.pi * (t / duration)) ** 3.5
    sweep_freq = 950 * np.exp(-t * 9.0) + 180
    sweep = np.sin(2 * np.pi * np.cumsum(sweep_freq) / sr)
    samples = (0.75 * noise + 0.25 * sweep) * envelope
    write_wav(SFX_DIR / "fast_whip_whoosh.wav", samples, sr)

def generate_paper_tear():
    """Generates a crisp, sharp paper/parchment tear for collage card reveals."""
    sr = 44100
    duration = 0.30
    t = np.linspace(0, duration, int(sr * duration), False)
    # Dual-stage tearing friction envelope
    env = 0.7 * np.exp(-((t - 0.06) ** 2) / 0.0012) + 0.9 * np.exp(-((t - 0.16) ** 2) / 0.0022)
    noise = np.random.uniform(-1, 1, len(t))
    grain = np.sin(2 * np.pi * 3800 * t + np.random.uniform(-0.6, 0.6, len(t))) * 0.35
    samples = (noise * 0.75 + grain) * env
    write_wav(SFX_DIR / "paper_tear.wav", samples, sr)

def generate_camera_shutter():
    """Generates a crisp DSLR dual-blade click + mirror slap for polaroids and freeze-frames."""
    sr = 44100
    duration = 0.24
    t = np.linspace(0, duration, int(sr * duration), False)
    blade1 = np.sin(2 * np.pi * 3400 * t) * np.exp(-t * 260)
    blade2 = np.sin(2 * np.pi * 2800 * (t - 0.06)) * np.exp(-(t - 0.06) * 180) * (t >= 0.06)
    mirror = np.sin(2 * np.pi * 420 * (t - 0.11)) * np.exp(-(t - 0.11) * 45) * (t >= 0.11) * 0.45
    noise = np.random.uniform(-0.5, 0.5, len(t)) * (np.exp(-t * 160) + np.exp(-(t - 0.06) * 140) * (t >= 0.06))
    samples = blade1 * 0.4 + blade2 * 0.4 + mirror + noise * 0.2
    write_wav(SFX_DIR / "camera_shutter.wav", samples, sr)

def generate_stamp_thump():
    """Generates a heavy rubber stamp dull impact with wooden housing resonance."""
    sr = 44100
    duration = 0.32
    t = np.linspace(0, duration, int(sr * duration), False)
    # Dull rubber impact
    thud = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 28)
    # Wood handle resonance
    wood = np.sin(2 * np.pi * 480 * t) * np.exp(-t * 60) * 0.4
    # Friction burst
    noise = np.random.uniform(-0.6, 0.6, len(t)) * np.exp(-t * 110) * 0.3
    samples = thud * 0.6 + wood + noise
    write_wav(SFX_DIR / "stamp_thump.wav", samples, sr)

def generate_pencil_scribble():
    """Generates a textured tactile pencil/graphite scribble on heavy cardstock."""
    sr = 44100
    duration = 0.28
    t = np.linspace(0, duration, int(sr * duration), False)
    # Triple-stroke friction envelope
    env = (
        0.75 * np.exp(-((t - 0.05) ** 2) / 0.0008) +
        0.85 * np.exp(-((t - 0.13) ** 2) / 0.0009) +
        0.90 * np.exp(-((t - 0.21) ** 2) / 0.0010)
    )
    noise = np.random.uniform(-1, 1, len(t))
    tip_resonance = np.sin(2 * np.pi * 3200 * t) * 0.25
    samples = (noise * 0.8 + tip_resonance) * env
    write_wav(SFX_DIR / "pencil_scribble.wav", samples, sr)

def generate_marker_squeak():
    """Generates a fluorescent chisel-tip highlighter squeak with friction sweep."""
    sr = 44100
    duration = 0.22
    t = np.linspace(0, duration, int(sr * duration), False)
    # Friction resonance with chirp modulation
    chirp = 1900 + 700 * np.sin(2 * np.pi * 14 * t)
    phase = 2 * np.pi * np.cumsum(chirp) / sr
    tone = np.sin(phase) * 0.45
    noise = np.random.uniform(-0.5, 0.5, len(t)) * 0.3
    envelope = np.sin(np.pi * (t / duration)) ** 1.8
    samples = (tone + noise) * envelope
    write_wav(SFX_DIR / "marker_squeak.wav", samples, sr)

def ensure_sfx_library():
    """Builds all procedural sound effects."""
    generators = {
        "pencil_scribble.wav": generate_pencil_scribble,
        "marker_squeak.wav": generate_marker_squeak,
        "keyboard_click.wav": generate_keyboard_click,
        "keyboard_thock.wav": generate_keyboard_thock,
        "paper_slide.wav": generate_paper_slide,
        "paper_tear.wav": generate_paper_tear,
        "camera_shutter.wav": generate_camera_shutter,
        "stamp_thump.wav": generate_stamp_thump,
        "warm_chime.wav": generate_warm_chime,
        "sub_thud.wav": generate_sub_thud,
        "red_scratch.wav": generate_red_scratch,
        "pop.wav": generate_bubble_pop,
        "whoosh.wav": generate_whoosh,
        "fast_whip_whoosh.wav": generate_fast_whip_whoosh,
    }
    for filename, gen_fn in generators.items():
        gen_fn()
    return SFX_DIR

if __name__ == "__main__":
    ensure_sfx_library()
    print(f"Generated comprehensive tactile SFX library in: {SFX_DIR}")


