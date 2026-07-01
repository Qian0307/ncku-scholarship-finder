import './globals.css';
import Script from 'next/script';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, CF_ANALYTICS_TOKEN } from '@/lib/site';
import { getDataUpdatedAt } from '@/lib/data-meta';
import PWARegister from '@/components/PWARegister';
import AuthProvider from '@/components/AuthProvider';
import AuthButton from '@/components/AuthButton';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // 各頁若自訂 title 會套用此模板（詳情頁自帶完整標題則直接顯示）
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // 分享到 Line／FB 時的預覽卡
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
};

export const viewport = {
  themeColor: '#8a1538',
};

export default function RootLayout({ children }) {
  const dataUpdatedAt = getDataUpdatedAt();
  return (
    <html lang="zh-Hant">
      <body>
        {/* 鍵盤使用者可先跳過導覽直達內容；平時隱藏，聚焦時才顯示 */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-ncku focus:shadow"
        >
          跳到主要內容
        </a>
        <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <header className="bg-ncku text-white shadow">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">成大獎助學金查詢</span>
              </a>
              <nav aria-label="主要導覽" className="flex items-center gap-4 text-sm">
                <a href="/" className="hover:underline underline-offset-4">
                  獎學金列表
                </a>
                <a href="/saved/" className="hover:underline underline-offset-4">
                  我的收藏
                </a>
                <a href="/faq/" className="hover:underline underline-offset-4">
                  常見問題
                </a>
                <AuthButton />
              </nav>
            </div>
          </header>

          <main id="main" className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
            {children}
          </main>

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
              {dataUpdatedAt && <span className="ml-1 text-slate-500">（資料更新於 {dataUpdatedAt}）</span>}
              <a href="/report/" className="ml-1 text-ncku hover:underline">
                回報資料有誤
              </a>
            </div>
          </footer>
        </div>
        </AuthProvider>

        <PWARegister />

        {/* Cloudflare Web Analytics：免 cookie、免同意條；未設定 token 則不載入 */}
        {CF_ANALYTICS_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
