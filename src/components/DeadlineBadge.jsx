import { daysUntil, isExpired } from '@/lib/data';

/**
 * 截止日標籤。today 由父層在 client 掛載後傳入（避免靜態輸出的日期 hydration 不一致）。
 * today 為 null 時只顯示日期、不顯示相對天數。
 */
export default function DeadlineBadge({ deadline, today }) {
  if (!deadline) {
    return <span className="text-slate-400">未註明截止日</span>;
  }
  if (!today) {
    return <span className="text-slate-600">截止 {deadline}</span>;
  }

  const left = daysUntil(deadline, today);
  const expired = isExpired(deadline, today);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">已截止</span>
        {deadline}
      </span>
    );
  }

  const urgent = left <= 7;
  const soon = left <= 30;
  const cls = urgent
    ? 'bg-red-100 text-red-700'
    : soon
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700';

  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
        {left === 0 ? '今天截止' : `剩 ${left} 天`}
      </span>
      {deadline}
    </span>
  );
}
