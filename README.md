# 成大獎助學金查詢 + 資格快篩

協助成功大學（NCKU）學生**查詢**校內外獎助學金，並**快速判斷**自己符合哪些資格。
輕量、公益、**無需登入**，前端純靜態，比對邏輯全在瀏覽器執行。

> 資料整理自[成大獎學金系統](https://sgd.adm.ncku.edu.tw/scholarship/list_all.asp)，僅供參考；實際資格與申請辦法以官方公告為準。

## 功能

- **獎學金列表**：關鍵字搜尋、依類別／年級篩選、隱藏已截止、截止日近者優先。
- **詳情頁**：資格分項、金額、名額、送件方式、應繳文件、申請辦法原文、官方原始連結與**申請表格下載**；無法自動判讀者標示「需人工確認」。
- **資格快篩**：7 步驟表單（年級 → 學院/系所 → 身分別 → 經濟身分 → 特殊身分 → 成績 → 兼領），即時跑出**三態結果**：
  - ✅ 符合｜⚠️ 可能符合（需人工確認）｜❌ 不符合（標出卡點）
  - **保守優先**：任何無法自動判讀的條件一律歸「可能符合」，不誤導學生漏報或白填。
- **列表個人化**：做過快篩後，profile 存在瀏覽器（localStorage，免登入），回列表時每張卡片直接標示符合度，可一鍵「隱藏不符合」。
- **加入行事曆**：詳情頁可把截止日加進 Google 日曆或下載 `.ics`（含截止前 3 天提醒）。
- **常見問題（/faq）**：資料來源、快篩判定方式與相關資源連結。

## 技術

- **Next.js 14（App Router）+ React 18 + Tailwind CSS 3**，靜態輸出（`output: 'export'`）。
- 資料不進資料庫，存成靜態 `public/scholarships.json`（614 筆）。
- 資料 pipeline：爬蟲（`cheerio` + `iconv-lite`）→ **Google Gemini** 輔助解析。
- 部署：**Cloudflare Pages**（產出目錄 `out/`）。

## 快速開始

需要 Node 20+。

```bash
npm install
npm run dev          # http://localhost:3000
```

`public/scholarships.json` 已內含產好的資料，**不重跑 pipeline 也能直接開發**。

## 資料 Pipeline（更新資料時才需要）

```bash
npm run scrape       # 爬列表 62 頁 + 各筆詳情 → scripts/raw/
npm run parse        # 解析 → public/scholarships.json
```

### 爬蟲（`scripts/scraper.mjs`）

- 來源為老舊 ASP 系統、**Big5 編碼**，已用 `iconv-lite` 正確轉 UTF-8。
- 詳情頁 query 參數名是中文「獎項編號」，以 Big5 + percent-encode 組 URL。
- 有禮貌：請求間隔 ≥1 秒、失敗重試退避、錯誤記錄；**可續爬**（詳情逐筆快取於 `scripts/raw/details/`）。
- 可用環境變數調整：`LIST_PAGES`、`DETAIL_LIMIT`、`DELAY_MS`、`FORCE`。

### 解析（`scripts/parser.mjs`）

採「**確定性解析優先 + Gemini 輔助模糊欄位**」：

1. 多數欄位由規則確定性映射（id／截止日／金額／年級／GPA／操行／兼領／經濟／特殊身分／來源分類）。
2. 只有無法規則化的自由文字（具體系所、非標準身分、其他條件）才送 Gemini 判讀。
3. **沒有金鑰也能跑**：模糊欄位維持 `needs_review`、相關維度留 `null`（落入 ⚠️）。

啟用 Gemini：複製 `.env.local.example` 成 `.env.local` 並填入 `GEMINI_API_KEY`（[取得金鑰](https://aistudio.google.com/apikey)）。

- 多模型輪替避開免費版 RPM 限制，逐筆快取於 `scripts/raw/ai/`，**可隨時中斷續跑**。
- 可調 `GEMINI_MODELS`、`GEMINI_DELAY_MS`、`GEMINI_LIMIT`、`NO_GEMINI`、`FORCE_AI`。

> 機敏金鑰只放 `.env.local`，已被 `.gitignore` 排除，**絕不進版控**。

### 自動更新（GitHub Actions）

`.github/workflows/update-data.yml` 會在每週一、四自動重爬＋重新解析，有變更才 commit `public/scholarships.json`（也可在 Actions 頁面手動觸發）。

- 若要在 CI 啟用 AI 輔助：到 repo 的 **Settings → Secrets and variables → Actions** 新增 secret `GEMINI_API_KEY`。沒設也能跑（純確定性解析）。
- Gemini 解析結果以 `actions/cache` 跨次保留；快取為**內容定址**，獎學金內容變動時會自動失效重算。

## 測試

```bash
npm test             # 比對核心 src/lib/matcher 的單元測試
```

涵蓋每個維度的 pass／fail／unknown，以及易錯點（經濟門檻含括、學院/系所聯集、GPA 單位不一致、`null` 不可當 pass）。

## 建置與部署（Cloudflare Pages）

```bash
npm run build        # 產出靜態檔到 out/
```

### 方式 A：Git 連動（建議）

在 Cloudflare Pages 後台 **Connect to Git**，設定：

| 項目 | 值 |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) 或 None |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | `20`（已附 `.nvmrc`） |

> 部署不需要 `GEMINI_API_KEY`；金鑰只在本機跑 pipeline 時使用。

### 方式 B：直接上傳（Wrangler）

```bash
npm run deploy       # = next build + npx wrangler pages deploy out
```

首次會要求登入 Cloudflare；專案設定見 `wrangler.toml`。

## 專案結構

```
.
├── scripts/
│   ├── scraper.mjs           # 爬蟲（Big5 → UTF-8）
│   ├── parser.mjs            # 確定性解析 + Gemini 輔助
│   └── raw/                  # 爬蟲與 AI 快取（gitignore）
├── public/
│   ├── scholarships.json     # 結構化資料（前端讀這個）
│   └── _headers              # Cloudflare 快取／安全標頭
├── src/
│   ├── app/                  # 頁面：列表(/)、詳情(/scholarship/[id])、快篩(/quiz)
│   ├── components/           # ScholarshipBrowser／Card／DeadlineBadge／QuizWizard
│   └── lib/
│       ├── data.js           # 資料載入、排序、篩選輔助
│       ├── constants.js      # 選項與顯示文字
│       ├── ncku-units.js     # 學院→系所選單
│       └── matcher/          # 三態比對核心 + 單元測試
├── next.config.mjs           # output: 'export'
├── wrangler.toml             # Cloudflare Pages 設定
└── CLAUDE.md                 # 專案規格與開發指引
```

## 資料 Schema（摘要）

每筆獎學金：

```jsonc
{
  "id": "e00112-010",
  "title": "獎學金名稱",
  "source_url": "官方詳情連結",
  "category": "校內 | 政府 | 民間 | 其他",
  "deadline": "YYYY-MM-DD 或 null",
  "amount": "金額描述",
  "quota": "名額描述 或 null",
  "apply_docs": "應繳文件／送件方式原文 或 null",
  "submit_methods": ["郵寄", "線上", "E-mail", "親送"] /* 或 null */,
  "form_url": "申請表格下載連結 或 null",
  "eligibility": {
    "year": ["大三", "碩"] /* 或 "all" / null */,
    "colleges": "all" /* 或 ["工學院"] / null */,
    "departments": "all" /* 或 ["機械工程學系"] / null */,
    "identity": "all" /* 或 ["原住民"] / null */,
    "economic_status": ["無限制"] /* 或 ["清寒"] / null */,
    "special_conditions": ["單親家庭"] /* 或 null */,
    "region": ["台南市"] /* 限設籍縣市；"all"=不限戶籍；null=籍貫等無法判讀 */,
    "region_extra": false /* true=另有設籍時間/行政區條件，命中縣市仍歸 ⚠️ */,
    "region_raw": "設籍台南市六個月以上" /* 區域條件原文，供顯示；不限時為 null */,
    "gpa_min": 80 /* 或 0(無門檻) / null */,
    "conduct_note": "操行成績需達 80 分 或 null",
    "other_requirements": "無法結構化的條件原文 或 null",
    "can_combine": true /* 或 false / null */
  },
  "raw_text": "申請辦法原文",
  "needs_review": false
}
```

**哨符約定**：`"all"`／`"無限制"` = 明確不限（該維度 pass）；`null` = 無法判讀（該維度 unknown → ⚠️）。兩者意義不同。

## 授權與免責

本站為非官方公益專案。資料僅供參考，不保證即時與正確；申請前請務必對照官方公告與申請辦法。
```
