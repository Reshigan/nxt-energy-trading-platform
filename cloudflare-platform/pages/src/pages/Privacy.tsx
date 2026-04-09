import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';
import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
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
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>Privacy Policy</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. Introduction</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>GONXT Technology (Pty) Ltd ("we", "us") is committed to protecting your personal information in compliance with the Protection of Personal Information Act 4 of 2013 (POPIA). This policy explains how we collect, use, and protect your data.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Information We Collect</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We collect: registration information (company name, contact details, CIPC number), KYC documents (ID, tax certificates, licences), trading data (orders, trades, positions), financial data (invoices, payments), and technical data (IP address, browser type, usage patterns).</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. Purpose of Processing</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We process your information for: account registration and KYC verification, trading and settlement services, regulatory compliance (NERSA, FSCA, SARS), billing and invoicing, platform improvement, and communication about your account.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Legal Basis</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We process your data on the basis of: your consent (given at registration), contractual necessity (to provide platform services), legal obligation (regulatory reporting), and legitimate interest (platform security and improvement).</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Third-Party Sharing</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We share data with: regulatory bodies (NERSA, FSCA, SARS) as required by law, payment processors (Stripe) for billing, identity verification services for KYC, and counterparties to your trades (limited to what is necessary for settlement).</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>6. Data Retention</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Trading records: 7 years (as required by FSCA). KYC documents: duration of account plus 5 years. Audit logs: 90 days in active storage, archived for 7 years. Account data: deleted within 30 days of account closure request.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>7. Your Rights</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Under POPIA, you have the right to: access your personal information, correct inaccurate data, request deletion of your data, object to processing, and data portability. Exercise these rights via Settings → Export or by contacting our Information Officer.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>8. Information Officer</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Our Information Officer is Reshigan Govender. Contact: reshigan@gonxt.tech, GONXT Technology (Pty) Ltd, Lanseria Corporate Park.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>9. Data Security</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We use industry-standard security measures including: end-to-end encryption (TLS 1.3), JWT authentication with 24-hour expiry, SHA-256 document hashing, Cloudflare edge security, and regular security audits.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>10. Breach Notification</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>In the event of a data breach, we will notify the Information Regulator within 72 hours and affected data subjects as soon as reasonably possible, in accordance with POPIA Section 22.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
