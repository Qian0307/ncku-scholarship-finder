// 共用常數與顯示文字

// 年級選項（與資格 schema 的 year 對應）
export const YEAR_OPTIONS = ['大一', '大二', '大三', '大四', '碩', '博'];

// 身分別、經濟身分（Phase 3 快篩會用到，先集中定義）
export const IDENTITY_OPTIONS = ['本國生', '僑生', '外籍生', '原住民', '身心障礙', '女性學生'];
export const ECONOMIC_OPTIONS = ['無', '清寒', '中低收', '低收'];

// 特殊身分／家庭狀況（快篩精靈與列表頁內嵌快篩共用）
export const SPECIAL_OPTIONS = [
  '特殊境遇家庭',
  '單親家庭',
  '家庭變故/急難',
  '軍公教遺族子女',
  '新住民子女',
  '失親/孤兒',
  '特殊教育學生',
  '癌症家庭子女',
];

/** 把 eligibility 的某維度轉成可讀文字（處理 all / null / 陣列） */
export function readUnit(value, { allText = '不限', unknownText = '未註明' } = {}) {
  if (value === 'all') return allText;
  if (value == null) return unknownText;
  if (Array.isArray(value)) return value.length ? value.join('、') : unknownText;
  return String(value);
}

/** 年級陣列轉精簡文字：含全部大學部 → 顯示「大學部」 */
export function readYears(years) {
  if (years === 'all') return '不限年級';
  if (years == null) return '未註明';
  if (!Array.isArray(years) || years.length === 0) return '未註明';
  const ug = ['大一', '大二', '大三', '大四'];
  const hasAllUg = ug.every((y) => years.includes(y));
  const parts = [];
  if (hasAllUg) parts.push('大學部');
  else parts.push(...years.filter((y) => ug.includes(y)));
  for (const y of ['碩', '博']) if (years.includes(y)) parts.push(y === '碩' ? '碩士' : '博士');
  return parts.join('、');
}
