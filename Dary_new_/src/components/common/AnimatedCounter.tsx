import React, { useState, useEffect, useRef } from 'react';

export interface AnimatedCounterProps {
  value?: number | string | null;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: boolean;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  loadingPlaceholder?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Custom hook to animate a numeric value counting up from 0 (or previous value) to targetValue.
 */
export function useCountUp(
  targetValue: number,
  duration = 1200,
  enabled = true
): number {
  const [current, setCurrent] = useState<number>(0);
  const currentRef = useRef<number>(0);
  const prevTargetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || isNaN(targetValue)) {
      return;
    }

    // Respect user's motion preferences
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCurrent(targetValue);
      currentRef.current = targetValue;
      prevTargetRef.current = targetValue;
      return;
    }

    const startVal = prevTargetRef.current;
    const diff = targetValue - startVal;

    // If already at target value, don't animate
    if (diff === 0) {
      setCurrent(targetValue);
      currentRef.current = targetValue;
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic: fast start with gentle deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + diff * ease;

      setCurrent(nextVal);
      currentRef.current = nextVal;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(targetValue);
        currentRef.current = targetValue;
        prevTargetRef.current = targetValue;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      prevTargetRef.current = currentRef.current;
    };
  }, [targetValue, duration, enabled]);

  return current;
}

/**
 * AnimatedCounter Component
 * Smoothly counts up to the target number upon loading / mount.
 */
export default function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = true,
  className = '',
  style,
  loading = false,
  loadingPlaceholder = '...',
  fallback = '—',
}: AnimatedCounterProps) {
  const isValueValid = value !== null && value !== undefined && value !== '';
  const num = isValueValid
    ? (typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')))
    : 0;
  const isNumValid = isValueValid && !isNaN(num);

  const current = useCountUp(isNumValid ? num : 0, duration, !loading && isNumValid);

  if (loading) {
    return <span className={className} style={style}>{loadingPlaceholder}</span>;
  }

  if (!isNumValid) {
    return <span className={className} style={style}>{fallback}</span>;
  }

  let formatted: string;
  if (decimals === 0) {
    const rounded = Math.round(current);
    formatted = separator ? rounded.toLocaleString() : String(rounded);
  } else {
    formatted = separator
      ? current.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : current.toFixed(decimals);
  }

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
