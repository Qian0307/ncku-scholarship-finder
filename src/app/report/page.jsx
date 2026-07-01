import { REPORT_EMAIL, buildReportMailto } from '@/lib/site';

export const metadata = {
  title: '回報資料有誤',
  description: '本站資料整理自成大獎學金系統，可能有解析誤差。發現錯誤歡迎來信回報，我們會盡快更正。',
};

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">回報資料有誤</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        本站的獎學金資料由程式自動擷取並解析，難免有誤差（例如金額、截止日、資格條件判讀錯誤）。
        若你發現任何一筆資料有問題，非常歡迎來信告訴我，我會盡快更正。這對其他同學很有幫助，謝謝你。
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">來信請盡量附上：</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>獎學金名稱（或該筆頁面連結）</li>
          <li>哪個欄位有誤、正確內容應為何</li>
          <li>可對照的官方頁面連結（若有）</li>
        </ul>

        <a
          href={buildReportMailto(null)}
          className="mt-4 inline-flex items-center rounded-md bg-ncku px-4 py-2 text-sm font-medium text-white hover:bg-ncku-light"
        >
          用 Email 回報
        </a>
        <p className="mt-2 text-xs text-slate-400">
          點按會開啟你的郵件程式（含 Gmail），寄件對象為 {REPORT_EMAIL}。
        </p>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        提醒：實際資格與申請辦法仍請以
        <a
          href="https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp"
          target="_blank"
          rel="noreferrer"
          className="mx-1 text-ncku hover:underline"
        >
          官方公告
        </a>
        為準。
      </p>
    </div>
  );
}
