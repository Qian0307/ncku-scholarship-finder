import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkYear,
  checkUnit,
  checkIdentity,
  checkEconomic,
  checkSpecial,
  checkRegion,
  checkGpa,
  checkCombine,
  matchStudent,
} from './index.js';

// 預設學生：大三、規劃設計學院 都市計劃學系、本國生、無經濟身分、gpa 85、未領其他獎
const baseStudent = {
  year: '大三',
  college: '規劃設計學院',
  department: '都市計劃學系',
  identities: ['本國生'],
  economic: '無',
  special: [],
  gpa: 85,
  hasOtherScholarship: false,
};
const verdict = (c) => c.verdict;

// ── 年級 ──────────────────────────────────────────
test('年級 pass / fail / unknown', () => {
  assert.equal(verdict(checkYear(baseStudent, { year: 'all' })), 'pass');
  assert.equal(verdict(checkYear(baseStudent, { year: ['大三', '大四'] })), 'pass');
  assert.equal(verdict(checkYear(baseStudent, { year: ['碩', '博'] })), 'fail');
  assert.equal(verdict(checkYear(baseStudent, { year: null })), 'unknown');
});

// ── 學院/系所 ─────────────────────────────────────
test('學院/系所 pass / fail / unknown', () => {
  assert.equal(verdict(checkUnit(baseStudent, { colleges: 'all', departments: 'all' })), 'pass');
  assert.equal(
    verdict(checkUnit(baseStudent, { colleges: ['工學院'], departments: ['資訊系'] })),
    'fail'
  );
  assert.equal(verdict(checkUnit(baseStudent, { colleges: null, departments: null })), 'unknown');
});

test('易錯點：學院/系所聯集 — 系所不在清單但學院在 → pass', () => {
  // 學生系所「都市計劃學系」不在清單，但學院「規劃設計學院」在 → 聯集通過
  const e = { colleges: ['規劃設計學院'], departments: ['建築學系'] };
  assert.equal(verdict(checkUnit(baseStudent, e)), 'pass');
});

// ── 身分別 ───────────────────────────────────────
test('身分別 pass / fail / unknown / all', () => {
  assert.equal(verdict(checkIdentity(baseStudent, { identity: 'all' })), 'pass'); // all → pass
  assert.equal(verdict(checkIdentity(baseStudent, { identity: ['本國生'] })), 'pass');
  assert.equal(verdict(checkIdentity(baseStudent, { identity: ['原住民'] })), 'fail');
  assert.equal(verdict(checkIdentity(baseStudent, { identity: null })), 'unknown');
});

// ── 經濟身分 ──────────────────────────────────────
test('經濟身分 pass / fail / unknown', () => {
  assert.equal(verdict(checkEconomic(baseStudent, { economic_status: ['無限制'] })), 'pass');
  assert.equal(verdict(checkEconomic(baseStudent, { economic_status: ['清寒'] })), 'fail'); // 學生「無」< 清寒
  assert.equal(verdict(checkEconomic(baseStudent, { economic_status: null })), 'unknown');
});

test('易錯點：低收去申請「中低收以上」應 pass', () => {
  const lowIncome = { ...baseStudent, economic: '低收' };
  // 辦法允許 ["中低收"] → 門檻=2；低收=3 ≥ 2 → pass
  assert.equal(verdict(checkEconomic(lowIncome, { economic_status: ['中低收'] })), 'pass');
  // 反向：清寒(1) 去申請「中低收以上」→ fail
  const poor = { ...baseStudent, economic: '清寒' };
  assert.equal(verdict(checkEconomic(poor, { economic_status: ['中低收'] })), 'fail');
});

// ── 特殊身分 ──────────────────────────────────────
test('特殊身分 pass / fail / 無限制', () => {
  assert.equal(verdict(checkSpecial(baseStudent, { special_conditions: null })), 'pass');
  const single = { ...baseStudent, special: ['單親家庭'] };
  assert.equal(verdict(checkSpecial(single, { special_conditions: ['單親家庭'] })), 'pass');
  assert.equal(verdict(checkSpecial(baseStudent, { special_conditions: ['單親家庭'] })), 'fail');
});

// ── 戶籍/區域條件 ──────────────────────────────────
test('戶籍 pass / fail / all / null', () => {
  const tainan = { ...baseStudent, region: '台南市' };
  assert.equal(verdict(checkRegion(tainan, { region: 'all' })), 'pass'); // 不限戶籍
  assert.equal(verdict(checkRegion(tainan, { region: ['台南市'] })), 'pass'); // 設籍命中
  assert.equal(verdict(checkRegion(tainan, { region: ['高雄市'] })), 'fail'); // 設籍不命中
  assert.equal(verdict(checkRegion(tainan, { region: null })), 'unknown'); // 籍貫無法判讀
});

test('易錯點：戶籍命中但有設籍時間/行政區附帶條件 → unknown（⚠️）', () => {
  const tainan = { ...baseStudent, region: '台南市' };
  // region_extra=true 代表「設籍滿 N 個月」之類無法自動驗證 → 落入 ⚠️ 而非直接 pass
  assert.equal(
    verdict(checkRegion(tainan, { region: ['台南市'], region_extra: true })),
    'unknown'
  );
});

// ── 成績 ─────────────────────────────────────────
test('成績 pass / fail / unknown（含等號）', () => {
  assert.equal(verdict(checkGpa(baseStudent, { gpa_min: 85 })), 'pass'); // 等號
  assert.equal(verdict(checkGpa(baseStudent, { gpa_min: 90 })), 'fail');
  assert.equal(verdict(checkGpa(baseStudent, { gpa_min: null })), 'unknown');
});

test('易錯點：GPA 單位不一致（gpa_min=null）→ unknown 落入 ⚠️，不誤判', () => {
  // parser 對 GPA 4.3 制／前 X% 會留 null
  const s = {
    needs_review: true,
    eligibility: {
      year: 'all', colleges: 'all', departments: 'all', identity: 'all',
      economic_status: ['無限制'], special_conditions: null,
      gpa_min: null, conduct_note: null, other_requirements: null, can_combine: true,
    },
  };
  const r = matchStudent(baseStudent, s);
  assert.equal(r.state, 'maybe'); // 因 gpa unknown → ⚠️，而非 ✅ 或 ❌
});

// ── 兼領 ─────────────────────────────────────────
test('兼領 pass / fail / unknown', () => {
  assert.equal(verdict(checkCombine(baseStudent, { can_combine: true })), 'pass');
  const hasOther = { ...baseStudent, hasOtherScholarship: true };
  assert.equal(verdict(checkCombine(hasOther, { can_combine: false })), 'fail');
  assert.equal(verdict(checkCombine(baseStudent, { can_combine: false })), 'pass'); // 未領 → pass
  assert.equal(verdict(checkCombine(hasOther, { can_combine: null })), 'unknown');
});

// ── 易錯點：null 不可被當成 pass（彙總層） ───────────
test('易錯點：null 維度不可當 pass — 全 all 但 identity=null → maybe', () => {
  const s = {
    needs_review: false,
    eligibility: {
      year: 'all', colleges: 'all', departments: 'all',
      identity: null, // 無法判讀
      economic_status: ['無限制'], special_conditions: null,
      gpa_min: 0, conduct_note: null, other_requirements: null, can_combine: true,
    },
  };
  const r = matchStudent(baseStudent, s);
  assert.equal(r.state, 'maybe');
  assert.ok(r.reasons.some((x) => x.dim === 'identity'));
});

// ── 彙總三態整體 ──────────────────────────────────
test('彙總：全 pass → yes；任一 fail → no；有 other_requirements → maybe', () => {
  const allPass = {
    needs_review: false,
    eligibility: {
      year: 'all', colleges: 'all', departments: 'all', identity: 'all',
      economic_status: ['無限制'], special_conditions: null, region: 'all',
      gpa_min: 0, conduct_note: null, other_requirements: null, can_combine: true,
    },
  };
  assert.equal(matchStudent(baseStudent, allPass).state, 'yes');

  const oneFail = JSON.parse(JSON.stringify(allPass));
  oneFail.eligibility.year = ['碩'];
  assert.equal(matchStudent(baseStudent, oneFail).state, 'no');

  const freeText = JSON.parse(JSON.stringify(allPass));
  freeText.eligibility.other_requirements = '需經教授推薦';
  assert.equal(matchStudent(baseStudent, freeText).state, 'maybe');
});
