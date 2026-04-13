import React, { useEffect, useState } from 'react';
import { calendarAPI } from '../lib/api';

const TYPE_COLORS: Record<string, string> = {
  cp: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  invoice: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  milestone: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  licence: 'bg-red-500/20 text-red-400 border-red-500/30',
  custom: 'bg-green-500/20 text-green-400 border-green-500/30',
  reminder: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  deadline: 'bg-red-500/20 text-red-400 border-red-500/30',
};

type CalEvent = { id: string; title: string; date: string; type: string; entity_type?: string; entity_id?: string; severity?: string };

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [overdue, setOverdue] = useState<Record<string, unknown>[]>([]);
  const [view, setView] = useState<'month' | 'week' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', event_date: '', description: '', event_type: 'reminder' });
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().substring(0, 7));

  const loadEvents = () => {
    const from = `${currentMonth}-01`;
    const to = `${currentMonth}-31`;
    setLoading(true);
    Promise.all([
      calendarAPI.getEvents({ from, to }),
      calendarAPI.getOverdue(),
    ]).then(([evRes, odRes]) => {
      setEvents(evRes.data?.data || []);
      setOverdue(odRes.data?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadEvents(); }, [currentMonth]);

  const handleAdd = () => {
    if (!newEvent.title || !newEvent.event_date) return;
    calendarAPI.createCustom(newEvent).then(() => {
      setShowAdd(false);
      setNewEvent({ title: '', event_date: '', description: '', event_type: 'reminder' });
      loadEvents();
    }).catch(() => {});
  };

  const groupedByDate: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    const d = ev.date?.substring(0, 10) || 'unknown';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(ev);
  }

  const prevMonth = () => {
    const d = new Date(currentMonth + '-01');
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };
  const nextMonth = () => {
    const d = new Date(currentMonth + '-01');
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Unified Calendar</h1>
          <p className="text-slate-400 text-sm mt-1">All deadlines, CPs, invoices, milestones, and events in one view</p>
        </div>
        <div className="flex gap-2">
          {(['list', 'week', 'month'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${view === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{v}</button>
          ))}
          <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm">+ Add Event</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="text" placeholder="Title" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            <select value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="reminder">Reminder</option><option value="meeting">Meeting</option><option value="deadline">Deadline</option><option value="custom">Custom</option>
            </select>
            <button onClick={handleAdd} className="bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Save</button>
          </div>
          <input type="text" placeholder="Description (optional)" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      )}

      {overdue.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h3 className="text-red-400 font-semibold text-sm mb-2">Overdue ({overdue.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {overdue.map((item, idx) => (
              <div key={idx} className="bg-red-500/10 rounded-lg px-3 py-2 text-sm">
                <span className="text-red-300">{String(item.description || item.invoice_number || item.type)}</span>
                <span className="text-red-400/60 ml-2">{String(item.target_date || item.due_date || '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-slate-400 hover:text-white text-sm">&larr; Prev</button>
        <h2 className="text-lg font-semibold text-white">{currentMonth}</h2>
        <button onClick={nextMonth} className="text-slate-400 hover:text-white text-sm">Next &rarr;</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No events this period</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, evs]) => (
            <div key={date}>
              <div className="text-sm text-slate-400 font-medium mb-2">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="space-y-1">
                {evs.map((ev) => (
                  <div key={ev.id} className={`rounded-lg px-4 py-2.5 border flex items-center justify-between ${TYPE_COLORS[ev.type] || TYPE_COLORS.custom}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase font-medium opacity-70">{ev.type}</span>
                      <span className="text-sm font-medium">{ev.title}</span>
                    </div>
                    {ev.severity === 'warning' && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">Warning</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
