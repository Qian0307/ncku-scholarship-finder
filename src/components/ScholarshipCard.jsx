import DeadlineBadge from './DeadlineBadge';
import FavoriteButton from './FavoriteButton';
import { readYears } from '@/lib/constants';

/** 小標籤 */
function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    ncku: 'bg-ncku/10 text-ncku',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    // 不用 whitespace-nowrap／shrink-0：身分別等長標籤在窄螢幕需可換行，否則會把卡片撐爆
    <span className={`inline-block max-w-full break-words rounded px-2 py-0.5 text-xs ${tones[tone]}`}>
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
export default function ScholarshipCard({ scholarship, today, matchState, matchReasons }) {
  const e = scholarship.eligibility;
  const badge = matchState ? MATCH_BADGE[matchState] : null;
  const econ =
    Array.isArray(e.economic_status) && !e.economic_status.includes('無限制')
      ? e.economic_status.join('、')
      : null;
  const identity = Array.isArray(e.identity) ? e.identity.join('、') : null;

  return (
    // stretched-link 模式：整張卡可點，但只有一個真正的連結（標題），
    // 收藏按鈕以較高 z-index 疊在其上 → 避免「連結內含按鈕」的無效巢狀與無障礙問題。
    <div className="relative min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-ncku hover:shadow-md">
      {badge && (
        <span className={`mb-1.5 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold text-slate-900 leading-snug">
          <a
            href={`/scholarship/${scholarship.id}/`}
            className="rounded-sm before:absolute before:inset-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ncku focus-visible:ring-offset-2"
          >
            {scholarship.title}
          </a>
        </h3>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {scholarship.category && <Chip tone="ncku">{scholarship.category}</Chip>}
          <FavoriteButton id={scholarship.id} />
        </div>
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

      {/* 「可能符合」：列出需人工確認的維度與條件原文 */}
      {matchState === 'maybe' && (
        <div className="mt-2 space-y-0.5 break-words border-l-2 border-amber-200 pl-2 text-xs text-amber-700">
          {Array.isArray(matchReasons) &&
            matchReasons.map((r) => (
              <p key={r.dim}>
                需確認：{r.label}（{r.reason}）
              </p>
            ))}
          {e.other_requirements && (
            <p>
              需確認：
              {e.other_requirements.length > 60
                ? e.other_requirements.slice(0, 60) + '…'
                : e.other_requirements}
            </p>
          )}
        </div>
      )}

      {/* 「不符合」：標出卡在哪些條件 */}
      {matchState === 'no' && Array.isArray(matchReasons) && matchReasons.length > 0 && (
        <p className="mt-2 break-words border-l-2 border-rose-200 pl-2 text-xs text-rose-600">
          卡在：{matchReasons.map((r) => `${r.label}（${r.reason}）`).join('、')}
        </p>
      )}
    </div>
  );
}
