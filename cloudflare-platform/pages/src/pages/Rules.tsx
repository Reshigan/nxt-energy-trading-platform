import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';
import { motion } from 'framer-motion';

export default function PlatformRulesPage() {
  const tc = useThemeClasses();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`min-h-screen ${tc.pageBg}`}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/landing" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-8 ${tc.isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>Platform Rules</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. Trading Rules</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All orders must be placed through the Platform's order entry system. Market manipulation, spoofing, layering, and wash trading are strictly prohibited. Order types: limit, market, stop, iceberg. Price-time priority matching.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Settlement Terms</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All trades settle T+2 (two business days). Settlement is final and irrevocable. Failure to settle will result in a default declaration and may lead to account suspension.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. Fee Schedule</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Trading: 0.15% per trade value (min R500). Carbon registry transfer: R25/tCO2e (min R2,500). Option premium processing: 0.50% (min R1,000). Settlement & clearing: 0.05% (min R250). KYC verification: R2,500 one-time per participant.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Margin Requirements</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Participants must maintain adequate margin as determined by the risk engine. Margin calls must be met within 24 hours. Failure to meet a margin call may result in forced liquidation of positions.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Market Conduct</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All participants must act with integrity and in good faith. Insider trading based on non-public information is prohibited. All material information must be disclosed promptly. Complaints should be directed to compliance@et.vantax.co.za.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>6. Carbon Credit Rules</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Carbon credits must be from verified registries (Gold Standard, Verra). Retirement is final and irreversible. Transfer fees apply. Tokenization requires verification of underlying credit ownership.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>7. Contract Rules</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Digital signatures are legally binding under the Electronic Communications and Transactions Act 25 of 2002. SHA-256 hashing provides document integrity verification. Amendments require all-party consent.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
