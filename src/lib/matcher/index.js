// 資格三態比對核心。前端只負責收集 StudentProfile 與呈現，不夾帶判斷邏輯。
//
// 哨符約定（與 parser 一致）：
//   "all" / "無限制" = 辦法明確「不限」→ 該維度 pass
//   null           = 無法判讀        → 該維度 unknown（⚠️）
//
// 每個 check 回傳 { verdict: 'pass'|'fail'|'unknown', reason: string }

import { normalizeCollege, deptListMatches } from './units.js';

export const ECON_RANK = { 無: 0, 無限制: 0, 清寒: 1, 中低收: 2, 低收: 3 };

const P = (reason) => ({ verdict: 'pass', reason });
const F = (reason) => ({ verdict: 'fail', reason });
const U = (reason) => ({ verdict: 'unknown', reason });

const nonEmptyArray = (v) => Array.isArray(v) && v.length > 0;
const intersects = (a = [], b = []) => a.some((x) => b.includes(x));

/** 年級 */
export function checkYear(student, e) {
  const y = e.year;
  if (y === 'all') return P('不限年級');
  if (y == null) return U('未註明適用年級');
  if (nonEmptyArray(y)) {
    return y.includes(student.year) ? P(`適用 ${student.year}`) : F(`限 ${y.join('、')}`);
  }
  return U('未註明適用年級');
}

/** 學院／系所（層級聯集：落在任一允許單位即通過） */
export function checkUnit(student, e) {
  const cg = e.colleges;
  const dp = e.departments;
  if (cg === 'all' && dp === 'all') return P('不限學院系所');

  const cgArr = nonEmptyArray(cg);
  const dpArr = nonEmptyArray(dp);
  const sCollege = normalizeCollege(student.college);
  const cgHit = cgArr && cg.map(normalizeCollege).includes(sCollege);
  const dpHit = dpArr && deptListMatches(dp, student); // 容忍命名差異 + 系所→學院聯集
  if (cgHit || dpHit) return P('符合限定學院/系所');

  const hasArr = cgArr || dpArr;
  const hasUnknown = cg == null || dp == null; // 其中一邊無法判讀
  if (hasArr && !hasUnknown) return F('不在限定學院/系所範圍');
  if (hasArr && hasUnknown) return U('部分學院/系所條件無法判讀');
  return U('學院/系所條件無法判讀'); // 皆 null
}

/** 身分別（交集；"all" 視為不限 → pass） */
export function checkIdentity(student, e) {
  const ids = e.identity;
  if (ids === 'all') return P('不限身分');
  if (ids == null) return U('未註明身分別限制');
  if (nonEmptyArray(ids)) {
    return intersects(student.identities || [], ids)
      ? P('符合身分別')
      : F(`限 ${ids.join('、')}`);
  }
  return U('未註明身分別限制');
}

/** 經濟身分（門檻制：學生等級 ≥ 辦法最低門檻 → pass） */
export function checkEconomic(student, e) {
  const list = e.economic_status;
  if (list == null) return U('未註明經濟身分條件');
  if (!nonEmptyArray(list)) return U('未註明經濟身分條件');
  if (list.includes('無限制')) return P('不限經濟身分');

  const threshold = Math.min(...list.map((x) => ECON_RANK[x] ?? 0));
  const mine = ECON_RANK[student.economic] ?? 0;
  return mine >= threshold
    ? P('符合經濟身分門檻')
    : F(`需 ${list.join('或')}（含以上等級）`);
}

/** 特殊家庭/境遇身分（限定型：需具備其中之一） */
export function checkSpecial(student, e) {
  const need = e.special_conditions;
  if (need == null) return P('無特殊身分限制');
  if (!nonEmptyArray(need)) return P('無特殊身分限制');
  return intersects(student.special || [], need)
    ? P('符合特殊身分')
    : F(`限 ${need.join('、')}`);
}

/** 區域條件（戶籍縣市） */
export function checkRegion(student, e) {
  const r = e.region;
  if (r === 'all') return P('不限戶籍');
  if (r == null) return U('戶籍/籍貫條件需人工確認');
  if (nonEmptyArray(r)) {
    if (!student.region) return U('未提供你的戶籍縣市');
    if (r.includes(student.region)) {
      return e.region_extra
        ? U(`設籍 ${r.join('、')}，但另有設籍時間/行政區條件需確認`)
        : P(`符合設籍 ${r.join('、')}`);
    }
    return F(`限設籍 ${r.join('、')}`);
  }
  return U('戶籍條件需人工確認');
}

/** 成績(百分制，含等號) */
export function checkGpa(student, e) {
  const min = e.gpa_min;
  if (min == null) return U('未註明成績門檻');
  if (student.gpa == null || Number.isNaN(student.gpa)) return U('未提供個人成績');
  return student.gpa >= min ? P(`成績達 ${min} 分門檻`) : F(`需達 ${min} 分`);
}

/** 兼領 */
export function checkCombine(student, e) {
  const c = e.can_combine;
  if (c === true) return P('可兼領');
  if (c === false) return student.hasOtherScholarship ? F('不可兼領，且已領其他獎學金') : P('未領其他獎學金');
  // null
  return student.hasOtherScholarship ? U('兼領規定未註明，且已領其他獎學金') : P('未領其他獎學金');
}

/** 主比對：回傳三態結果 */
export function matchStudent(student, s) {
  const e = s.eligibility;
  const checks = {
    year: checkYear(student, e),
    unit: checkUnit(student, e),
    identity: checkIdentity(student, e),
    economic: checkEconomic(student, e),
    special: checkSpecial(student, e),
    region: checkRegion(student, e),
    gpa: checkGpa(student, e),
    combine: checkCombine(student, e),
  };
  return aggregate(checks, s);
}

const DIM_LABEL = {
  year: '年級',
  unit: '學院/系所',
  identity: '身分別',
  economic: '經濟身分',
  special: '特殊身分',
  region: '戶籍',
  gpa: '成績',
  combine: '兼領',
};

/** 彙總三態：任一 fail → no；無 fail 但有 unknown/自由條件 → maybe；全 pass → yes */
export function aggregate(checks, s) {
  const entries = Object.entries(checks).map(([dim, c]) => ({ dim, label: DIM_LABEL[dim], ...c }));
  const failed = entries.filter((c) => c.verdict === 'fail');
  if (failed.length) return { state: 'no', reasons: failed, checks };

  const unsure = entries.filter((c) => c.verdict === 'unknown');
  const hasFreeText = Boolean(s.eligibility.other_requirements) || s.needs_review === true;
  if (unsure.length || hasFreeText) {
    return { state: 'maybe', reasons: unsure, hasFreeText, checks };
  }
  return { state: 'yes', reasons: [], checks };
}

/** 對全部獎學金跑比對，回傳依三態分組 */
export function matchAll(student, scholarships) {
  const yes = [];
  const maybe = [];
  const no = [];
  for (const s of scholarships) {
    const r = matchStudent(student, s);
    const item = { scholarship: s, result: r };
    if (r.state === 'yes') yes.push(item);
    else if (r.state === 'maybe') maybe.push(item);
    else no.push(item);
  }
  return { yes, maybe, no };
}
