'use client';

import { toggleFavorite } from '@/lib/favorites-store';
import { useFavorites } from '@/lib/use-favorites';

/**
 * 收藏切換按鈕。
 * variant="card"：用於列表卡片，點擊不觸發卡片連結跳轉。
 * variant="detail"：用於詳情頁的較大按鈕。
 */
export default function FavoriteButton({ id, variant = 'card' }) {
  const favs = useFavorites();
  const active = Boolean(favs[id]);

  const onClick = (e) => {
    // 卡片本身是連結，避免點收藏時跳頁
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(id);
  };

  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
          active
            ? 'border-ncku bg-ncku text-white hover:bg-ncku/90'
            : 'border-slate-300 bg-white text-slate-700 hover:border-ncku'
        }`}
      >
        {active ? '已收藏' : '加入收藏'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? '移除收藏' : '加入收藏'}
      className={`shrink-0 rounded border px-2 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ncku focus-visible:ring-offset-1 ${
        active
          ? 'border-ncku bg-ncku/10 text-ncku'
          : 'border-slate-300 bg-white text-slate-500 hover:border-ncku hover:text-ncku'
      }`}
    >
      {active ? '已收藏' : '收藏'}
    </button>
  );
}
