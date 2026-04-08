import React, { useState } from 'react';
import { FiX, FiSearch, FiBook, FiMail, FiChevronRight, FiArrowLeft } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';

const KB_CATEGORIES = [
  { name: 'Getting Started', articles: [
    { title: 'Creating your account', content: 'Visit et.vantax.co.za and click "Start Free Trial". Complete the 3-step signup process: create your account, verify your email, and fill in your quick profile. You\'ll have immediate access to view the platform while your full KYC verification runs in the background.' },
    { title: 'Completing KYC verification', content: 'NXT runs 10 automated checks: CIPC, SARS, VAT, FICA, Sanctions, BBBEE, NERSA, FSCA, FAIS, and CIDB. Upload required documents in Settings → Registration. Most checks complete within 30 seconds. Trading is locked until kyc_status = verified.' },
    { title: 'Understanding your dashboard', content: 'Your Dashboard shows portfolio value, daily P&L, energy traded volume, carbon credit balance, market price trends, portfolio mix, and AI-powered insights. All data updates in real-time.' },
    { title: 'Navigating the platform', content: 'Use the sidebar to navigate between 19 sections. The header shows your current role, notifications, and theme toggle. Use the AI chat widget (bottom-right) for quick help.' },
    { title: 'Understanding roles and permissions', content: 'NXT supports 7 roles: Generator, Trader, Offtaker, IPP Developer, Regulator, Admin, and Observer. Each role has specific permissions. Switch roles using the role switcher in the header.' },
    { title: 'Your first contract', content: 'Go to Contracts → Contract Flow tab. Click "New Document" to upload a contract. Add signatories, run statutory checks, and sign digitally. Each signature includes a SHA-256 hash.' },
    { title: 'Your first trade', content: 'Go to Trading. Select a market (Eskom Day-Ahead, Bilateral, Carbon). Place a limit or market order. Your order will be matched against the order book automatically.' },
    { title: 'Understanding compliance', content: 'Go to Compliance to view your statutory check status, licence management, and regulatory reporting. All 14 South African regulations are checked automatically.' },
  ]},
  { name: 'Trading', articles: [
    { title: 'Placing orders', content: 'NXT supports limit, market, stop, and iceberg orders. Limit orders specify a price; market orders fill at best available. Stop orders trigger at a threshold. Iceberg orders hide total quantity.' },
    { title: 'Reading the order book', content: 'The order book shows bids (buy) and asks (sell) sorted by price. Green = bids, Red = asks. Spread = difference between best bid and best ask.' },
    { title: 'Managing positions', content: 'View your open positions in Portfolio. Each position shows entry price, current price, unrealized P&L, and risk metrics (VaR, Greeks).' },
    { title: 'Understanding settlement', content: 'Trades settle T+2 (two business days after execution). Settlement status: Pending → Confirmed → Processing → Settled. View in Settlement page.' },
    { title: 'Trading fees explained', content: 'Trading: 0.15% per trade value (min R500). Carbon registry transfer: R25/tCO2e (min R2,500). Option premium: 0.50% (min R1,000). Settlement: 0.05% (min R250).' },
    { title: 'Risk management basics', content: 'Use Risk Dashboard for VaR, CVaR, Greeks, and stress testing. Set position limits and stop-loss levels. The AI engine provides risk alerts.' },
  ]},
  { name: 'Carbon', articles: [
    { title: 'Managing carbon credits', content: 'View your credit inventory in Carbon → Inventory tab. Each credit has a vintage, registry (Gold Standard/Verra), technology type, and volume in tCO2e.' },
    { title: 'Retiring credits', content: 'Select credits and click "Retire". Specify beneficiary and purpose. A retirement certificate is generated with a unique certificate number and QR verification code.' },
    { title: 'Transferring credits', content: 'Transfer credits between accounts within NXT. Select credits, specify recipient, and confirm. Transfer fee: R25/tCO2e.' },
    { title: 'Writing carbon options', content: 'Create call, put, or collar options on carbon credits. Specify strike price, expiry, and premium. Options can be exercised or left to expire.' },
    { title: 'Exercising options', content: 'Active options can be exercised before expiry. The underlying credits are transferred and the premium is settled automatically.' },
    { title: 'Understanding tokenization', content: 'Tokenize carbon credits for fractional ownership and easier trading. Each token represents a specific credit with full provenance chain.' },
  ]},
  { name: 'IPP Projects', articles: [
    { title: 'Registering a new project', content: 'Go to IPP → click "New Project". Enter project details: name, technology, capacity, location, timeline. Add milestones and conditions precedent.' },
    { title: 'Tracking milestones', content: 'Each project has milestones from Development through COD. Track completion percentage, upload evidence documents, and manage dependencies.' },
    { title: 'Managing conditions precedent', content: 'CPs are requirements that must be satisfied before financial close. Upload documents, set deadlines, and track satisfaction status.' },
    { title: 'Financial close process', content: 'Financial close occurs when all CPs are satisfied and all parties sign. The platform tracks all requirements and notifies when ready.' },
    { title: 'Disbursement requests', content: 'Lenders can view disbursement requests from IPP developers. Each request links to a milestone and requires documentation.' },
    { title: 'Grid connection tracking', content: 'Track Eskom grid connection status for each project. Manage connection agreements, technical requirements, and commissioning schedules.' },
  ]},
  { name: 'Contracts', articles: [
    { title: 'Creating a new document', content: 'Upload PDF, DOCX, or create from template. Add metadata: title, type (PPA, LOI, EPC), parties, and terms.' },
    { title: 'Understanding the lifecycle', content: 'Contracts flow through: Draft → Negotiation → Legal Review → Signing → Validation → Execution → Active. Each phase has specific requirements.' },
    { title: 'Digital signing', content: 'Each signature creates a SHA-256 hash of the document content at signing time. Timestamps are recorded. PDF signature page is auto-generated.' },
    { title: 'Statutory compliance checks', content: '14 South African regulations are checked: ERA, NERSA Licence, MFMA, PFMA, BBBEE, Carbon Tax Act, REIPPPP, and more.' },
    { title: 'Amending an active contract', content: 'Amendments create a new version with major/minor versioning. All parties must sign the amendment. Original contract is preserved.' },
    { title: 'Smart contract rules', content: '8 rule types: price_threshold, volume_cap, expiry_auto_renew, penalty_clause, force_majeure, escalation, performance_bond, regulatory_change.' },
  ]},
  { name: 'Compliance', articles: [
    { title: 'KYC requirements', content: 'Requirements vary by participant type. All need: CIPC, SARS, VAT, FICA, Sanctions. Generators also need NERSA. Financial services need FSCA/FAIS.' },
    { title: 'Understanding statutory checks', content: '14 checks cover all SA energy regulations. Results: Pass, Fail, Pending, Override (admin). Failed checks show what action is required.' },
    { title: 'Licence management', content: 'Track all licences: generation, trading, distribution, supply. Set expiry alerts. Upload renewal applications.' },
    { title: 'Regulatory reporting', content: 'Generate compliance reports for NERSA, FSCA, and SARS. Reports include trading activity, positions, and risk metrics.' },
  ]},
  { name: 'API & Developer', articles: [
    { title: 'Getting an API key', content: 'Go to Developer Portal → API Keys tab. Click "Generate Key". Keys are SHA-256 hashed — the full key is only shown once. Store it securely.' },
    { title: 'Authentication and rate limits', content: 'Use X-API-Key header for authentication. Rate limits: 100/min general, 300/min trading, 10/min registration. 429 responses include Retry-After header.' },
    { title: 'Webhook integration', content: 'Register webhook URLs in Developer Portal → Webhooks tab. Events: trade.executed, contract.signed, carbon.retired, invoice.generated. HMAC-SHA256 signature verification.' },
    { title: 'API reference overview', content: 'Full REST API at /api/v1/. Endpoints: /register, /participants, /contracts, /trading, /carbon, /projects, /settlement, /compliance, /marketplace, /ai, /reports, /developer, /metering, /p2p.' },
  ]},
];

export default function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<{title:string;content:string}|null>(null);

  if (!open) return null;

  const allArticles = KB_CATEGORIES.flatMap(c => c.articles.map(a => ({...a, category: c.name})));
  const filtered = search ? allArticles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9980]" onClick={onClose} />
      <div className={`fixed right-0 top-0 bottom-0 w-96 z-[9981] shadow-2xl overflow-y-auto ${isDark ? 'bg-[#0d1b2a] border-l border-white/[0.06]' : 'bg-white border-l border-slate-200'}`}>
        <div className={`sticky top-0 z-10 p-4 ${isDark ? 'bg-[#0d1b2a] border-b border-white/[0.06]' : 'bg-white border-b border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Help Center</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><FiX className="w-5 h-5" /></button>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setSelectedArticle(null); }}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-1 focus:ring-blue-500/20`}
              placeholder="Search help articles..." />
          </div>
        </div>

        <div className="p-4">
          {selectedArticle ? (
            <div>
              <button onClick={() => setSelectedArticle(null)} className={`flex items-center gap-1.5 text-sm font-medium mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <FiArrowLeft className="w-3.5 h-3.5" /> Back to articles
              </button>
              <h3 className="text-lg font-bold mb-3">{selectedArticle.title}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{selectedArticle.content}</p>
            </div>
          ) : search ? (
            <div>
              <p className={`text-xs font-medium mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
              {filtered.map((a, i) => (
                <button key={i} onClick={() => setSelectedArticle(a)} className={`w-full text-left p-3 rounded-xl mb-2 flex items-center justify-between ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}>
                  <div><div className="text-sm font-medium">{a.title}</div><div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{a.category}</div></div>
                  <FiChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div>
              {KB_CATEGORIES.map((cat, ci) => (
                <div key={ci} className="mb-6">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{cat.name}</h3>
                  {cat.articles.map((a, ai) => (
                    <button key={ai} onClick={() => setSelectedArticle(a)} className={`w-full text-left p-2.5 rounded-lg mb-0.5 flex items-center justify-between text-sm ${isDark ? 'text-slate-300 hover:bg-white/[0.04]' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className="flex items-center gap-2"><FiBook className="w-3.5 h-3.5 text-blue-500 shrink-0" />{a.title}</span>
                      <FiChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
                    </button>
                  ))}
                </div>
              ))}
              <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-blue-500/[0.08] border border-blue-500/10' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Need more help?</p>
                <a href="mailto:support@et.vantax.co.za" className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                  <FiMail className="w-4 h-4" /> Contact support@et.vantax.co.za
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
