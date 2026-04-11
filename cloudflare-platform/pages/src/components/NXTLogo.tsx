import React from 'react';

interface NXTLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Ionvex Energy Exchange — official brand logo.
 * Ion particle mark: three orbital paths around a glowing core.
 * Provided by brand identity kit — no copyright or trademark conflicts.
 */
export default function NXTLogo({ size = 40, animated = true, className = '' }: NXTLogoProps) {
  const s = size;
  const id = `ionvex-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      {/* Glow ring */}
      {animated && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,204,0.4), rgba(0,184,212,0.3), rgba(0,119,255,0.3))',
            filter: 'blur(8px)',
            animation: 'ionvexGlow 3s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={s}
        height={s}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5CC" />
            <stop offset="50%" stopColor="#00B8D4" />
            <stop offset="100%" stopColor="#0077FF" />
          </linearGradient>
          <linearGradient id={`${id}-orb1`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5CC" stopOpacity={0.05} />
            <stop offset="50%" stopColor="#00E5CC" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#0077FF" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id={`${id}-orb2`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0077FF" stopOpacity={0.05} />
            <stop offset="50%" stopColor="#0077FF" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#00E5CC" stopOpacity={0.05} />
          </linearGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${id}-coreGlow`}>
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orbital ring 1 */}
        <ellipse cx="100" cy="100" rx="72" ry="24" transform="rotate(-30 100 100)"
          stroke={`url(#${id}-orb1)`} strokeWidth="2.5" fill="none"
          className={animated ? 'ionvex-orbit' : ''} />
        {/* Orbital ring 2 */}
        <ellipse cx="100" cy="100" rx="72" ry="24" transform="rotate(30 100 100)"
          stroke={`url(#${id}-orb2)`} strokeWidth="2.5" fill="none"
          className={animated ? 'ionvex-orbit-reverse' : ''} />
        {/* Orbital ring 3 — equatorial */}
        <ellipse cx="100" cy="100" rx="72" ry="24"
          stroke={`url(#${id}-orb1)`} strokeWidth="1.5" fill="none" opacity="0.35" />

        {/* Core */}
        <circle cx="100" cy="100" r="18" fill={`url(#${id}-grad)`} filter={`url(#${id}-coreGlow)`} />
        <circle cx="100" cy="100" r="9" fill="#ffffff" opacity="0.85" />

        {/* Electrons */}
        <circle cx="165" cy="72" r="6" fill="#00E5CC" filter={`url(#${id}-glow)`}>
          {animated && <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx="40" cy="124" r="5" fill="#0077FF" filter={`url(#${id}-glow)`} opacity="0.75">
          {animated && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite" />}
        </circle>
        <circle cx="130" cy="130" r="4" fill="#00B8D4" filter={`url(#${id}-glow)`} opacity="0.55">
          {animated && <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />}
        </circle>
      </svg>

      <style>{`
        @keyframes ionvexGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .ionvex-orbit {
          animation: ionvexOrbitSpin 20s linear infinite;
          transform-origin: center;
        }
        .ionvex-orbit-reverse {
          animation: ionvexOrbitSpin 25s linear infinite reverse;
          transform-origin: center;
        }
        @keyframes ionvexOrbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
