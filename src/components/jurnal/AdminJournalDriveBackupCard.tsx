import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  CloudUpload,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FolderOpen,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  FileSpreadsheet,
  FileJson,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TeachingJournal } from '../../types';
import {
  JournalBackupPeriodType,
  filterJournalsByPeriod,
  normalizeJournalDateISO,
  toLocalISODate,
} from '../../lib/journalBackupUtils';
import {
  DRIVE_BACKUP_FOLDER_NAME,
  DriveFileInfo,
  GoogleDriveAuthExpiredError,
  JournalDriveBackupResult,
  backupJournalsToGoogleDrive,
  clearGoogleDriveAccessToken,
  getGoogleDriveAccessToken,
  googleDriveSignIn,
  googleDriveSignOut,
  initGoogleDriveAuth,
  listRecentJournalDriveBackups,
} from '../../lib/googleDriveBackup';

interface AdminJournalDriveBackupCardProps {
  isAdmin: boolean;
  journals: TeachingJournal[];
  currentUserName: string;
  onDeleteJournalsBulk: (ids: string[]) => Promise<boolean>;
  onNotify?: (message: string) => void;
}

export const AdminJournalDriveBackupCard: React.FC<AdminJournalDriveBackupCardProps> = ({
  isAdmin,
  journals,
  currentUserName,
  onDeleteJournalsBulk,
  onNotify,
}) => {
  const todayIso = useMemo(() => toLocalISODate(new Date()), []);
  const currentMonthIso = useMemo(() => todayIso.slice(0, 7), [todayIso]);

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [periodType, setPeriodType] = useState<JournalBackupPeriodType>('harian');
  const [dailyDate, setDailyDate] = useState<string>(todayIso);
  const [weeklyDate, setWeeklyDate] = useState<string>(todayIso);
  const [monthlyValue, setMonthlyValue] = useState<string>(currentMonthIso);

  // State autentikasi Google Drive (token HANYA di memori)
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(() => getGoogleDriveAccessToken());
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getGoogleDriveAccessToken());
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // State daftar file di Drive & proses eksekusi
  const [driveFolder, setDriveFolder] = useState<DriveFileInfo | null>(null);
  const [recentDriveFiles, setRecentDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [executionStep, setExecutionStep] = useState<'idle' | 'uploading' | 'deleting_cloud'>('idle');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [lastBackupResult, setLastBackupResult] = useState<{
    result: JournalDriveBackupResult;
    deletedCount: number;
    cloudDeletedImmediately: boolean;
    periodLabel: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = initGoogleDriveAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
        setNeedsAuth(false);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
        setNeedsAuth(true);
        setRecentDriveFiles([]);
        setDriveFolder(null);
      }
    );
    return () => unsubscribe();
  }, [isAdmin]);

  const loadDriveFiles = useCallback(async (token: string) => {
    setIsLoadingFiles(true);
    try {
      const { folder, files } = await listRecentJournalDriveBackups(token);
      setDriveFolder(folder);
      setRecentDriveFiles(files);
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleDriveAccessToken();
        setDriveToken(null);
        setNeedsAuth(true);
        setDriveError(err.message);
      } else {
        setDriveError(err instanceof Error ? err.message : 'Gagal memuat daftar file Google Drive.');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && driveToken) {
      void loadDriveFiles(driveToken);
    }
  }, [isAdmin, driveToken, loadDriveFiles]);

  const activeAnchorValue = useMemo(() => {
    if (periodType === 'harian') return dailyDate;
    if (periodType === 'mingguan') return weeklyDate;
    return monthlyValue;
  }, [periodType, dailyDate, weeklyDate, monthlyValue]);

  const { range: periodRange, matched: matchedJournals } = useMemo(
    () => filterJournalsByPeriod(journals, periodType, activeAnchorValue),
    [journals, periodType, activeAnchorValue]
  );

  const latestJournalIso = useMemo<string | null>(() => {
    let latest: string | null = null;
    for (const j of journals) {
      const norm = normalizeJournalDateISO(j.date);
      if (norm && (!latest || norm > latest)) {
        latest = norm;
      }
    }
    return latest;
  }, [journals]);

  const estimatedBytes = useMemo(() => {
    if (matchedJournals.length === 0) return 0;
    try {
      return new Blob([JSON.stringify(matchedJournals)]).size;
    } catch {
      return JSON.stringify(matchedJournals).length;
    }
  }, [matchedJournals]);

  const uniqueTeachersCount = useMemo(
    () => new Set(matchedJournals.map((j) => j.teacherId || j.teacherName)).size,
    [matchedJournals]
  );

  const uniqueClassesCount = useMemo(
    () => new Set(matchedJournals.map((j) => j.className)).size,
    [matchedJournals]
  );

  if (!isAdmin) return null;

  const handleGoogleSignIn = async () => {
    setDriveError(null);
    setIsSigningIn(true);
    try {
      const res = await googleDriveSignIn();
      setDriveUser(res.user);
      setDriveToken(res.accessToken);
      setNeedsAuth(false);
      await loadDriveFiles(res.accessToken);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setDriveError('Login Google dibatalkan sebelum selesai.');
      } else if (code === 'auth/popup-blocked') {
        setDriveError('Popup login Google diblokir oleh browser. Izinkan popup untuk melanjutkan.');
      } else {
        setDriveError(err?.message || 'Gagal masuk dengan akun Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setDriveError(null);
    try {
      await googleDriveSignOut();
      setDriveUser(null);
      setDriveToken(null);
      setNeedsAuth(true);
      setDriveFolder(null);
      setRecentDriveFiles([]);
    } catch (err: any) {
      setDriveError(err?.message || 'Gagal memutuskan koneksi Google Drive.');
    }
  };

  const handleJumpToLatestDate = () => {
    if (!latestJournalIso) return;
    if (periodType === 'harian') setDailyDate(latestJournalIso);
    else if (periodType === 'mingguan') setWeeklyDate(latestJournalIso);
    else setMonthlyValue(latestJournalIso.slice(0, 7));
  };

  const handleOpenConfirmModal = () => {
    setDriveError(null);
    if (!driveToken || needsAuth) {
      setDriveError('Silakan login dengan Google terlebih dahulu untuk mengakses Google Drive.');
      return;
    }
    if (matchedJournals.length === 0) {
      setDriveError('Tidak ada jurnal pada periode yang dipilih.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleExecuteBackupAndDelete = async () => {
    const token = getGoogleDriveAccessToken() || driveToken;
    if (!token) {
      setIsConfirmModalOpen(false);
      setNeedsAuth(true);
      setDriveError('Sesi Google Drive belum aktif. Silakan Sign in with Google kembali.');
      return;
    }

    const journalsSnapshot = [...matchedJournals];
    const idsToDelete = journalsSnapshot.map((j) => j.id).filter(Boolean);
    const snapshotRange = { ...periodRange };

    setDriveError(null);
    setLastBackupResult(null);
    setExecutionStep('uploading');

    let driveResult: JournalDriveBackupResult;
    try {
      driveResult = await backupJournalsToGoogleDrive(token, journalsSnapshot, {
        periodRange: snapshotRange,
        backedUpBy: currentUserName || 'Administrator SIMPATI',
      });

      if (!driveResult?.xlsxFile?.id || !driveResult?.jsonFile?.id) {
        throw new Error('Verifikasi ID file backup Google Drive tidak lengkap.');
      }
    } catch (err) {
      setExecutionStep('idle');
      setIsConfirmModalOpen(false);
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleDriveAccessToken();
        setDriveToken(null);
        setNeedsAuth(true);
        setDriveError(
          `${err.message} Seluruh ${journalsSnapshot.length} jurnal di database Cloud tetap aman dan tidak dihapus.`
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Gagal mengunggah backup ke Google Drive.';
        setDriveError(
          `Upload ke Google Drive gagal (${msg}). Seluruh ${journalsSnapshot.length} jurnal di database Cloud tetap aman dan TIDAK dihapus.`
        );
      }
      return;
    }

    // Upload ke Google Drive SUKSES & terverifikasi -> lanjut hapus jurnal dari database Cloud
    setExecutionStep('deleting_cloud');
    try {
      const cloudDeletedImmediately = await onDeleteJournalsBulk(idsToDelete);
      setLastBackupResult({
        result: driveResult,
        deletedCount: idsToDelete.length,
        cloudDeletedImmediately,
        periodLabel: snapshotRange.label,
      });
      setIsConfirmModalOpen(false);
      setExecutionStep('idle');

      if (cloudDeletedImmediately) {
        onNotify?.(
          `Backup ${idsToDelete.length} jurnal (${snapshotRange.label}) berhasil disimpan ke Google Drive dan dihapus dari database Cloud.`
        );
      } else {
        onNotify?.(
          `Backup ${idsToDelete.length} jurnal tersimpan aman di Google Drive. Penghapusan Cloud Firestore sedang menunggu koneksi/kuota pulih.`
        );
      }

      await loadDriveFiles(token);
    } catch (err) {
      setExecutionStep('idle');
      setIsConfirmModalOpen(false);
      setLastBackupResult({
        result: driveResult,
        deletedCount: 0,
        cloudDeletedImmediately: false,
        periodLabel: snapshotRange.label,
      });
      setDriveError(
        `File backup sudah tersimpan aman di Google Drive, namun penghapusan otomatis database Cloud gagal: ${
          err instanceof Error ? err.message : 'Kesalahan tidak diketahui'
        }.`
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
      {/* Header Panel */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0B1E2E] via-[#122B40] to-[#193B4E] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
              <ShieldCheck className="w-3 h-3" />
              Khusus Admin
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
              <CloudUpload className="w-3 h-3" />
              Google Drive Auto-Archive
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
            Backup Jurnal Mengajar ke Google Drive & Bersihkan Cloud
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Arsipkan jurnal periode Harian, Mingguan, atau Bulanan ke Google Drive (.xlsx & .json), lalu hapus otomatis dari database Cloud agar penyimpanan Firestore tetap lega.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {needsAuth || !driveToken ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-[#1f1f1f] text-xs font-semibold rounded-full border border-[#747775]/40 shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>{isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span className="max-w-[190px] truncate">
                  {driveUser?.email || driveUser?.displayName || 'Google Drive Terhubung'}
                </span>
              </div>
              {driveFolder?.webViewLink && (
                <a
                  href={driveFolder.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Buka Folder Drive</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-xs font-semibold border border-rose-400/30 transition cursor-pointer"
                title="Putuskan Koneksi Google Drive"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title={isExpanded ? 'Sembunyikan Panel Backup' : 'Tampilkan Panel Backup'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Panel */}
      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-5 bg-[#FAFBFD]">
          {/* Error Banner */}
          {driveError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{driveError}</span>
              </div>
              <button
                type="button"
                onClick={() => setDriveError(null)}
                className="text-rose-700 hover:underline text-[11px] shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Success Banner */}
          {lastBackupResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-emerald-950">
                      Backup Periode {lastBackupResult.periodLabel} Tersimpan di Google Drive!
                    </p>
                    <p className="text-emerald-800">
                      {lastBackupResult.cloudDeletedImmediately
                        ? `${lastBackupResult.deletedCount} jurnal mengajar telah berhasil diunggah dan dihapus permanen dari database Cloud Firestore.`
                        : `File backup sudah aman di Google Drive. Penghapusan ${lastBackupResult.deletedCount} jurnal dari database Cloud sedang menunggu sinkronisasi.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLastBackupResult(null)}
                  className="text-emerald-700 hover:underline text-[11px] font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                {lastBackupResult.result.xlsxFile.webViewLink && (
                  <a
                    href={lastBackupResult.result.xlsxFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/60 transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Buka Excel (.xlsx) di Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lastBackupResult.result.jsonFile.webViewLink && (
                  <a
                    href={lastBackupResult.result.jsonFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/60 transition"
                  >
                    <FileJson className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Buka Arsip (.json) di Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Grid Periode & Pratinjau */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Kolom Kiri: Pengaturan Periode */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  1. Pilih Periode Backup Jurnal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriodType('harian')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      periodType === 'harian'
                        ? 'bg-[#6B9A95] text-white border-[#6B9A95] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('mingguan')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      periodType === 'mingguan'
                        ? 'bg-[#6B9A95] text-white border-[#6B9A95] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Mingguan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('bulanan')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      periodType === 'bulanan'
                        ? 'bg-[#6B9A95] text-white border-[#6B9A95] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Bulanan</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Tentukan {periodType === 'harian' ? 'Tanggal' : periodType === 'mingguan' ? 'Tanggal Dalam Pekan' : 'Bulan & Tahun'}
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {periodType === 'harian' && (
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
                    />
                  )}
                  {periodType === 'mingguan' && (
                    <input
                      type="date"
                      value={weeklyDate}
                      onChange={(e) => setWeeklyDate(e.target.value)}
                      className="px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
                    />
                  )}
                  {periodType === 'bulanan' && (
                    <input
                      type="month"
                      value={monthlyValue}
                      onChange={(e) => setMonthlyValue(e.target.value)}
                      className="px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
                    />
                  )}

                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                    Rentang: {periodRange.startDate === periodRange.endDate ? periodRange.startDate : `${periodRange.startDate} s/d ${periodRange.endDate}`}
                  </span>

                  {matchedJournals.length === 0 && latestJournalIso && (
                    <button
                      type="button"
                      onClick={handleJumpToLatestDate}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer"
                    >
                      Pilih Tanggal Jurnal Terbaru ({latestJournalIso})
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>
                    Folder tujuan Drive: <strong className="text-slate-700">{DRIVE_BACKUP_FOLDER_NAME}</strong>
                  </p>
                  <p>
                    Format terunggah: <strong className="text-slate-700">Excel (.xlsx) + Arsip JSON (.json)</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  disabled={matchedJournals.length === 0 || !driveToken || needsAuth || executionStep !== 'idle'}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1E2E] hover:bg-[#132E45] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>
                    Backup ke Drive & Hapus Cloud ({matchedJournals.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Kolom Kanan: Pratinjau & Riwayat Drive */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ringkasan Data Periode Terpilih
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {periodRange.shortLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Jurnal</div>
                    <div className="text-lg font-black text-slate-900">{matchedJournals.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Guru / Kelas</div>
                    <div className="text-lg font-black text-slate-900">
                      {uniqueTeachersCount} / {uniqueClassesCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Hemat Cloud</div>
                    <div className="text-lg font-black text-emerald-800">
                      {(estimatedBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftar Arsip Terbaru di Google Drive */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    File Backup Terbaru di Google Drive
                  </span>
                  {driveToken && !needsAuth && (
                    <button
                      type="button"
                      onClick={() => void loadDriveFiles(driveToken)}
                      disabled={isLoadingFiles}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4E7D78] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                      <span>Muat Ulang</span>
                    </button>
                  )}
                </div>

                {needsAuth || !driveToken ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3">
                    Klik <strong>Sign in with Google</strong> di kanan atas kartu ini untuk menghubungkan Google Drive Anda sebelum menjalankan backup.
                  </p>
                ) : isLoadingFiles ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memeriksa folder arsip di Google Drive...</span>
                  </div>
                ) : recentDriveFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3">
                    Belum ada file backup jurnal di folder Google Drive SIMPATI.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {recentDriveFiles.slice(0, 6).map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {file.name.endsWith('.json') ? (
                            <FileJson className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate font-semibold text-slate-800" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4E7D78] hover:underline shrink-0"
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Eksplisit (WAJIB sebelum upload ke Drive & hapus Cloud) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Konfirmasi Backup ke Google Drive & Hapus Cloud
                </h3>
                <p className="text-xs text-slate-600">
                  Anda akan mengarsipkan <strong>{matchedJournals.length} jurnal mengajar</strong> pada periode{' '}
                  <strong>{periodRange.label}</strong> ke Google Drive, kemudian{' '}
                  <strong className="text-rose-700">menghapus permanen</strong> seluruh jurnal tersebut dari database Cloud Firestore.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Folder Google Drive</span>
                <span className="font-bold text-slate-800">{DRIVE_BACKUP_FOLDER_NAME}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">File yang dibuat</span>
                <span className="font-bold text-slate-800">Excel (.xlsx) & Arsip (.json)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Jumlah jurnal dihapus dari Cloud</span>
                <span className="font-extrabold text-rose-700">{matchedJournals.length} entri</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Contoh Jurnal Terdampak:
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {matchedJournals.slice(0, 5).map((j) => (
                  <div key={j.id} className="px-3 py-2 text-[11px] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800">{j.date}</span> ·{' '}
                      <span className="font-semibold text-slate-700">{j.teacherName}</span>
                      <div className="text-slate-500 truncate">
                        {j.className} — {j.subjectName}
                      </div>
                    </div>
                  </div>
                ))}
                {matchedJournals.length > 5 && (
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 text-center">
                    ...dan {matchedJournals.length - 5} jurnal lainnya pada periode ini
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-medium">
              Jaminan Aman: Jika proses upload ke Google Drive gagal atau koneksi terputus, seluruh jurnal di database Cloud Firestore <strong>tidak akan dihapus</strong>.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={executionStep !== 'idle'}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBackupAndDelete}
                disabled={executionStep !== 'idle'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-70"
              >
                {executionStep === 'uploading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunggah ke Google Drive...</span>
                  </>
                ) : executionStep === 'deleting_cloud' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus dari Cloud...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Ya, Backup ke Drive & Hapus Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
