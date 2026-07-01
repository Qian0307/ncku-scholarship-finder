export const metadata = {
  // 標題套用 layout 的 template（自動補「｜成大獎助學金查詢」）
  title: '常見問題與資源',
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
  {
    q: '怎麼收藏獎學金、追蹤申請進度？',
    a: '在列表卡片或詳情頁點「收藏」，即可到上方「我的收藏」查看，會依截止日近者優先排序，並可勾選「已申請」自我追蹤。收藏也只存在你的瀏覽器，換裝置或清除瀏覽資料會消失。',
  },
  {
    q: '可以把截止日加進行事曆嗎？',
    a: '可以。單筆在詳情頁按「加入行事曆」（Google 日曆或下載 .ics）；也可在「我的收藏」一次把所有收藏匯出成單一 .ics 檔匯入行事曆。事件都含截止前 3 天提醒。',
  },
  {
    q: '如何把我的篩選結果分享給同學？',
    a: '在列表按「複製篩選連結」，會把你目前填的條件編成一段網址。同學打開該連結就會自動套用相同條件，直接看到符合度，適合貼到系上群組。',
  },
  {
    q: '可以像 App 一樣加到手機主畫面、離線看嗎？',
    a: '可以。用手機瀏覽器開啟本站，選單通常會有「加到主畫面」；加入後可像 App 以獨立視窗開啟，先前瀏覽過的頁面在離線時仍可查看。',
  },
  {
    q: '搜尋不到某類型獎學金（例如僑生、單親、清寒）？',
    a: '預設只搜尋獎學金「名稱」。可勾選搜尋框下方「含申請條件內文」，就會一併比對藏在申請辦法條文裡的關鍵字。',
  },
  {
    q: '發現資料有誤怎麼辦？',
    a: '每筆詳情頁下方有「來信回報」，頁尾也有「回報資料有誤」連結，會開啟郵件並自動帶入該筆資訊。你的回報能幫助其他同學，非常感謝。',
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
