import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Release {
  version: string;
  date: string;
  features: string[];
  fixes: string[];
  known_issues?: string[];
}

const RELEASES: Release[] = [
  {
    version: '2.0.0',
    date: '2026-04-11',
    features: [
      'Module Registry & Feature Flags — 23 platform modules with admin toggle UI',
      '8 Role-specific Cockpits — single-screen command center per role',
      'Onboarding Email Sequence — automated emails on days 0, 1, 3, 7, 13',
      'POPIA Data Export — download all your data at /register/me/export',
      'Account Deletion Requests — POPIA-compliant 30-day processing',
      'Session Management — view and revoke active sessions',
      'Notification Preferences — control email and push notifications',
      'Role-based Rate Limiting — per-role request limits',
      'Cookie Consent Banner — POPIA-compliant consent management',
      'API Versioning Headers — X-NXT-Version on all responses',
      'Changelog Page — in-app version history',
      'Loading States & Empty States — skeleton loaders and helpful empty states',
      'Accessibility Improvements — ARIA labels, focus indicators, contrast fixes',
    ],
    fixes: [
      'XSS in retirement certificate — credit.id and retired_at now escaped',
      'Token transfer validates recipient exists before transferring',
      'Carbon credit tokenization uses correct status (active vs available)',
      'REC certificate numbers include random suffix to prevent race conditions',
      'Conditional orders stored separately to prevent matching at price 0',
      'formatZAR numeric literal separators corrected (was 10x overstated)',
      'Cockpit queries use correct column names (total_cents, document_signatories)',
    ],
    known_issues: [
      'Webhook delivery retries are limited to 3 attempts',
      'KV-based rate limiting may have slight drift under high concurrency',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-15',
    features: [
      'Initial platform release',
      '35 database tables for comprehensive energy trading',
      '5 Durable Objects (OrderBook, Escrow, P2P, SmartContract, RiskEngine)',
      '30+ route files covering trading, carbon, contracts, settlement',
      '50+ frontend pages with React and Recharts',
      'Cascade engine for webhooks, emails, and notifications',
      'Stripe billing integration with 3 subscription tiers',
    ],
    fixes: [],
  },
];

export default function Changelog() {
  const { isDark } = useTheme();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Changelog</h1>
      <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Platform version history, new features, and bug fixes.
      </p>

      <div className="space-y-8">
        {RELEASES.map((release) => (
          <div
            key={release.version}
            className={`rounded-xl border p-6 ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                v{release.version}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {release.date}
              </span>
            </div>

            {release.features.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  New Features
                </h3>
                <ul className="space-y-1">
                  {release.features.map((f, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span className="text-emerald-500 mr-2">+</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {release.fixes.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Bug Fixes
                </h3>
                <ul className="space-y-1">
                  {release.fixes.map((f, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span className="text-blue-500 mr-2">~</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {release.known_issues && release.known_issues.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  Known Issues
                </h3>
                <ul className="space-y-1">
                  {release.known_issues.map((f, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span className="text-amber-500 mr-2">!</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
