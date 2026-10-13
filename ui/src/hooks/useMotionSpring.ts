import { useEffect, useState, useRef } from 'react';
import { Spring, Springs } from '../lib/motion';

/**
 * A hook to manage a deterministic spring animation driven by a value that changes over time.
 * In a pure deterministic environment, we wouldn't use requestAnimationFrame, but to bridge
 * the gap between React state and the `seek(t)` contract, this hook provides a way to
 * smoothly interpolate to a target value using the provided Spring physics.
 */
export function useMotionSpring(targetValue: number, spring: Spring = Springs.snappy) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const targetRef = useRef(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetRef.current !== targetValue) {
      startValueRef.current = currentValue;
      targetRef.current = targetValue;
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        if (startTimeRef.current === null) return;

        // Calculate dt in seconds
        const dt = (time - startTimeRef.current) / 1000;
        const progress = spring.evaluate(dt);

        const newValue = startValueRef.current + (targetRef.current - startValueRef.current) * progress;
        setCurrentValue(newValue);

        // Stop animating when we're close enough and velocity is near zero
        // This is a simplified check; closed-form springs technically never fully stop,
        // they just get infinitely close. We'll cut it off after a reasonable duration
        // based on damping/stiffness, or a fixed threshold.
        // A simple heuristic: cut off after 2 seconds or if progress is extremely close to 1.
        if (dt < 2.0 && Math.abs(progress - 1) > 0.001) {
          requestRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentValue(targetRef.current);
          requestRef.current = null;
        }
      };

      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  // Do not include currentValue in the dependency array to prevent the effect from
  // re-running and cancelling the animation frame on every state update.
  }, [targetValue, spring]); // Removed currentValue

  return currentValue;
}
