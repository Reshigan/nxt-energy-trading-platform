import React from 'react';

interface NXTLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Voltex Energy Exchange — custom logo.
 * Stylized "V" lightning bolt inside a rounded badge with energy orbit ring.
 * Original design — no copyright or trademark conflicts.
 */
export default function NXTLogo({ size = 40, animated = true, className = '' }: NXTLogoProps) {
  const s = size;
  const id = `voltex-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      {/* Glow ring */}
      {animated && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(6,182,212,0.3), rgba(59,130,246,0.3))',
            filter: 'blur(8px)',
            animation: 'voltexGlow 3s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          {/* Background gradient — deep teal to navy */}
          <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f3d3e" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0a2e3d" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#071e2e" stopOpacity="1" />
          </linearGradient>

          {/* Glass shine */}
          <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="40%" stopColor="white" stopOpacity="0.04" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Bolt gradient — emerald to cyan */}
          <linearGradient id={`${id}-bolt`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Ring gradient */}
          <linearGradient id={`${id}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>

          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rounded square base */}
        <rect
          x="2" y="2"
          width="96" height="96"
          rx="22"
          fill={`url(#${id}-bg)`}
          stroke={`url(#${id}-ring)`}
          strokeWidth="1.5"
        />

        {/* Glass overlay */}
        <rect
          x="4" y="4"
          width="92" height="46"
          rx="20"
          fill={`url(#${id}-shine)`}
        />

        {/* Energy orbit ring */}
        <circle
          cx="50" cy="50" r="36"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="1.2"
          strokeDasharray="18 8"
          className={animated ? 'voltex-spin' : ''}
        />

        {/* "V" lightning bolt — the core mark */}
        <path
          d="M38 28 L50 56 L42 56 L50 72 L62 44 L54 44 L62 28 Z"
          fill={`url(#${id}-bolt)`}
          filter={`url(#${id}-glow)`}
          className={animated ? 'voltex-pulse' : ''}
        />

        {/* Small energy dots */}
        <circle cx="26" cy="50" r="2" fill="#34d399" opacity="0.6">
          {animated && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx="74" cy="50" r="2" fill="#06b6d4" opacity="0.6">
          {animated && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />}
        </circle>
      </svg>

      <style>{`
        @keyframes voltexGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .voltex-spin {
          animation: voltexRingSpin 12s linear infinite;
          transform-origin: center;
        }
        @keyframes voltexRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .voltex-pulse {
          animation: voltexBoltPulse 2s ease-in-out infinite;
        }
        @keyframes voltexBoltPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
