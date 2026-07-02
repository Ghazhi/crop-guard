import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { db, type OfflineQueueItem } from '@/lib/offline';

interface SyncResult {
  success: number;
  failed: number;
}

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  photoQueueCount: number;
  queue: OfflineQueueItem[];
  lastSyncedAt: string | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  setQueue: (queue: OfflineQueueItem[]) => void;
  addToQueue: (item: OfflineQueueItem) => void;
  refreshCounts: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  cacheCheckins: (organisationId: string) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  photoQueueCount: 0,
  queue: [],
  lastSyncedAt: null,

  setOnline:       (isOnline)       => set({ isOnline }),
  setSyncing:      (isSyncing)      => set({ isSyncing }),
  setPendingCount: (pendingCount)   => set({ pendingCount }),
  setQueue:        (queue)          => set({ queue, pendingCount: queue.length }),

  addToQueue: (item) =>
    set((state) => ({
      queue: [...state.queue, item],
      pendingCount: state.pendingCount + 1,
    })),

  refreshCounts: async () => {
    const [queueCount, photoCount] = await Promise.all([
      db.queue.count(),
      db.photoQueue.where('synced').equals(0).count(),
    ]);
    const queue = await db.queue.toArray();
    set({ pendingCount: queueCount, photoQueueCount: photoCount, queue });
  },

  syncNow: async (): Promise<SyncResult> => {
    const { isSyncing } = get();
    if (isSyncing) return { success: 0, failed: 0 };

    set({ isSyncing: true });
    const result: SyncResult = { success: 0, failed: 0 };

    try {
      const items = await db.queue.orderBy('createdAt').toArray();
      for (const item of items) {
        try {
          if (item.operation === 'create') {
            const { error } = await (supabase.from(item.table as never) as ReturnType<typeof supabase.from>)
              .insert(item.payload as never);
            if (error) throw error;
          } else if (item.operation === 'update') {
            const { error } = await (supabase.from(item.table as never) as ReturnType<typeof supabase.from>)
              .update(item.payload as never).eq('id', item.recordId);
            if (error) throw error;
          } else if (item.operation === 'delete') {
            const { error } = await (supabase.from(item.table as never) as ReturnType<typeof supabase.from>)
              .delete().eq('id', item.recordId);
            if (error) throw error;
          }
          if (item.id !== undefined) await db.queue.delete(item.id);
          result.success++;
        } catch {
          if (item.id !== undefined) {
            await db.queue.update(item.id, {
              attempts: item.attempts + 1,
              lastError: 'Sync failed',
            });
          }
          result.failed++;
        }
      }

      // Sync unuploaded photos
      const photos = await db.photoQueue.where('synced').equals(0).toArray();
      for (const photo of photos) {
        try {
          const res = await fetch(photo.localPath);
          const blob = await res.blob();
          const { error } = await supabase.storage
            .from(photo.bucket)
            .upload(photo.storagePath, blob, { upsert: true });
          if (!error && photo.id !== undefined) {
            await db.photoQueue.update(photo.id, { synced: true });
          }
        } catch {
          // leave in queue for retry
        }
      }

      set({ lastSyncedAt: new Date().toISOString() });
      await get().refreshCounts();
    } finally {
      set({ isSyncing: false });
    }
    return result;
  },

  cacheCheckins: async (organisationId: string) => {
    try {
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id')
        .eq('organisation_id', organisationId);
      if (!farmers?.length) return;

      const farmerIds = farmers.map(f => f.id);
      const { data: checkins } = await supabase
        .from('farmer_checkins')
        .select('*, farmer_checkin_responses(*)')
        .in('farmer_id', farmerIds)
        .order('created_at', { ascending: false });

      if (checkins) {
        await db.checkins.bulkPut(
          checkins.map(c => ({
            id: c.id,
            farmerId: c.farmer_id,
            weekNumber: c.week_number,
            status: 'submitted' as const,
            data: c as Record<string, unknown>,
            responses: (c.farmer_checkin_responses ?? []).map((r: Record<string, unknown>) => ({
              activityCode: r.activity_code as string,
              pillar: r.pillar as string,
              farmerResponse: r.farmer_response as 'yes' | 'partial' | 'no',
              isFlagged: r.is_flagged as boolean,
              photoUrl: r.photo_url as string | null,
            })),
            cachedAt: new Date().toISOString(),
          }))
        );
      }
    } catch {
      // fail silently — offline caching is best-effort
    }
  },
}));

// Wire up online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
    useOfflineStore.getState().syncNow();
  });
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });
}
