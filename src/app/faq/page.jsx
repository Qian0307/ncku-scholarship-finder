export const metadata = {
  title: '常見問題與資源｜成大獎助學金查詢',
  description: '關於本站資料來源、資格快篩判定方式，以及成大獎助學金相關資源連結。',
};

const FAQS = [
  {
    q: '這個網站的資料從哪裡來？多久更新一次？',
    a: '資料整理自成大獎學金系統（學務處生輔組）的公開頁面，定期自動重新擷取。每筆都附「查看官方原始頁面」連結，請以官方公告為最終依據。',
  },
  {
    q: '「資格快篩」的三態（符合／可能符合／不符合）怎麼判定？',
    a: '系統把每筆獎學金的條件拆成年級、學院系所、身分別、經濟身分、特殊身分、成績、兼領等維度逐一比對：全部通過為「符合」；任一明確不符為「不符合」並標出卡點；只要有無法自動判讀的條件（如需推薦、特殊資格、成績單位不一致）一律歸「可能符合」，提醒你人工確認。',
  },
  {
    q: '為什麼很多獎學金被標成「可能符合」？',
    a: '本站採「保守優先」原則：寧可提醒你確認，也不誤判讓你漏報或白填。許多申請辦法含無法結構化的文字條件，因此會落入此區，請點開詳情對照原文。',
  },
  {
    q: '需要登入或填個人資料嗎？資料會被上傳嗎？',
    a: '完全不需要登入。快篩填的條件只存在你自己的瀏覽器（localStorage）用於即時比對，不會上傳到任何伺服器。',
  },
  {
    q: '快篩說我符合，就一定能領到嗎？',
    a: '不一定。快篩只比對可自動判讀的條件，且名額有限、另有審查與書面要求。請務必詳閱官方申請辦法與應繳文件。',
  },
  {
    q: '找不到我的系所，或學院系所判斷怪怪的？',
    a: '系所選單依現有獎學金資料整理，可能不完整。選不到時可只選學院，系統會用學院層級比對。若仍有疑慮，請以詳情頁原文與承辦單位為準。',
  },
];

const RESOURCES = [
  { name: '成大學務處生活輔導組', url: 'http://assistance-osa.ncku.edu.tw/bin/home.php' },
  { name: '成大獎學金系統（原始資料來源）', url: 'https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp' },
  { name: '成大學務處', url: 'http://stud.adm.ncku.edu.tw/sam/' },
];

export default function FaqPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">常見問題與資源</h1>
        <p className="mt-1 text-sm text-slate-500">關於資料來源、快篩判定與相關連結。</p>
      </section>

      <section className="space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer font-medium text-slate-800">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">相關資源</h2>
        <ul className="space-y-2 text-sm">
          {RESOURCES.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer" className="text-ncku hover:underline">
                {r.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
