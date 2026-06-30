// 資料載入與查詢輔助。前端與頁面一律透過這裡取得獎學金資料，不直接讀檔。
import scholarships from '../../public/scholarships.json';

/** 全部獎學金（依截止日近者優先排序；無截止日排最後） */
export function getAllScholarships() {
  return [...scholarships].sort(compareByDeadline);
}

/** 依 id 取單筆 */
export function getScholarshipById(id) {
  return scholarships.find((s) => s.id === id) || null;
}

/** 所有 id（給 generateStaticParams 用） */
export function getAllIds() {
  return scholarships.map((s) => s.id);
}

/** 截止日比較：有日期者在前且近者優先，null 排最後 */
export function compareByDeadline(a, b) {
  if (!a.deadline && !b.deadline) return 0;
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
}

/** 截止日是否已過（以今天為基準） */
export function isExpired(deadline, today = new Date()) {
  if (!deadline) return false;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(deadline) < t;
}

/** 距截止剩餘天數；null → null */
export function daysUntil(deadline, today = new Date()) {
  if (!deadline) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(deadline) - t) / 86400000);
}

/** 衍生：所有出現過的分類（去重、排序） */
export function getCategories() {
  const set = new Set();
  for (const s of scholarships) if (s.category) set.add(s.category);
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}
