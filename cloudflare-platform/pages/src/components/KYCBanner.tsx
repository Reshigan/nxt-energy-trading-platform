import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../lib/store';

export default function KYCBanner() {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  if (!user || user.kyc_status === 'verified') return null;
  const checks = user.kyc_checks_passed || 0;
  const total = 10;

  return (
    <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
      <div className="flex items-center gap-3">
        <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            Complete your verification to unlock trading — {checks} of {total} checks complete
          </p>
        </div>
      </div>
      <Link to="/register" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shrink-0">
        Continue <FiArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
