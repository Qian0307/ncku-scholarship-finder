#!/usr/bin/env node
/**
 * 成大獎學金系統爬蟲
 * 來源：https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp（老舊 ASP，Big5 編碼）
 *
 * 流程：
 *   1. 逐頁爬列表（?page=N），取得每筆的「獎項編號」與基本欄位
 *   2. 逐筆爬詳情頁（detail.asp?獎項編號=<id>），抽出結構化欄位
 *   3. 原始結果寫入 scripts/raw/details/<id>.json，最後彙整成 scripts/raw/raw.json
 *
 * 設計重點：
 *   - 用 iconv-lite 把 Big5 正確轉成 UTF-8（否則全亂碼）
 *   - 詳情頁 query string 參數名是中文「獎項編號」，需以 Big5 + percent-encode 組 URL
 *   - 有禮貌：請求間隔 ≥1 秒、失敗重試、記錄錯誤
 *   - 可續爬：詳情檔已存在則跳過（FORCE=1 可強制重抓）
 *   - 可獨立執行（為 GitHub Actions cron 預留）
 *
 * 環境變數（皆可選）：
 *   LIST_PAGES    只爬前 N 頁列表（測試用，預設全部）
 *   DETAIL_LIMIT  只爬前 N 筆詳情（測試用，預設全部）
 *   DELAY_MS      請求間隔毫秒（預設 1100）
 *   FORCE         =1 時忽略既有快取重抓
 */

import { load } from 'cheerio';
import iconv from 'iconv-lite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, 'raw');
const DETAIL_DIR = path.join(RAW_DIR, 'details');

const BASE = 'https://sgd.adm.ncku.edu.tw/scholarship/';
const LIST_URL = BASE + 'list_all.asp';

const DELAY_MS = Number(process.env.DELAY_MS ?? 1100);
const MAX_PAGES = process.env.LIST_PAGES ? Number(process.env.LIST_PAGES) : Infinity;
const DETAIL_LIMIT = process.env.DETAIL_LIMIT ? Number(process.env.DETAIL_LIMIT) : Infinity;
const FORCE = process.env.FORCE === '1';

// query string 參數名「獎項編號」的 Big5 + percent-encode 形式
const ID_PARAM = [...iconv.encode('獎項編號', 'big5')]
  .map((b) => '%' + b.toString(16).padStart(2, '0'))
  .join('');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

/** 抓取並把 Big5 解成 UTF-8；失敗會重試 */
async function fetchBig5(url, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NCKU-Scholarship-Finder/0.1 (public non-profit lookup)' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return iconv.decode(buf, 'big5');
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(DELAY_MS * attempt); // 退避
    }
  }
  throw lastErr;
}

const clean = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** 解析單頁列表，回傳 { items, totalPages } */
function parseList(html) {
  const $ = load(html);
  const totalPages = Number(clean($('body').text()).match(/共\s*(\d+)\s*頁/)?.[1] ?? 0);

  const items = [];
  $('a[href*="detail.asp"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const id = decodeURIComponent(href).split('=').pop()?.trim();
    // 合法獎項編號形如 e00112-010 / a1188-220：至少含數字且長度足夠；過濾站方雜訊連結（如 ?獎項編號=a）
    if (!id || id.length < 3 || !/\d/.test(id)) return;
    // 同一列的儲存格：項目 學年 學期 名稱 分類 名額 金額 區域條件 明細
    const tds = $(a).closest('tr').find('td');
    items.push({
      id,
      list_year: clean($(tds[1]).text()),
      list_semester: clean($(tds[2]).text()),
      list_title: clean($(tds[3]).text()),
      list_category: clean($(tds[4]).text()),
      list_quota: clean($(tds[5]).text()),
      list_amount: clean($(tds[6]).text()),
      list_region: clean($(tds[7]).text()),
    });
  });
  return { items, totalPages };
}

// 詳情頁勾選框的固定順序（系統用 8 個無名 checkbox 表達）
const CHECKBOX_LABELS = ['學士', '碩士', '博士', '日間部', '進修部', '全部及格', '未享公費', '未享其它獎'];

/** 解析詳情頁 → 結構化原始資料 */
function parseDetail(html, id) {
  const $ = load(html);

  // 標籤(橘底 span.style4) → 緊鄰的值儲存格
  const fields = {};
  $('span.style4').each((_, span) => {
    const label = clean($(span).text()).replace(/[（(].*?[)）]/g, ''); // 去掉「(家庭狀況)」之類
    const valTd = $(span).closest('td').next('td');
    fields[label] = valTd;
  });
  const text = (label) => clean(fields[label]?.text() ?? '');

  // 勾選框：依文件順序對應固定標籤
  const checks = {};
  $('input[type="checkbox"]').each((i, el) => {
    const label = CHECKBOX_LABELS[i];
    if (label) checks[label] = $(el).attr('checked') != null;
  });

  // 成績條件：值格內的巢狀表，取資料列
  let grade = null;
  const gradeTd = fields['成績條件'];
  if (gradeTd) {
    const rows = gradeTd.find('table tr');
    if (rows.length >= 2) {
      const c = $(rows[1]).find('td').map((_, td) => clean($(td).text())).get();
      grade = {
        identity: c[0] ?? '',
        year: c[1] ?? '',
        semester: c[2] ?? '',
        academic: c[3] ?? '', // 學業成績（百分制）
        pe: c[4] ?? '',       // 體育成績
        conduct: c[5] ?? '',  // 操行成績
        military: c[6] ?? '', // 軍訓成績
        all_pass: c[7] ?? '', // 全部及格
      };
    }
  }

  // 申請表格下載連結：只取「未被註解」的現行連結（cheerio 會自動忽略 <!-- --> 內節點）
  const formUrl =
    $('a[href*="sch_file"]').first().attr('href') ||
    $('a[href*="/song/"]').first().attr('href') ||
    null;

  return {
    id,
    source_url: `${BASE}detail.asp?獎項編號=${id}`,
    form_url: formUrl,
    title: text('獎學金名稱'),
    eng_name: text('英文名稱'),
    short_name: text('簡稱'),
    category: text('獎學金分類'),
    academic_year: text('學年'),
    semester: text('學期'),
    deadline_raw: text('申請期限'),
    quota: text('名額'),
    amount: text('金額'),
    checks,
    dept_condition: text('系所條件'),     // 系所/學院條件，常見「不限」
    family_status: text('身份條件'),       // 身份條件(家庭狀況)，經濟身分相關
    identity_restrict: text('身份限制'),   // 身分別限制
    other_condition: text('其他條件'),     // 自由文字
    region_condition: text('區域條件'),
    grade,
    required_docs: text('應繳文件'),
    notes: text('注意事項'),
    remark: text('備註'),
  };
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

async function main() {
  await fs.mkdir(DETAIL_DIR, { recursive: true });
  console.log(`▶ 開始爬取（間隔 ${DELAY_MS}ms${FORCE ? '，強制重抓' : ''}）`);

  // ── 1. 列表 ─────────────────────────────────────────────
  const first = await fetchBig5(`${LIST_URL}?page=1`);
  const { items: page1, totalPages } = parseList(first);
  const pages = Math.min(totalPages || 1, MAX_PAGES);
  console.log(`  列表共 ${totalPages} 頁，本次爬 ${pages} 頁`);

  const listItems = [...page1];
  for (let p = 2; p <= pages; p++) {
    await sleep(DELAY_MS);
    try {
      const { items } = parseList(await fetchBig5(`${LIST_URL}?page=${p}`));
      listItems.push(...items);
      process.stdout.write(`\r  列表進度 ${p}/${pages}（累計 ${listItems.length} 筆）`);
    } catch (err) {
      errors.push({ stage: 'list', page: p, message: String(err) });
    }
  }
  // 若只爬部分頁，第 1 頁也要納入；去重（同一獎項可能跨頁重覆出現）
  const byId = new Map(listItems.map((it) => [it.id, it]));
  const uniqueList = [...byId.values()];
  console.log(`\n  列表完成，去重後 ${uniqueList.length} 筆`);
  await writeJson(path.join(RAW_DIR, 'list.json'), uniqueList);

  // ── 2. 詳情 ─────────────────────────────────────────────
  const targets = uniqueList.slice(0, DETAIL_LIMIT);
  const records = [];
  let done = 0;
  for (const item of targets) {
    const cacheFile = path.join(DETAIL_DIR, `${item.id.replace(/[^\w.-]/g, '_')}.json`);
    let record;
    if (!FORCE) {
      try {
        record = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      } catch {
        /* 無快取，往下抓 */
      }
    }
    if (!record) {
      await sleep(DELAY_MS);
      try {
        const url = `${BASE}detail.asp?${ID_PARAM}=${encodeURIComponent(item.id)}`;
        record = parseDetail(await fetchBig5(url), item.id);
        // 列表欄位補進來（詳情缺值時可備援）
        record._list = item;
        await writeJson(cacheFile, record);
      } catch (err) {
        errors.push({ stage: 'detail', id: item.id, message: String(err) });
        continue;
      }
    }
    records.push(record);
    done++;
    process.stdout.write(`\r  詳情進度 ${done}/${targets.length}`);
  }
  console.log(`\n  詳情完成，成功 ${records.length} 筆`);

  await writeJson(path.join(RAW_DIR, 'raw.json'), records);
  if (errors.length) {
    await writeJson(path.join(RAW_DIR, 'errors.json'), errors);
    console.log(`⚠ 有 ${errors.length} 筆錯誤，已記錄到 scripts/raw/errors.json`);
  }
  console.log(`✔ 完成：scripts/raw/raw.json（${records.length} 筆）`);
}

main().catch((err) => {
  console.error('爬蟲中止：', err);
  process.exit(1);
});
