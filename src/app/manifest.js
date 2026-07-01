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
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
