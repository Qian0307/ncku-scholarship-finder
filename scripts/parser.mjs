#!/usr/bin/env node
/**
 * 解析器：scripts/raw/raw.json → public/scholarships.json
 *
 * 策略：「確定性解析優先 + Gemini 輔助模糊欄位」
 *   - 詳情頁多數欄位已結構化，先用規則確定性映射（id/title/截止日/金額/年級/GPA/操行/兼領）
 *   - 只有「無法規則化」的自由文字（系所條件、家庭/身份條件、其他條件、站方分類）才送 Gemini 判讀
 *   - 沒有 GEMINI_API_KEY 也能跑：模糊欄位一律標 needs_review、相關維度留 null（落入 ⚠️）
 *
 * 比對黃金原則：保守優先。任何無法自動判讀 → 留 null（unknown），不硬猜。
 *
 * 哨符約定（與 lib/matcher 一致）：
 *   "all" / "無限制"  = 辦法明確「不限」→ 該維度 pass
 *   null            = 無法判讀          → 該維度 unknown（⚠️）
 *   注意：identity 維度沿用 "all" 表示「不限身分」，需 Phase 3 matcher 一併支援。
 *
 * 環境變數（皆可選）：
 *   GEMINI_API_KEY  有則啟用 AI 輔助（放 .env.local）
 *   GEMINI_MODEL    預設 gemini-2.0-flash
 *   GEMINI_LIMIT    最多送幾筆給 Gemini（測試/控成本用，預設全部 needs_review 筆）
 *   NO_GEMINI       =1 時強制只跑確定性解析
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeRegion } from '../src/lib/region.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_FILE = path.join(__dirname, 'raw', 'raw.json');
const OUT_FILE = path.join(__dirname, '..', 'public', 'scholarships.json');

// ── 小工具：載入 .env.local（不引入額外套件）──────────────
async function loadEnvLocal() {
  try {
    const txt = await fs.readFile(path.join(__dirname, '..', '.env.local'), 'utf-8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* 沒有 .env.local 也沒關係 */
  }
}

// ── 詞彙對照表 ───────────────────────────────────────────
const ECON_TERMS = [
  [/低收入戶|低收(?!入)|^低收/, '低收'],
  [/中低收入戶|中低收/, '中低收'],
  [/清寒|家境清寒|清寒證明/, '清寒'],
];
const IDENTITY_TERMS = [
  [/僑生|僑.?學生/, '僑生'],
  [/外籍生|外國學生|國際學生/, '外籍生'],
  [/原住民/, '原住民'],
  [/身心障礙|身障|殘障/, '身心障礙'],
  [/女性學生|限女性/, '女性學生'],
  [/本國生|本國學生/, '本國生'],
];

// 特殊家庭／境遇身分（非經濟、非一般身分；屬「限定」條件）。詞彙取自實際資料盤點。
const SPECIAL_TERMS = [
  [/特殊境遇(家庭|婦女)?/, '特殊境遇家庭'],
  [/單親/, '單親家庭'],
  [/家遭變故|遭逢變故|家庭變故|急難|重大傷病|罹患重病|家庭遭遇重大|突遭變故/, '家庭變故/急難'],
  [/軍公教遺族|遺族|遺眷|榮民子女|榮眷|警消子女|因公殉職/, '軍公教遺族子女'],
  [/新住民|外籍配偶/, '新住民子女'],
  [/孤兒|失親|失怙|父歿|母歿|無依|父母雙亡|喪父|喪母|家庭失功能/, '失親/孤兒'],
  [/特殊教育學生|特教生|資賦優異/, '特殊教育學生'],
  [/癌症家庭/, '癌症家庭子女'],
];

const isUnrestricted = (s) => !s || /^(不限|無|無限制|全部|皆可)$/.test(s.trim());

// 區域/戶籍條件解析統一改用共用模組 src/lib/region.js 的 normalizeRegion，
// 與前端比對共用同一套規則，輸出 region / region_extra / region_raw 三欄。
function regionFields(raw) {
  const { region, region_raw, extra } = normalizeRegion(raw);
  return {
    region,
    region_extra: Array.isArray(region) ? !!extra : false,
    region_raw,
  };
}

/**
 * 依名稱（出資單位）確定性判斷來源分類 → 校內 / 政府 / 民間 / 其他。
 * 站方原始 category（全校性/院系類/清寒生…）是「範圍/用途」而非來源別，故改以名稱判定。
 * 順序：校內 → 政府 → 民間 → 其他。Gemini 之後仍可覆寫。
 */
function classifyCategory(title) {
  const t = title || '';
  if (/國立成功大學|成功大學|成大|本校/.test(t)) return '校內';
  if (/教育部|內政部|國防部|勞動部|衛生福利部|外交部|僑務委員會|原住民族委員會|客家委員會|退輔會|國軍退除役|科技部|國家科學|中山科學研究院|縣政府|市政府|鄉公所|區公所|鎮公所|縣府|政府|公所|議會|國家/.test(t))
    return '政府';
  if (/財團法人|社團法人|基金會|股份有限公司|有限公司|公司|學會|協會|文教|扶輪|獅子會|同濟會|青商|宗親會|同鄉會|銀行|商業|工業|文化事業|慈善/.test(t))
    return '民間';
  return '其他';
}

/** 從應繳文件/注意事項文字偵測送件方式標籤；偵測不到回 null */
function detectSubmitMethods(r) {
  const text = `${r.required_docs || ''} ${r.notes || ''} ${r.other_condition || ''}`;
  const out = [];
  if (/線上|網路報名|網路填報|系統申請|線上申請|google\s*form|表單填寫|報名系統/i.test(text)) out.push('線上');
  if (/e-?mail|電子郵件|電子信箱|寄.{0,6}(信箱|email)/i.test(text)) out.push('E-mail');
  if (/郵寄|逕寄|掛號|寄至|郵局|限時/.test(text)) out.push('郵寄');
  if (/親送|親自|逕送|送至|繳交至|送件至|送交/.test(text)) out.push('親送');
  return out.length ? [...new Set(out)] : null;
}

/** "2026/10/31" → "2026-10-31"；無法解析 → null */
function parseDeadline(raw) {
  const m = (raw || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** 數字字串 → number；非數字或空 → null */
function num(s) {
  const n = Number((s || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && (s || '').trim() !== '' ? n : null;
}

/** 掃描文字找出能對應到列舉的詞；回傳陣列（可能空） */
function pickTerms(text, table) {
  const out = [];
  for (const [re, val] of table) if (re.test(text || '')) out.push(val);
  return [...new Set(out)];
}

// ── 確定性解析：raw 一筆 → schema 一筆 ────────────────────
function baseParse(r) {
  const reviewNotes = [];
  const extraReqs = [];

  // 年級：學士→大一~大四；碩士→碩；博士→博
  const c = r.checks || {};
  let year = [];
  if (c['學士']) year.push('大一', '大二', '大三', '大四');
  if (c['碩士']) year.push('碩');
  if (c['博士']) year.push('博');
  if (year.length === 0) year = null; // 三者皆未勾 → 無法判讀
  // 僅限進修部 → 一般日間部學生可能不符，標註提醒
  if (c['進修部'] && !c['日間部']) extraReqs.push('限進修部');
  if (r.identity_restrict && /不含在職進修|不含進修/.test(r.identity_restrict)) {
    extraReqs.push(r.identity_restrict);
  }

  // 系所/學院條件
  let colleges = null;
  let departments = null;
  if (isUnrestricted(r.dept_condition)) {
    colleges = 'all';
    departments = 'all';
  } else if (r.dept_condition) {
    // 具體系所/學院無法用規則可靠拆解 → 交給 Gemini；先標註
    reviewNotes.push(`系所條件待判讀：「${r.dept_condition}」`);
  }

  // 特殊家庭/境遇身分（限定型；取自身份條件與身份限制這兩個「要求」欄位）
  const famText = `${r.family_status || ''} ${r.identity_restrict || ''}`;
  const specialHits = pickTerms(famText, SPECIAL_TERMS);
  const special_conditions = specialHits.length > 0 ? specialHits : null;

  // 身分別：身份限制欄 + 身份條件欄內出現的標準身分關鍵字。
  // 「不限」判定只看 identity_restrict；family_status 的經濟/特殊內容由各自維度處理，不影響身分別。
  const identityHits = pickTerms(famText, IDENTITY_TERMS);
  let identity;
  if (identityHits.length > 0) {
    identity = identityHits;
  } else if (isUnrestricted(r.identity_restrict)) {
    identity = 'all'; // 身份限制欄不限 → 不限身分
  } else {
    identity = null; // 身份限制欄有寫但抓不到標準身分 → 待判讀
    reviewNotes.push(`身份限制待判讀：「${r.identity_restrict}」`);
  }

  // 經濟身分：取自 family_status（身份條件/家庭狀況）
  let economic_status = null;
  if (isUnrestricted(r.family_status)) {
    economic_status = ['無限制'];
  } else {
    const econHits = pickTerms(r.family_status, ECON_TERMS);
    if (econHits.length > 0) {
      economic_status = econHits;
    } else if (special_conditions || identityHits.length > 0) {
      // family_status 內容已被特殊身分/身分別維度結構化 → 經濟面不另設限
      economic_status = ['無限制'];
    } else {
      // 例如「癌症家庭子女」這類無法歸類 → 不硬套，標註待判讀
      reviewNotes.push(`家庭/身份條件待判讀：「${r.family_status}」`);
      extraReqs.push(r.family_status);
    }
  }

  // GPA：成績條件的學業成績（百分制）。>0 視為門檻；0 視為無門檻(0 分以上皆可)
  const academic = num(r.grade?.academic);
  const gpa_min = academic; // 0 代表無門檻；null 代表無資料

  // 操行：>0 記為文字提醒
  const conduct = num(r.grade?.conduct);
  const conduct_note = conduct && conduct > 0 ? `操行成績需達 ${conduct} 分` : null;

  // 兼領：勾「未享其它獎」→ 不可兼領(false)；未勾 → 視為可兼領(true)
  const can_combine = c['未享其它獎'] ? false : true;

  // 其他條件原文
  if (r.other_condition) extraReqs.push(r.other_condition);
  const other_requirements = extraReqs.filter(Boolean).join('\n') || null;

  const needs_review = reviewNotes.length > 0;

  return {
    id: r.id,
    title: r.title || r._list?.list_title || '',
    source_url: r.source_url,
    category: classifyCategory(r.title || r._list?.list_title), // 來源別：校內/政府/民間/其他；Gemini 可再精修
    deadline: parseDeadline(r.deadline_raw),
    amount: r.amount || null,
    quota: r.quota && r.quota !== '不定' ? r.quota : r.quota === '不定' ? '不定' : null,
    apply_docs: r.required_docs || null, // 應繳文件／送件方式
    submit_methods: detectSubmitMethods(r), // 送件方式標籤（線上/郵寄/E-mail/親送）
    form_url: r.form_url || null, // 申請表格下載連結
    eligibility: {
      year,
      colleges,
      departments,
      identity,
      economic_status,
      special_conditions,
      ...regionFields(r.region_condition),
      gpa_min,
      conduct_note,
      other_requirements,
      can_combine,
    },
    raw_text: buildRawText(r),
    needs_review,
    _review_notes: reviewNotes, // 內部用，輸出前移除
  };
}

function buildRawText(r) {
  return [
    r.dept_condition && `系所條件：${r.dept_condition}`,
    r.family_status && `身份條件(家庭狀況)：${r.family_status}`,
    r.identity_restrict && `身份限制：${r.identity_restrict}`,
    r.other_condition && `其他條件：${r.other_condition}`,
    r.region_condition && `區域條件：${r.region_condition}`,
    r.required_docs && `應繳文件：${r.required_docs}`,
    r.notes && `注意事項：${r.notes}`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ── Gemini 輔助：只送有待判讀註記的筆 ─────────────────────
const GEMINI_SCHEMA_HINT = `你是台灣成功大學獎學金資料的審稿員。我會給你一筆獎學金的原始欄位，請依規則輸出 JSON 修正其資格欄位。

只輸出 JSON（不要 markdown 圍欄、不要說明），格式：
{
  "category": "校內" | "政府" | "民間" | "其他",
  "colleges": ["文學院"] | "all" | null,
  "departments": ["心理系"] | "all" | null,
  "identity": ["本國生","僑生","外籍生","原住民","身心障礙" 的子集] | "all" | null,
  "economic_status": ["低收","中低收","清寒","無限制" 的子集] | null,
  "other_requirements": "無法結構化的條件原文（中文）" | null,
  "still_needs_review": true | false
}

規則（保守優先，無法判讀一律 null，不要硬猜）：
- "all"=辦法明確寫「不限」；null=無法判讀。兩者不同。
- colleges/departments：能明確對應到成大的學院/系所才填，否則 null。
- identity：只用列出的 5 種；非標準身分（如「癌症家庭子女」）不要塞進 identity，改寫入 other_requirements、並 still_needs_review=true。
- economic_status：僅在確定是「低收/中低收/清寒/不限」時填；「中低收以上」請填 ["中低收"]；非門檻式（如僅限中低收排除低收）→ null 並寫進 other_requirements、still_needs_review=true。
- category：依名稱與內容判斷是校方/政府/民間/其他來源的獎學金。
- 任何含模糊或需人工確認的條件 → still_needs_review=true。`;

const AI_CACHE_DIR = path.join(__dirname, 'raw', 'ai');

/** 把 Gemini 回傳的合法欄位保守合併進記錄 */
function applyRefinement(rec, out) {
  if (['校內', '政府', '民間', '其他'].includes(out.category)) rec.category = out.category;
  if (out.colleges === 'all' || out.colleges === null || Array.isArray(out.colleges))
    rec.eligibility.colleges = out.colleges;
  if (out.departments === 'all' || out.departments === null || Array.isArray(out.departments))
    rec.eligibility.departments = out.departments;
  if (out.identity === 'all' || out.identity === null || Array.isArray(out.identity))
    rec.eligibility.identity = out.identity;
  if (out.economic_status === null || Array.isArray(out.economic_status))
    rec.eligibility.economic_status = out.economic_status;
  if (typeof out.other_requirements === 'string' || out.other_requirements === null)
    rec.eligibility.other_requirements = out.other_requirements;
  rec.needs_review = out.still_needs_review !== false; // 預設仍需審
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 呼叫單一模型（REST，便於讀取 429 的 retryDelay）。
 * 回傳 { ok, data } 或 { ok:false, quota:boolean, retryMs:number, message }
 */
async function callModel(apiKey, modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    return { ok: false, quota: false, retryMs: 0, message: String(err) };
  }
  const j = await res.json().catch(() => ({}));
  if (res.status === 200) {
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, quota: false, retryMs: 0, message: 'JSON 解析失敗' };
    }
  }
  const quota = res.status === 429 || /RESOURCE_EXHAUSTED/i.test(j.error?.status || '');
  const retry = (j.error?.details || []).find((d) => String(d['@type']).includes('RetryInfo'));
  const retryMs = retry ? Math.ceil(parseFloat(retry.retryDelay) * 1000) || 0 : 0;
  return { ok: false, quota, retryMs, message: j.error?.message || `HTTP ${res.status}` };
}

async function refineWithGemini(records, apiKey) {
  // 多模型輪替：各模型在免費版有獨立 RPM 桶，輪流打可維持速度、極少需等待
  const models = (process.env.GEMINI_MODELS ||
    'gemini-2.5-flash,gemini-flash-lite-latest,gemini-2.0-flash-lite,gemini-2.0-flash')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const baseDelay = Number(process.env.GEMINI_DELAY_MS ?? 1200);
  await fs.mkdir(AI_CACHE_DIR, { recursive: true });

  const limit = process.env.GEMINI_LIMIT ? Number(process.env.GEMINI_LIMIT) : Infinity;
  const targets = records.filter((r) => r.needs_review).slice(0, limit);
  console.log(`  Gemini 輔助 ${targets.length} 筆（輪替模型：${models.join(' / ')}；逐筆快取可續跑）…`);

  // 各模型的冷卻時間戳（毫秒）；尚未冷卻者可用
  const cooldownUntil = new Map(models.map((m) => [m, 0]));
  let ok = 0;
  let fromCache = 0;
  let modelIdx = 0;

  for (let i = 0; i < targets.length; i++) {
    const rec = targets[i];
    const cacheFile = path.join(AI_CACHE_DIR, `${rec.id.replace(/[^\w.-]/g, '_')}.json`);

    const prompt = `${GEMINI_SCHEMA_HINT}\n\n---\n獎學金資料：\n${JSON.stringify(
      { title: rec.title, 站方分類: rec.category, raw_text: rec.raw_text, 目前推測: rec.eligibility, 待判讀: rec._review_notes },
      null, 2
    )}`;
    // 內容定址：payload 變了 → 快取失效重算（資料更新時不會套到舊 AI 結果）
    const hash = crypto.createHash('sha1').update(prompt).digest('hex').slice(0, 12);

    // 1) 先看快取（FORCE_AI=1 可忽略）
    if (process.env.FORCE_AI !== '1') {
      try {
        const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
        if (cached.h === hash) {
          applyRefinement(rec, cached.out);
          fromCache++;
          ok++;
          process.stdout.write(`\r  Gemini 進度 ${i + 1}/${targets.length}（成功 ${ok}，快取 ${fromCache}）`);
          continue;
        }
      } catch {
        /* 無快取或格式不符，往下打 API */
      }
    }

    // 2) 在各模型間輪替嘗試（最多繞所有模型 3 圈）
    let out = null;
    for (let attempt = 0; attempt < models.length * 3 && !out; attempt++) {
      const m = models[modelIdx % models.length];
      modelIdx++;
      const wait = cooldownUntil.get(m) - Date.now();
      if (wait > 0) {
        // 此模型冷卻中：若所有模型都在冷卻，睡到最近一個解凍
        const soonest = Math.min(...models.map((mm) => cooldownUntil.get(mm)));
        if (soonest > Date.now()) await sleep(Math.min(soonest - Date.now(), 5000));
        continue;
      }
      await sleep(baseDelay);
      const r = await callModel(apiKey, m, prompt);
      if (r.ok) {
        out = r.data;
      } else if (r.quota) {
        cooldownUntil.set(m, Date.now() + Math.max(r.retryMs, 3000)); // 進冷卻，換下一個模型
      } else {
        break; // 非配額錯誤（壞資料等）→ 放棄這筆
      }
    }

    if (out) {
      applyRefinement(rec, out);
      await fs.writeFile(cacheFile, JSON.stringify({ h: hash, out }) + '\n', 'utf-8');
      ok++;
    } else {
      rec.needs_review = true; // 失敗保留確定性結果，下次再跑會補
    }
    process.stdout.write(`\r  Gemini 進度 ${i + 1}/${targets.length}（成功 ${ok}，快取 ${fromCache}）`);
  }
  console.log(`\n  Gemini 完成，成功 ${ok} 筆（其中快取 ${fromCache}），未補齊 ${targets.length - ok} 筆`);
}

// ── 主流程 ───────────────────────────────────────────────
async function main() {
  await loadEnvLocal();
  const rawAll = JSON.parse(await fs.readFile(RAW_FILE, 'utf-8'));
  // 濾掉無標題的雜訊筆（站方殘留的空連結）
  const raw = rawAll.filter((r) => (r.title || r._list?.list_title || '').trim());
  const dropped = rawAll.length - raw.length;
  console.log(`▶ 解析 ${raw.length} 筆原始資料${dropped ? `（已濾除 ${dropped} 筆無標題雜訊）` : ''}`);

  const records = raw.map(baseParse);
  const reviewCount = records.filter((r) => r.needs_review).length;
  console.log(`  確定性解析完成；其中 ${reviewCount} 筆有待判讀欄位`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && process.env.NO_GEMINI !== '1') {
    await refineWithGemini(records, apiKey);
  } else {
    console.log('  （未設定 GEMINI_API_KEY 或 NO_GEMINI=1）跳過 AI 輔助，模糊欄位維持 needs_review');
  }

  // 移除內部欄位
  for (const r of records) delete r._review_notes;

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(records, null, 2) + '\n', 'utf-8');

  const finalReview = records.filter((r) => r.needs_review).length;
  console.log(`✔ 完成：public/scholarships.json（${records.length} 筆，needs_review ${finalReview} 筆）`);
}

main().catch((err) => {
  console.error('解析中止：', err);
  process.exit(1);
});
