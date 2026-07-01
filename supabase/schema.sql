-- 成大獎助學金查詢：帳號同步用資料表。
-- 在 Supabase 專案的 SQL Editor 貼上執行一次即可。
-- 設計：每個使用者一列，收藏與快篩條件各存成 jsonb；RLS 確保只能存取自己的資料。

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  favorites  jsonb not null default '{}'::jsonb,  -- { [scholarshipId]: { applied, savedAt } }
  profile    jsonb,                                -- 快篩條件；未設定為 null
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- 只允許使用者存取自己的那一列
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
