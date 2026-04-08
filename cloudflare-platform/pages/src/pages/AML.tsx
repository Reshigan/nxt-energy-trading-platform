import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';
import { motion } from 'framer-motion';

export default function AMLPolicyPage() {
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
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>AML Policy</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. Overview</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>GONXT Technology (Pty) Ltd is committed to preventing money laundering and terrorist financing in compliance with the Financial Intelligence Centre Act 38 of 2001 (FICA) and the Prevention of Organised Crime Act 121 of 1998 (POCA).</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Customer Due Diligence</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All participants undergo KYC verification including: CIPC company registration check, SARS tax clearance verification, FICA compliance screening, international sanctions screening, and enhanced due diligence for high-risk participants.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. Transaction Monitoring</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We monitor all transactions for suspicious activity including: unusual trading patterns, transactions inconsistent with the participant's profile, large or rapid movements of funds, and structuring to avoid reporting thresholds.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Suspicious Transaction Reporting</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Suspicious transactions are reported to the Financial Intelligence Centre (FIC) in accordance with Section 29 of FICA. We are prohibited from informing the subject of a suspicious transaction report.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Record Keeping</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We maintain records of all transactions, KYC documents, and suspicious activity reports for a minimum of 5 years after the end of the business relationship, as required by FICA.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>6. Sanctions Compliance</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We screen all participants against South African, EU, UK, US (OFAC), and UN sanctions lists. Transactions involving sanctioned parties or jurisdictions are blocked.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>7. Staff Training</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All staff with customer-facing or compliance responsibilities receive regular AML/CFT training. Our compliance team reviews policies annually.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>8. Compliance Officer</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Our designated Compliance Officer is Reshigan Govender. Reports of suspicious activity can be made to compliance@et.vantax.co.za.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
