---
name: motion-studio
description: Build studio-grade motion graphics, kinetic typography hook intros, UI morphs, and product showreels using pure code, closed-form springs, and deterministic frame rendering.
---

# Motion Studio Skill for Antigravity

Use this skill to design, preview, and render studio-grade motion graphics directly in code for video clips, social shorts, product demos, and narrative explainers.

## Core Directives

1. **The `window.seek(t)` Law**:
   - Animations must be pure mathematical functions of time $t$.
   - Never use `requestAnimationFrame`, `setTimeout`, `setInterval`, or CSS animations/transitions.
   - All state must be calculated deterministically based on input timestamp `t` (in seconds).

2. **Closed-Form Physics (`motion.js`)**:
   - Every movement must use closed-form damped harmonic oscillator springs (`evaluate(dt)`).
   - Use `track(t, keyframes, spring)` for scalar state tracking across multiple targets.

3. **Motion Presets**:
   - `Springs.snappy` (mass: 0.8, stiffness: 240, damping: 18): Fast UI elements, badges, pills.
   - `Springs.bouncy` (mass: 1.0, stiffness: 160, damping: 10): Playful pops, icons, attention callouts.
   - `Springs.gentle` (mass: 1.2, stiffness: 90, damping: 14): Slow container expansions, camera shifts.
   - `Springs.elastic` (mass: 0.6, stiffness: 320, damping: 12): Kinetic typography word punch.

4. **Visual Design Standards**:
   - Canvas/DOM resolution: 1080x1920 (9:16 vertical shorts) or 1920x1080 (16:9 landscape).
   - Modern glassmorphism with high contrast: dark semi-transparent backdrops (`rgba(10, 14, 22, 0.85)`), hairline borders (`1px solid rgba(255, 255, 255, 0.12)`), subtle blur (`backdrop-filter: blur(16px)`).
   - High-contrast typography: Segment-leading punch words highlighted in vibrant neon cyan (`#00F5FF`), acid yellow (`#FACC15`), or warm gold (`#EAB308`).
   - Clean safe-zone alignment: Keep critical visual information within vertical mobile safe margins (top margin $\ge 140\text{px}$, bottom margin $\ge 380\text{px}$).

## Workflow

1. **Design**: Build or adapt an HTML5 motion template in `engine/motion/templates/`.
2. **Preview**: Open the HTML file in a local browser or Antigravity browser subagent and scrub with the interactive timeline slider.
3. **Render**: Use `engine/motion/overlay.py` or Playwright to render transparent PNG frame sequences or ProRes 4444 video with alpha.
4. **Composite**: Overlay onto clips via FFmpeg using hardware-accelerated video filters.
