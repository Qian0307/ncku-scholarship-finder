// 把目前的查詢與快篩條件編碼進網址 query，供分享；以及從網址還原。
// 靜態站也能運作（純 client 解析）。陣列以逗號串接。

const KEYS = {
  query: 'q',
  category: 'cat',
  year: 'year',
  college: 'col',
  department: 'dept',
  economic: 'econ',
  region: 'region',
  gpa: 'gpa',
};

/** 由篩選狀態產生 query string（不含 ?）；空值省略 */
export function encodeFilters(state) {
  const p = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS)) {
    const v = state[field];
    if (v !== undefined && v !== null && v !== '') p.set(key, String(v));
  }
  if (Array.isArray(state.identities) && state.identities.length) {
    p.set('id', state.identities.join(','));
  }
  if (Array.isArray(state.special) && state.special.length) {
    p.set('sp', state.special.join(','));
  }
  if (state.hasOther) p.set('other', '1');
  return p.toString();
}

/** 從 URLSearchParams（或 query string）還原成部分篩選狀態 */
export function decodeFilters(input) {
  const p = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out = {};
  for (const [field, key] of Object.entries(KEYS)) {
    const v = p.get(key);
    if (v != null) out[field] = v;
  }
  const id = p.get('id');
  if (id) out.identities = id.split(',').filter(Boolean);
  const sp = p.get('sp');
  if (sp) out.special = sp.split(',').filter(Boolean);
  if (p.get('other') === '1') out.hasOther = true;
  return out;
}

/** 是否含任何可還原的篩選參數 */
export function hasFilterParams(input) {
  return Object.keys(decodeFilters(input)).length > 0;
}
