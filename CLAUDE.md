# CLAUDE.md

> 成大校內獎助學金查詢 + 資格快篩網站。本檔為 Claude Code 的專案指引，每次 session 開始請先讀完。

## 專案目標

協助成大（NCKU）學生：
1. **查詢**校內獎助學金
2. **快速判斷**自己符合哪些資格（資格快篩）

定位：輕量、公益、無需登入。**不做**登入系統、後台 CRUD、Line 推播、寄信中心（那些是 v2 以後的事）。

## 技術選型

- **Next.js (App Router) + React + Tailwind CSS**
- v1 **不使用資料庫**，獎學金資料存成靜態 `public/scholarships.json`
- 部署目標：**Cloudflare Pages**（靜態輸出 `output: 'export'`）
- AI 解析：**Google Gemini API**，金鑰由 `.env.local` 提供，變數名 `GEMINI_API_KEY`

## 目錄結構

```
.
├── scripts/                # 資料 pipeline（可獨立執行）
│   ├── scraper.mjs         # 爬成大獎學金系統 → raw/*.json
│   ├── parser.mjs          # 呼叫 Gemini 解析 → public/scholarships.json
│   └── raw/                # 爬蟲原始輸出（gitignore 或保留皆可）
├── src/
│   ├── app/                # 頁面（首頁、列表、詳情、資格快篩）
│   ├── components/         # UI 元件
│   └── lib/                # 比對邏輯、資料載入
├── public/
│   └── scholarships.json   # 結構化獎學金資料（前端讀這個）
├── .github/workflows/      # 之後加 cron 自動更新（先預留）
└── CLAUDE.md
```

## 資料來源（重要）

成大獎學金查詢系統：`https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp`

- 約 **614 筆、62 頁**
- ⚠️ **老舊 ASP 系統，極可能是 Big5 編碼** —— 爬蟲務必用 `iconv-lite` 正確轉成 UTF-8，否則全部亂碼
- 寫通用爬蟲前，**先抓一筆實際頁面確認 HTML 結構與編碼**
- 爬蟲要有禮貌：請求間隔（建議 ≥1 秒）、可重試、失敗記錄；**不要短時間大量打站**

## 資料 Schema

`public/scholarships.json` 為陣列，每筆：

```json
{
  "id": "字串",
  "title": "獎學金名稱",
  "source_url": "詳情連結",
  "category": "校內 / 政府 / 民間 等",
  "deadline": "YYYY-MM-DD 或 null",
  "amount": "金額描述字串",
  "eligibility": {
    "year": ["大一","大二","大三","大四","碩","博"],
    "colleges": ["文學院"],
    "departments": ["心理系"],
    "identity": ["本國生","僑生","外籍生","原住民","身心障礙"],
    "economic_status": ["低收","中低收","清寒","無限制"],
    "gpa_min": null,
    "conduct_note": "操行/其他成績要求文字 或 null",
    "other_requirements": "無法結構化的條件原文",
    "can_combine": null
  },
  "raw_text": "申請辦法原文",
  "needs_review": false
}
```

- `year` / `colleges` / `departments` 若全校適用，填字串 `"all"` 而非陣列
- `gpa_min` / `can_combine` 無法判讀時填 `null`，**不要硬猜**
- 解析有任何不確定 → 該筆 `needs_review: true`

## 核心功能：資格快篩（三態比對）

申請辦法常含無法自動判讀的條件（如「家境清寒且品學兼優」），所以比對結果**必須三態，不可二元**：

- ✅ **符合**
- ⚠️ **可能符合**：含 `other_requirements`、`needs_review`、或任何無法自動判讀的條件 → 提示「需人工確認」
- ❌ **不符合**：可摺疊，並說明卡在哪個條件

**比對黃金原則：保守優先。** 任何無法自動判讀的條件，一律歸「可能符合」而非「符合」，避免誤導學生漏報或白填。

系所/學院比對要處理層級：「全校(all)」⊇「特定學院」⊇「特定系所」，學生只要落在範圍內即視為該維度通過。

## 開發階段（依序，每階段先驗收）

- **Phase 1** — 資料 pipeline：`scraper.mjs` → `parser.mjs` → `scholarships.json`
- **Phase 2** — 查詢介面：搜尋 + 篩選（類別、年級、截止日近的優先）、列表卡片、詳情頁
- **Phase 3** — 資格快篩精靈：多步驟表單（年級 → 學院/系所 → 身分別 → 經濟身分 → GPA → 是否已領其他獎學金）→ 三態結果分區呈現

## 常用指令

```bash
npm run dev              # 本機開發
npm run scrape           # 執行爬蟲（scripts/scraper.mjs）
npm run parse            # Gemini 解析（scripts/parser.mjs）
npm run build            # 靜態輸出（Cloudflare Pages）
```
> 若上述 script 尚未建立，請在 package.json 補上對應指令。

## 慣例

- 程式碼註解、commit 訊息、UI 文案一律用**繁體中文**
- UI 乾淨清楚、響應式即可，不過度設計
- pipeline 腳本要能**獨立執行**（為之後的 GitHub Actions cron 預留）
- 機敏金鑰只放 `.env.local`，絕不寫進程式碼或 commit

## 暫時不要做

登入 / 資料庫 / 後台編輯 / 寄信 / Line / SerpApi。這些等 v1 跑順再說。

---

# 資格比對規格（lib/matcher）

資格快篩的核心邏輯，**全部集中在 `src/lib/matcher/`**，前端只負責收集輸入與呈現，不夾帶判斷邏輯。

## 學生輸入 (StudentProfile)

```js
{
  year: "大三",                       // 單選
  college: "規劃設計學院",            // 學院（先選）
  department: "都市計劃學系",          // 系所（依學院過濾後選）
  identities: ["本國生"],            // 可複選：本國生/僑生/外籍生/原住民/身心障礙
  economic: "無",                    // 單選：無/清寒/中低收/低收
  gpa: 85,                           // 學業平均（百分制，NCKU 成績單為準）
  hasOtherScholarship: false         // 是否已領其他獎學金
}
```
> 學院先選、系所再選 → 同時握有 college 與 department，**不需要 dept→college 對照表**。

## 三態判定

每個維度先各自產出 `'pass' | 'fail' | 'unknown'`，再彙總：

| 彙總條件 | 結果 |
| --- | --- |
| 任一維度 `fail` | ❌ 不符合（記錄卡在哪些維度） |
| 無 fail，但有 `unknown`，或該筆 `needs_review`，或 `other_requirements` 非空 | ⚠️ 可能符合（列出需人工確認的點） |
| 全部 `pass` | ✅ 符合 |

**`null` 與 `"all"`/`"無限制"` 意義不同**（parser 必須區分）：
- `"all"` / `"無限制"`＝辦法明確寫「不限」→ 該維度 `pass`
- `null`＝無法判讀 → 該維度 `unknown`（落入 ⚠️，不要當成 pass）

## 各維度規則

**年級 (year)**
- `"all"` → pass｜學生年級 ∈ 清單 → pass｜清單非空且不在內 → fail｜`null` → unknown

**學院/系所 (unit) — 層級聯集**
- 關係：全校(all) ⊇ 學院 ⊇ 系所；採**聯集**（落在任一允許單位即通過）
- `colleges=="all"` 且 `departments=="all"` → pass
- 其餘：`學生.college ∈ colleges` **或** `學生.department ∈ departments` → pass
  - 其中 `colleges=="all"` 視為學院這條不設限、只看系所；`departments=="all"` 反之
- 兩者皆具體且都不命中 → fail｜兩者皆 `null` → unknown

**身分別 (identity)**
- 取交集：`學生.identities ∩ 辦法.identity ≠ ∅` → pass
- 辦法清單非空且交集為空 → fail（如辦法限原住民、學生非原住民）
- 辦法為 `null` → unknown
- 提醒：原住民/身心障礙/僑生/外籍生多為「限定」性質，本國生為一般身分

**經濟身分 (economic) — 含括關係（門檻制）**
- 等級：`無=0 < 清寒=1 < 中低收=2 < 低收=3`（越弱勢等級越高，可滿足較低門檻）
- 門檻 = 辦法允許清單中**最低**的等級；`學生.economic 等級 ≥ 門檻` → pass
  - 例：辦法允許 `["中低收"]` → 門檻=2 → 低收(3)、中低收(2) pass；清寒(1)、無(0) fail（即「中低收以上」）
  - 例：辦法允許 `["低收"]` → 門檻=3 → 僅低收 pass
  - 辦法 `["無限制"]` → 門檻=0 → 全 pass
- 辦法為 `null` → unknown
- ⚠️ 例外：少數獎學金「僅限中低收、排除低收」這種非門檻式 → parser 應寫進 `other_requirements` 並標 `needs_review`，比對歸 unknown，**不要硬套門檻**

**成績 (gpa) — 邊界與單位**
- 一律含等號：`學生.gpa ≥ gpa_min` → pass；`<` → fail
- `gpa_min` 為 `null` → unknown
- ⚠️ **單位一致性**：本專案學生輸入為百分制；若辦法門檻是 GPA 4.3 制或「全班前 X%」→ parser 標 `needs_review`、`gpa_min` 留 `null`，比對歸 unknown，**禁止跨制換算硬比**

**兼領 (combine)**
- `can_combine===true` → pass
- `can_combine===false`：學生已領其他獎學金 → fail；未領 → pass
- `can_combine===null`：學生已領 → unknown；未領 → pass

## 參考骨架

```js
// src/lib/matcher/index.js
const ECON_RANK = { '無': 0, '無限制': 0, '清寒': 1, '中低收': 2, '低收': 3 };

// 各 check 回傳 { verdict: 'pass'|'fail'|'unknown', reason: string }
export function matchStudent(student, s) {
  const e = s.eligibility;
  const checks = {
    year:     checkYear(student, e),
    unit:     checkUnit(student, e),
    identity: checkIdentity(student, e),
    economic: checkEconomic(student, e),
    gpa:      checkGpa(student, e),
    combine:  checkCombine(student, e),
  };
  return aggregate(checks, s);
}

function aggregate(checks, s) {
  const entries = Object.entries(checks);
  const failed = entries.filter(([, c]) => c.verdict === 'fail');
  if (failed.length) return { state: 'no', reasons: failed, checks };

  const unsure = entries.filter(([, c]) => c.verdict === 'unknown');
  const hasFreeText = Boolean(s.eligibility.other_requirements) || s.needs_review === true;
  if (unsure.length || hasFreeText) {
    return { state: 'maybe', reasons: unsure, hasFreeText, checks };
  }
  return { state: 'yes', checks };
}
```

## 測試要求

`src/lib/matcher/` 要附單元測試，**每個維度至少涵蓋 pass / fail / unknown 三種情況**，並針對下列易錯點各寫一例：
- 經濟身分門檻（低收去申請「中低收以上」應 pass）
- 學院/系所聯集（學生系所不在清單、但學院在 → pass）
- GPA 單位不一致 → 應落入 ⚠️ 而非誤判
- `null` 不可被當成 `pass`
