import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function TermsAndConditionsPage() {
  const tc = useThemeClasses();
  return (
    <div className={`min-h-screen ${tc.pageBg}`}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/landing" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-8 ${tc.isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>Terms & Conditions</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. Acceptance of Terms</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>By accessing and using the NXT Energy Trading Platform ("Platform"), operated by GONXT Technology (Pty) Ltd ("Company"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Platform.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Platform Services</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Platform provides energy trading, carbon credit management, IPP project tracking, digital contract management, and related services for registered South African energy market participants.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. Registration & Eligibility</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>You must be a registered South African entity or individual authorised to participate in energy markets. All information provided during registration must be true, accurate, and complete. You are responsible for maintaining the confidentiality of your account credentials.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Trading Rules</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>All trades executed on the Platform are subject to our Platform Rules. Orders are matched automatically based on price-time priority. Settlement occurs T+2 (two business days). All participants must maintain adequate margin and comply with position limits.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Fees & Billing</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Subscription fees are billed monthly. Transaction fees are accrued daily and invoiced monthly. See our Pricing page for current rates. Late payments are subject to suspension after 30 days.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>6. Intellectual Property</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Platform, including all software, content, and documentation, is the property of GONXT Technology (Pty) Ltd. You may not copy, modify, distribute, or reverse engineer any part of the Platform.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>7. Limitation of Liability</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Company shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>8. Dispute Resolution</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Any disputes shall be resolved through mediation, followed by arbitration in Johannesburg, South Africa, in accordance with the Arbitration Act 42 of 1965. The governing law is the law of the Republic of South Africa.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>9. Termination</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Either party may terminate this agreement with 30 days written notice. The Company may suspend or terminate your account immediately for breach of these terms, fraudulent activity, or regulatory non-compliance.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>10. Amendments</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>The Company reserves the right to modify these terms at any time. Material changes will be communicated via email 30 days in advance. Continued use after changes constitutes acceptance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
