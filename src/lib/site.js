// 站台層級設定：正式網址、站名等。
// 部署到自訂網域時，設定環境變數 NEXT_PUBLIC_SITE_URL 即可（結尾不要加斜線）。
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ncku-scholarship-finder.pages.dev'
).replace(/\/$/, '');

export const SITE_NAME = '成大獎助學金查詢';
export const SITE_DESCRIPTION =
  '成功大學校內外獎助學金查詢與資格快篩，輕量、公益、免登入。';

// Cloudflare Web Analytics token（在 CF 後台建立 beacon 後填入環境變數；未設定則不載入）
export const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN || '';
