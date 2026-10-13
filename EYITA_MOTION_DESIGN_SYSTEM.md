# Eyita: Code-Driven Motion Design Knowledge Base
*From Generative AI Slop to Deterministic, Studio-Grade Code Motion*

---

## 1. Executive Summary & Philosophy

Most AI-generated videos suffer from the "generative slop" trap:
- Hallucinated text and deformed hands from diffusion video models.
- Static Midjourney/Flux images with slow Ken Burns zoom pans.
- Generic, centered cards fading into blurry gradient backgrounds.
- Zero frame-level timing precision or sync with narrative beats.

**Eyita's Paradigm Shift**: **Motion Graphics as Pure Functions of Time in Code.**
Instead of prompting an image diffusion model to generate disconnected static slides, Eyita renders **deterministic, vector-sharp, 60fps animations** built with HTML5, Canvas 2D/WebGL, and SVG, orchestrated by closed-form physics equations and rendered headlessly via Chromium and FFmpeg.

### The Core Virtues of Code-Driven Motion in Eyita:
1. **Mathematical Determinism**: Render frame 142 at $t = 2.366\text{s}$ a thousand times on any machine, and every single pixel will be identical.
2. **Sub-second Iteration**: Changing a title, color token, layout dimension, or animation duration takes milliseconds in code without re-rolling diffusion seeds.
3. **Infinite Resolution & 60fps Crispness**: Typography, UI mockups, icons, and diagrams stay vector-sharp at 1080p, 4K, or 8K without video compression artifacts or diffusion blur.
4. **Physical Realism via Closed-Form Springs**: No robotic CSS linear easings. All motion is governed by damped harmonic oscillators with mass, stiffness, and damping.
5. **Continuous Spatial Coherence ("OneTake")**: No jarring jump cuts. A single container smoothly expands, morphs, re-arranges, and transitions its internal elements throughout the entire story.

---

## 2. The Architectural Law: The Deterministic `seek(t)` Contract

Every motion template in Eyita must obey one non-negotiable architectural contract:

```javascript
window.seek = function(t) {
  // Pure mathematical evaluation of the entire scene at timestamp t (in seconds)
  // 1. Compute spring / physics states at t
  // 2. Update layout coordinates and transforms
  // 3. Render canvas / update DOM
};
```

### The Iron Rules:
- ❌ **STRICTLY BANNED**:
  - `requestAnimationFrame` (non-deterministic, frame-rate dependent)
  - `setTimeout` / `setInterval`
  - CSS Transitions (`transition: all 0.3s ease`)
  - CSS Animations (`animation: spin 1s infinite`)
  - Unseeded `Math.random()` (use a deterministic PRNG seeded by state index)
  - Network requests during animation playback
-  **REQUIRED**:
  - All visual state is a pure mathematical function: $\text{VisualState} = f(t)$.
  - Any frame can be evaluated in $O(1)$ random access by calling `window.seek(t)`.
  - Global variable `window.TOTAL_DURATION` exposes the exact clip duration in seconds.

---

## 3. The 5 Core Motion Design Engines

### Engine 1: OneTake Continuous Morphing Container
*Inspired by `onetake` (`github.com/feitangyuan/onetake`)*
- **Concept**: Instead of cutting between disparate slides, the entire story unfolds inside a **living container** that never leaves the screen.
- **Mechanics**:
  - The container morphs its `width`, `height`, `border-radius`, and `background-color` between predetermined States.
  - As the container resizes, child elements exit with an overshoot spring, the container interpolates, and the incoming state elements spring into place with staggered delays.
  - A subtle 4–8px backdrop blur and soft directional glow maintains visual depth.

### Engine 2: Kinetic Typography & Word Stagger
*Inspired by `HeyGen Hyperframes` (`hyperframes.heygen.com`)*
- **Concept**: Text is not static subtitle text; it is an active narrative character.
- **Mechanics**:
  - Text is split into words or characters.
  - Each word $i$ has an activation timestamp $t_{\text{start}} = t_0 + i \times \text{stagger}$.
  - Words enter via vertical translation ($+24\text{px} \to 0\text{px}$) + scale ($0.85 \to 1.0$) driven by a snappy damped spring.
  - Active spoken keywords pulse with high-contrast accent color (e.g. Electric Cyan `#00F5FF` or Acid Gold `#FACC15`) and soft bloom.

### Engine 3: Procedural Paper / Cutout Stop-Motion
*Inspired by `Paper/Collage Animation Engine`*
- **Concept**: Organic, tactile, editorial aesthetic for storytelling, essays, and historical/philosophical explainers.
- **Mechanics**:
  - Physics runs smoothly at 60fps, but visual coordinates are quantized to 12fps or 15fps (`t_quantized = Math.floor(t * 12) / 12`).
  - Procedural paper grain overlay with Perlin noise / SVG turbulence filters.
  - Subtle random rotation jitter ($\pm 1.5^\circ$) that steps on every quantized frame, giving authentic handmade stop-motion texture.

### Engine 4: p5.js / Brush Generative Illustration
*Inspired by `ClaudeAnimationBase` (`github.com/JohnHeibel/ClaudeAnimationBase`)*
- **Concept**: Hand-drawn, expressive sketch and charcoal illustration for character acting and metaphorical visual storytelling.
- **Mechanics**:
  - Deterministic p5.js canvas where strokes are drawn using parametric curves: $P(u) = (1-u)^3 P_0 + 3(1-u)^2 u P_1 + 3(1-u) u^2 P_2 + u^3 P_3$.
  - Stroke reveal progress $u(t) = \text{clamp}\left(\frac{t - t_0}{\text{duration}}, 0, 1\right)$.
  - Textured brush tips render deterministic bristled strokes without temporal flicker.

### Engine 5: Procedural UI & Concept Visualizer
*Inspired by `Lemo-Opuscar` (`github.com/lemomo-ai/lemo-opuscar`)*
- **Concept**: Visualizing complex software architecture, finance charts, AI agent graphs, database schemas, and data pipelines.
- **Mechanics**:
  - Nodes and edges represented as SVG paths with dynamic `stroke-dashoffset` driven by springs.
  - Live metric counters that smoothly tick numbers up using exponential ease-out.
  - Glowing laser pulses traveling along circuit/network edges synchronized to narration points.

---

## 4. The Core Mathematics: Closed-Form Damped Springs (`motion.js`)

In traditional animation, springs require iterative numerical integration (`Euler` or `Runge-Kutta`), which breaks random seeking.
Eyita uses the **analytical closed-form solution of the second-order damped harmonic oscillator differential equation**:

$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

For an underdamped spring ($\zeta < 1$):
$$\omega_0 = \sqrt{\frac{k}{m}}, \quad \zeta = \frac{c}{2\sqrt{m k}}, \quad \omega_d = \omega_0 \sqrt{1 - \zeta^2}$$
$$x(t) = 1 - e^{-\zeta \omega_0 t} \left[ \cos(\omega_d t) + \frac{\zeta \omega_0}{\omega_d} \sin(\omega_d t) \right]$$

### Production JavaScript Implementation (`motion.js`):

```javascript
/**
 * Eyita Motion Physics Library
 * Closed-form analytical spring & track solver for deterministic seek(t).
 */

export class Spring {
  constructor({ mass = 1.0, stiffness = 180.0, damping = 12.0 } = {}) {
    this.mass = mass;
    this.stiffness = stiffness;
    this.damping = damping;
    this.w0 = Math.sqrt(this.stiffness / this.mass);
    this.zeta = this.damping / (2 * Math.sqrt(this.stiffness * this.mass));
    this.wd = this.zeta < 1.0 ? this.w0 * Math.sqrt(1.0 - this.zeta * this.zeta) : 0;
  }

  /**
   * Evaluates normalized spring position [0 -> 1] at elapsed time dt (seconds).
   */
  evaluate(dt) {
    if (dt <= 0) return 0.0;
    if (this.zeta < 1.0) {
      // Underdamped (natural bounce / overshoot)
      const envelope = Math.exp(-this.zeta * this.w0 * dt);
      const cosTerm = Math.cos(this.wd * dt);
      const sinTerm = Math.sin(this.wd * dt);
      return 1.0 - envelope * (cosTerm + (this.zeta * this.w0 / this.wd) * sinTerm);
    } else {
      // Critically damped or overdamped
      const decay = Math.exp(-this.w0 * dt);
      return 1.0 - decay * (1.0 + this.w0 * dt);
    }
  }
}

// Pre-tuned spring presets for rapid composition
export const Springs = {
  snappy: new Spring({ mass: 0.8, stiffness: 240, damping: 18 }),   // UI morphs, toggles
  bouncy: new Spring({ mass: 1.0, stiffness: 160, damping: 10 }),   // Badges, callouts, emojis
  gentle: new Spring({ mass: 1.2, stiffness: 90, damping: 14 }),    // Background shifts, camera pans
  heavy: new Spring({ mass: 2.0, stiffness: 120, damping: 20 }),    // Heavy cards, full view switches
  elastic: new Spring({ mass: 0.6, stiffness: 320, damping: 12 })   // Kinetic typography pops
};

/**
 * Tracks a scalar value through multiple keyframed target steps.
 * Enables O(1) deterministic random-access seeking with stacked spring impulses.
 */
export function track(t, keyframes, spring = Springs.snappy) {
  if (!keyframes || keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  let current = keyframes[0].value;
  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1];
    const curr = keyframes[i];
    if (t < curr.time) break;

    const dt = t - curr.time;
    const progress = spring.evaluate(dt);
    const delta = curr.value - prev.value;
    current += delta * progress;
  }
  return current;
}

export function lerp(a, b, factor) {
  return a + (b - a) * factor;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(min, max, value) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}
```

---

## 5. Audio-Visual Synchronization Pipeline (`beats.py`)

Visual motion feels disconnected and cheap unless it hits the auditory nervous system precisely on the beat.

### The Beat-Grid Architecture:
1. **Audio Ingestion**: Eyita ingests the narration track and background music stem.
2. **Feature Extraction (`beats.py`)**:
   - Computes global BPM and beat timestamps using `librosa.beat.beat_track`.
   - Identifies downbeats (Bar 1, Bar 2, Bar 3) for major layout state transitions.
   - Computes transient onset peaks (`hits`) using spectral flux for kinetic word punches and UI sound effects.
3. **Sound Design Master**:
   - UI mechanical clicks, soft whooshes, and glass pops are triggered precisely on transient timestamps.
   - The entire sound track is mastered using FFmpeg `loudnorm` filter to standard vertical video target: **$-14\text{ LUFS}$** with **$-1.5\text{ dBFS}$** true peak.

### `beats.py` Script Reference:
```python
import librosa
import numpy as np
import json
import sys

def extract_motion_cues(audio_path, output_json):
    y, sr = librosa.load(audio_path, sr=22050)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    
    # Downbeats every 4 beats
    downbeats = beat_times[::4].tolist()
    
    # Onset transient peaks for SFX / word hits
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    peaks = librosa.util.peak_pick(onset_env, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
    hit_times = librosa.frames_to_time(peaks, sr=sr).tolist()
    
    result = {
        "bpm": float(tempo[0] if isinstance(tempo, np.ndarray) else tempo),
        "duration": float(len(y) / sr),
        "downbeats": [round(t, 3) for t in downbeats],
        "hits": [round(t, 3) for t in hit_times[:40]]  # Top transient hits
    }
    
    with open(output_json, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Beat grid extracted: {len(downbeats)} downbeats, {len(result['hits'])} hits saved to {output_json}")

if __name__ == "__main__":
    extract_motion_cues(sys.argv[1], sys.argv[2])
```

---

## 6. The Production Headless Renderer (`render.mjs`)

Eyita renders motion HTML templates into final broadcast-quality video using Playwright and FFmpeg with **$4\times$ Temporal Sub-sampling for Optical Motion Blur**.

```
[Template HTML] -> Playwright Headless Chromium -> window.seek(t) at 240fps
                     |
               (Pipe PNG stream via stdin)
                     v
   [FFmpeg] -> tmix (4 frames) -> Decimate to 60fps -> ProRes 422 / H.264 MP4
```

### `render.mjs` Implementation:
```javascript
import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

async function renderMotionVideo({
  htmlPath,
  outputPath,
  fps = 60,
  subsample = 4, // 4x sub-sampling = true optical motion blur
  width = 1080,
  height = 1920
}) {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"]
  });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const fileUrl = "file://" + path.resolve(htmlPath).replace(/\\/g, "/");
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  const duration = await page.evaluate(() => window.TOTAL_DURATION || 5.0);
  const totalRenderFrames = Math.ceil(duration * fps * subsample);
  const dt = 1 / (fps * subsample);

  console.log(`Rendering ${duration}s at ${fps}fps (${subsample}x subsample -> ${totalRenderFrames} frames)`);

  // Spawn FFmpeg piping raw PNG sequence from stdin
  const ffmpegArgs = [
    "-y",
    "-f", "image2pipe",
    "-c:v", "png",
    "-r", `${fps * subsample}`,
    "-i", "-",
    "-vf", `tmix=frames=${subsample}:weights="1 1 1 1",select='eq(mod(n\\,${subsample})\\,${subsample - 1})',setpts=N/${fps}/TB`,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "16",
    "-pix_fmt", "yuv420p",
    outputPath
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, { stdio: ["pipe", "inherit", "inherit"] });

  for (let i = 0; i < totalRenderFrames; i++) {
    const t = i * dt;
    await page.evaluate((time) => window.seek(time), t);
    const screenshotBuffer = await page.screenshot({ type: "png" });
    ffmpeg.stdin.write(screenshotBuffer);
  }

  ffmpeg.stdin.end();
  await new Promise((resolve) => ffmpeg.on("close", resolve));
  await browser.close();
  console.log(`Render complete -> ${outputPath}`);
}
```

---

## 7. The Eyita Agentic Prompting Protocol

When you are in the Eyita repository and want the AI to generate a complete motion design sequence, use this **Director's Prompt Template**:

```markdown
### TASK: Create a OneTake Motion Storytelling Template
- **Format**: 9:16 Vertical (1080x1920) or 16:9 Landscape (1920x1080)
- **Engine**: Pure HTML5/Canvas using `window.seek(t)` contract.
- **Physics**: Analytical closed-form damped springs (`motion.js`).
- **Narrative Script**:
  [PASTE YOUR STORYLINE / VOICEOVER HERE]

### REQUIRED EXECUTION SPEC:
1. **State Sequence**:
   - State 0 (0.0s - 2.5s): Hook question inside a compact glowing badge.
   - State 1 (2.5s - 5.8s): Container morphs to full card; dynamic kinetic typography reveals core insight.
   - State 2 (5.8s - 9.2s): Container splits; left node connects to right node via glowing SVG data cable.
   - State 3 (9.2s - 12.0s): Climax metric / conclusion pop with glowing highlight border.
2. **Visual Standards**:
   - Modern glassmorphism: `#08090D` background, `rgba(255,255,255,0.04)` card fills, `1px solid rgba(255,255,255,0.1)` hairline borders.
   - Typography: Sans-serif modern (Inter / Outfit / Plus Jakarta Sans) with tracking `-0.02em`.
   - Accent palette: High-contrast electric cyan `#00F5FF` + warm acid yellow `#FACC15`.
3. **No External Assets**:
   - Zero remote images or un-embedded fonts. Everything must be self-contained SVG, Canvas 2D, or inline CSS.
4. **Deterministic Hook**:
   - Expose `window.TOTAL_DURATION = 12.0;`
   - Expose `window.seek = function(t) { ... }`
```

---

## 8. The Anti-Pattern Checklist (What Banned Looks Like)

| Amateur "Mid" AI Video | Eyita Studio-Grade Code Motion |
| :--- | :--- |
| Jump cuts between static AI generated photos | Continuous morphing container (`OneTake`) that never leaves screen |
| CSS `ease-in-out` robotic linear slides | Physics-backed damped harmonic oscillator with real momentum & overshoot |
| Generic centered text in default box | Staggered kinetic typography with active word glow and velocity scaling |
| Diffusion model hallucinating weird text | 100% crisp, sub-pixel accurate vector typography and SVG diagrams |
| Random unpredictable output every run | Deterministic `window.seek(t)` contract with frame-perfect repeatability |
| Disconnected audio & visual drift | Beats and transient onset peaks mathematically tied to animation keyframes |
