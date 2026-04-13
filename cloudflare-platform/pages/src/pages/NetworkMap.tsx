import React, { useEffect, useState, useRef, useCallback } from 'react';
import { networkAPI } from '../lib/api';

type Node = { id: string; name: string; type: string; province: string; x?: number; y?: number; vx?: number; vy?: number };
type Edge = { from: string; to: string; types: string[]; value_cents: number; count: number };

export default function NetworkMap() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);
  const [filter, setFilter] = useState('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    networkAPI.getGraph().then((res) => {
      const data = res.data?.data || { nodes: [], edges: [] };
      const ns = (data.nodes || []).map((n: Node, i: number) => ({
        ...n,
        x: 400 + Math.cos((i / (data.nodes.length || 1)) * Math.PI * 2) * 250 + (Math.random() - 0.5) * 100,
        y: 300 + Math.sin((i / (data.nodes.length || 1)) * Math.PI * 2) * 200 + (Math.random() - 0.5) * 100,
        vx: 0, vy: 0,
      }));
      setNodes(ns);
      setEdges(data.edges || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    ipp: '#22c55e', generator: '#22c55e', offtaker: '#3b82f6', trader: '#f59e0b',
    lender: '#8b5cf6', carbon_fund: '#06b6d4', grid: '#ef4444', admin: '#f43f5e',
    buyer: '#60a5fa', seller: '#34d399',
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Simple force simulation step
    const filteredNodes = filter === 'all' ? nodes : nodes.filter((n) => n.type === filter);
    const nodeMap = new Map(filteredNodes.map((n) => [n.id, n]));

    // Draw edges
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) continue;
      ctx.beginPath();
      ctx.moveTo(fromNode.x || 0, fromNode.y || 0);
      ctx.lineTo(toNode.x || 0, toNode.y || 0);
      const alpha = Math.min(0.8, 0.1 + edge.count * 0.1);
      ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`;
      ctx.lineWidth = Math.min(4, 0.5 + edge.count * 0.5);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of filteredNodes) {
      const x = node.x || 0;
      const y = node.y || 0;
      const color = typeColors[node.type] || '#94a3b8';
      const radius = selected?.id === node.id ? 12 : 8;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = selected?.id === node.id ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = selected?.id === node.id ? 2 : 1;
      ctx.stroke();

      // Label
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(node.name?.substring(0, 20) || '', x, y + radius + 12);
    }

  }, [nodes, edges, filter, selected]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const clicked = nodes.find((n) => Math.hypot((n.x || 0) - x, (n.y || 0) - y) < 15);
    setSelected(clicked || null);
  };

  const roleTypes = [...new Set(nodes.map((n) => n.type))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Relationship Network</h1>
          <p className="text-slate-400 text-sm mt-1">Visualise counterparty connections across the platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>All</button>
          {roleTypes.map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${filter === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{t.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-slate-500">Loading network data...</div>
          ) : nodes.length === 0 ? (
            <div className="h-[500px] flex items-center justify-center text-slate-500">No network data available</div>
          ) : (
            <canvas ref={canvasRef} width={800} height={500} onClick={handleCanvasClick} className="w-full h-[500px] cursor-crosshair" />
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Network Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Participants</span><span className="text-white">{nodes.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Connections</span><span className="text-white">{edges.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total Value</span><span className="text-green-400">R{(edges.reduce((s, e) => s + e.value_cents, 0) / 100).toLocaleString()}</span></div>
            </div>
          </div>

          {selected && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">{selected.name}</h3>
              <div className="space-y-1 text-xs text-slate-400">
                <div>Role: <span className="text-white capitalize">{selected.type?.replace('_', ' ')}</span></div>
                <div>Province: <span className="text-white">{selected.province || 'N/A'}</span></div>
                <div>Connections: <span className="text-white">{edges.filter((e) => e.from === selected.id || e.to === selected.id).length}</span></div>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
            <div className="space-y-1.5">
              {Object.entries(typeColors).map(([role, color]) => (
                <div key={role} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-300 capitalize">{role.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
