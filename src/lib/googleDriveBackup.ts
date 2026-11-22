import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  browserPopupRedirectResolver,
  User,
} from 'firebase/auth';
import { workspaceAuth } from './firebase';
import { TeachingJournal } from '../types';
import {
  JournalBackupPeriodRange,
  buildJournalBackupJsonString,
  buildJournalBackupWorkbookArrayBuffer,
} from './journalBackupUtils';

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'] as const;

export const DRIVE_BACKUP_FOLDER_NAME = 'Backup Jurnal Mengajar SIMPATI SMKN 1 Tegalsari';

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account consent',
});

// Cache token HANYA di memori (tidak pernah disimpan di localStorage / sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let prewarmPromise: Promise<boolean> | null = null;
const inFlightFolderLookups = new Map<string, Promise<DriveFileInfo>>();

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
}

export interface JournalDriveBackupResult {
  folder: DriveFileInfo;
  xlsxFile: DriveFileInfo;
  jsonFile: DriveFileInfo;
  backedUpAt: number;
}

export class GoogleDriveAuthExpiredError extends Error {
  constructor(
    message = 'Sesi akses Google Drive telah berakhir atau izin dicabut. Silakan login ulang dengan Google.'
  ) {
    super(message);
    this.name = 'GoogleDriveAuthExpiredError';
  }
}

export function isRunningInsideIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Pra-inisialisasi Firebase popup resolver (memuat gapi & __/auth/iframe)
 * sebelum user mengklik tombol login, agar window.open() terpanggil sinkron
 * saat klik dan tidak terblokir popup blocker Chrome.
 */
export const prewarmGoogleAuthPopup = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (prewarmPromise) return prewarmPromise;

  prewarmPromise = (async () => {
    try {
      const resolver = browserPopupRedirectResolver as unknown as {
        _initialize?: (auth: unknown) => Promise<unknown>;
      };
      if (typeof resolver?._initialize === 'function') {
        await resolver._initialize(workspaceAuth);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[SIMPATI Drive] Pra-inisialisasi popup Google Auth gagal:', err);
      prewarmPromise = null;
      return false;
    }
  })();

  return prewarmPromise;
};

export const formatGoogleAuthError = (
  err: unknown
): { code: string; message: string; suggestNewTab: boolean } => {
  const errObj = err as { code?: string; message?: string } | null;
  const code = typeof errObj?.code === 'string' ? errObj.code : '';
  const rawMessage = err instanceof Error ? err.message : String(errObj?.message || err || '');
  const inIframe = isRunningInsideIframe();

  switch (code) {
    case 'auth/popup-blocked':
      return {
        code,
        message: inIframe
          ? 'Popup login Google diblokir oleh browser di dalam tampilan preview. Izinkan popup atau buka aplikasi di tab baru untuk menghubungkan Google Drive.'
          : 'Popup login Google diblokir oleh browser. Silakan izinkan popup untuk situs ini lalu klik Sign in with Google kembali.',
        suggestNewTab: inIframe,
      };
    case 'auth/popup-closed-by-user':
      return {
        code,
        message: inIframe
          ? 'Koneksi popup Google terputus sebelum selesai (sering terjadi di dalam preview iframe jika cookie pihak ketiga dibatasi). Coba buka aplikasi di tab baru untuk login Google.'
          : 'Jendela login Google ditutup sebelum proses selesai. Silakan klik Sign in with Google dan selesaikan persetujuan akun.',
        suggestNewTab: inIframe,
      };
    case 'auth/cancelled-popup-request':
      return {
        code,
        message: 'Permintaan login Google sebelumnya dibatalkan. Silakan klik Sign in with Google satu kali lagi.',
        suggestNewTab: false,
      };
    case 'auth/network-request-failed':
      return {
        code,
        message:
          'Gagal terhubung ke layanan autentikasi Google (apis.google.com / firebaseapp.com). Periksa koneksi internet, nonaktifkan pemblokir skrip/adblocker, atau coba buka di tab baru.',
        suggestNewTab: inIframe,
      };
    case 'auth/unauthorized-domain':
    case 'auth/unauthorized-continue-uri':
      return {
        code,
        message: `Domain "${
          typeof window !== 'undefined' ? window.location.hostname : ''
        }" belum diotorisasi pada Firebase Auth OAuth.`,
        suggestNewTab: false,
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message: 'Metode login Google belum diaktifkan pada proyek Firebase Auth OAuth.',
        suggestNewTab: false,
      };
    case 'auth/internal-error':
    case 'auth/missing-iframe-start':
      return {
        code,
        message: inIframe
          ? 'Browser membatasi iframe autentikasi Google di dalam frame preview. Buka aplikasi di tab baru untuk menghubungkan Google Drive dengan lancar.'
          : 'Terjadi kendala internal autentikasi Google. Muat ulang halaman lalu coba kembali.',
        suggestNewTab: inIframe,
      };
    default:
      return {
        code: code || 'unknown',
        message: rawMessage || 'Gagal terhubung dengan akun Google.',
        suggestNewTab: inIframe,
      };
  }
};

export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(workspaceAuth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleDriveSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    workspaceAuth.languageCode = 'id';
    const result = await signInWithPopup(workspaceAuth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Token akses Google Drive tidak diterima. Pastikan izin Google Drive disetujui pada layar login Google.'
      );
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearGoogleDriveAccessToken = (): void => {
  cachedAccessToken = null;
};

export const googleDriveSignOut = async (): Promise<void> => {
  cachedAccessToken = null;
  await workspaceAuth.signOut();
};

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

interface ParsedDriveError {
  status: number;
  reason: string;
  message: string;
}

async function parseDriveError(res: Response): Promise<ParsedDriveError> {
  let reason = '';
  let message = `Google Drive API mengembalikan status HTTP ${res.status}`;
  try {
    const data = await res.json();
    if (data?.error?.message) {
      message = String(data.error.message);
    }
    const firstErr = Array.isArray(data?.error?.errors) ? data.error.errors[0] : null;
    if (firstErr?.reason) {
      reason = String(firstErr.reason);
    }
  } catch {
    // Abaikan jika body bukan JSON
  }
  return { status: res.status, reason, message };
}

function handleDriveHttpFailure(parsed: ParsedDriveError): never {
  if (parsed.status === 401) {
    cachedAccessToken = null;
    throw new GoogleDriveAuthExpiredError();
  }
  if (parsed.status === 403) {
    const lowerMsg = parsed.message.toLowerCase();
    if (
      parsed.reason === 'insufficientPermissions' ||
      parsed.reason === 'authError' ||
      lowerMsg.includes('insufficient authentication scopes') ||
      lowerMsg.includes('insufficient permission')
    ) {
      cachedAccessToken = null;
      throw new GoogleDriveAuthExpiredError(
        'Izin akses Google Drive belum dicentang saat login Google. Klik Sign in with Google kembali dan pastikan kotak izin Google Drive dicentang.'
      );
    }
  }
  throw new Error(parsed.message);
}

export async function findOrCreateDriveFolder(
  accessToken: string,
  folderName: string = DRIVE_BACKUP_FOLDER_NAME
): Promise<DriveFileInfo> {
  const dedupeKey = `${accessToken.slice(-16)}::${folderName}`;
  const existingPromise = inFlightFolderLookups.get(dedupeKey);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const q = `name='${escapeDriveQueryValue(
      folderName
    )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchUrl =
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
      `&fields=${encodeURIComponent('files(id,name,webViewLink,mimeType,createdTime)')}` +
      `&spaces=drive&pageSize=5`;

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      handleDriveHttpFailure(await parseDriveError(searchRes));
    }

    const searchJson = (await searchRes.json()) as { files?: DriveFileInfo[] };
    if (Array.isArray(searchJson.files) && searchJson.files.length > 0 && searchJson.files[0]?.id) {
      return searchJson.files[0];
    }

    // Buat folder baru jika belum ada
    const createRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(
        'id,name,webViewLink,mimeType,createdTime'
      )}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Folder arsip otomatis backup Jurnal Mengajar SIMPATI SMKN 1 Tegalsari.',
        }),
      }
    );

    if (!createRes.ok) {
      handleDriveHttpFailure(await parseDriveError(createRes));
    }

    const folder = (await createRes.json()) as DriveFileInfo;
    if (!folder?.id) {
      throw new Error('Google Drive tidak mengembalikan ID folder backup.');
    }
    return folder;
  })();

  inFlightFolderLookups.set(dedupeKey, run);
  try {
    return await run;
  } finally {
    inFlightFolderLookups.delete(dedupeKey);
  }
}

export async function uploadBlobToGoogleDrive(
  accessToken: string,
  params: {
    fileName: string;
    mimeType: string;
    blob: Blob;
    parentFolderId: string;
    description?: string;
  }
): Promise<DriveFileInfo> {
  const metadata = {
    name: params.fileName,
    mimeType: params.mimeType,
    parents: [params.parentFolderId],
    ...(params.description ? { description: params.description } : {}),
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  formData.append('file', params.blob, params.fileName);

  const uploadUrl =
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` +
    `&fields=${encodeURIComponent('id,name,mimeType,webViewLink,size,createdTime')}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    handleDriveHttpFailure(await parseDriveError(res));
  }

  const uploaded = (await res.json()) as DriveFileInfo;
  if (!uploaded?.id) {
    throw new Error(`Upload "${params.fileName}" gagal diverifikasi oleh Google Drive (ID kosong).`);
  }
  return uploaded;
}

export async function listRecentJournalDriveBackups(
  accessToken: string,
  folderId?: string
): Promise<{ folder: DriveFileInfo | null; files: DriveFileInfo[] }> {
  const folder = folderId
    ? { id: folderId, name: DRIVE_BACKUP_FOLDER_NAME }
    : await findOrCreateDriveFolder(accessToken, DRIVE_BACKUP_FOLDER_NAME);

  const q = `'${escapeDriveQueryValue(folder.id)}' in parents and trashed=false`;
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&orderBy=createdTime%20desc&pageSize=12` +
    `&fields=${encodeURIComponent('files(id,name,mimeType,webViewLink,size,createdTime)')}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    handleDriveHttpFailure(await parseDriveError(res));
  }

  const data = (await res.json()) as { files?: DriveFileInfo[] };
  return {
    folder,
    files: Array.isArray(data.files) ? data.files : [],
  };
}

export async function backupJournalsToGoogleDrive(
  accessToken: string,
  journals: TeachingJournal[],
  params: {
    periodRange: JournalBackupPeriodRange;
    backedUpBy: string;
  }
): Promise<JournalDriveBackupResult> {
  if (journals.length === 0) {
    throw new Error('Tidak ada jurnal pada periode terpilih untuk dibackup.');
  }

  const backedUpAt = Date.now();
  const stamp = new Date(backedUpAt);
  const timeSuffix =
    `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(
      stamp.getDate()
    ).padStart(2, '0')}_` +
    `${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}${String(
      stamp.getSeconds()
    ).padStart(2, '0')}`;

  const meta = {
    periodRange: params.periodRange,
    backedUpBy: params.backedUpBy,
    backedUpAt,
  };

  // 1. Pastikan folder arsip di Google Drive tersedia
  const folder = await findOrCreateDriveFolder(accessToken, DRIVE_BACKUP_FOLDER_NAME);

  // 2. Bangun file Excel (.xlsx) dan arsip JSON (.json)
  const xlsxBuffer = buildJournalBackupWorkbookArrayBuffer(journals, meta);
  const xlsxBlob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const xlsxName = `Backup_Jurnal_${params.periodRange.fileSlug}_${timeSuffix}.xlsx`;

  const jsonStr = buildJournalBackupJsonString(journals, meta);
  const jsonBlob = new Blob([jsonStr], {
    type: 'application/json; charset=utf-8',
  });
  const jsonName = `Backup_Jurnal_${params.periodRange.fileSlug}_${timeSuffix}.json`;

  const description = `Backup ${params.periodRange.label} (${journals.length} jurnal) oleh ${params.backedUpBy}`;

  // 3. Unggah kedua file dan verifikasi ID keduanya diterima dari Google Drive
  const xlsxFile = await uploadBlobToGoogleDrive(accessToken, {
    fileName: xlsxName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    blob: xlsxBlob,
    parentFolderId: folder.id,
    description,
  });

  const jsonFile = await uploadBlobToGoogleDrive(accessToken, {
    fileName: jsonName,
    mimeType: 'application/json',
    blob: jsonBlob,
    parentFolderId: folder.id,
    description,
  });

  return {
    folder,
    xlsxFile,
    jsonFile,
    backedUpAt,
  };
}
