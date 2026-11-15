import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Inisialisasi Firestore dengan ignoreUndefinedProperties agar field opsional tidak pernah menggagalkan penyimpanan
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    { ignoreUndefinedProperties: true },
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

// Helper penguji koneksi cloud Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'simpati_data', 'ping'));
    return true;
  } catch (err: any) {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('[SIMPATI Cloud] Client Firestore dalam mode offline.');
      return false;
    }
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, 'simpati_data/ping');
      return false;
    }
    // Jika dokumen belum ada, koneksi tetap berhasil
    return true;
  }
}

export default app;
