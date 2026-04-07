import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function CookiePolicyPage() {
  const tc = useThemeClasses();
  return (
    <div className={`min-h-screen ${tc.pageBg}`}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/landing" className={`inline-flex items-center gap-1.5 text-sm font-medium mb-8 ${tc.isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <h1 className={`text-3xl font-bold mb-2 ${tc.textPrimary}`}>Cookie Policy</h1>
        <p className={`text-sm mb-8 ${tc.textSecondary}`}>Last updated: April 2026</p>
        <div className={`${tc.cardBg} rounded-2xl p-8`}>
          
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>1. What Are Cookies</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>Cookies are small text files stored on your device when you visit a website. They help us provide you with a better experience by remembering your preferences and session state.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>2. Cookies We Use</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We use only essential cookies required for the Platform to function. We do not use tracking cookies, analytics cookies, or advertising cookies.</p><p><strong>Session Cookie (JWT):</strong> Stores your authentication token. Expires after 24 hours or when you log out.</p><p><strong>Theme Preference:</strong> Stores your dark/light mode preference. Persistent, stored in localStorage.</p><p><strong>Tour Status:</strong> Stores whether you have completed the guided tour. Persistent, stored in localStorage.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>3. No Third-Party Cookies</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We do not set or allow third-party cookies. No analytics services (Google Analytics, etc.) or advertising networks have access to set cookies on our domain.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>4. Managing Cookies</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>You can manage cookies through your browser settings. Note that disabling essential cookies will prevent you from using the Platform, as authentication requires the session cookie.</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className={`text-xl font-bold mb-3 ${tc.textPrimary}`}>5. Changes</h2>
            <div className={`text-sm leading-relaxed space-y-3 ${tc.textSecondary}`}>
              <p>We will update this policy if we change our cookie usage. Any changes will be communicated via the Platform.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
