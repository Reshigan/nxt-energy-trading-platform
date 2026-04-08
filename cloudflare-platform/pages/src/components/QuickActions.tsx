import React from 'react';
import { FiPlus, FiUpload, FiRefreshCw, FiActivity, FiFileText, FiShield, FiFilePlus, FiSearch, FiAlertTriangle, FiUsers, FiHeart, FiCode, FiDollarSign, FiCheckCircle, FiBarChart2, FiShoppingBag, FiGlobe, FiDownload } from '../lib/fi-icons-shim';

const iconMap: Record<string, React.ReactNode> = {
  'plus': <FiPlus className="w-4 h-4" />,
  'upload': <FiUpload className="w-4 h-4" />,
  'refresh': <FiRefreshCw className="w-4 h-4" />,
  'activity': <FiActivity className="w-4 h-4" />,
  'file': <FiFileText className="w-4 h-4" />,
  'file-text': <FiFileText className="w-4 h-4" />,
  'file-plus': <FiFilePlus className="w-4 h-4" />,
  'shield': <FiShield className="w-4 h-4" />,
  'search': <FiSearch className="w-4 h-4" />,
  'alert-triangle': <FiAlertTriangle className="w-4 h-4" />,
  'users': <FiUsers className="w-4 h-4" />,
  'heart': <FiHeart className="w-4 h-4" />,
  'code': <FiCode className="w-4 h-4" />,
  'dollar-sign': <FiDollarSign className="w-4 h-4" />,
  'check-circle': <FiCheckCircle className="w-4 h-4" />,
  'bar-chart': <FiBarChart2 className="w-4 h-4" />,
  'shopping-bag': <FiShoppingBag className="w-4 h-4" />,
  'globe': <FiGlobe className="w-4 h-4" />,
  'download': <FiDownload className="w-4 h-4" />,
};

interface QuickActionsProps {
  actions: { label: string; icon: string }[];
  accentHex: string;
}

export default function QuickActions({ actions, accentHex }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action, i) => (
        <button key={action.label}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.06] text-left"
          style={{ animation: `cardFadeUp 400ms ease ${i * 60}ms both` }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentHex}15`, color: accentHex }}>
            {iconMap[action.icon] || <FiActivity className="w-4 h-4" />}
          </span>
          <span className="leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
