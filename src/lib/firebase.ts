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
    // Jika dokumen belum ada, koneksi tetap berhasil
    return true;
  }
}

export default app;
