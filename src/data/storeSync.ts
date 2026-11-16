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

  // 3. Keduanya memiliki data sekolah nyata -> Cloud Firestore terpusat selalu menjadi acuan otoritatif
  // agar container server lokal atau clock-skew perangkat lain TIDAK PERNAH menimpa jadwal/jurnal di Cloud.
  if (hasCloud && hasServer && cloudMeaningful && serverMeaningful) {
    return {
      source: 'cloud',
      chosen: cloudData!,
      syncCloudFromServer: false,
      hydrateServerFromCloud: cloudTs > serverTs || countStoreEntities(cloudData) !== countStoreEntities(serverData),
      reason: 'Cloud Firestore menjadi sumber otoritatif utama agar data antar perangkat tidak saling menimpa.',
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

export interface ScheduleDelta {
  upserts: any[];
  deleteIds: string[];
  replaceAll?: any[];
  replaceClassScope?: {
    classId: string;
    weekType?: string;
    items: any[];
  };
}

export function createEmptyScheduleDelta(): ScheduleDelta {
  return {
    upserts: [],
    deleteIds: [],
  };
}

export function hasScheduleDeltaChanges(delta?: ScheduleDelta | null): boolean {
  if (!delta) return false;
  if (delta.replaceAll !== undefined) return true;
  if (delta.replaceClassScope !== undefined) return true;
  if (delta.upserts.length > 0) return true;
  if (delta.deleteIds.length > 0) return true;
  return false;
}

/**
 * Menggabungkan perubahan jadwal lokal (tambah/ubah/hapus/impor per kelas & pekan)
 * di atas daftar jadwal terbaru dari Cloud Firestore secara atomik sehingga
 * jadwal guru lain yang masuk bersamaan TIDAK PERNAH tertimpa atau hilang.
 */
export function mergeSchedulesWithDelta(
  remoteSchedules: any[] | undefined | null,
  delta: ScheduleDelta
): any[] {
  if (delta.replaceAll !== undefined) {
    return [...delta.replaceAll];
  }

  let result = Array.isArray(remoteSchedules) ? [...remoteSchedules] : [];

  if (delta.replaceClassScope) {
    const { classId, weekType, items } = delta.replaceClassScope;
    const scopeWeek = weekType && weekType !== 'ALL' ? weekType : null;
    result = result.filter((s) => {
      if (!s || s.classId !== classId) return true;
      if (!scopeWeek) return false;
      // Hanya ganti slot pada kelas & pekan yang sama, pertahankan pekan rotasi lainnya
      const itemWeek = s.weekType || null;
      return itemWeek !== null && itemWeek !== scopeWeek;
    });
    const newIds = new Set(items.map((x) => x?.id).filter(Boolean));
    result = result.filter((s) => !s?.id || !newIds.has(s.id));
    result.push(...items);
  }

  if (delta.deleteIds.length > 0) {
    const deleteSet = new Set(delta.deleteIds);
    result = result.filter((s) => !s?.id || !deleteSet.has(s.id));
  }

  if (delta.upserts.length > 0) {
    const upsertMap = new Map<string, any>();
    for (const item of delta.upserts) {
      if (item && item.id) {
        upsertMap.set(item.id, item);
      }
    }
    const seen = new Set<string>();
    result = result.map((existing) => {
      if (existing?.id && upsertMap.has(existing.id)) {
        seen.add(existing.id);
        return upsertMap.get(existing.id);
      }
      return existing;
    });
    for (const [id, item] of upsertMap.entries()) {
      if (!seen.has(id)) {
        result.push(item);
      }
    }
  }

  // Deduplikasi akhir berdasarkan id (pertahankan entri terbaru)
  const dedupedReversed: any[] = [];
  const seenFinal = new Set<string>();
  for (let i = result.length - 1; i >= 0; i--) {
    const item = result[i];
    if (!item) continue;
    if (item.id) {
      if (seenFinal.has(item.id)) continue;
      seenFinal.add(item.id);
    }
    dedupedReversed.push(item);
  }
  return dedupedReversed.reverse();
}

export interface JournalDelta {
  upserts: any[];
  deleteIds: string[];
  replaceAll?: any[];
}

export function createEmptyJournalDelta(): JournalDelta {
  return {
    upserts: [],
    deleteIds: [],
  };
}

export function hasJournalDeltaChanges(delta?: JournalDelta | null): boolean {
  if (!delta) return false;
  if (delta.replaceAll !== undefined) return true;
  if (delta.upserts.length > 0) return true;
  if (delta.deleteIds.length > 0) return true;
  return false;
}

/**
 * Menggabungkan perubahan jurnal mengajar secara atomik di atas data Cloud terbaru
 * agar penginputan jurnal oleh banyak guru bersamaan tidak saling menimpa.
 */
export function mergeJournalsWithDelta(
  remoteJournals: any[] | undefined | null,
  delta: JournalDelta
): any[] {
  if (delta.replaceAll !== undefined) {
    return [...delta.replaceAll];
  }

  let result = Array.isArray(remoteJournals) ? [...remoteJournals] : [];

  if (delta.deleteIds.length > 0) {
    const deleteSet = new Set(delta.deleteIds);
    result = result.filter((j) => !j?.id || !deleteSet.has(j.id));
  }

  if (delta.upserts.length > 0) {
    const upsertMap = new Map<string, any>();
    for (const item of delta.upserts) {
      if (item && item.id) {
        upsertMap.set(item.id, item);
      }
    }
    const seen = new Set<string>();
    result = result.map((existing) => {
      if (existing?.id && upsertMap.has(existing.id)) {
        seen.add(existing.id);
        return upsertMap.get(existing.id);
      }
      return existing;
    });
    // Jurnal baru ditaruh di paling atas sesuai urutan terbaru
    const inserted: any[] = [];
    for (const item of delta.upserts) {
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id);
        inserted.push(item);
      }
    }
    result = [...inserted, ...result];
  }

  const deduped: any[] = [];
  const seenFinal = new Set<string>();
  for (const item of result) {
    if (!item) continue;
    if (item.id) {
      if (seenFinal.has(item.id)) continue;
      seenFinal.add(item.id);
    }
    deduped.push(item);
  }
  return deduped;
}

export interface AttendanceDelta {
  upserts: Record<string, any>;
  deleteKeys: string[];
  replaceAll?: Record<string, any>;
}

export function createEmptyAttendanceDelta(): AttendanceDelta {
  return {
    upserts: {},
    deleteKeys: [],
  };
}

export function hasAttendanceDeltaChanges(delta?: AttendanceDelta | null): boolean {
  if (!delta) return false;
  if (delta.replaceAll !== undefined) return true;
  if (Object.keys(delta.upserts).length > 0) return true;
  if (delta.deleteKeys.length > 0) return true;
  return false;
}

/**
 * Menggabungkan catatan kehadiran/konfirmasi KBM guru & piket secara atomik
 * berdasarkan scheduleId key agar tidak saling menimpa antar guru/piket.
 */
export function mergeAttendanceWithDelta(
  remoteAttendance: Record<string, any> | undefined | null,
  delta: AttendanceDelta
): Record<string, any> {
  if (delta.replaceAll !== undefined) {
    return { ...delta.replaceAll };
  }

  const result: Record<string, any> =
    remoteAttendance && typeof remoteAttendance === 'object' ? { ...remoteAttendance } : {};

  for (const key of delta.deleteKeys) {
    delete result[key];
  }

  for (const [key, val] of Object.entries(delta.upserts)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }

  return result;
}

export interface EntityDelta<T = any> {
  upserts: T[];
  deleteIds: string[];
  replaceAll?: T[];
}

export function createEmptyEntityDelta<T = any>(): EntityDelta<T> {
  return {
    upserts: [],
    deleteIds: [],
  };
}

export function hasEntityDeltaChanges<T = any>(delta?: EntityDelta<T> | null): boolean {
  if (!delta) return false;
  if (delta.replaceAll !== undefined) return true;
  if (delta.upserts.length > 0) return true;
  if (delta.deleteIds.length > 0) return true;
  return false;
}

export function recordEntityDeltaPatch<T extends { id?: string }>(
  current: EntityDelta<T>,
  patch: Partial<EntityDelta<T>>
): EntityDelta<T> {
  if (patch.replaceAll !== undefined) {
    return {
      upserts: [],
      deleteIds: [],
      replaceAll: [...patch.replaceAll],
    };
  }

  let deleteIds = [...current.deleteIds];
  let upserts = [...current.upserts];

  if (patch.deleteIds && patch.deleteIds.length > 0) {
    const delSet = new Set([...deleteIds, ...patch.deleteIds]);
    deleteIds = Array.from(delSet);
    upserts = upserts.filter((u) => !u?.id || !delSet.has(u.id));
  }

  if (patch.upserts && patch.upserts.length > 0) {
    const upsertIds = new Set(patch.upserts.map((u) => u?.id).filter(Boolean) as string[]);
    deleteIds = deleteIds.filter((id) => !upsertIds.has(id));
    const map = new Map<string, T>();
    upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    patch.upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    upserts = Array.from(map.values());
  }

  return {
    upserts,
    deleteIds,
    ...(current.replaceAll !== undefined ? { replaceAll: current.replaceAll } : {}),
  };
}

export function combineEntityDeltas<T extends { id?: string }>(
  older: EntityDelta<T> | null | undefined,
  newer: EntityDelta<T>
): EntityDelta<T> {
  if (!older || !hasEntityDeltaChanges(older)) {
    return newer;
  }
  if (!hasEntityDeltaChanges(newer)) {
    return older;
  }
  if (newer.replaceAll !== undefined) {
    return { ...newer };
  }
  if (older.replaceAll !== undefined) {
    return {
      upserts: [],
      deleteIds: [],
      replaceAll: mergeEntitiesWithDelta(older.replaceAll, newer),
    };
  }
  return recordEntityDeltaPatch(older, newer);
}

/**
 * Menggabungkan perubahan data master (guru, akun, mapel, kelas, ruang, jurusan, tahun pelajaran)
 * secara atomik di atas daftar terbaru dari Cloud Firestore berdasarkan id.
 */
export function mergeEntitiesWithDelta<T extends { id?: string }>(
  remoteList: T[] | undefined | null,
  delta: EntityDelta<T>
): T[] {
  if (delta.replaceAll !== undefined) {
    return [...delta.replaceAll];
  }

  let result = Array.isArray(remoteList) ? [...remoteList] : [];

  if (delta.deleteIds.length > 0) {
    const deleteSet = new Set(delta.deleteIds);
    result = result.filter((item) => !item?.id || !deleteSet.has(item.id));
  }

  if (delta.upserts.length > 0) {
    const upsertMap = new Map<string, T>();
    for (const item of delta.upserts) {
      if (item && item.id) {
        upsertMap.set(item.id, item);
      }
    }
    const seen = new Set<string>();
    result = result.map((existing) => {
      if (existing?.id && upsertMap.has(existing.id)) {
        seen.add(existing.id);
        return upsertMap.get(existing.id)!;
      }
      return existing;
    });
    for (const item of delta.upserts) {
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
  }

  // Deduplikasi akhir berdasarkan id (pertahankan entri terbaru)
  const dedupedReversed: T[] = [];
  const seenFinal = new Set<string>();
  for (let i = result.length - 1; i >= 0; i--) {
    const item = result[i];
    if (!item) continue;
    if (item.id) {
      if (seenFinal.has(item.id)) continue;
      seenFinal.add(item.id);
    }
    dedupedReversed.push(item);
  }
  return dedupedReversed.reverse();
}

export function combineScheduleDeltas(
  older: ScheduleDelta | null | undefined,
  newer: ScheduleDelta
): ScheduleDelta {
  if (!older || !hasScheduleDeltaChanges(older)) return newer;
  if (!hasScheduleDeltaChanges(newer)) return older;
  if (newer.replaceAll !== undefined) return { ...newer };
  if (older.replaceAll !== undefined) {
    return {
      upserts: [],
      deleteIds: [],
      replaceAll: mergeSchedulesWithDelta(older.replaceAll, newer),
    };
  }
  const merged: ScheduleDelta = {
    upserts: [...older.upserts],
    deleteIds: [...older.deleteIds],
    ...(newer.replaceClassScope !== undefined
      ? { replaceClassScope: newer.replaceClassScope }
      : older.replaceClassScope !== undefined
      ? { replaceClassScope: older.replaceClassScope }
      : {}),
  };
  if (newer.deleteIds.length > 0) {
    const delSet = new Set([...merged.deleteIds, ...newer.deleteIds]);
    merged.deleteIds = Array.from(delSet);
    merged.upserts = merged.upserts.filter((u) => !u?.id || !delSet.has(u.id));
  }
  if (newer.upserts.length > 0) {
    const upsertIds = new Set(newer.upserts.map((u) => u?.id).filter(Boolean));
    merged.deleteIds = merged.deleteIds.filter((id) => !upsertIds.has(id));
    const map = new Map<string, any>();
    merged.upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    newer.upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    merged.upserts = Array.from(map.values());
  }
  return merged;
}

export function combineJournalDeltas(
  older: JournalDelta | null | undefined,
  newer: JournalDelta
): JournalDelta {
  if (!older || !hasJournalDeltaChanges(older)) return newer;
  if (!hasJournalDeltaChanges(newer)) return older;
  if (newer.replaceAll !== undefined) return { ...newer };
  if (older.replaceAll !== undefined) {
    return {
      upserts: [],
      deleteIds: [],
      replaceAll: mergeJournalsWithDelta(older.replaceAll, newer),
    };
  }
  let deleteIds = [...older.deleteIds];
  let upserts = [...older.upserts];
  if (newer.deleteIds.length > 0) {
    const delSet = new Set([...deleteIds, ...newer.deleteIds]);
    deleteIds = Array.from(delSet);
    upserts = upserts.filter((u) => !u?.id || !delSet.has(u.id));
  }
  if (newer.upserts.length > 0) {
    const upsertIds = new Set(newer.upserts.map((u) => u?.id).filter(Boolean));
    deleteIds = deleteIds.filter((id) => !upsertIds.has(id));
    const map = new Map<string, any>();
    upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    newer.upserts.forEach((u) => {
      if (u?.id) map.set(u.id, u);
    });
    upserts = Array.from(map.values());
  }
  return { upserts, deleteIds };
}

export function combineAttendanceDeltas(
  older: AttendanceDelta | null | undefined,
  newer: AttendanceDelta
): AttendanceDelta {
  if (!older || !hasAttendanceDeltaChanges(older)) return newer;
  if (!hasAttendanceDeltaChanges(newer)) return older;
  if (newer.replaceAll !== undefined) return { ...newer };
  if (older.replaceAll !== undefined) {
    return {
      upserts: {},
      deleteKeys: [],
      replaceAll: mergeAttendanceWithDelta(older.replaceAll, newer),
    };
  }
  let deleteKeys = [...older.deleteKeys];
  const upserts: Record<string, any> = { ...older.upserts };
  if (newer.deleteKeys.length > 0) {
    const delSet = new Set([...deleteKeys, ...newer.deleteKeys]);
    deleteKeys = Array.from(delSet);
    for (const k of delSet) {
      delete upserts[k];
    }
  }
  if (Object.keys(newer.upserts).length > 0) {
    const keys = new Set(Object.keys(newer.upserts));
    deleteKeys = deleteKeys.filter((k) => !keys.has(k));
    Object.assign(upserts, newer.upserts);
  }
  return { upserts, deleteKeys };
}



