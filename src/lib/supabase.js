// Supabase 用戶端（僅在瀏覽器/client component 使用）。
// 未設定環境變數時 supabase 為 null → 全站優雅降級為「純本機（localStorage）」模式，
// 登入相關 UI 一律隱藏，既有功能不受影響。
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // OAuth 導回後自動換 session
        flowType: 'pkce',
      },
    })
  : null;
