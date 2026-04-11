import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import NXTLogo from '../components/NXTLogo';
import {
  IconTrading, IconCarbon, IconZap, IconContracts, IconCompliance, IconAI,
  IconSun, IconMoon, IconArrowRight, IconCheck, IconChevronDown,
} from '../components/icons';

const faqs = [
  { q: 'What is Voltex Energy Exchange?', a: 'Voltex is South Africa\'s first open-market energy trading platform, enabling generators, traders, offtakers, and IPP developers to trade energy, manage carbon credits, and close IPP deals digitally.' },
  { q: 'Who can use the platform?', a: 'Any registered South African energy market participant — generators, traders, offtakers, IPP developers, lenders, regulators, and carbon fund managers.' },
  { q: 'Is the platform NERSA compliant?', a: 'Yes. NXT integrates with NERSA, FSCA, CIPC, SARS, and other regulatory bodies. All statutory checks are automated during registration.' },
  { q: 'How does carbon credit trading work?', a: 'You can buy, sell, retire, transfer, and tokenize carbon credits from Gold Standard and Verra-certified projects directly on the platform.' },
  { q: 'What are the trading fees?', a: 'Trading fees are 0.15% per trade value (min R500). Carbon registry transfers are R25/tCO2e. See our pricing page for full details.' },
  { q: 'How secure is the platform?', a: 'Voltex uses Cloudflare\'s global edge network with end-to-end encryption, JWT authentication, SHA-256 document hashing, and POPIA-compliant data handling.' },
  { q: 'Can I try the platform before committing?', a: 'Yes! We offer a 14-day free trial on the Professional tier with full feature access. No credit card required to start.' },
  { q: 'How does digital contract signing work?', a: 'Upload your contract document, add signatories, and sign digitally. Each signature is SHA-256 hashed with a timestamp for legal validity.' },
  { q: 'Is there an API for integration?', a: 'Yes. NXT provides a full REST API with webhook support. Generate API keys from the Developer Portal and integrate with your existing systems.' },
  { q: 'What support is available?', a: 'All plans include email support. Professional and Enterprise plans include priority support. Contact support@et.vantax.co.za for assistance.' },
];

const features = [
  { Icon: IconTrading, title: 'Trading Engine', desc: 'Real-time order matching with limit, market, stop, and iceberg orders. WebSocket price feeds and position management.' },
  { Icon: IconCarbon, title: 'Carbon Marketplace', desc: 'Trade, retire, transfer, and tokenize carbon credits from Gold Standard and Verra-certified projects.' },
  { Icon: IconZap, title: 'IPP Lifecycle', desc: 'Track projects from development through COD with milestone tracking, condition precedent management, and disbursement control.' },
  { Icon: IconContracts, title: 'Digital Contracts', desc: 'Create, negotiate, validate, sign, and execute contracts digitally with SHA-256 integrity hashing and statutory compliance.' },
  { Icon: IconCompliance, title: 'Compliance & KYC', desc: 'Automated 10-point KYC verification with CIPC, SARS, NERSA, FSCA, FICA, and sanctions screening integration.' },
  { Icon: IconAI, title: 'AI Analytics', desc: 'AI-powered portfolio optimisation, risk management, weather-adjusted forecasting, and market insights.' },
];

const pricingTiers = [
  { name: 'Starter', price: 'R5,000', period: '/month', participants: '5', projects: '3', contracts: '10', trading: 'View only', carbon: 'No', ai: 'Basic', highlight: false },
  { name: 'Professional', price: 'R25,000', period: '/month', participants: '20', projects: '10', contracts: 'Unlimited', trading: 'Full', carbon: 'Full', ai: 'Full + API', highlight: true },
  { name: 'Enterprise', price: 'R75,000', period: '/month', participants: 'Unlimited', projects: 'Unlimited', contracts: 'Unlimited', trading: 'Full + Tokenization', carbon: 'Full', ai: 'Full + Chat', highlight: false },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isDark, toggleTheme } = useTheme();

  const bg = isDark ? 'bg-[#0a1628]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const textSec = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-[#0f1d32] border-white/[0.06]' : 'bg-slate-50 border-slate-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`min-h-screen ${bg} ${text}`}>
      {/* Nav */}
      <nav className={`sticky top-0 z-50 backdrop-blur-xl ${isDark ? 'bg-[#0a1628]/90 border-b border-white/[0.06]' : 'bg-white/90 border-b border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <NXTLogo size={32} animated />
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Voltex</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Toggle theme">
              {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
            <Link to="/login" className={`px-4 py-2 text-sm font-medium rounded-lg ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Sign In</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            South Africa's Open Market<br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">Energy Trading Platform</span>
          </h1>
          <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 ${textSec}`}>
            Trade energy, manage carbon credits, and close IPP deals on a single platform built for the South African energy market.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 flex items-center gap-2">
              Start Free Trial <IconArrowRight size={16} />
            </Link>
            <a href="mailto:reshigan@gonxt.tech?subject=NXT%20Demo%20Request" className={`px-8 py-3.5 text-base font-semibold rounded-xl border ${isDark ? 'border-white/[0.1] text-white hover:bg-white/[0.04]' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
              Book Demo
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className={`py-8 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {['NERSA', 'Gold Standard', 'Verra', 'Eskom'].map(name => (
            <span key={name} className={`text-sm font-semibold tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{name}</span>
          ))}
        </div>
      </section>

      {/* 3-column value props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { Icon: IconTrading, title: 'Trade Energy', desc: 'Real-time order book with limit, market, and stop orders. Automated settlement and clearing.' },
            { Icon: IconCarbon, title: 'Manage Carbon', desc: 'Buy, sell, retire, and tokenize carbon credits from certified registries. Write options and manage your carbon fund.' },
            { Icon: IconZap, title: 'Close IPP Deals', desc: 'Track IPP projects end-to-end from development through COD. Manage milestones, CPs, and disbursements.' },
          ].map((item, i) => (
            <div key={i} className={`p-8 rounded-2xl border ${cardBg} text-center`}>
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
                <item.Icon size={28} color="#3b82f6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className={textSec}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className={`py-20 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className={`text-center mb-12 ${textSec}`}>A complete platform for South African energy market participants</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`p-6 rounded-xl border ${cardBg}`}>
                <div className="mb-4"><f.Icon size={32} color="#3b82f6" /></div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className={`text-sm ${textSec}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className={`text-center mb-12 ${textSec}`}>14-day free trial on Professional. No credit card required.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingTiers.map((tier, i) => (
            <div key={i} className={`p-8 rounded-2xl border ${tier.highlight ? 'border-blue-500 ring-2 ring-blue-500/20' : isDark ? 'border-white/[0.06]' : 'border-slate-200'} ${cardBg} relative`}>
              {tier.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Most Popular</div>}
              <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
              <div className="mb-6"><span className="text-3xl font-extrabold">{tier.price}</span><span className={textSec}>{tier.period}</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />{tier.participants} participants</li>
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />{tier.projects} projects</li>
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />{tier.contracts} contracts</li>
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />Trading: {tier.trading}</li>
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />Carbon: {tier.carbon}</li>
                <li className="flex items-center gap-2 text-sm"><IconCheck size={16} color="#3b82f6" />AI: {tier.ai}</li>
              </ul>
              <Link to="/register" className={`block w-full py-3 text-center rounded-xl font-semibold ${tier.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : isDark ? 'bg-white/[0.06] hover:bg-white/[0.1] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                Get Started
              </Link>
            </div>
          ))}
        </div>
        <div className={`mt-8 text-center text-sm ${textSec}`}>
          Plus transaction fees: Trading 0.15% · Carbon R25/tCO2e · Options 0.50% · Settlement 0.05% · KYC R2,500 one-time
        </div>
      </section>

      {/* FAQ */}
      <section className={`py-20 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className={`rounded-xl border ${cardBg} overflow-hidden`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-medium pr-4">{faq.q}</span>
                  <span className={`shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}><IconChevronDown size={18} /></span>
                </button>
                {openFaq === i && <div className={`px-5 pb-5 text-sm ${textSec}`}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${isDark ? 'border-t border-white/[0.06]' : 'border-t border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                                <NXTLogo size={28} animated={false} />
                                <span className="font-bold">Voltex</span>
              </div>
              <p className={`text-sm ${textSec}`}>GONXT Technology (Pty) Ltd<br />Lanseria Corporate Park<br />reshigan@gonxt.tech</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className={`space-y-2 text-sm ${textSec}`}>
                <li><Link to="/login" className="hover:underline">Sign In</Link></li>
                <li><Link to="/register" className="hover:underline">Register</Link></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className={`space-y-2 text-sm ${textSec}`}>
                <li><Link to="/terms" className="hover:underline">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                <li><Link to="/risk-disclosure" className="hover:underline">Risk Disclosure</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className={`space-y-2 text-sm ${textSec}`}>
                <li><Link to="/rules" className="hover:underline">Platform Rules</Link></li>
                <li><Link to="/cookies" className="hover:underline">Cookie Policy</Link></li>
                <li><Link to="/aml" className="hover:underline">AML Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className={`mt-12 pt-8 ${isDark ? 'border-t border-white/[0.06]' : 'border-t border-slate-200'} text-center text-sm ${textSec}`}>
            &copy; {new Date().getFullYear()} GONXT Technology (Pty) Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
