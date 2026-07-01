// 帳號登入後，將收藏與快篩條件同步到 Supabase（每個使用者一列 jsonb）。
// 合併策略：收藏取聯集（applied 為 OR）；profile 以雲端為主、雲端沒有才用本機。
import { supabase } from './supabase';
import { getFavorites, setAllFavorites } from './favorites-store';
import { loadProfile, saveProfile } from './profile-store';

const TABLE = 'user_data';

function mergeFavorites(local = {}, remote = {}) {
  const out = { ...remote };
  for (const [id, l] of Object.entries(local)) {
    const r = out[id];
    if (!r) {
      out[id] = l;
    } else {
      out[id] = {
        applied: Boolean(l.applied || r.applied),
        savedAt: Math.min(l.savedAt ?? Date.now(), r.savedAt ?? Date.now()),
      };
    }
  }
  return out;
}

/** 登入後：拉遠端 → 與本機合併 → 回寫本機並推回雲端 */
export async function pullMergePush(userId) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from(TABLE)
    .select('favorites, profile')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[sync] 讀取失敗：', error.message);
    return;
  }

  const mergedFav = mergeFavorites(getFavorites(), data?.favorites || {});
  setAllFavorites(mergedFav);

  const chosenProfile = data?.profile ?? loadProfile();
  if (chosenProfile) saveProfile(chosenProfile);

  await push(userId);
}

/** 將目前本機的收藏與條件推送到雲端 */
export async function push(userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      favorites: getFavorites(),
      profile: loadProfile(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[sync] 寫入失敗：', error.message);
}
