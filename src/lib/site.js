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

// 資料回報信箱（收「資料有誤」回報的 Gmail）
export const REPORT_EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL || 'cc8576a@gmail.com';

/** 產生「回報資料有誤」的 mailto 連結；帶入該筆獎學金資訊方便對照 */
export function buildReportMailto(scholarship) {
  const subject = scholarship
    ? `【成大獎學金查詢】資料回報：${scholarship.title}`
    : '【成大獎學金查詢】資料回報';
  const bodyLines = ['我想回報以下獎學金資料有誤或需更新：', ''];
  if (scholarship) {
    bodyLines.push(`名稱：${scholarship.title}`);
    bodyLines.push(`ID：${scholarship.id}`);
    bodyLines.push(`頁面：${SITE_URL}/scholarship/${scholarship.id}/`);
    if (scholarship.source_url) bodyLines.push(`官方原始頁：${scholarship.source_url}`);
    bodyLines.push('');
  }
  bodyLines.push('有誤的欄位與正確內容（請描述）：', '');
  // 不用 URLSearchParams：它會把空格編成 '+'，在 mailto 內文會顯示成字面加號
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  return `mailto:${REPORT_EMAIL}?${query}`;
}
