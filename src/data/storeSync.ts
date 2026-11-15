export interface StoreSyncCandidate {
  teachers?: any[];
  subjects?: any[];
  classes?: any[];
  departments?: any[];
  rooms?: any[];
  academicYears?: any[];
  schedules?: any[];
  attendanceRecords?: Record<string, any>;
  userAccounts?: any[];
  journals?: any[];
  activeWeekFilter?: string;
  monthlyWeekSchedules?: Record<string, any>;
  lastUpdated?: number;
  lastUpdatedBy?: string;
  isInitialEmpty?: boolean;
  explicitResetAt?: number;
}

export interface AuthoritativeStoreDecision {
  source: 'cloud' | 'server' | 'none';
  chosen: StoreSyncCandidate | null;
  syncCloudFromServer: boolean;
  hydrateServerFromCloud: boolean;
  reason: string;
}

const SYSTEM_PLACEHOLDER_AUTHORS = new Set([
  'System',
  'System Reset',
  'System Fresh Init',
]);

export function hasMeaningfulSchoolData(store?: StoreSyncCandidate | null): boolean {
  if (!store || typeof store !== 'object') return false;
  if (Array.isArray(store.teachers) && store.teachers.length > 0) return true;
  if (Array.isArray(store.subjects) && store.subjects.length > 0) return true;
  if (Array.isArray(store.classes) && store.classes.length > 0) return true;
  if (Array.isArray(store.departments) && store.departments.length > 0) return true;
  if (Array.isArray(store.rooms) && store.rooms.length > 0) return true;
  if (Array.isArray(store.schedules) && store.schedules.length > 0) return true;
  if (Array.isArray(store.journals) && store.journals.length > 0) return true;
  if (store.attendanceRecords && Object.keys(store.attendanceRecords).length > 0) return true;
  if (Array.isArray(store.userAccounts) && store.userAccounts.length > 3) return true;
  if (store.monthlyWeekSchedules && Object.keys(store.monthlyWeekSchedules).length > 0) return true;
  return false;
}

export function isSystemPlaceholderStore(store?: StoreSyncCandidate | null): boolean {
  if (!store || typeof store !== 'object') return true;
  if (hasMeaningfulSchoolData(store)) return false;
  if (store.isInitialEmpty === true) return true;
  if (!store.lastUpdated || store.lastUpdated <= 0) return true;
  if (store.lastUpdatedBy && SYSTEM_PLACEHOLDER_AUTHORS.has(store.lastUpdatedBy)) return true;
  return false;
}

export function countStoreEntities(store?: StoreSyncCandidate | null): number {
  if (!store || typeof store !== 'object') return 0;
  return (
    (Array.isArray(store.teachers) ? store.teachers.length : 0) +
    (Array.isArray(store.subjects) ? store.subjects.length : 0) +
    (Array.isArray(store.classes) ? store.classes.length : 0) +
    (Array.isArray(store.departments) ? store.departments.length : 0) +
    (Array.isArray(store.rooms) ? store.rooms.length : 0) +
    (Array.isArray(store.schedules) ? store.schedules.length : 0) +
    (Array.isArray(store.journals) ? store.journals.length : 0)
  );
}

/**
 * Menentukan sumber database otoritatif antara Cloud Firestore dan server container lokal.
 * Menjamin container server kosong/baru (ephemeral Cloud Run) TIDAK PERNAH menimpa data di Cloud Firestore.
 */
export function pickAuthoritativeStore({
  cloudData,
  serverData,
}: {
  cloudData?: StoreSyncCandidate | null;
  serverData?: StoreSyncCandidate | null;
}): AuthoritativeStoreDecision {
  const hasCloud = Boolean(cloudData && typeof cloudData === 'object');
  const hasServer = Boolean(serverData && typeof serverData === 'object');

  if (!hasCloud && !hasServer) {
    return {
      source: 'none',
      chosen: null,
      syncCloudFromServer: false,
      hydrateServerFromCloud: false,
      reason: 'Tidak ada data cloud maupun server lokal.',
    };
  }

  const cloudMeaningful = hasMeaningfulSchoolData(cloudData);
  const serverMeaningful = hasMeaningfulSchoolData(serverData);
  const cloudPlaceholder = isSystemPlaceholderStore(cloudData);
  const serverPlaceholder = isSystemPlaceholderStore(serverData);

  const cloudTs = typeof cloudData?.lastUpdated === 'number' && !cloudPlaceholder ? cloudData.lastUpdated : 0;
  const serverTs = typeof serverData?.lastUpdated === 'number' && !serverPlaceholder ? serverData.lastUpdated : 0;

  // 1. Jika cloud memiliki data sekolah nyata sedangkan server kosong/placeholder -> Cloud mutlak menang & isi server lokal
  if (hasCloud && cloudMeaningful && !serverMeaningful) {
    return {
      source: 'cloud',
      chosen: cloudData!,
      syncCloudFromServer: false,
      hydrateServerFromCloud: true,
      reason: 'Cloud memiliki data sekolah aktif; server container lokal kosong sehingga dihidrasi dari Cloud.',
    };
  }

  // 2. Jika cloud kosong/belum ada data nyata sedangkan server lokal memiliki data nyata
  if (hasServer && serverMeaningful && !cloudMeaningful) {
    // Jika admin secara eksplisit mereset cloud SETELAH timestamp server lokal, hormati reset cloud
    const explicitResetTs = typeof cloudData?.explicitResetAt === 'number' ? cloudData.explicitResetAt : 0;
    if (hasCloud && explicitResetTs > 0 && explicitResetTs >= serverTs) {
      return {
        source: 'cloud',
        chosen: cloudData!,
        syncCloudFromServer: false,
        hydrateServerFromCloud: true,
        reason: 'Reset eksplisit admin pada Cloud lebih baru dari data server lokal.',
      };
    }

    return {
      source: 'server',
      chosen: serverData!,
      syncCloudFromServer: serverTs > 0 || !hasCloud,
      hydrateServerFromCloud: false,
      reason: 'Server lokal memiliki data sekolah sedangkan Cloud kosong; mengunggah data server ke Cloud.',
    };
  }

  // 3. Keduanya memiliki data sekolah nyata -> bandingkan timestamp valid
  if (hasCloud && hasServer && cloudMeaningful && serverMeaningful) {
    if (serverTs > cloudTs) {
      return {
        source: 'server',
        chosen: serverData!,
        syncCloudFromServer: true,
        hydrateServerFromCloud: false,
        reason: 'Data server lokal memiliki timestamp lebih baru daripada Cloud.',
      };
    }
    return {
      source: 'cloud',
      chosen: cloudData!,
      syncCloudFromServer: false,
      hydrateServerFromCloud: cloudTs > serverTs,
      reason: 'Data Cloud Firestore merupakan versi terbaru dan menjadi acuan utama.',
    };
  }

  // 4. Hanya salah satu yang ada
  if (hasCloud) {
    return {
      source: 'cloud',
      chosen: cloudData!,
      syncCloudFromServer: false,
      hydrateServerFromCloud: cloudTs > serverTs,
      reason: 'Menggunakan state awal dari Cloud Firestore.',
    };
  }

  return {
    source: 'server',
    chosen: serverData!,
    syncCloudFromServer: !serverPlaceholder && serverMeaningful,
    hydrateServerFromCloud: false,
    reason: 'Cloud belum tersedia; menggunakan state server lokal.',
  };
}
