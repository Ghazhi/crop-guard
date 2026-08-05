import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface PagePerms {
  can_view: boolean;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface PermissionsState {
  /** page_key → perms for the currently signed-in user's custom role */
  perms: Record<string, PagePerms>;
  customRoleId: string | null;
  loaded: boolean;
  /** Call after profile loads. Pass null if user has no custom role. */
  load: (customRoleId: string | null) => Promise<void>;
  reset: () => void;
  canView:   (pageKey: string) => boolean;
  canCreate: (pageKey: string) => boolean;
  canRead:   (pageKey: string) => boolean;
  canUpdate: (pageKey: string) => boolean;
  canDelete: (pageKey: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  perms: {},
  customRoleId: null,
  loaded: false,

  load: async (customRoleId) => {
    if (!customRoleId) {
      set({ perms: {}, customRoleId: null, loaded: true });
      return;
    }
    // skip if already loaded for same role
    if (get().loaded && get().customRoleId === customRoleId) return;
    const { data } = await supabase
      .from('custom_role_permissions')
      .select('page_key, can_view, can_create, can_read, can_update, can_delete')
      .eq('role_id', customRoleId);
    const map: Record<string, PagePerms> = {};
    (data ?? []).forEach((p: any) => {
      map[p.page_key] = {
        can_view:   p.can_view,
        can_create: p.can_create,
        can_read:   p.can_read,
        can_update: p.can_update,
        can_delete: p.can_delete,
      };
    });
    set({ perms: map, customRoleId, loaded: true });
  },

  reset: () => set({ perms: {}, customRoleId: null, loaded: false }),

  // If user has no custom role → full access (return true).
  // If user has a custom role but page not in map → deny (return false).
  canView:   (k) => !get().customRoleId ? true : (get().perms[k]?.can_view   ?? false),
  canCreate: (k) => !get().customRoleId ? true : (get().perms[k]?.can_create ?? false),
  canRead:   (k) => !get().customRoleId ? true : (get().perms[k]?.can_read   ?? false),
  canUpdate: (k) => !get().customRoleId ? true : (get().perms[k]?.can_update ?? false),
  canDelete: (k) => !get().customRoleId ? true : (get().perms[k]?.can_delete ?? false),
}));
