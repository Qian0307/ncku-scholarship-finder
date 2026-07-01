'use client';

import { useAuth } from './AuthProvider';

/** 導覽列的登入/帳號入口。未設定 Supabase 或載入中時不顯示。 */
export default function AuthButton() {
  const { user, loading, configured, signInWithGoogle } = useAuth();
  if (!configured || loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={signInWithGoogle}
        className="rounded bg-white/15 px-2.5 py-1 text-sm font-medium text-white hover:bg-white/25"
      >
        登入
      </button>
    );
  }

  const name = user.user_metadata?.name || user.email || '我的帳號';
  return (
    <a
      href="/account/"
      className="max-w-[8rem] truncate rounded bg-white/15 px-2.5 py-1 text-sm font-medium text-white hover:bg-white/25"
      title={name}
    >
      {name}
    </a>
  );
}
