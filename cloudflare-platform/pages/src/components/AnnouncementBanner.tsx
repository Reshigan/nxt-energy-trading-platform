import React, { useState, useEffect } from 'react';
import { announcementsAPI } from '../lib/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  starts_at: string | null;
  expires_at: string | null;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    announcementsAPI.list()
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const typeStyles: Record<string, string> = {
    info: 'bg-blue-600/90 text-white',
    warning: 'bg-amber-500/90 text-white',
    critical: 'bg-red-600/90 text-white',
    success: 'bg-emerald-600/90 text-white',
  };

  return (
    <div className="space-y-0">
      {visible.map(a => (
        <div key={a.id} className={`px-4 py-2 flex items-center justify-between ${typeStyles[a.type] || typeStyles.info}`}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{a.title}</span>
            {a.body && <span className="opacity-90">— {a.body}</span>}
          </div>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, a.id]))}
            className="text-white/70 hover:text-white text-lg leading-none ml-4"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
