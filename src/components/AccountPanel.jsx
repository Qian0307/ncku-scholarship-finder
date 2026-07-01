'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { push } from '@/lib/sync';

export default function AccountPanel() {
  const { user, loading, configured, signInWithGoogle, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  if (!configured) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        本站尚未啟用帳號功能。目前收藏與快篩條件只會存在這台裝置的瀏覽器。
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">載入中…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          登入後，你的收藏與快篩條件會跨裝置自動同步（換手機、電腦都看得到）。
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-4 inline-flex items-center rounded-md bg-ncku px-4 py-2 text-sm font-medium text-white hover:bg-ncku-light"
        >
          使用 Google 登入
        </button>
      </div>
    );
  }

  const name = user.user_metadata?.name || user.email;

  const manualSync = async () => {
    setSyncing(true);
    await push(user.id);
    setSyncedAt(new Date());
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">已登入</p>
        <p className="mt-1 font-medium text-slate-900">{name}</p>
        {user.email && name !== user.email && (
          <p className="text-sm text-slate-500">{user.email}</p>
        )}
        <p className="mt-3 text-sm text-slate-600">
          你的收藏與快篩條件會自動同步到雲端，並在其他裝置登入後合併。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={manualSync}
            disabled={syncing}
            className="rounded-md border border-ncku px-3 py-1.5 text-sm font-medium text-ncku hover:bg-ncku/5 disabled:opacity-50"
          >
            {syncing ? '同步中…' : '立即同步'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            登出
          </button>
          {syncedAt && (
            <span className="text-xs text-slate-500">
              已同步 {syncedAt.toLocaleTimeString('zh-TW')}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        登出後，收藏與條件仍會保留在這台裝置的瀏覽器；只是不再與雲端同步。
      </p>
    </div>
  );
}
