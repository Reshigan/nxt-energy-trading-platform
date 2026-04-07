import React, { useEffect, useState, useRef } from 'react';

interface SemiGaugeProps {
  value: number;        // 0-100
  label: string;
  sublabel?: string;
  accentHex: string;
  size?: number;
}

export default function SemiGauge({ value, label, sublabel, accentHex, size = 220 }: SemiGaugeProps) {
  const [animated, setAnimated] = useState(false);
  const [counter, setCounter] = useState(0);
  const rafRef = useRef<number>();

  const r = (size - 24) / 2;
  const circumference = Math.PI * r;
  const target = circumference - (value / 100) * circumference;

  useEffect(() => {
    setAnimated(false);
    setCounter(0);
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const duration = 1400;
    const ease = (t: number) => {
      // cubic-bezier(0.16,1,0.3,1) approximation
      return 1 - Math.pow(1 - t, 3);
    };
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCounter(Math.round(ease(p) * value));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [animated, value]);

  const cx = size / 2;
  const cy = size / 2 + 10;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
          className="text-slate-200 dark:text-slate-700/50"
        />
        {/* Active arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={accentHex} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? target : circumference}
          style={{
            transition: animated ? `stroke-dashoffset 1400ms cubic-bezier(0.16,1,0.3,1)` : 'none',
            filter: `drop-shadow(0 0 8px ${accentHex}40)`,
          }}
        />
        {/* Glow dots at start and end */}
        {animated && (
          <>
            <circle cx={cx - r} cy={cy} r="6" fill={accentHex} opacity="0.3"
              style={{ animation: 'gaugeDotPop 400ms ease 200ms both' }} />
          </>
        )}
      </svg>
      <div className="text-center -mt-4">
        <span className="text-4xl font-extrabold tracking-tight mono" style={{ color: accentHex }}>{counter}</span>
        <span className="text-lg font-bold text-slate-400 dark:text-slate-500 ml-0.5">%</span>
      </div>
      <div className="text-center mt-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        {sublabel && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
