// 僅供 server component / build 階段使用：讀取獎學金資料檔的最後更新日期。
// 靜態輸出時於 build 執行一次，把日期寫進頁面。請勿在 client component 匯入（含 fs）。
import { statSync } from 'node:fs';
import path from 'node:path';

/** 回傳資料檔最後更新日期（YYYY-MM-DD）；讀取失敗回傳 null */
export function getDataUpdatedAt() {
  try {
    const file = path.join(process.cwd(), 'public', 'scholarships.json');
    const mtime = statSync(file).mtime;
    // 以台灣時區呈現日期
    return new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(mtime)
      .replace(/\//g, '-');
  } catch {
    return null;
  }
}
