'use client';

import { useEffect, useState } from 'react';
import ScholarshipCard from './ScholarshipCard';
import { useFavorites } from '@/lib/use-favorites';
import { setApplied, clearFavorites } from '@/lib/favorites-store';
import { compareByDeadline } from '@/lib/data';
import { buildIcsMulti } from '@/lib/calendar';

/** 我的收藏清單：依截止日近者優先，可標記「已申請」。資料存在瀏覽器本機。 */
export default function SavedList({ data }) {
  const favs = useFavorites();
  const [today, setToday] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setToday(new Date());
    setMounted(true);
  }, []);

  // 掛載前不顯示（靜態輸出階段 favs 為空），避免 hydration 不一致
  if (!mounted) {
    return <p className="mt-6 text-sm text-slate-400">載入收藏中…</p>;
  }

  const items = data
    .filter((s) => favs[s.id])
    .sort(compareByDeadline)
    .map((s) => ({ s, applied: Boolean(favs[s.id]?.applied) }));

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        還沒有收藏任何獎學金。到
        <a href="/" className="mx-1 text-ncku hover:underline">
          獎學金列表
        </a>
        點「收藏」即可加入這裡追蹤申請進度。
      </div>
    );
  }

  const appliedCount = items.filter((i) => i.applied).length;
  const datedCount = items.filter((i) => i.s.deadline).length;

  const exportAllIcs = () => {
    const ics = buildIcsMulti(items.map((i) => i.s));
    if (!ics) {
      window.alert('收藏中沒有具截止日的獎學金可匯出。');
      return;
    }
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '成大獎學金-我的收藏.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          共 <span className="font-semibold text-slate-700">{items.length}</span> 筆收藏
          <span className="mx-1 text-slate-300">·</span>
          已標記申請 {appliedCount}
        </span>
        <div className="flex items-center gap-3">
          {datedCount > 0 && (
            <button type="button" onClick={exportAllIcs} className="text-ncku hover:underline">
              全部匯入行事曆（.ics）
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('確定要清空所有收藏嗎？此動作無法復原。')) clearFavorites();
            }}
            className="text-slate-500 hover:underline"
          >
            清空收藏
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {items.map(({ s, applied }) => (
          <div key={s.id}>
            <ScholarshipCard scholarship={s} today={today} />
            <label className="mt-1 flex items-center gap-2 pl-1 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={applied}
                onChange={(e) => setApplied(s.id, e.target.checked)}
                className="rounded border-slate-300 text-ncku focus:ring-ncku"
              />
              我已申請這筆
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
