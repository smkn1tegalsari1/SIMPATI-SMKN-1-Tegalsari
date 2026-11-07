import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firestore dengan database ID khusus SIMPATI
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

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
