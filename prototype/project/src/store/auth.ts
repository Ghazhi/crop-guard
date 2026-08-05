import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types';
import type { User as AuthUser, Session } from '@supabase/supabase-js';
import { usePermissionsStore } from '@/store/permissions';

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
    set({ loading: true });
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    get().setProfile(data ?? null);
    // Load page permissions for this user's custom role (if any)
    await usePermissionsStore.getState().load((data as any)?.custom_role_id ?? null);
    set({ loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    usePermissionsStore.getState().reset();
    set({ authUser: null, session: null, profile: null, role: null });
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        get().fetchProfile(session.user.id).then(() => {
          set({ session, authUser: session.user, initialized: true });
        });
      } else {
        set({ session, authUser: null, initialized: true });
      }
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
