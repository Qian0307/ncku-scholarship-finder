import DeadlineBadge from './DeadlineBadge';
import { readYears } from '@/lib/constants';

/** 小標籤 */
function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    ncku: 'bg-ncku/10 text-ncku',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

const MATCH_BADGE = {
  yes: { text: '符合', cls: 'bg-emerald-100 text-emerald-700' },
  maybe: { text: '可能符合', cls: 'bg-amber-100 text-amber-700' },
  no: { text: '不符合', cls: 'bg-rose-100 text-rose-600' },
};

/** 列表卡片 */
export default function ScholarshipCard({ scholarship, today, matchState }) {
  const e = scholarship.eligibility;
  const badge = matchState ? MATCH_BADGE[matchState] : null;
  const econ =
    Array.isArray(e.economic_status) && !e.economic_status.includes('無限制')
      ? e.economic_status.join('、')
      : null;
  const identity = Array.isArray(e.identity) ? e.identity.join('、') : null;

  return (
    <a
      href={`/scholarship/${scholarship.id}/`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-ncku hover:shadow-md"
    >
      {badge && (
        <span className={`mb-1.5 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold text-slate-900 leading-snug">{scholarship.title}</h3>
        {scholarship.category && <Chip tone="ncku">{scholarship.category}</Chip>}
      </div>

      <div className="mt-2 text-sm">
        <DeadlineBadge deadline={scholarship.deadline} today={today} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>{readYears(e.year)}</Chip>
        {econ && <Chip tone="amber">限{econ}</Chip>}
        {identity && <Chip tone="amber">限{identity}</Chip>}
        {scholarship.amount && scholarship.amount !== '不定' && (
          <Chip>{scholarship.amount.length > 16 ? scholarship.amount.slice(0, 16) + '…' : scholarship.amount}</Chip>
        )}
        {scholarship.quota && scholarship.quota !== '不定' && <Chip>名額 {scholarship.quota}</Chip>}
        {scholarship.needs_review && <Chip tone="amber">部分條件需確認</Chip>}
      </div>
    </a>
  );
}
