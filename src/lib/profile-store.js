// 快篩 profile 的瀏覽器端儲存（localStorage，免登入個人化）。

const PROFILE_KEY = 'ncku_quiz_profile_v1';

export function loadProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* 忽略（隱私模式等） */
  }
}

export function clearProfile() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* 忽略 */
  }
}
