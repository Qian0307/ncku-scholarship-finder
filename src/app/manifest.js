import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

// PWA manifest：讓學生可把網站「加到主畫面」，以獨立視窗開啟。
export default function manifest() {
  return {
    name: `${SITE_NAME} — 校內外獎助學金查詢`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8a1538',
    lang: 'zh-Hant',
    icons: [
      // PNG 供 Android Chrome 判定可安裝（需 192 與 512）
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      // SVG 供支援的瀏覽器（清晰任意尺寸）
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
