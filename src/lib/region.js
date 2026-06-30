// 區域條件（戶籍縣市）正規化與選項。
//
// 成大獎學金系統的「區域條件」原文型態很雜：設籍縣市、含設籍時間、含行政區、
// 國籍類（具有中華民國國籍）、籍貫類（祖籍陝西省、泰北…）。這裡把它整理成可比對的結構：
//   region: "all"        → 不限戶籍（國籍類 / 不限 / 空白）→ 比對 pass
//   region: ["台南市",…] → 限設籍某些縣市 → 比對看學生戶籍是否落入
//   region: null         → 無法以縣市判讀（籍貫省份等）→ 比對 unknown（⚠️）
// region_raw 保留原文供顯示；extra=true 代表另有「設籍滿 N 個月/行政區」等無法自動驗證的附帶條件。

// 台灣 22 縣市（學生戶籍下拉用；臺一律寫作台）
export const COUNTIES = [
  '台北市',
  '新北市',
  '桃園市',
  '台中市',
  '台南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
];

const DURATION_RE = /(個月|年)以上|滿.*?(個月|年)/;
const AREA_RE = /(?:[^地縣市]區(?![域])|鄉|鎮)/; // 行政區／鄉／鎮（左營區、阿里山鄉、鹿港鎮…），排除「地區/區域」

// 舊縣市名 → 現行縣市（2010/2014 升格改制前的名稱仍出現在辦法原文）
const OLD_NAMES = {
  台北縣: '新北市',
  桃園縣: '桃園市',
  台中縣: '台中市',
  台南縣: '台南市',
  高雄縣: '高雄市',
  板橋市: '新北市',
};

/**
 * 把原始區域條件字串轉成結構化資料。
 * @returns {{ region: 'all'|string[]|null, region_raw: string|null, extra: boolean }}
 */
export function normalizeRegion(raw) {
  const text = String(raw || '')
    .replace(/臺/g, '台')
    .trim();
  if (!text || /^不限$/.test(text)) return { region: 'all', region_raw: null, extra: false };

  const parts = text.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
  const found = new Set();
  let nationalityOrUnlimited = false;
  let unmappable = false;

  for (const p of parts) {
    if (/不限|不受.*限制/.test(p)) {
      nationalityOrUnlimited = true;
      continue;
    }
    // 花東地區 → 花蓮縣 + 台東縣
    if (/花東/.test(p)) {
      found.add('花蓮縣');
      found.add('台東縣');
      continue;
    }
    // 高屏 → 高雄市 + 屏東縣
    if (/高屏/.test(p)) {
      found.add('高雄市');
      found.add('屏東縣');
    }
    // 「嘉義縣市 / 新竹縣市」→ 同時含縣與市
    const both = p.match(/(嘉義|新竹)縣市/);
    if (both) {
      found.add(`${both[1]}市`);
      found.add(`${both[1]}縣`);
    }
    // 台中港區 → 台中市
    if (/台中港/.test(p)) found.add('台中市');

    // 舊縣市名 → 現行縣市
    let matchedOld = false;
    for (const [old, cur] of Object.entries(OLD_NAMES)) {
      if (p.includes(old)) {
        found.add(cur);
        matchedOld = true;
      }
    }

    let matchedCounty = false;
    for (const c of COUNTIES) {
      if (p.includes(c)) {
        found.add(c);
        matchedCounty = true;
      }
    }

    if (matchedCounty || matchedOld || both || /花東|高屏|台中港/.test(p)) continue;

    // 國籍類（具有中華民國國籍、中華民國公民…）視為不限戶籍
    if (/中華民國|國籍|公民/.test(p)) {
      nationalityOrUnlimited = true;
      continue;
    }
    // 其餘（祖籍某省、泰北清邁…）無法以台灣縣市判讀
    unmappable = true;
  }

  const extra = DURATION_RE.test(text) || AREA_RE.test(text);

  if (found.size > 0) {
    return { region: [...found], region_raw: text, extra: extra || unmappable };
  }
  if (unmappable) return { region: null, region_raw: text, extra: true };
  if (nationalityOrUnlimited) return { region: 'all', region_raw: null, extra: false };
  return { region: null, region_raw: text, extra: true };
}
