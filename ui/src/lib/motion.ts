export class Spring {
  mass: number;
  stiffness: number;
  damping: number;
  w0: number;
  zeta: number;
  wd: number;

  constructor({ mass = 1.0, stiffness = 180.0, damping = 12.0 } = {}) {
    this.mass = mass;
    this.stiffness = stiffness;
    this.damping = damping;
    this.w0 = Math.sqrt(this.stiffness / this.mass);
    this.zeta = this.damping / (2 * Math.sqrt(this.stiffness * this.mass));
    this.wd = this.zeta < 1.0 ? this.w0 * Math.sqrt(1.0 - this.zeta * this.zeta) : 0;
  }

  evaluate(dt: number) {
    if (dt <= 0) return 0.0;
    if (this.zeta < 1.0) {
      // Underdamped: provides natural bounce and physical overshoot
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

export const Springs = {
  snappy: new Spring({ mass: 0.8, stiffness: 260, damping: 20 }),
  bouncy: new Spring({ mass: 1.0, stiffness: 180, damping: 10 }),
  gentle: new Spring({ mass: 1.4, stiffness: 85, damping: 15 }),
  heavy: new Spring({ mass: 2.2, stiffness: 110, damping: 22 }),
  elastic: new Spring({ mass: 0.55, stiffness: 340, damping: 11 })
};

export interface Keyframe {
  time: number;
  value: number;
}

export function track(t: number, keyframes: Keyframe[], spring = Springs.snappy) {
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

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(min: number, max: number, value: number) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}
