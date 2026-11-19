import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
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
  prompt: 'consent',
});

// Cache token HANYA di memori (tidak pernah disimpan di localStorage / sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

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
    const result = await signInWithPopup(workspaceAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Token akses Google Drive tidak diterima. Pastikan popup login tidak diblokir dan izin Google Drive disetujui.'
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

async function parseDriveErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error?.message) return String(data.error.message);
  } catch {
    // Abaikan jika body bukan JSON
  }
  return `Google Drive API mengembalikan status HTTP ${res.status}`;
}

export async function findOrCreateDriveFolder(
  accessToken: string,
  folderName: string = DRIVE_BACKUP_FOLDER_NAME
): Promise<DriveFileInfo> {
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

  if (searchRes.status === 401 || searchRes.status === 403) {
    cachedAccessToken = null;
    throw new GoogleDriveAuthExpiredError();
  }

  if (!searchRes.ok) {
    throw new Error(await parseDriveErrorMessage(searchRes));
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

  if (createRes.status === 401 || createRes.status === 403) {
    cachedAccessToken = null;
    throw new GoogleDriveAuthExpiredError();
  }

  if (!createRes.ok) {
    throw new Error(await parseDriveErrorMessage(createRes));
  }

  const folder = (await createRes.json()) as DriveFileInfo;
  if (!folder?.id) {
    throw new Error('Google Drive tidak mengembalikan ID folder backup.');
  }
  return folder;
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

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new GoogleDriveAuthExpiredError();
  }

  if (!res.ok) {
    throw new Error(await parseDriveErrorMessage(res));
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

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new GoogleDriveAuthExpiredError();
  }

  if (!res.ok) {
    throw new Error(await parseDriveErrorMessage(res));
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
