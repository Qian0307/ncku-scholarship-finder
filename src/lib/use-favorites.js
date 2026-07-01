'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getFavorites, getServerFavorites } from './favorites-store';

/** 訂閱收藏 map；靜態輸出階段回傳空物件，掛載後才顯示真實收藏，避免 hydration 不一致 */
export function useFavorites() {
  return useSyncExternalStore(subscribe, getFavorites, getServerFavorites);
}
