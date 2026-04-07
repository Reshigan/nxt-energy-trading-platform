import React, { useState, useEffect } from 'react';
import { FiFileText, FiShield, FiAlertTriangle, FiPlus } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { settlementAPI } from '../lib/api';

const tabs = ['Invoices', 'Escrows', 'Disputes'];

const invoices = [
  { id: 'INV-2024-001', counterparty: 'Eskom Holdings', amount: 'R842,000', status: 'Paid', due: '2024-04-15', type: 'Solar PPA' },
  { id: 'INV-2024-002', counterparty: 'BevCo Power', amount: 'R1,240,000', status: 'Pending', due: '2024-04-30', type: 'Wind Contract' },
  { id: 'INV-2024-003', counterparty: 'GreenFund SA', amount: 'R430,000', status: 'Overdue', due: '2024-03-31', type: 'Carbon Credits' },
  { id: 'INV-2024-004', counterparty: 'TerraVolt Energy', amount: 'R680,000', status: 'Paid', due: '2024-04-10', type: 'Gas Forward' },
  { id: 'INV-2024-005', counterparty: 'Carbon Bridge', amount: 'R125,000', status: 'Draft', due: '2024-05-15', type: 'RECs' },
];

const escrows = [
  { id: 'ESC-001', parties: 'TerraVolt <> Eskom', amount: 'R2.4M', status: 'Funded', conditions: '3/4 met', created: '2024-03-01' },
  { id: 'ESC-002', parties: 'BevCo <> GreenFund', amount: 'R800K', status: 'Pending', conditions: '1/3 met', created: '2024-03-15' },
  { id: 'ESC-003', parties: 'Envera <> Carbon Bridge', amount: 'R1.2M', status: 'Released', conditions: '4/4 met', created: '2024-02-15' },
  { id: 'ESC-004', parties: 'NXT Admin <> TerraVolt', amount: 'R500K', status: 'Disputed', conditions: '2/3 met', created: '2024-03-20' },
];

const disputes = [
  { id: 'DSP-001', parties: 'TerraVolt vs Eskom', amount: 'R340,000', status: 'Under Review', type: 'Delivery Shortfall', filed: '2024-03-25' },
  { id: 'DSP-002', parties: 'BevCo vs GreenFund', amount: 'R180,000', status: 'Mediation', type: 'Quality Issue', filed: '2024-03-20' },
  { id: 'DSP-003', parties: 'Envera vs Carbon Bridge', amount: 'R95,000', status: 'Resolved', type: 'Payment Delay', filed: '2024-02-28' },
];

const sc: Record<string, { bg: string; text: string }> = {
  Paid: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Overdue: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  Draft: { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
  Funded: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  Released: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Disputed: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  'Under Review': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Mediation: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  Resolved: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
};

function Badge({ status }: { status: string }) {
  const s = sc[status] || sc.Draft;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{status}</span>;
}

export default function Settlement() {
  const { isDark } = useTheme();
  const cv = (d: string, l: string) => isDark ? d : l;
  const [activeTab, setActiveTab] = useState('Invoices');
  const [invoiceData, setInvoiceData] = useState(invoices);
  const [escrowData, setEscrowData] = useState(escrows);
  const [disputeData, setDisputeData] = useState(disputes);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, escRes, dspRes] = await Promise.all([
          settlementAPI.getInvoices(),
          settlementAPI.getEscrows(),
          settlementAPI.getDisputes(),
        ]);
        if (invRes.data?.data?.length) setInvoiceData(invRes.data.data);
        if (escRes.data?.data?.length) setEscrowData(escRes.data.data);
        if (dspRes.data?.data?.length) setDisputeData(dspRes.data.data);
      } catch { /* use demo data */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Settlement</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Invoices, escrows & dispute resolution</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> {activeTab === 'Invoices' ? 'Generate Invoice' : activeTab === 'Escrows' ? 'Create Escrow' : 'File Dispute'}
        </button>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit ${cv('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${activeTab === tab ? cv('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : cv('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'Invoices' && <FiFileText className="w-3.5 h-3.5" />}
            {tab === 'Escrows' && <FiShield className="w-3.5 h-3.5" />}
            {tab === 'Disputes' && <FiAlertTriangle className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      <div className={`cp-card !p-0 overflow-hidden ${cv('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        <div className="overflow-x-auto">
          {activeTab === 'Invoices' && (
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium">Invoice</th>
                <th className="text-left py-3.5 px-4 font-medium">Counterparty</th>
                <th className="text-left py-3.5 px-4 font-medium">Type</th>
                <th className="text-right py-3.5 px-4 font-medium">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium">Status</th>
                <th className="text-right py-3.5 px-5 font-medium">Due Date</th>
              </tr></thead>
              <tbody>{invoiceData.map(inv => (
                <tr key={inv.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{inv.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{inv.counterparty}</td>
                  <td className="py-3.5 px-4 text-slate-500">{inv.type}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{inv.amount}</td>
                  <td className="py-3.5 px-4"><Badge status={inv.status} /></td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{inv.due}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {activeTab === 'Escrows' && (
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium">Escrow</th>
                <th className="text-left py-3.5 px-4 font-medium">Parties</th>
                <th className="text-right py-3.5 px-4 font-medium">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium">Status</th>
                <th className="text-left py-3.5 px-4 font-medium">Conditions</th>
                <th className="text-right py-3.5 px-5 font-medium">Created</th>
              </tr></thead>
              <tbody>{escrowData.map(e => (
                <tr key={e.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{e.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{e.parties}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{e.amount}</td>
                  <td className="py-3.5 px-4"><Badge status={e.status} /></td>
                  <td className="py-3.5 px-4 text-slate-500">{e.conditions}</td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{e.created}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {activeTab === 'Disputes' && (
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium">Dispute</th>
                <th className="text-left py-3.5 px-4 font-medium">Parties</th>
                <th className="text-left py-3.5 px-4 font-medium">Type</th>
                <th className="text-right py-3.5 px-4 font-medium">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium">Status</th>
                <th className="text-right py-3.5 px-5 font-medium">Filed</th>
              </tr></thead>
              <tbody>{disputeData.map(d => (
                <tr key={d.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{d.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{d.parties}</td>
                  <td className="py-3.5 px-4 text-slate-500">{d.type}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{d.amount}</td>
                  <td className="py-3.5 px-4"><Badge status={d.status} /></td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{d.filed}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
