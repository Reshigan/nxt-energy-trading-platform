import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const COOKIE_CONSENT_KEY = 'nxt_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = (level: 'essential' | 'all') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level, accepted_at: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 border-t ${
        isDark
          ? 'bg-[#151F32]/98 backdrop-blur-xl border-white/[0.06]'
          : 'bg-white/98 backdrop-blur-xl border-slate-200'
      }`}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            NXT Energy Trading Platform uses essential cookies for authentication and session management.
            We do not use tracking or advertising cookies.
            See our <a href="/cookies" className="underline text-[#d4e157] hover:opacity-80">Cookie Policy</a> for details.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => accept('essential')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              isDark
                ? 'border-white/[0.1] text-slate-300 hover:bg-white/[0.05]'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="Accept essential cookies only"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept('all')}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#d4e157] text-[#1a2e1a] hover:bg-[#c5d24e] transition-all"
            aria-label="Accept all cookies"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
