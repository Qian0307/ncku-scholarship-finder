import { SITE_URL } from '@/lib/site';

// 允許所有爬蟲索引，並指向 sitemap，協助 Google 收錄 600+ 獎學金詳情頁。
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
