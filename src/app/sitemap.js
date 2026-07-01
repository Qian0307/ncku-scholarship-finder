import { getAllIds } from '@/lib/data';
import { SITE_URL } from '@/lib/site';

// 靜態 sitemap：首頁、常見問題，以及每一筆獎學金詳情頁。
// next.config 設定 trailingSlash: true，故所有網址結尾一律加斜線以保持一致。
export default function sitemap() {
  const now = new Date();

  const staticPages = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/faq/`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const scholarshipPages = getAllIds().map((id) => ({
    url: `${SITE_URL}/scholarship/${id}/`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...scholarshipPages].map((p) => ({
    lastModified: now,
    ...p,
  }));
}
