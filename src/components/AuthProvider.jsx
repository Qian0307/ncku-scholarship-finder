'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { subscribe as subscribeFavorites } from '@/lib/favorites-store';
import { subscribeProfile } from '@/lib/profile-store';
import { pullMergePush, push } from '@/lib/sync';

const AuthContext = createContext({
  user: null,
  loading: true,
  configured: false,
  signInWithGoogle: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

/** 提供登入狀態，並在登入後同步收藏/條件到雲端；未設定 Supabase 時完全不作用。 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const userRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      userRef.current = u;
      setUser(u);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      userRef.current = u;
      setUser(u);
      if (event === 'SIGNED_IN' && u) pullMergePush(u.id);
    });

    // 本機收藏/條件變動 → 去抖動推送到雲端（登入時才推）
    let timer;
    const onLocalChange = () => {
      if (!userRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => push(userRef.current.id), 1000);
    };
    const unFav = subscribeFavorites(onLocalChange);
    const unProfile = subscribeProfile(onLocalChange);

    return () => {
      sub.subscription.unsubscribe();
      unFav();
      unProfile();
      clearTimeout(timer);
    };
  }, []);

  const signInWithGoogle = () => {
    if (!supabase) return;
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = () => supabase?.auth.signOut();

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: isSupabaseConfigured, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
