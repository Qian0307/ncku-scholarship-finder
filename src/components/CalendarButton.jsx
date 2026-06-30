'use client';

import { useState } from 'react';
import { googleCalUrl, buildIcs } from '@/lib/calendar';

/** 「加入行事曆」：Google Calendar 連結 + .ics 下載（含截止前 3 天提醒） */
export default function CalendarButton({ scholarship }) {
  const [open, setOpen] = useState(false);
  if (!scholarship.deadline) return null;

  const downloadIcs = () => {
    const ics = buildIcs(scholarship);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scholarship.id}-截止提醒.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-ncku px-4 py-2 text-sm font-medium text-ncku hover:bg-ncku/5"
      >
        加入行事曆
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <a
            href={googleCalUrl(scholarship)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Google 日曆
          </a>
          <button
            type="button"
            onClick={downloadIcs}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            下載 .ics（含提醒）
          </button>
        </div>
      )}
    </div>
  );
}
