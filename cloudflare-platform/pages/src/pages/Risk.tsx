import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';
import { motion } from 'framer-motion';

export default function RiskDisclosurePage() {
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
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>Risk Disclosure</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>Important Notice</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p><strong>Energy trading and carbon credit trading involve significant risk. You should carefully consider whether trading is appropriate for you in light of your experience, objectives, financial resources, and other relevant circumstances.</strong></p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. Market Risk</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Energy prices and carbon credit values can fluctuate significantly due to supply and demand, weather, regulatory changes, and geopolitical events. Past performance is not indicative of future results. You may lose some or all of your invested capital.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Liquidity Risk</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The energy trading market may have limited liquidity, particularly for less common contract types or during off-peak periods. You may not be able to exit a position at your desired price.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. Regulatory Risk</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Changes in South African energy regulation, carbon tax policy, or financial services law may materially affect the value of your positions and the availability of certain products.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Counterparty Risk</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>While the Platform provides escrow and settlement services, there is a risk that a counterparty may default on their obligations. The Platform does not guarantee the performance of any counterparty.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Technology Risk</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Platform relies on technology infrastructure including internet connectivity, cloud services, and software systems. Technical failures, cybersecurity incidents, or service outages may affect your ability to trade or access your account.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>6. Carbon Credit Specific Risks</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Carbon credit values depend on registry standards, project performance, and regulatory frameworks. Credits from delisted projects may lose their value. Retirement is final and irreversible.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>7. Not Financial Advice</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Platform and its AI features provide information and tools only. Nothing on the Platform constitutes financial, investment, tax, or legal advice. Consult qualified professionals before making trading decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
