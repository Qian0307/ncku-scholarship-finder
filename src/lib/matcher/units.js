// 學院／系所名稱正規化與歸屬判斷（純函式，無資料相依，供 matcher 與 UI 共用）。
//
// 成大資料的單位名稱不一致（電資學院/電機資訊學院、化工系/化學工程學系、含碩士班/博士班…），
// 精確字串比對會把「真符合」誤判成不符合。這裡做容忍性正規化與「系所→學院」歸屬，
// 讓 unit 比對能跨命名差異、並支援層級聯集（系所屬於學生學院即通過）。

// 成大九大學院（正規名）
export const COLLEGES = [
  '文學院',
  '理學院',
  '工學院',
  '電機資訊學院',
  '規劃設計學院',
  '管理學院',
  '醫學院',
  '社會科學院',
  '生物科學與科技學院',
];

// 學院別名 → 正規名
const COLLEGE_ALIAS = {
  電資學院: '電機資訊學院',
  電機資訊學院: '電機資訊學院',
  規劃與設計學院: '規劃設計學院',
  規劃設計學院: '規劃設計學院',
  社會科學學院: '社會科學院',
  社會科學院: '社會科學院',
  生物科學與科技學院: '生物科學與科技學院',
  生科學院: '生物科學與科技學院',
};

/** 正規化學院名稱 */
export function normalizeCollege(name) {
  if (!name) return name;
  const n = String(name).trim();
  return COLLEGE_ALIAS[n] || n;
}

// 以關鍵字判斷某「系所」名稱所屬學院。順序重要（先判專業領域）。
const DEPT_RULES = [
  [/牙醫|藥學|藥理|護理|物理治療|職能治療|醫學檢驗|生物醫學工程|醫學系|醫技/, '醫學院'],
  [/電機|電子|通訊|資訊工程|資工|資訊管理|資管(?!.*管理學院)|光電|電資/, '電機資訊學院'],
  [/機械|材料|化工|化學工程|土木|水利|海洋|環境工程|環工|測量|空間資訊|航空|太空|資源工程|工程科學|系統及船舶|船舶|能源|尖端材料/, '工學院'],
  [/建築|都市計劃|都計|工業設計|工設|創意產業|景觀/, '規劃設計學院'],
  [/企業管理|企管|會計|統計|財務金融|國際企業|國際經營|工業與資訊管理|交通管理|交管|經濟/, '管理學院'],
  [/生命科學|生物科技|生物資訊|生化(?!.*醫)|生物化學|分子生物/, '生物科學與科技學院'],
  [/數學|物理(?!治療)|化學(?!工程)|地球科學|地科/, '理學院'],
  [/中文|中國文學|外文|外國語|歷史|台灣文學|藝術|考古|人類/, '文學院'],
  [/政治|法律|社會(?!科學院)|教育|心理/, '社會科學院'],
];

/** 判斷系所所屬學院；判不出回 null */
export function collegeOfDept(name) {
  const n = String(name || '');
  for (const [re, college] of DEPT_RULES) if (re.test(n)) return college;
  return null;
}

/** 去掉學位層級等後綴，取系所核心名（用於寬鬆比對） */
export function deptCore(name) {
  return String(name || '')
    .replace(/臺/g, '台') // 臺/台 視為同字，避免「臺灣文學系」對不到「台灣文學系」
    .replace(/(碩士班|博士班|碩士在職專班|在職專班|碩士學位學程|博士學位學程|學位學程|碩士|博士)$/g, '')
    .replace(/(研究所|學系|學研究所)$/g, '')
    .replace(/(系|所)$/g, '')
    .trim();
}

/**
 * 學生單位是否落入辦法允許的系所清單（容忍命名差異）：
 *   1) 系所核心名互相包含
 *   2) 該系所所屬學院 == 學生學院（層級聯集）
 */
export function deptListMatches(deptList, student) {
  const sCollege = normalizeCollege(student.college);
  const sCore = deptCore(student.department);
  for (const d of deptList) {
    const core = deptCore(d);
    if (sCore && core && (sCore.includes(core) || core.includes(sCore))) return true;
    if (sCollege && collegeOfDept(d) === sCollege) return true; // 系所屬於學生學院
  }
  return false;
}
