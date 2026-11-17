import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDriveDownload,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  ShieldCheck,
  Users,
  CalendarDays,
  BookOpen,
  Layers,
  Building2,
  School,
  BookCheck,
  Clock,
  Search,
  Sparkles,
  RotateCcw,
  Save,
  X,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  computePerTeacherScheduleBreakdown,
  computeSmartScheduleMerge,
  createFullDatabaseBackupEnvelope,
  createSchedulesBackupEnvelope,
  downloadSchedulesExcel,
  estimateFirestorePayloadBytes,
  FIRESTORE_FREE_QUOTA_LABEL,
  FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
  formatQuotaPercentage,
  formatStorageBytes,
  parseBackupJsonText,
  parseScheduleExcelBuffer,
  ParsedImportPayload,
  triggerDownloadJson,
} from '../../data/databaseBackup';
import { ScheduleWeekType } from '../../types';

interface FirestoreStorageMetricsResponse {
  success: boolean;
  available: boolean;
  source: 'google_cloud_monitoring' | 'unavailable';
  metricType?: string;
  projectId?: string;
  databaseId?: string;
  actualDatabaseBytes?: number;
  measuredAt?: string;
  quotaBytes: number;
  quotaLabel: string;
  reason?: string;
}

export const BackupImporDatabaseView: React.FC = () => {
  const {
    teachers,
    subjects,
    classes,
    departments,
    rooms,
    academicYears,
    schedules,
    attendanceRecords,
    userAccounts,
    journals,
    activeWeekFilter,
    monthlyWeekSchedules,
    currentUser,
    isCloudConnected,
    isRetryingCloudSync,
    isServerConnected,
    cloudSyncError,
    hasCloudBackup,
    cloudBackupSummary,
    retryCloudSync,
    createCloudBackup,
    restoreFromCloudBackup,
    mergeImportedSchedulesAndData,
    restoreDatabaseSnapshot,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUpCloud, setIsBackingUpCloud] = useState(false);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [confirmRestoreCloud, setConfirmRestoreCloud] = useState(false);
  const [storageMetrics, setStorageMetrics] = useState<FirestoreStorageMetricsResponse | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Filter Ekspor Khusus Jadwal
  const [exportWeekFilter, setExportWeekFilter] = useState<'ALL_ITEMS' | ScheduleWeekType>('ALL_ITEMS');
  const [exportTeacherFilter, setExportTeacherFilter] = useState<string>('ALL');

  // Impor & Preview State
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedImport, setParsedImport] = useState<ParsedImportPayload | null>(null);
  const [importMode, setImportMode] = useState<'merge_smart' | 'restore_full'>('merge_smart');
  const [mergeMasterData, setMergeMasterData] = useState(true);
  const [mergeJournals, setMergeJournals] = useState(true);
  const [confirmFullRestoreCheck, setConfirmFullRestoreCheck] = useState(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  // Tabel Rincian Input Guru
  const [teacherSearch, setTeacherSearch] = useState('');

  const fetchStorageMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/api/firestore-storage-metrics');
      if (res.ok) {
        const json: FirestoreStorageMetricsResponse = await res.json();
        setStorageMetrics(json);
      } else {
        setStorageMetrics({
          success: false,
          available: false,
          source: 'unavailable',
          quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
          quotaLabel: FIRESTORE_FREE_QUOTA_LABEL,
          reason: `Endpoint metrik mengembalikan status HTTP ${res.status}.`,
        });
      }
    } catch {
      setStorageMetrics({
        success: false,
        available: false,
        source: 'unavailable',
        quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
        quotaLabel: FIRESTORE_FREE_QUOTA_LABEL,
        reason: 'Tidak dapat menghubungi endpoint backend Google Cloud Monitoring.',
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    void fetchStorageMetrics();
  }, [fetchStorageMetrics]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Estimasi Ukuran Data Aplikasi (JSON) untuk Database Utama (main_store)
  const mainStoreEstimatedBytes = useMemo(() => {
    return estimateFirestorePayloadBytes({
      teachers,
      subjects,
      classes,
      departments,
      rooms,
      academicYears,
      schedules,
      attendanceRecords,
      userAccounts,
      journals,
      activeWeekFilter,
      monthlyWeekSchedules,
    });
  }, [
    teachers,
    subjects,
    classes,
    departments,
    rooms,
    academicYears,
    schedules,
    attendanceRecords,
    userAccounts,
    journals,
    activeWeekFilter,
    monthlyWeekSchedules,
  ]);

  const backupStoreEstimatedBytes =
    hasCloudBackup && typeof cloudBackupSummary?.estimatedBytes === 'number'
      ? cloudBackupSummary.estimatedBytes
      : 0;
  const totalAppEstimatedBytes = mainStoreEstimatedBytes + backupStoreEstimatedBytes;

  const quotaBytes = storageMetrics?.quotaBytes || FIRESTORE_FREE_STORAGE_QUOTA_BYTES;
  const quotaLabel = storageMetrics?.quotaLabel || FIRESTORE_FREE_QUOTA_LABEL;
  const hasActualFirestoreSize =
    Boolean(storageMetrics?.available) &&
    typeof storageMetrics?.actualDatabaseBytes === 'number' &&
    Number.isFinite(storageMetrics.actualDatabaseBytes);
  const referenceUsedBytes = hasActualFirestoreSize
    ? (storageMetrics!.actualDatabaseBytes as number)
    : totalAppEstimatedBytes;
  const quotaUsage = useMemo(
    () => formatQuotaPercentage(referenceUsedBytes, quotaBytes),
    [referenceUsedBytes, quotaBytes]
  );

  // Rincian Jadwal per Guru di database aktif saat ini
  const currentTeacherBreakdown = useMemo(() => {
    return computePerTeacherScheduleBreakdown(schedules, teachers);
  }, [schedules, teachers]);

  const filteredTeacherBreakdown = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return currentTeacherBreakdown;
    return currentTeacherBreakdown.filter(
      (g) =>
        g.teacherName.toLowerCase().includes(q) ||
        g.teacherCode.toLowerCase().includes(q) ||
        g.classes.some((c) => c.toLowerCase().includes(q)) ||
        g.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [currentTeacherBreakdown, teacherSearch]);

  // Jadwal terfilter untuk Ekspor Khusus Jadwal
  const filteredExportSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (exportWeekFilter !== 'ALL_ITEMS') {
        const w = s.weekType || 'ALL';
        if (w !== exportWeekFilter) return false;
      }
      if (exportTeacherFilter !== 'ALL') {
        const matchId = s.teacherId === exportTeacherFilter;
        const matchCode = s.teacherCode && s.teacherCode === exportTeacherFilter;
        const matchName = s.teacherName === exportTeacherFilter;
        if (!matchId && !matchCode && !matchName) return false;
      }
      return true;
    });
  }, [schedules, exportWeekFilter, exportTeacherFilter]);

  // Preview Smart Merge terhadap database aktif saat ini
  const importMergePreview = useMemo(() => {
    if (!parsedImport) return null;
    const scheduleMerge = computeSmartScheduleMerge(schedules, parsedImport.schedules);
    const incomingTeachers = computePerTeacherScheduleBreakdown(
      parsedImport.schedules,
      parsedImport.teachers && parsedImport.teachers.length > 0 ? parsedImport.teachers : teachers
    );
    return {
      scheduleMerge,
      incomingTeachers,
    };
  }, [parsedImport, schedules, teachers]);

  const dateStamp = new Date().toISOString().slice(0, 10);

  // Handler Ekspor Lengkap (.JSON)
  const handleDownloadFullJson = () => {
    const envelope = createFullDatabaseBackupEnvelope(
      {
        teachers,
        subjects,
        classes,
        departments,
        rooms,
        academicYears,
        schedules,
        attendanceRecords,
        userAccounts,
        journals,
        activeWeekFilter,
        monthlyWeekSchedules,
      },
      currentUser.name || 'Administrator SIMPATI'
    );
    triggerDownloadJson(envelope, `SIMPATI_Full_Database_Backup_${dateStamp}.json`);
    showToast(
      'success',
      `Backup database lengkap berhasil diunduh (${schedules.length} jadwal, ${teachers.length} guru, ${journals.length} jurnal).`
    );
  };

  // Handler Ekspor Jadwal (.JSON)
  const handleDownloadSchedulesJson = () => {
    const labelParts: string[] = [];
    if (exportWeekFilter !== 'ALL_ITEMS') labelParts.push(`Rotasi: ${exportWeekFilter}`);
    if (exportTeacherFilter !== 'ALL') labelParts.push(`Guru: ${exportTeacherFilter}`);
    const envelope = createSchedulesBackupEnvelope(
      filteredExportSchedules,
      currentUser.name || 'Administrator SIMPATI',
      labelParts.length > 0 ? labelParts.join(' | ') : 'Semua Jadwal Pelajaran'
    );
    triggerDownloadJson(envelope, `SIMPATI_Backup_Jadwal_Guru_${dateStamp}.json`);
    showToast('success', `Backup ${filteredExportSchedules.length} slot jadwal (.JSON) berhasil diunduh.`);
  };

  // Handler Ekspor Jadwal (.XLSX)
  const handleDownloadSchedulesExcel = () => {
    downloadSchedulesExcel(filteredExportSchedules, `SIMPATI_Backup_Jadwal_Guru_${dateStamp}.xlsx`);
    showToast('success', `Backup ${filteredExportSchedules.length} slot jadwal (.XLSX) berhasil diunduh.`);
  };

  // Handler Baca File Upload (.json / .xlsx)
  const processUploadedFile = async (file: File) => {
    setParseError(null);
    setParsedImport(null);
    setConfirmFullRestoreCheck(false);

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseBackupJsonText(text, file.name, {
          teachers,
          classes,
          subjects,
          rooms,
        });
        setParsedImport(parsed);
        setImportMode('merge_smart');
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        const parsed = parseScheduleExcelBuffer(buf, file.name, {
          teachers,
          classes,
          subjects,
          rooms,
        });
        setParsedImport(parsed);
        setImportMode('merge_smart');
      } else {
        setParseError('Format file belum didukung. Gunakan file backup .json atau .xlsx hasil ekspor SIMPATI.');
      }
    } catch (err: any) {
      setParseError(err?.message || 'Gagal membaca file backup.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUploadedFile(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedImport) return;
    setIsApplyingImport(true);
    try {
      if (importMode === 'merge_smart') {
        const res = await mergeImportedSchedulesAndData(parsedImport, {
          mergeMasterData,
          mergeJournals,
        });
        showToast(res.success ? 'success' : 'error', res.message);
        if (res.success) {
          setParsedImport(null);
          void fetchStorageMetrics();
        }
      } else {
        if (!confirmFullRestoreCheck) {
          showToast('error', 'Centang kotak konfirmasi terlebih dahulu sebelum melakukan Restore Penuh.');
          setIsApplyingImport(false);
          return;
        }
        const isFullJson = parsedImport.format === 'simpati_full_backup_v1';
        const res = await restoreDatabaseSnapshot(
          isFullJson
            ? {
                teachers: parsedImport.teachers,
                subjects: parsedImport.subjects,
                classes: parsedImport.classes,
                departments: parsedImport.departments,
                rooms: parsedImport.rooms,
                academicYears: parsedImport.academicYears,
                schedules: parsedImport.schedules,
                attendanceRecords: parsedImport.attendanceRecords,
                userAccounts: parsedImport.userAccounts,
                journals: parsedImport.journals,
                activeWeekFilter: parsedImport.activeWeekFilter,
                monthlyWeekSchedules: parsedImport.monthlyWeekSchedules,
              }
            : { schedules: parsedImport.schedules },
          isFullJson ? 'full_snapshot' : 'schedules_only'
        );
        showToast(res.success ? 'success' : 'error', res.message);
        if (res.success) {
          setParsedImport(null);
          setConfirmFullRestoreCheck(false);
          void fetchStorageMetrics();
        }
      }
    } finally {
      setIsApplyingImport(false);
    }
  };

  const formatIsoTimestamp = (iso?: string) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const entityCards = [
    { label: 'Data Guru', count: teachers.length, icon: Users, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    { label: 'Mata Pelajaran', count: subjects.length, icon: BookOpen, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { label: 'Jurusan', count: departments.length, icon: Layers, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Kelas & Rombel', count: classes.length, icon: School, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Ruangan', count: rooms.length, icon: Building2, color: 'text-slate-700 bg-slate-100 border-slate-200' },
    { label: 'Jadwal Pelajaran', count: schedules.length, icon: CalendarDays, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Jurnal Mengajar', count: journals.length, icon: BookCheck, color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { label: 'Akun Pengguna', count: userAccounts.length, icon: ShieldCheck, color: 'text-teal-700 bg-teal-50 border-teal-200' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E2E] via-[#0f2940] to-[#13334e] rounded-3xl p-6 md:p-7 text-white shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <HardDriveDownload className="w-3.5 h-3.5" />
                Pusat Backup & Impor Database
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${
                  cloudSyncError
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : isCloudConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cloudSyncError ? 'bg-rose-400' : isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {cloudSyncError ? 'Cloud Error' : isCloudConnected ? 'Cloud Firestore Terhubung' : 'Menghubungkan Cloud...'}
              </span>
              {isServerConnected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                  Server Lokal Aktif
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Backup & Impor Database Hasil Input Guru
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Cadangkan seluruh database sekolah dan hasil penginputan jadwal pelajaran guru dalam format{' '}
              <strong className="text-white">.JSON</strong> atau <strong className="text-white">Excel (.XLSX)</strong>,
              serta impor kembali secara <strong className="text-amber-300">Gabung Cerdas (Merge Aman)</strong> tanpa menimpa data yang sudah ada.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing || isRetryingCloudSync}
            onClick={async () => {
              setIsRefreshing(true);
              const [ok] = await Promise.all([retryCloudSync(), fetchStorageMetrics()]);
              setIsRefreshing(false);
              if (ok) {
                showToast('success', 'Data terbaru berhasil disinkronkan dan terhubung ke Cloud Firestore!');
              } else {
                showToast(
                  'error',
                  cloudSyncError || 'Belum dapat terhubung ke Cloud Firestore. Data sementara diambil dari server lokal.'
                );
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isRetryingCloudSync ? 'animate-spin' : ''}`} />
            <span>{isRefreshing || isRetryingCloudSync ? 'Menyinkronkan...' : 'Segarkan dari Cloud'}</span>
          </button>
        </div>

        {/* Capacity & Cloud Backup Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
          {/* Panel 1: Kuota Firestore (1 GiB), Ukuran Aktual Cloud Monitoring, & Estimasi Data Aplikasi */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-300" />
                Kuota & Penyimpanan Cloud Firestore
              </span>
              <span className="font-extrabold tabular-nums text-amber-300">
                {formatStorageBytes(referenceUsedBytes)} / {quotaLabel} ({quotaUsage.formatted})
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900/60 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  quotaUsage.percent >= 85
                    ? 'bg-rose-500'
                    : quotaUsage.percent >= 65
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(2, quotaUsage.barWidthPct)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-slate-950/35 border border-white/10 px-3 py-2 space-y-0.5">
                <p className="text-slate-300 font-semibold">Ukuran Aktual Firestore</p>
                {isLoadingMetrics ? (
                  <p className="text-cyan-200 font-bold">Memuat Cloud Monitoring...</p>
                ) : hasActualFirestoreSize ? (
                  <p className="text-emerald-300 font-extrabold tabular-nums">
                    {formatStorageBytes(storageMetrics!.actualDatabaseBytes!)}{' '}
                    <span className="font-normal text-slate-300">
                      (Monitoring · {formatIsoTimestamp(storageMetrics?.measuredAt)})
                    </span>
                  </p>
                ) : (
                  <p className="text-amber-200 font-semibold leading-snug">
                    Belum tersedia di runtime ini
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-slate-950/35 border border-white/10 px-3 py-2 space-y-0.5">
                <p className="text-slate-300 font-semibold">Kuota Penyimpanan Gratis</p>
                <p className="text-white font-extrabold tabular-nums">
                  {quotaLabel}{' '}
                  <span className="font-normal text-slate-300">(database paket gratis)</span>
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/35 border border-white/10 px-3 py-2 space-y-0.5">
                <p className="text-slate-300 font-semibold">Estimasi Data Utama (main_store)</p>
                <p className="text-cyan-200 font-extrabold tabular-nums">
                  {formatStorageBytes(mainStoreEstimatedBytes)}{' '}
                  <span className="font-normal text-slate-300">(JSON aplikasi)</span>
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/35 border border-white/10 px-3 py-2 space-y-0.5">
                <p className="text-slate-300 font-semibold">Estimasi Cadangan (main_store_backup)</p>
                <p className="text-emerald-200 font-extrabold tabular-nums">
                  {hasCloudBackup
                    ? backupStoreEstimatedBytes > 0
                      ? formatStorageBytes(backupStoreEstimatedBytes)
                      : 'Tersedia'
                    : 'Belum ada cadangan'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed bg-slate-950/30 rounded-xl px-3 py-2 border border-white/10">
              <Info className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p>
                  {hasActualFirestoreSize
                    ? 'Indikator kuota memakai ukuran aktual database dari Google Cloud Monitoring.'
                    : `Indikator kuota memakai total estimasi data aplikasi (${formatStorageBytes(
                        totalAppEstimatedBytes
                      )}) terhadap kuota ${quotaLabel}.`}{' '}
                  Angka <strong>estimasi ukuran data aplikasi (JSON)</strong> dapat berbeda dengan{' '}
                  <strong>ukuran aktual database Firestore</strong> karena Firestore memperhitungkan{' '}
                  <strong>metadata dan indeks</strong>.
                </p>
                {!hasActualFirestoreSize && storageMetrics?.reason && !isLoadingMetrics && (
                  <p className="text-slate-400">{storageMetrics.reason}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-300">
              {currentTeacherBreakdown.length} guru telah memiliki total <strong>{schedules.length}</strong> slot
              jadwal aktif di database utama.
            </p>
          </div>

          {/* Panel 2: Status Database Cadangan Cloud (main_store_backup) */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Database Cadangan Cloud (main_store_backup)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 tabular-nums">
                  {hasCloudBackup
                    ? backupStoreEstimatedBytes > 0
                      ? `Estimasi: ${formatStorageBytes(backupStoreEstimatedBytes)}`
                      : 'Snapshot Tersedia'
                    : 'Kosong'}
                </span>
              </div>

              {hasCloudBackup && cloudBackupSummary ? (
                <div className="rounded-xl bg-slate-950/35 border border-white/10 p-3 space-y-1 text-[11px] text-emerald-100">
                  <p>
                    Terakhir dicadangkan: <strong>{formatTimestamp(cloudBackupSummary.backedUpAt)}</strong>
                    {cloudBackupSummary.backedUpBy ? ` · oleh ${cloudBackupSummary.backedUpBy}` : ''}
                  </p>
                  <p className="text-slate-200">
                    Isi cadangan: <strong>{cloudBackupSummary.teachersCount}</strong> guru ·{' '}
                    <strong>{cloudBackupSummary.classesCount}</strong> kelas ·{' '}
                    <strong>{cloudBackupSummary.schedulesCount}</strong> jadwal
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  Belum ada snapshot cadangan di dokumen <code>main_store_backup</code>. Klik tombol di bawah untuk
                  menyimpan cadangan terpisah dari database utama.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBackingUpCloud}
                onClick={async () => {
                  setIsBackingUpCloud(true);
                  const ok = await createCloudBackup('Cadangan Manual Menu Backup Database');
                  setIsBackingUpCloud(false);
                  if (ok) {
                    void fetchStorageMetrics();
                  }
                  showToast(
                    ok ? 'success' : 'error',
                    ok
                      ? 'Snapshot cadangan berhasil disimpan ke Cloud Firestore (main_store_backup).'
                      : 'Gagal membuat cadangan Cloud. Pastikan data sekolah tidak kosong & koneksi aktif.'
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isBackingUpCloud ? 'Menyimpan...' : 'Cadangkan ke Cloud Sekarang'}</span>
              </button>

              {hasCloudBackup && !confirmRestoreCloud && (
                <button
                  type="button"
                  onClick={() => setConfirmRestoreCloud(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 font-bold text-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan dari Cadangan Cloud</span>
                </button>
              )}

              {confirmRestoreCloud && (
                <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-400/40 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-200">Timpa data aktif dengan cadangan Cloud?</span>
                  <button
                    type="button"
                    disabled={isRestoringCloud}
                    onClick={async () => {
                      setIsRestoringCloud(true);
                      const res = await restoreFromCloudBackup();
                      setIsRestoringCloud(false);
                      setConfirmRestoreCloud(false);
                      if (res.success) {
                        void fetchStorageMetrics();
                      }
                      showToast(res.success ? 'success' : 'error', res.message);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                  >
                    {isRestoringCloud ? 'Memulihkan...' : 'Ya, Pulihkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRestoreCloud(false)}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between gap-3 text-xs font-semibold shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-cyan-50 border-cyan-300 text-cyan-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Peringatan Cloud Error */}
      {cloudSyncError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Gangguan Sinkronisasi Cloud Firestore terdeteksi:</p>
              <p className="mt-0.5">{cloudSyncError}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRetryingCloudSync}
            onClick={async () => {
              const [ok] = await Promise.all([retryCloudSync(), fetchStorageMetrics()]);
              showToast(
                ok ? 'success' : 'error',
                ok ? 'Koneksi Cloud Firestore berhasil dipulihkan!' : 'Masih belum dapat terhubung ke Cloud Firestore.'
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetryingCloudSync ? 'animate-spin' : ''}`} />
            <span>{isRetryingCloudSync ? 'Menyambungkan...' : 'Coba Hubungkan Ulang'}</span>
          </button>
        </div>
      )}

      {/* Grid Jumlah Data Aktif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {entityCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between gap-2">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 tabular-nums leading-none">{card.count}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: BACKUP & EKSPOR DATABASE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Backup Database Lengkap (.JSON) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0B1E2E] text-amber-400 flex items-center justify-center shadow-xs">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  Backup Lengkap Sekolah
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Ekspor Seluruh Database (.JSON)
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Mengunduh arsip utuh database SIMPATI mencakup seluruh Data Guru, Mata Pelajaran, Jurusan, Kelas, Ruangan,{' '}
              <strong>Jadwal Pelajaran hasil input guru</strong>, Jurnal Mengajar, Log Kehadiran, Akun Pengguna, dan Pengaturan Rotasi Pekan Bulanan.
            </p>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Total Guru</p>
                <p className="font-black text-slate-900 text-sm tabular-nums">{teachers.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Slot Jadwal</p>
                <p className="font-black text-blue-700 text-sm tabular-nums">{schedules.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Total Jurnal</p>
                <p className="font-black text-purple-700 text-sm tabular-nums">{journals.length}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadFullJson}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0B1E2E] hover:bg-slate-800 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Unduh Backup Database Lengkap (.JSON)</span>
          </button>
        </div>

        {/* Card B: Backup Khusus Jadwal Hasil Input Guru (.JSON & .XLSX) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Backup Jadwal Guru
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Ekspor Jadwal Pelajaran Hasil Input Guru
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unduh khusus jadwal yang sudah diinput guru (bisa difilter per guru atau per rotasi pekan) ke format{' '}
              <strong>.JSON</strong> atau <strong>Excel (.XLSX)</strong> agar dapat disimpan aman maupun diimpor/digabung kembali kapan saja.
            </p>

            {/* Filter Ekspor Jadwal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Rotasi Pekan:</label>
                <select
                  value={exportWeekFilter}
                  onChange={(e) => setExportWeekFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL_ITEMS">Semua Rotasi ({schedules.length} slot)</option>
                  <option value="P10_PROD_P11_NORM">Pekan K10 Produktif · K11 Normada</option>
                  <option value="P10_NORM_P11_PROD">Pekan K10 Normada · K11 Produktif</option>
                  <option value="ALL">Jadwal Rutin (Berlaku Semua Pekan)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Guru Penginput:</label>
                <select
                  value={exportTeacherFilter}
                  onChange={(e) => setExportTeacherFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL">Semua Guru ({currentTeacherBreakdown.length} guru)</option>
                  {currentTeacherBreakdown.map((g) => (
                    <option key={g.teacherKey} value={g.teacherId || g.teacherCode || g.teacherName}>
                      {g.teacherCode !== '-' ? `[${g.teacherCode}] ` : ''}{g.teacherName} ({g.totalSlots} jam)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={filteredExportSchedules.length === 0}
              onClick={handleDownloadSchedulesJson}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
              <span>Unduh Jadwal .JSON ({filteredExportSchedules.length})</span>
            </button>

            <button
              type="button"
              disabled={filteredExportSchedules.length === 0}
              onClick={handleDownloadSchedulesExcel}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Jadwal .XLSX ({filteredExportSchedules.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: IMPOR & GABUNG DATABASE (.JSON / .XLSX) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-300 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Impor & Gabungkan Database Hasil Input Guru
              </h2>
              <p className="text-xs text-slate-500">
                Unggah file backup <code className="font-bold text-slate-700">.JSON</code> (Database Lengkap / Backup Jadwal Guru) atau{' '}
                <code className="font-bold text-slate-700">Excel (.XLSX)</code> untuk meninjau & menggabungkan jadwal tanpa menghapus input guru lain.
              </p>
            </div>
          </div>

          {parsedImport && (
            <button
              type="button"
              onClick={() => {
                setParsedImport(null);
                setParseError(null);
                setConfirmFullRestoreCheck(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal / Pilih File Lain</span>
            </button>
          )}
        </div>

        {/* Upload Dropzone */}
        {!parsedImport && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer space-y-3 ${
              isDragging
                ? 'border-cyan-500 bg-cyan-50/70'
                : 'border-slate-300 bg-slate-50/60 hover:border-cyan-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mx-auto text-cyan-700">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800">
                Klik untuk memilih file backup (.JSON / .XLSX) atau seret file ke area ini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung: Backup Database Lengkap (.json), Backup Jadwal Guru (.json), Array Jadwal (.json), dan File Excel Backup Jadwal (.xlsx)
              </p>
            </div>
          </div>
        )}

        {parseError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview Panel Setelah File Terbaca */}
        {parsedImport && importMergePreview && (
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-5">
            {/* Info File */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0B1E2E] text-amber-300">
                    {parsedImport.format === 'simpati_full_backup_v1'
                      ? 'BACKUP DATABASE LENGKAP (.JSON)'
                      : parsedImport.format === 'excel_schedule_sheet'
                      ? 'EXCEL BACKUP JADWAL (.XLSX)'
                      : 'BACKUP JADWAL GURU (.JSON)'}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">{parsedImport.fileName}</span>
                </div>
                {(parsedImport.exportedAt || parsedImport.exportedBy) && (
                  <p className="text-[11px] text-slate-500">
                    Diekspor: {parsedImport.exportedAt ? new Date(parsedImport.exportedAt).toLocaleString('id-ID') : '-'}
                    {parsedImport.exportedBy ? ` oleh ${parsedImport.exportedBy}` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold border border-emerald-200">
                  +{importMergePreview.scheduleMerge.addedItems.length} Jadwal Baru
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold border border-amber-200">
                  {importMergePreview.scheduleMerge.updatedItems.length} Slot Diperbarui
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-200 text-slate-700 font-bold">
                  {importMergePreview.scheduleMerge.duplicateSkippedCount} Sama/Dilewati
                </span>
              </div>
            </div>

            {parsedImport.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                {parsedImport.warnings.map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Ringkasan Guru Penginput di dalam File */}
            {importMergePreview.incomingTeachers.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    Pratinjau Jadwal per Guru dalam File ({importMergePreview.incomingTeachers.length} Guru ·{' '}
                    {parsedImport.schedules.length} Total Slot)
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">KODE</th>
                        <th className="py-2 px-3">NAMA GURU</th>
                        <th className="py-2 px-3 text-center">JUMLAH SLOT</th>
                        <th className="py-2 px-3">KELAS</th>
                        <th className="py-2 px-3">MATA PELAJARAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importMergePreview.incomingTeachers.map((g) => (
                        <tr key={g.teacherKey} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-cyan-800">{g.teacherCode}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{g.teacherName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-extrabold border border-blue-200">
                              {g.totalSlots} Jam
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{g.classes.join(', ')}</td>
                          <td className="py-2 px-3 text-slate-600">{g.subjects.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pilihan Mode Impor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mode 1: Gabung Cerdas */}
              <button
                type="button"
                onClick={() => setImportMode('merge_smart')}
                className={`text-left p-4 rounded-2xl border-2 transition cursor-pointer space-y-2 ${
                  importMode === 'merge_smart'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Mode Gabung Cerdas (Direkomendasikan)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white">
                    AMAN
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menggabungkan jadwal hasil input guru dari file ke database Cloud Firestore secara atomik{' '}
                  <strong>tanpa menghapus</strong> jadwal guru lain yang sudah tersimpan saat ini.
                </p>
              </button>

              {/* Mode 2: Restore Penuh */}
              <button
                type="button"
                onClick={() => setImportMode('restore_full')}
                className={`text-left p-4 rounded-2xl border-2 transition cursor-pointer space-y-2 ${
                  importMode === 'restore_full'
                    ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    Mode Pulihkan Penuh (Timpa Data Aktif)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white">
                    TIMPA
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {parsedImport.format === 'simpati_full_backup_v1'
                    ? 'Mengganti seluruh database aktif dengan isi snapshot file backup lengkap ini.'
                    : 'Mengganti seluruh daftar jadwal pelajaran aktif saat ini dengan daftar jadwal dari file ini.'}
                </p>
              </button>
            </div>

            {/* Opsi Tambahan Gabung Cerdas */}
            {importMode === 'merge_smart' && parsedImport.format === 'simpati_full_backup_v1' && (
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeMasterData}
                    onChange={(e) => setMergeMasterData(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>
                    Gabungkan Data Master yang belum ada (Guru: {parsedImport.teachers?.length || 0}, Mapel:{' '}
                    {parsedImport.subjects?.length || 0}, Kelas: {parsedImport.classes?.length || 0})
                  </span>
                </label>

                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeJournals}
                    onChange={(e) => setMergeJournals(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Gabungkan Riwayat Jurnal yang belum ada ({parsedImport.journals?.length || 0})</span>
                </label>
              </div>
            )}

            {/* Konfirmasi Keamanan untuk Restore Penuh */}
            {importMode === 'restore_full' && (
              <label className="flex items-start gap-2.5 bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-900 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmFullRestoreCheck}
                  onChange={(e) => setConfirmFullRestoreCheck(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-600"
                />
                <span>
                  Saya memahami bahwa Mode Pulihkan Penuh akan mengganti data aktif saat ini dengan isi file backup.
                  (Sistem otomatis menyimpan cadangan pengaman ke Cloud sebelum melakukan timpa.)
                </span>
              </label>
            )}

            {/* Tombol Eksekusi Impor */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isApplyingImport || (importMode === 'restore_full' && !confirmFullRestoreCheck)}
                onClick={handleExecuteImport}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-50 ${
                  importMode === 'merge_smart'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isApplyingImport
                    ? 'Menyimpan ke Cloud Firestore...'
                    : importMode === 'merge_smart'
                    ? `Gabungkan & Simpan ke Cloud (${importMergePreview.scheduleMerge.addedItems.length} Baru, ${importMergePreview.scheduleMerge.updatedItems.length} Update)`
                    : 'Pulihkan Penuh & Simpan ke Cloud'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: RINCIAN JADWAL PELAJARAN HASIL INPUT GURU SAAT INI */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-700" />
              Rekap Hasil Penginputan Jadwal Pelajaran per Guru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan daftar guru yang jadwal mengajarnya sudah tersimpan di Cloud Firestore beserta tombol backup cepat per guru.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, kode, kelas, mapel..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {teacherSearch && (
              <button
                onClick={() => setTeacherSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 text-center w-12">NO</th>
                <th className="py-3 px-3">KODE</th>
                <th className="py-3 px-4">NAMA GURU</th>
                <th className="py-3 px-3 text-center">TOTAL SLOT</th>
                <th className="py-3 px-3 text-center">K10 PROD · K11 NORM</th>
                <th className="py-3 px-3 text-center">K10 NORM · K11 PROD</th>
                <th className="py-3 px-3 text-center">RUTIN</th>
                <th className="py-3 px-4">KELAS YANG DIAJAR</th>
                <th className="py-3 px-4 text-center">BACKUP GURU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeacherBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {schedules.length === 0
                        ? 'Belum ada jadwal pelajaran tersimpan di database.'
                        : 'Tidak ada data guru yang cocok dengan pencarian.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTeacherBreakdown.map((g, idx) => {
                  const teacherSchedules = schedules.filter(
                    (s) =>
                      (g.teacherId && s.teacherId === g.teacherId) ||
                      (g.teacherCode !== '-' && s.teacherCode === g.teacherCode) ||
                      s.teacherName === g.teacherName
                  );
                  return (
                    <tr key={g.teacherKey} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-800">{g.teacherCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{g.teacherName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{g.subjects.join(', ')}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-extrabold border border-blue-200 tabular-nums">
                          {g.totalSlots} Jam
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold text-emerald-700">
                        {g.p10ProdCount}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold text-purple-700">
                        {g.p10NormCount}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold text-slate-700">
                        {g.allWeekCount}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        <span className="line-clamp-2">{g.classes.join(', ') || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const env = createSchedulesBackupEnvelope(
                                teacherSchedules,
                                currentUser.name || 'Admin',
                                `Jadwal Guru: ${g.teacherName}`
                              );
                              const safeName = g.teacherName.replace(/[^a-zA-Z0-9]/g, '_');
                              triggerDownloadJson(env, `Jadwal_${safeName}_${dateStamp}.json`);
                              showToast('success', `Backup JSON jadwal ${g.teacherName} (${teacherSchedules.length} jam) diunduh.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold cursor-pointer"
                            title="Unduh Backup .JSON Guru Ini"
                          >
                            .JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const safeName = g.teacherName.replace(/[^a-zA-Z0-9]/g, '_');
                              downloadSchedulesExcel(teacherSchedules, `Jadwal_${safeName}_${dateStamp}.xlsx`);
                              showToast('success', `Backup Excel jadwal ${g.teacherName} (${teacherSchedules.length} jam) diunduh.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                            title="Unduh Backup Excel .XLSX Guru Ini"
                          >
                            .XLSX
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
