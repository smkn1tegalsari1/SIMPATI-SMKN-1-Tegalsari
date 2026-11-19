import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

interface AppletFirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const oauthAppletConfig = firebaseConfig as AppletFirebaseConfig;

// Konfigurasi Firestore utama sekolah (dipertahankan agar tidak terputus saat OAuth menggunakan project terpisah)
const LIVE_SCHOOL_FIRESTORE_CONFIG: AppletFirebaseConfig = {
  projectId: 'model-cell-lrrhs',
  appId: '1:113801419143:web:096d2733dbc66334925b22',
  apiKey: 'AIzaSyDMwdLDxFFs89Ha8gQ4xi1aCAajdM8_suQ',
  authDomain: 'model-cell-lrrhs.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-simpatismkn1tega-a2de4c12-589c-4acb-97fa-2ab69d4a292a',
  storageBucket: 'model-cell-lrrhs.firebasestorage.app',
  messagingSenderId: '113801419143',
  measurementId: '',
};

const firestoreTargetConfig: AppletFirebaseConfig = oauthAppletConfig.firestoreDatabaseId
  ? oauthAppletConfig
  : LIVE_SCHOOL_FIRESTORE_CONFIG;

// Inisialisasi Firebase App utama untuk Cloud Firestore sekolah
const app: FirebaseApp =
  getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firestoreTargetConfig);

// Inisialisasi Firebase Auth khusus Google Workspace OAuth (gunakan app yang sama jika projectId identik)
const workspaceOAuthApp: FirebaseApp =
  oauthAppletConfig.projectId === firestoreTargetConfig.projectId
    ? app
    : getApps().find((a) => a.name === 'google-drive-oauth') ||
      initializeApp(oauthAppletConfig, 'google-drive-oauth');

export const workspaceAuth = getAuth(workspaceOAuthApp);

const databaseId = firestoreTargetConfig.firestoreDatabaseId || '(default)';

export const FIRESTORE_PRICING_URL = 'https://firebase.google.com/pricing#cloud-firestore';
export const FIRESTORE_CONSOLE_UPGRADE_URL = `https://console.firebase.google.com/project/${firestoreTargetConfig.projectId}/firestore/databases/${databaseId}/data?openUpgradeDialog=true`;

// Inisialisasi Firestore dengan ignoreUndefinedProperties dan experimentalAutoDetectLongPolling
// agar koneksi stabil di jaringan sekolah, proxy, iFrame, maupun seluler
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    },
    databaseId
  );
} catch {
  firestoreInstance = getFirestore(app, databaseId);
}

export const db = firestoreInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type CloudErrorCategory =
  | 'quota'
  | 'permission'
  | 'offline'
  | 'contention'
  | 'payload_size'
  | 'invalid_data'
  | 'unknown';

export interface ClassifiedCloudError {
  category: CloudErrorCategory;
  code: string;
  message: string;
  isTransient: boolean;
  rawMessage: string;
}

export function classifyFirestoreError(error: unknown): ClassifiedCloudError {
  const errObj = error as { code?: string; message?: string } | null;
  const code = typeof errObj?.code === 'string' ? errObj.code.toLowerCase() : '';
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === 'string'
      ? errObj.message
      : String(error || 'Kesalahan tidak diketahui');
  const lower = rawMessage.toLowerCase();

  if (code === 'resource-exhausted' || lower.includes('quota exceeded') || lower.includes('bandwidth exhausted')) {
    return {
      category: 'quota',
      code: code || 'resource-exhausted',
      message:
        'Kuota gratis harian Cloud Firestore telah tercapai. Data tetap aman di browser & server lokal; sinkronisasi Cloud akan aktif kembali setelah kuota direset atau paket Firebase ditingkatkan.',
      isTransient: false,
      rawMessage,
    };
  }

  if (code === 'permission-denied' || lower.includes('missing or insufficient permissions')) {
    return {
      category: 'permission',
      code: code || 'permission-denied',
      message: 'Izin akses Cloud Firestore ditolak oleh aturan keamanan (firestore.rules).',
      isTransient: false,
      rawMessage,
    };
  }

  if (
    lower.includes('exceeds the maximum allowed size') ||
    lower.includes('maximum document size') ||
    lower.includes('1048576')
  ) {
    return {
      category: 'payload_size',
      code: code || 'invalid-argument',
      message: 'Ukuran data melebihi batas maksimal dokumen Cloud Firestore (1 MB).',
      isTransient: false,
      rawMessage,
    };
  }

  if (code === 'invalid-argument' || lower.includes('unsupported field value')) {
    return {
      category: 'invalid_data',
      code: code || 'invalid-argument',
      message: 'Format data tidak valid untuk disimpan ke Cloud Firestore.',
      isTransient: false,
      rawMessage,
    };
  }

  if (code === 'aborted' || lower.includes('transaction failed') || lower.includes('contention')) {
    return {
      category: 'contention',
      code: code || 'aborted',
      message: 'Terjadi antrean simpan bersamaan di Cloud Firestore. Sistem sedang mencoba ulang otomatis.',
      isTransient: true,
      rawMessage,
    };
  }

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'internal' ||
    lower.includes('the client is offline') ||
    lower.includes('could not reach cloud firestore') ||
    lower.includes('webchannel') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timed out')
  ) {
    return {
      category: 'offline',
      code: code || 'unavailable',
      message: 'Koneksi ke Cloud Firestore sedang terputus sementara. Sistem akan menyambung ulang secara otomatis.',
      isTransient: true,
      rawMessage,
    };
  }

  return {
    category: 'unknown',
    code: code || 'unknown',
    message: rawMessage || 'Terjadi gangguan sementara pada koneksi Cloud Firestore.',
    isTransient: true,
    rawMessage,
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  options?: { rethrow?: boolean }
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);
  if (options?.rethrow) {
    throw new Error(serialized);
  }
  return errInfo;
}

export async function checkFirestoreConnection(): Promise<{
  ok: boolean;
  error?: ClassifiedCloudError;
}> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true };
  } catch (err: unknown) {
    const classified = classifyFirestoreError(err);
    if (classified.category === 'permission') {
      handleFirestoreError(err, OperationType.GET, 'test/connection');
    } else {
      console.warn('[SIMPATI Cloud] Uji koneksi Firestore gagal:', classified.code, classified.rawMessage);
    }
    return { ok: false, error: classified };
  }
}

// Helper penguji koneksi cloud Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  const res = await checkFirestoreConnection();
  return res.ok;
}

export default app;
