import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types';
import type { User as AuthUser, Session } from '@supabase/supabase-js';

interface AuthState {
  authUser:    AuthUser | null;
  session:     Session | null;
  profile:     User | null;
  role:        UserRole | null;
  loading:     boolean;
  initialized: boolean;
  setSession:    (session: Session | null) => void;
  setProfile:    (profile: User | null) => void;
  fetchProfile:  (userId: string) => Promise<void>;
  signOut:       () => Promise<void>;
  initialize:    () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authUser:    null,
  session:     null,
  profile:     null,
  role:        null,
  loading:     false,
  initialized: false,

  setSession: (session) => set({ session, authUser: session?.user ?? null }),

  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    get().setProfile(data ?? null);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ authUser: null, session: null, profile: null, role: null });
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, authUser: session?.user ?? null, initialized: true });
      if (session?.user) get().fetchProfile(session.user.id);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        set({ session, authUser: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null, role: null });
        }
      })();
    });
  },
}));
