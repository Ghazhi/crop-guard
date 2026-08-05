import Dexie, { type Table } from 'dexie';

/* ── Interfaces ──────────────────────────────────────────── */

export interface OfflineFarmer {
  id: string;
  data: Record<string, unknown>;
  syncedAt?: string;
  organisationId?: string;
  cachedAt?: string;
}

export interface OfflineCheckin {
  id: string;
  farmerId: string;
  weekNumber: number;
  status: 'submitted' | 'pending_verification' | 'verified';
  data: Record<string, unknown>;
  responses: OfflineCheckinResponse[];
  cachedAt: string;
}

export interface OfflineCheckinResponse {
  activityCode: string;
  pillar: string;
  farmerResponse: 'yes' | 'partial' | 'no';
  agentResponse?: 'yes' | 'partial' | 'no';
  isFlagged: boolean;
  photoUrl?: string | null;
  evidenceUrl?: string | null;
}

export interface OfflineVerificationDraft {
  id: string;                        // checkin_id
  farmerId: string;
  weekNumber: number;
  agentId: string;
  activities: OfflineVerificationActivity[];
  startedAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface OfflineVerificationActivity {
  activityCode: string;
  pillar: string;
  farmerResponse: 'yes' | 'partial' | 'no';
  agentVerified?: boolean;
  agentResponse?: 'yes' | 'partial' | 'no';
  evidenceUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
}

export interface OfflinePhotoQueue {
  id?: number;
  localPath: string;         // object-URL from camera/gallery
  bucket: string;
  storagePath: string;
  relatedTable: string;
  relatedId: string;
  fieldName: string;
  uploadedUrl?: string;
  createdAt: string;
  synced: boolean;
}

export interface OfflineGPSLog {
  id?: number;
  farmerId?: string;
  verificationId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  recordedAt: string;
  synced: boolean;
}

export interface OfflineConfig {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface OfflineQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

/* ── Dexie DB ────────────────────────────────────────────── */

class CropGuardDB extends Dexie {
  farmers!: Table<OfflineFarmer>;
  checkins!: Table<OfflineCheckin>;
  verificationDrafts!: Table<OfflineVerificationDraft>;
  photoQueue!: Table<OfflinePhotoQueue>;
  gpsLog!: Table<OfflineGPSLog>;
  config!: Table<OfflineConfig>;
  queue!: Table<OfflineQueueItem>;

  constructor() {
    super('cropguard_offline');
    this.version(2).stores({
      farmers:            'id, organisationId, cachedAt',
      checkins:           'id, farmerId, weekNumber, status, cachedAt',
      verificationDrafts: 'id, farmerId, weekNumber, agentId, synced',
      photoQueue:         '++id, relatedId, synced, createdAt',
      gpsLog:             '++id, farmerId, verificationId, synced',
      config:             'key',
      queue:              '++id, table, recordId, createdAt, attempts',
    });
  }
}

export const db = new CropGuardDB();
