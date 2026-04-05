import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiPlus, FiCheckCircle, FiClock, FiUpload } from 'react-icons/fi';
import { projectsAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

const MILESTONES = [
  'Environmental Authorisation', 'Grid Connection Agreement', 'Generation Licence (NERSA)',
  'PPA Execution', 'Financial Close — All CPs', 'Construction Commencement',
  'Commissioning & Testing', 'COD Declaration',
];

const CP_LIST = [
  'EIA Record of Decision', 'NERSA Generation Licence', 'Grid Connection Agreement',
  'Water Use Licence', 'PPA Execution', 'EPC Contract Signed',
  'Insurance Policies', 'Land Lease Agreement', 'BBBEE Compliance Certificate',
  'Legal Opinion on Structure',
];

export default function IPP() {
  const tc = useThemeClasses();
  const { activeRole } = useAuthStore();
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);
  const [detailTab, setDetailTab] = useState<'milestones' | 'cps' | 'disbursements' | 'docs'>('milestones');
  const [milestones, setMilestones] = useState<Array<Record<string, unknown>>>([]);
  const [conditions, setConditions] = useState<Array<Record<string, unknown>>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadCPModal, setShowUploadCPModal] = useState(false);
  const [selectedCP, setSelectedCP] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', technology: 'solar', capacity_mw: '', province: '', grid_connection_point: '', cod_target: '' });

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.data || []);
    } catch { /* ignore */ }
  };

  const loadProjectDetail = async (project: Record<string, unknown>) => {
    setSelectedProject(project);
    // Milestones and conditions would be loaded from sub-endpoints in production
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await projectsAPI.create({
        ...createForm,
        capacity_mw: parseFloat(createForm.capacity_mw),
      });
      setShowCreateModal(false);
      loadProjects();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    try {
      await projectsAPI.updateMilestone(selectedProject.id as string, milestoneId, { status: 'completed', completed_date: new Date().toISOString() });
    } catch { /* ignore */ }
  };

  const phases = ['development', 'financial_close', 'construction', 'commissioning', 'commercial_ops'];
  const inputClass = `w-full px-3 py-2 ${tc.input} rounded-lg text-sm`;

  // Metrics
  const totalCapacity = projects.reduce((sum, p) => sum + ((p.capacity_mw as number) || 0), 0);
  const inConstruction = projects.filter((p) => p.phase === 'construction').length;
  const operational = projects.filter((p) => p.phase === 'commercial_ops').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>IPP Projects</h1>
        {(activeRole === 'ipp_developer' || activeRole === 'admin') && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg text-sm font-medium">
            <FiPlus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {/* Accent Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, color: 'text-blue-400' },
          { label: 'Total Capacity', value: `${totalCapacity.toFixed(0)} MW`, color: 'text-emerald-400' },
          { label: 'In Construction', value: inConstruction, color: 'text-blue-400' },
          { label: 'Operational', value: operational, color: 'text-blue-400' },
        ].map((m) => (
          <div key={m.label} className={`${tc.cardBg} p-4 text-center`}>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {selectedProject ? (
        <div className={`${tc.cardBg} p-6 space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => setSelectedProject(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2">&larr; Back</button>
              <h2 className="text-lg font-bold">{selectedProject.name as string}</h2>
              <div className="flex gap-2 mt-1">
                <StatusBadge status={selectedProject.phase as string} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProject.capacity_mw as number} MW {selectedProject.technology as string}</span>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-400">Progress</div>
              <div className="text-blue-400 font-bold text-xl">{selectedProject.progress_pct as number || 0}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-[#d4e157] to-[#b8c43a] h-2 rounded-full transition-all" style={{ width: `${selectedProject.progress_pct as number || 0}%` }} />
          </div>

          {/* Phase Tracker */}
          <div className="flex gap-1">
            {phases.map((p, i) => {
              const currentIdx = phases.indexOf(selectedProject.phase as string);
              const isPast = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={p} className={`flex-1 text-center py-2 rounded text-xs font-medium ${isCurrent ? 'bg-blue-500/15 text-blue-400' : isPast ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-slate-500'}`}>
                  {p.replace('_', ' ')}
                </div>
              );
            })}
          </div>

          {/* Detail Tabs */}
          <div className="flex gap-2">
            {(['milestones', 'cps', 'disbursements', 'docs'] as const).map((t) => (
              <button key={t} onClick={() => setDetailTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${detailTab === t ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400'}`}>
                {t === 'cps' ? 'Conditions Precedent' : t}
              </button>
            ))}
          </div>

          {/* Milestones Tab */}
          {detailTab === 'milestones' && (
            <div className="space-y-3">
              {MILESTONES.map((ms, i) => (
                <div key={ms} className={`flex items-center gap-4 p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {i < 3 ? <FiCheckCircle className="w-5 h-5" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{ms}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{i < 3 ? 'Completed' : 'Pending'}</div>
                  </div>
                  {i >= 3 && (activeRole === 'ipp_developer' || activeRole === 'admin') && (
                    <button onClick={() => handleCompleteMilestone(`ms-${i}`)} className="px-3 py-1 text-xs bg-blue-500/15 text-blue-400 rounded-lg">
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CPs Tab */}
          {detailTab === 'cps' && (
            <div className="space-y-3">
              {CP_LIST.map((cp, i) => (
                <div key={cp} className={`flex items-center gap-4 p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                  <div className={`w-2 h-2 rounded-full ${i < 4 ? 'bg-emerald-400' : i < 7 ? 'bg-orange-400' : 'bg-slate-500'}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{cp}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{i < 4 ? 'Satisfied' : i < 7 ? 'In Progress' : 'Outstanding'}</div>
                  </div>
                  {i >= 4 && (activeRole === 'ipp_developer' || activeRole === 'admin') && (
                    <button onClick={() => { setSelectedCP({ id: `cp-${i}`, name: cp }); setShowUploadCPModal(true); }} className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg flex items-center gap-1">
                      <FiUpload className="w-3 h-3" /> Upload
                    </button>
                  )}
                  {activeRole === 'lender' && i >= 4 && i < 7 && (
                    <button className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-lg">Waive</button>
                  )}
                </div>
              ))}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                <strong className="text-yellow-400">FC Declaration:</strong> <span className="text-slate-300">Only available when all CPs are Satisfied or Waived</span>
              </div>
            </div>
          )}

          {/* Disbursements Tab */}
          {detailTab === 'disbursements' && (
            <div className="space-y-3">
              {[
                { milestone: 'Financial Close', amount: 'R25,000,000', status: 'disbursed' },
                { milestone: 'Construction 30%', amount: 'R50,000,000', status: 'pending_ie' },
                { milestone: 'Construction 70%', amount: 'R50,000,000', status: 'pending' },
                { milestone: 'COD', amount: 'R25,000,000', status: 'pending' },
              ].map((d) => (
                <div key={d.milestone} className={`flex items-center justify-between p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                  <div>
                    <div className="font-medium text-sm">{d.milestone}</div>
                    <div className="text-lg font-bold text-blue-400">{d.amount}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={d.status} />
                    {d.status === 'pending_ie' && activeRole === 'lender' && (
                      <button className="block mt-2 px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg">Approve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Docs Tab */}
          {detailTab === 'docs' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['EIA ROD', 'NERSA Licence', 'Grid Agreement', 'PPA Draft', 'PPA Signed', 'EPC Contract', 'Insurance Pack', 'Land Lease', 'BBBEE Cert', 'Legal Opinion', 'IE Certificate', 'COD Certificate'].map((doc) => (
                <div key={doc} className={`p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} hover:bg-slate-800 transition-colors cursor-pointer text-center`}>
                  <FiUpload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs font-medium">{doc}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Click to upload</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Project Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className={`col-span-2 ${tc.cardBg} p-12 text-center`}>
              <FiZap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No IPP projects yet</p>
            </div>
          ) : projects.map((p) => (
            <div key={p.id as string} className={`${tc.cardBg} p-5 cursor-pointer hover:border-blue-500/30 transition-colors`} onClick={() => loadProjectDetail(p)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{p.name as string}</h3>
                <StatusBadge status={p.phase as string} />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div><div className="text-xs text-slate-500 dark:text-slate-400">Capacity</div><div className="font-medium">{p.capacity_mw as number} MW</div></div>
                <div><div className="text-xs text-slate-500 dark:text-slate-400">Technology</div><div className="font-medium capitalize">{p.technology as string}</div></div>
                <div><div className="text-xs text-slate-500 dark:text-slate-400">Province</div><div className="font-medium">{p.province as string || '-'}</div></div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-[#d4e157] to-[#b8c43a] h-1.5 rounded-full" style={{ width: `${p.progress_pct as number || 0}%` }} />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.progress_pct as number || 0}% complete • COD: {p.cod_target as string || 'TBD'}</div>
              {activeRole === 'lender' && <div className="text-xs text-blue-400 mt-2">Debt: R{((p.debt_cents as number || 0) / 100).toLocaleString()}</div>}
              {activeRole === 'offtaker' && <div className="text-xs text-emerald-400 mt-2">Offtaker: Confirmed</div>}
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New IPP Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Project Name *</label>
            <input className={inputClass} required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Technology *</label>
              <select className={inputClass} value={createForm.technology} onChange={(e) => setCreateForm({ ...createForm, technology: e.target.value })}>
                {['solar', 'wind', 'hydro', 'gas', 'battery', 'biomass'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Capacity (MW) *</label>
              <input className={inputClass} type="number" step="0.1" required value={createForm.capacity_mw} onChange={(e) => setCreateForm({ ...createForm, capacity_mw: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Province</label>
              <select className={inputClass} value={createForm.province} onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}>
                <option value="">Select...</option>
                {['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">COD Target</label>
              <input className={inputClass} type="date" value={createForm.cod_target} onChange={(e) => setCreateForm({ ...createForm, cod_target: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Grid Connection Point</label>
            <input className={inputClass} value={createForm.grid_connection_point} onChange={(e) => setCreateForm({ ...createForm, grid_connection_point: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </Modal>

      {/* Upload CP Doc Modal */}
      <Modal isOpen={showUploadCPModal} onClose={() => setShowUploadCPModal(false)} title="Upload CP Document">
        <div className="space-y-4">
          <div className={`p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-sm`}>
            <strong>Condition:</strong> {selectedCP?.name as string}
          </div>
          <div className="border-2 border-dashed border-slate-300 dark:border-white/[0.08] rounded-lg p-8 text-center">
            <FiUpload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Click or drag to upload evidence document</p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOC, or image files up to 10MB</p>
          </div>
          <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium">
            Submit Evidence
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
