import { notFound } from 'next/navigation';
import { getAllIds, getScholarshipById } from '@/lib/data';
import { readUnit, readYears } from '@/lib/constants';
import { SITE_URL } from '@/lib/site';
import LiveDeadline from '@/components/LiveDeadline';
import CalendarButton from '@/components/CalendarButton';

// 靜態輸出：預先產生每一筆詳情頁
export function generateStaticParams() {
  return getAllIds().map((id) => ({ id }));
}

export function generateMetadata({ params }) {
  const s = getScholarshipById(params.id);
  if (!s) return { title: '找不到獎學金' };
  const desc =
    `${s.category ?? ''}獎助學金${s.amount ? `，金額 ${s.amount}` : ''}` +
    `${s.deadline ? `，截止 ${s.deadline}` : ''}。成大獎助學金查詢與資格快篩。`;
  return {
    // 標題套用 layout 的 template（自動補「｜成大獎助學金查詢」）
    title: s.title,
    description: desc,
    openGraph: {
      title: s.title,
      description: desc,
      url: `${SITE_URL}/scholarship/${s.id}/`,
    },
  };
}

/** 資格欄位列 */
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function gpaText(v) {
  if (v == null) return '未註明';
  if (v === 0) return '無學業成績門檻';
  return `學業成績需達 ${v} 分（百分制）`;
}

function combineText(v) {
  if (v === true) return '可同時兼領其他獎學金';
  if (v === false) return '不可兼領其他獎學金';
  return '未註明，請洽承辦單位確認';
}

function regionText(e) {
  const r = e.region;
  if (r === 'all') return '不限戶籍';
  if (Array.isArray(r) && r.length) {
    const base = `限設籍 ${r.join('、')}`;
    return e.region_extra && e.region_raw ? `${base}（原文：${e.region_raw}）` : base;
  }
  if (e.region_raw) return `${e.region_raw}（無法自動判讀，請確認）`;
  return null;
}

export default function DetailPage({ params }) {
  const s = getScholarshipById(params.id);
  if (!s) notFound();
  const e = s.eligibility;

  return (
    <article>
      <a href="/" className="text-sm text-ncku hover:underline">
        回列表
      </a>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          {s.category && (
            <span className="rounded bg-ncku/10 px-2 py-0.5 text-xs text-ncku">{s.category}</span>
          )}
          {s.needs_review && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              部分條件需人工確認
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{s.title}</h1>
        <div className="mt-2 text-sm">
          {/* 掛載後才算相對天數，避免靜態輸出 hydration 不一致 */}
          <LiveDeadline deadline={s.deadline} />
        </div>
      </header>

      {s.needs_review && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          本筆部分申請條件無法自動結構化判讀，下方資格僅供初步參考，請務必對照「申請辦法原文」與官方公告。
        </div>
      )}

      {/* 基本資訊 + 資格 */}
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-slate-900">資格與條件</h2>
        <dl>
          <Row label="適用年級">{readYears(e.year)}</Row>
          <Row label="適用學院">{readUnit(e.colleges)}</Row>
          <Row label="適用系所">{readUnit(e.departments)}</Row>
          <Row label="身分別">{readUnit(e.identity, { allText: '不限身分' })}</Row>
          <Row label="經濟身分">
            {readUnit(e.economic_status, { allText: '不限' })}
            {Array.isArray(e.economic_status) &&
              !e.economic_status.includes('無限制') &&
              '（含以上等級）'}
          </Row>
          {Array.isArray(e.special_conditions) && (
            <Row label="特殊身分">限 {e.special_conditions.join('、')}</Row>
          )}
          {regionText(e) && <Row label="戶籍/區域">{regionText(e)}</Row>}
          <Row label="成績門檻">{gpaText(e.gpa_min)}</Row>
          {e.conduct_note && <Row label="操行要求">{e.conduct_note}</Row>}
          <Row label="兼領規定">{combineText(e.can_combine)}</Row>
          <Row label="金額">{s.amount || '未註明'}</Row>
          {s.quota && <Row label="名額">{s.quota}</Row>}
          {Array.isArray(s.submit_methods) && (
            <Row label="送件方式">
              <span className="inline-flex flex-wrap gap-1.5">
                {s.submit_methods.map((m) => (
                  <span key={m} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {m}
                  </span>
                ))}
              </span>
            </Row>
          )}
          {s.apply_docs && (
            <Row label="應繳文件">
              <span className="whitespace-pre-wrap">{s.apply_docs}</span>
            </Row>
          )}
          {e.other_requirements && (
            <Row label="其他條件">
              <span className="whitespace-pre-wrap">{e.other_requirements}</span>
            </Row>
          )}
        </dl>
      </section>

      {/* 申請辦法原文 */}
      {s.raw_text && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">申請辦法原文</h2>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
            {s.raw_text}
          </pre>
        </section>
      )}

      {/* 行動按鈕 */}
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={s.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-ncku px-4 py-2 text-sm font-medium text-white hover:bg-ncku-light"
        >
          查看官方原始頁面
        </a>
        {s.form_url && (
          <a
            href={s.form_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-ncku px-4 py-2 text-sm font-medium text-ncku hover:bg-ncku/5"
          >
            下載申請表格
          </a>
        )}
        <CalendarButton scholarship={s} />
      </div>
    </article>
  );
}
