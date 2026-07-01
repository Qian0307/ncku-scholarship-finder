# Supabase 設定指南（帳號登入與跨裝置同步）

本站的「Google 登入 + 跨裝置同步」由 [Supabase](https://supabase.com) 提供（客戶端直連 + Row-Level Security，**不需自建後端**）。

> **未設定也能用**：沒有提供 `NEXT_PUBLIC_SUPABASE_*` 環境變數時，登入 UI 會自動隱藏，網站維持純本機（localStorage）模式。以下設定完成後才會啟用帳號功能。

跟著做約 20–30 分鐘。分四大塊：**Supabase 專案 → 資料表 → Google 登入 → 環境變數 → 測試**。

---

## Part A — 建立 Supabase 專案

1. 到 <https://supabase.com> → **Sign in**（可用 GitHub 登入）。
2. **New project**：
   - **Name**：`ncku-scholarship`（隨意）
   - **Database Password**：設一組強密碼並**存好**。
   - **Region**：選 **Southeast Asia (Singapore)**（離台灣最近）。
   - 按 **Create new project**，等 1–2 分鐘初始化。

## Part B — 建立資料表（跑 schema）

1. 左側 **SQL Editor** → **New query**。
2. 打開本專案的 [`supabase/schema.sql`](../supabase/schema.sql)，把整段內容貼進去。
3. 按 **Run**。看到成功、無紅色錯誤即可。
4. 到左側 **Table Editor** 確認出現 `user_data` 表。

> 此 SQL 會建表並啟用 Row-Level Security（每人只能存取自己那列）。

## Part C — 設定 Google 登入

需在 **Google Cloud（拿憑證）** 與 **Supabase（貼憑證）** 之間來回。先記下你的 **Supabase callback 網址**：

```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

`<PROJECT_REF>` 是你的 Supabase 專案代號（**Settings → API** 的 Project URL 可看到）。

### C-1. Google Cloud Console 建立 OAuth 憑證

1. 到 <https://console.cloud.google.com> → 上方建立一個新專案（或用現有的）。
2. **APIs & Services → OAuth consent screen**：
   - User Type 選 **External** → Create。
   - 填 App name（例：`成大獎助學金查詢`）、User support email、Developer contact email。
   - Scopes 這頁**不用加**（預設 email／profile 就夠）→ Save and continue。
   - **要開放所有同學登入**：回到 OAuth consent screen 按 **Publish app**。只用 email/profile 這種非敏感範圍，發布**不需 Google 審核**。
   - 若只想先自己測，可留 **Testing** 並把自己的 Gmail 加到 **Test users**。
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**：
   - Application type：**Web application**。
   - **Authorized JavaScript origins** 加：
     - `http://localhost:3000`
     - `https://<你的正式網域>`（例：`https://ncku-scholarship-finder.pages.dev`）
   - **Authorized redirect URIs** 加上面的 **Supabase callback 網址**：
     - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - Create → 複製 **Client ID** 與 **Client secret**。

### C-2. 回 Supabase 啟用 Google

1. Supabase 左側 **Authentication → Providers → Google**。
2. 開啟 **Enable**，貼上 **Client ID** 與 **Client Secret** → **Save**。

## Part D — 設定 Redirect URLs（很常漏，漏了會登入失敗）

程式登入後會導回 `window.location.origin`，此網址必須在 Supabase 允許清單內：

1. Supabase **Authentication → URL Configuration**：
   - **Site URL**：填正式網域，例 `https://ncku-scholarship-finder.pages.dev`。
   - **Redirect URLs**（逐一 Add URL）：
     - `http://localhost:3000`
     - `https://<你的正式網域>`
     - 如有 Cloudflare preview 網域也加。
   - Save。

## Part E — 取得金鑰、設定環境變數

1. Supabase **Settings → API**：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ⚠️ **不要**用 `service_role` key，那個絕不能放前端。

2. **本機**：專案根目錄 `.env.local` 加入：

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=貼上 anon key
   ```

   然後 `npm run dev`，`http://localhost:3000` 右上角會出現「登入」。

3. **Cloudflare Pages（正式站）**：專案 **Settings → Environment variables**，在 **Production**（建議 Preview 也加）新增這兩個變數 → **儲存後重新部署一次**。

> ⚠️ **常見雷：`NEXT_PUBLIC_` 變數是 build 時打包的。**
> 加了變數之後，必須讓 Cloudflare **用新變數重新 build 一次**才會生效。
> 「Retry deployment」若重跑的是**舊的部署**，會用舊環境重建、不含新變數。
> 最可靠的做法：**推一個新 commit 到 `main`**（觸發全新部署），或在 Deployments 對**最新一筆**重新部署。
> 驗證是否生效：開正式站 → 右上角出現「登入」即成功。

   > `NEXT_PUBLIC_` 是 **build 時**注入，不重新 build 不會生效。

## Part F — 測試

1. 開網站 → 右上「登入」→ 選 Google 帳號 → 導回網站，右上顯示名字。
2. 收藏一筆 → 換裝置（或無痕視窗）登入同一 Google 帳號 → 「我的收藏」應看到同步資料。
3. `/account` 頁可看登入狀態、手動「立即同步」、登出。

---

## 常見問題排解

| 症狀 | 原因與解法 |
| --- | --- |
| `redirect_uri_mismatch` | Google 憑證的 **Authorized redirect URIs** 必須**完全等於** `https://<PROJECT_REF>.supabase.co/auth/v1/callback`（不是你網站網址）。 |
| 登入後轉圈／回不來 | **Part D 的 Redirect URLs 沒加**你目前開啟的網址（含 `localhost`）。 |
| 只有你能登入、別人不行 | OAuth 同意畫面還在 **Testing** → 去 **Publish app**。 |
| 正式站沒出現登入鈕 | Cloudflare 環境變數沒設，或設了但**沒重新部署**。 |
| 專案被暫停 | 免費方案七天無活動會暫停；登入 Supabase 後台點一下即可恢復。 |

---

## 運作原理（簡述）

- 登入採 **Google OAuth（PKCE）**，session 由 Supabase 管理、存在瀏覽器。
- 資料表 `user_data` 每個使用者一列，收藏與快篩條件各存成 `jsonb`。
- **RLS** 保證每人只能讀寫自己那列；前端僅用 `anon` key，安全無虞。
- 登入後：拉遠端 → 與本機**合併**（收藏取聯集）→ 回寫並上傳；之後本機變動去抖動同步。
- 相關程式：`src/lib/supabase.js`、`src/lib/sync.js`、`src/components/AuthProvider.jsx`。
