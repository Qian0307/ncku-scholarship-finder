// 收藏清單的瀏覽器端儲存（localStorage，免登入）。
// 資料結構：{ [id]: { applied: boolean, savedAt: number } }
// 提供 useSyncExternalStore 友善的 subscribe/getSnapshot，讓卡片與清單頁即時同步。

const KEY = 'ncku_favorites_v1';

let cache = null; // 記憶體快取，避免每次讀 localStorage
const listeners = new Set();

function read() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map) {
  cache = map;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(map));
    } catch {
      /* 忽略（隱私模式等） */
    }
  }
  listeners.forEach((l) => l());
}

/** 取得目前收藏 map（同一參考在未變更前保持穩定，供 useSyncExternalStore 使用） */
export function getFavorites() {
  if (cache === null) cache = read();
  return cache;
}

/** 供 SSR/靜態輸出使用的空快照 */
export function getServerFavorites() {
  return EMPTY;
}
const EMPTY = {};

export function subscribe(listener) {
  listeners.add(listener);
  // 跨分頁同步
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = read();
      listener();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function isFavorite(id) {
  return Boolean(getFavorites()[id]);
}

/** 加入或移除收藏；回傳操作後是否為已收藏 */
export function toggleFavorite(id) {
  const map = { ...getFavorites() };
  if (map[id]) {
    delete map[id];
    write(map);
    return false;
  }
  map[id] = { applied: false, savedAt: Date.now() };
  write(map);
  return true;
}

export function removeFavorite(id) {
  const map = { ...getFavorites() };
  if (map[id]) {
    delete map[id];
    write(map);
  }
}

/** 設定「已申請」狀態 */
export function setApplied(id, applied) {
  const map = { ...getFavorites() };
  if (!map[id]) map[id] = { savedAt: Date.now() };
  map[id] = { ...map[id], applied: Boolean(applied) };
  write(map);
}

export function clearFavorites() {
  write({});
}

/** 以整份 map 覆寫（雲端同步 merge 後回寫用） */
export function setAllFavorites(map) {
  write({ ...map });
}
