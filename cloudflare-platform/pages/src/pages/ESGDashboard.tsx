import React, { useState, useEffect, useCallback } from 'react';
import { FiAward, FiRefreshCw, FiStar } from '../lib/fi-icons-shim';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { esgAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface LeaderboardEntry { participant_id: string; company_name: string; overall_score: number; tier: string; categories: Record<string, number>; }
interface Badge { id: string; name: string; description: string; tier: string; icon: string; }

const TIER_COLORS: Record<string, string> = { platinum: 'text-purple-500', gold: 'text-amber-500', silver: 'text-slate-400', bronze: 'text-orange-600' };
const TIER_BG: Record<string, string> = { platinum: 'bg-purple-500/10', gold: 'bg-amber-500/10', silver: 'bg-slate-500/10', bronze: 'bg-orange-500/10' };

export default function ESGDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lbRes, bgRes] = await Promise.all([esgAPI.getLeaderboard(), esgAPI.getBadges()]);
      setLeaderboard(lbRes.data?.data || []);
      setBadges(bgRes.data?.data || []);
    } catch { setError('Failed to load ESG data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const radarData = leaderboard[0]?.categories ? Object.entries(leaderboard[0].categories).map(([key, val]) => ({
    category: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    score: val,
    fullMark: 100,
  })) : [];

  const chartData = leaderboard.slice(0, 10).map(e => ({ name: e.company_name?.substring(0, 15) || 'Unknown', score: e.overall_score }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">ESG Scoring</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Environmental, Social & Governance performance leaderboard</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : leaderboard.length === 0 ? <EmptyState title="No ESG scores" description="ESG scores are calculated from participant activity." /> : (<>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4">
        {leaderboard.slice(0, 3).map((e, i) => (
          <div key={e.participant_id} className={`cp-card !p-5 text-center ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${TIER_BG[e.tier] || 'bg-slate-500/10'}`}>
              <span className={`text-lg font-bold ${TIER_COLORS[e.tier] || 'text-slate-500'}`}>#{i + 1}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{e.company_name || 'Unknown'}</p>
            <p className={`text-2xl font-extrabold mono ${TIER_COLORS[e.tier] || 'text-slate-500'}`}>{e.overall_score}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIER_BG[e.tier]} ${TIER_COLORS[e.tier]}`}>{e.tier?.toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart for top scorer */}
        {radarData.length > 0 && (
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Top Scorer Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={c('#1e293b', '#e2e8f0')} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: c('#64748b', '#94a3b8') }} />
                <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leaderboard bar chart */}
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Top 10 ESG Scores</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} width={100} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="score" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full leaderboard table */}
      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Full Leaderboard</h3>
        <table className="w-full text-sm">
          <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
            <th className="text-left py-2 font-medium">#</th>
            <th className="text-left py-2 font-medium">Company</th>
            <th className="text-right py-2 font-medium">Score</th>
            <th className="text-center py-2 font-medium">Tier</th>
          </tr></thead>
          <tbody>{leaderboard.map((e, i) => (
            <tr key={e.participant_id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
              <td className="py-2.5 text-slate-500">{i + 1}</td>
              <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{e.company_name || 'Unknown'}</td>
              <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{e.overall_score}</td>
              <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIER_BG[e.tier]} ${TIER_COLORS[e.tier]}`}>{e.tier?.toUpperCase()}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Available ESG Badges</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badges.map(b => (
              <div key={b.id} className={`p-3 rounded-xl border text-center ${c('bg-white/[0.02] border-white/[0.06]', 'bg-slate-50 border-black/[0.04]')}`}>
                <FiAward className={`w-6 h-6 mx-auto mb-1 ${TIER_COLORS[b.tier] || 'text-slate-500'}`} />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{b.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}
    </motion.div>
  );
}
