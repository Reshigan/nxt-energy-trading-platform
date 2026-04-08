import React from 'react';

interface NXTLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Modern glass-morphism animated NXT Energy logo.
 * Features: layered glass panels, gradient glow, animated pulse ring.
 */
export default function NXTLogo({ size = 40, animated = true, className = '' }: NXTLogoProps) {
  const s = size;
  const half = s / 2;
  const r = s * 0.38;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      {/* Glow ring */}
      {animated && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(99,102,241,0.3), rgba(16,185,129,0.3))',
            filter: 'blur(8px)',
            animation: 'nxtLogoGlow 3s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          {/* Glass background gradient */}
          <linearGradient id="nxt-glass-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0f2847" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a1e3d" stopOpacity="1" />
          </linearGradient>

          {/* Glass highlight */}
          <linearGradient id="nxt-glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="40%" stopColor="white" stopOpacity="0.05" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Bolt gradient */}
          <linearGradient id="nxt-bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* Accent ring gradient */}
          <linearGradient id="nxt-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
          </linearGradient>

          <filter id="nxt-bolt-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base rounded square */}
        <rect
          x="1" y="1"
          width={s - 2} height={s - 2}
          rx={s * 0.22}
          fill="url(#nxt-glass-bg)"
          stroke="url(#nxt-ring-grad)"
          strokeWidth="1"
        />

        {/* Glass highlight overlay */}
        <rect
          x="2" y="2"
          width={s - 4} height={(s - 4) * 0.5}
          rx={s * 0.2}
          fill="url(#nxt-glass-shine)"
        />

        {/* Inner accent ring */}
        <circle
          cx={half} cy={half} r={r}
          fill="none"
          stroke="url(#nxt-ring-grad)"
          strokeWidth="1"
          strokeDasharray={`${r * 0.8} ${r * 0.4}`}
          className={animated ? 'nxt-logo-spin' : ''}
        />

        {/* Lightning bolt — the core icon */}
        <path
          d={`M${half - s * 0.1} ${half + s * 0.02} L${half + s * 0.02} ${half - s * 0.22} L${half - s * 0.02} ${half - s * 0.02} L${half + s * 0.1} ${half - s * 0.02} L${half - s * 0.02} ${half + s * 0.22} L${half + s * 0.02} ${half + s * 0.02} Z`}
          fill="url(#nxt-bolt-grad)"
          filter="url(#nxt-bolt-glow)"
          className={animated ? 'nxt-bolt-pulse' : ''}
        />
      </svg>

      <style>{`
        @keyframes nxtLogoGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .nxt-logo-spin {
          animation: nxtRingSpin 12s linear infinite;
          transform-origin: center;
        }
        @keyframes nxtRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .nxt-bolt-pulse {
          animation: nxtBoltPulse 2s ease-in-out infinite;
        }
        @keyframes nxtBoltPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
