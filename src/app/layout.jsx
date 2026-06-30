import './globals.css';

export const metadata = {
  title: '成大獎助學金查詢',
  description: '成功大學校內外獎助學金查詢與資格快篩，輕量、公益、免登入。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-ncku text-white shadow">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">成大獎助學金查詢</span>
              </a>
              <nav className="flex items-center gap-4 text-sm">
                <a href="/" className="hover:underline underline-offset-4">
                  獎學金列表
                </a>
                <a href="/faq/" className="hover:underline underline-offset-4">
                  常見問題
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500 leading-relaxed">
              本站為非官方公益專案，資料整理自
              <a
                href="https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp"
                target="_blank"
                rel="noreferrer"
                className="text-ncku hover:underline mx-1"
              >
                成大獎學金系統
              </a>
              ，僅供參考；實際資格與申請辦法請以官方公告為準。
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
