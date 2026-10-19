import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  MapPin,
  Search,
  Filter,
  Check,
  FileSpreadsheet,
  Users,
  CalendarDays,
  Sparkles,
  Calendar,
  RotateCcw,
  X,
  UserX,
  Download,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScheduleItem } from '../../types';
import { PiketVerifyModal } from '../modals/PiketVerifyModal';

export const PapanGuruPiketView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentPeriod,
    currentDateString,
    currentTimeString,
    currentDayName,
    currentDayIndex,
    effectiveWeekType,
    realtimeWeekType,
    quickPiketStatusToggle,
    currentUser,
    teachers,
    userAccounts,
  } = useApp();

  const todayUpper = (currentDayName || '').toUpperCase();

  // Helper resolusi nama hari untuk tiap jadwal
  const getScheduleDayName = (item: ScheduleItem): string => {
    if (item.dayName) return item.dayName;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[item.dayOfWeek] || 'Senin';
  };

  // Cek apakah ada jadwal pada hari ini (sesuai waktu laptop)
  const hasSchedulesToday = useMemo(() => {
    return schedules.some((s) => {
      const dName = getScheduleDayName(s).toUpperCase();
      return dName === todayUpper || s.dayOfWeek === currentDayIndex;
    });
  }, [schedules, todayUpper, currentDayIndex]);

  // Petugas Guru Piket Hari Ini (sesuai waktu laptop)
  const piketDutyOfficersToday = useMemo(() => {
    const day = (currentDayName || '').toLowerCase();
    return teachers.filter((t) => {
      const acc = userAccounts.find((a) => a.teacherId === t.id);
      const days = acc?.piketDays && acc.piketDays.length > 0 ? acc.piketDays : t.piketDays || [];
      return days.some((d) => d.toLowerCase() === day);
    });
  }, [teachers, userAccounts, currentDayName]);

  // State Filter Real-Time
  const [selectedDay, setSelectedDay] = useState<string>(() => (hasSchedulesToday ? 'TODAY' : 'ALL'));
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'current' | 'all'>('current');
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'needs_validation' | 'inval_needed' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalSchedule, setActiveModalSchedule] = useState<ScheduleItem | null>(null);

  // Helper penentuan apakah suatu jadwal sedang aktif secara real-time
  const isScheduleCurrentlyActive = (s: ScheduleItem): boolean => {
    const sDay = getScheduleDayName(s).toUpperCase();
    const isToday = sDay === todayUpper || s.dayOfWeek === currentDayIndex;
    const pNum = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
    return isToday && pNum === currentPeriod;
  };

  // Filtered schedules berdasarkan kondisi real-time
  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      // 1. Filter Hari
      const sDay = getScheduleDayName(s).toUpperCase();
      if (selectedDay === 'TODAY') {
        const isToday = sDay === todayUpper || s.dayOfWeek === currentDayIndex;
        if (!isToday) return false;
      } else if (selectedDay !== 'ALL') {
        if (sDay !== selectedDay.toUpperCase()) return false;
      }

      // 2. Filter Rotasi Pekan
      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== selectedWeek) return false;
      }

      // 3. Filter Jam Pelajaran
      const pNum = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
      if (selectedPeriod === 'current') {
        if (pNum !== currentPeriod) return false;
      } else if (typeof selectedPeriod === 'number') {
        if (pNum !== selectedPeriod) return false;
      }

      // 4. Data Kehadiran Real-time
      const record = attendanceRecords[s.id];
      const piketStatus = record?.piketConfirmation?.status;
      const isPiketDone = piketStatus && piketStatus !== 'belum_konfirmasi';
      const teacherStatus = record?.teacherConfirmation?.status;
      const isTeacherPermitted = teacherStatus === 'izin' || teacherStatus === 'sakit' || teacherStatus === 'dinas_luar';

      // 5. Filter Tab Status
      if (activeTab === 'ongoing') {
        if (!isScheduleCurrentlyActive(s)) return false;
      } else if (activeTab === 'needs_validation') {
        if (isPiketDone) return false;
      } else if (activeTab === 'inval_needed') {
        const needsInval =
          isTeacherPermitted ||
          piketStatus === 'izin_terkonfirmasi' ||
          piketStatus === 'tidak_hadir' ||
          Boolean(record?.piketConfirmation?.substituteTeacherName);
        if (!needsInval) return false;
      } else if (activeTab === 'verified') {
        if (!isPiketDone) return false;
      }

      // 6. Pencarian Cepat
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          s.teacherName.toLowerCase().includes(q) ||
          s.subjectName.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          s.roomName.toLowerCase().includes(q) ||
          sDay.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    schedules,
    selectedDay,
    todayUpper,
    currentDayIndex,
    selectedWeek,
    effectiveWeekType,
    selectedPeriod,
    currentPeriod,
    activeTab,
    attendanceRecords,
    searchQuery,
  ]);

  // Statistik Real-Time Piket (Dihitung berdasarkan filter Hari dan Pekan aktif)
  const scopedStats = useMemo(() => {
    let totalInScope = 0;
    let ongoingCount = 0;
    let verifiedCount = 0;
    let invalNeededCount = 0;
    let invalAssignedCount = 0;
    let unverifiedCount = 0;

    schedules.forEach((s) => {
      // Filter Hari scope
      const sDay = getScheduleDayName(s).toUpperCase();
      if (selectedDay === 'TODAY') {
        const isToday = sDay === todayUpper || s.dayOfWeek === currentDayIndex;
        if (!isToday) return;
      } else if (selectedDay !== 'ALL') {
        if (sDay !== selectedDay.toUpperCase()) return;
      }

      // Filter Pekan scope
      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== selectedWeek) return;
      }

      totalInScope += 1;
      const record = attendanceRecords[s.id];
      const piketStatus = record?.piketConfirmation?.status;
      const teacherStatus = record?.teacherConfirmation?.status;
      const isTeacherPermitted = teacherStatus === 'izin' || teacherStatus === 'sakit' || teacherStatus === 'dinas_luar';

      // Cek apakah sedang berlangsung
      if (isScheduleCurrentlyActive(s)) {
        ongoingCount += 1;
      }

      // Cek Status Piket
      if (piketStatus === 'terverifikasi_hadir' || piketStatus === 'terlambat') {
        verifiedCount += 1;
      } else if (
        isTeacherPermitted ||
        piketStatus === 'izin_terkonfirmasi' ||
        piketStatus === 'tidak_hadir' ||
        record?.piketConfirmation?.substituteTeacherName
      ) {
        invalNeededCount += 1;
        if (record?.piketConfirmation?.substituteTeacherName) {
          invalAssignedCount += 1;
        }
      } else {
        unverifiedCount += 1;
      }
    });

    return {
      totalInScope,
      ongoingCount,
      verifiedCount,
      invalNeededCount,
      invalAssignedCount,
      unverifiedCount,
    };
  }, [
    schedules,
    selectedDay,
    todayUpper,
    currentDayIndex,
    selectedWeek,
    effectiveWeekType,
    attendanceRecords,
    currentPeriod,
  ]);

  // Bulk validate active period untuk hari dan jam yang dipilih
  const handleBulkValidatePeriod = () => {
    const targetPeriod = selectedPeriod === 'all' || selectedPeriod === 'current' ? currentPeriod : selectedPeriod;
    const targetSchedules = schedules.filter((s) => {
      const sDay = getScheduleDayName(s).toUpperCase();
      if (selectedDay === 'TODAY') {
        const isToday = sDay === todayUpper || s.dayOfWeek === currentDayIndex;
        if (!isToday) return false;
      } else if (selectedDay !== 'ALL') {
        if (sDay !== selectedDay.toUpperCase()) return false;
      }

      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== selectedWeek) return false;
      }

      const pNum = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
      return pNum === targetPeriod;
    });

    targetSchedules.forEach((s) => {
      quickPiketStatusToggle(s.id, 'terverifikasi_hadir');
    });
  };

  // Ekspor Rekap Piket Real-Time ke Excel
  const handleExportExcel = () => {
    try {
      const headers = [
        'Hari',
        'Jam Ke',
        'Waktu',
        'Pekan',
        'Nama Guru',
        'Mata Pelajaran',
        'Kelas',
        'Ruang',
        'Status Guru',
        'Validasi Piket',
        'Guru Pengganti (Inval)',
        'Tugas Mandiri',
        'Catatan Piket',
      ];

      const rows = filtered.map((s) => {
        const record = attendanceRecords[s.id];
        const teacherStatus = record?.teacherConfirmation?.status || 'belum_konfirmasi';
        const piketStatus = record?.piketConfirmation?.status || 'belum_konfirmasi';

        return [
          getScheduleDayName(s),
          s.periodIndex,
          s.timeRange,
          s.weekType || 'SEMUA',
          s.teacherName,
          s.subjectName,
          s.className,
          s.roomName,
          teacherStatus,
          piketStatus,
          record?.piketConfirmation?.substituteTeacherName || '-',
          record?.piketConfirmation?.assignedTask || '-',
          record?.piketConfirmation?.notes || '-',
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Papan Guru Piket');
      XLSX.writeFile(wb, `papan_piket_${selectedDay.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Reset filter ke kondisi default real-time
  const handleResetFilters = () => {
    setSelectedDay(hasSchedulesToday ? 'TODAY' : 'ALL');
    setSelectedPeriod('current');
    setSelectedWeek('ACTIVE');
    setActiveTab('all');
    setSearchQuery('');
  };

  const isFiltered =
    selectedDay !== (hasSchedulesToday ? 'TODAY' : 'ALL') ||
    selectedPeriod !== 'current' ||
    selectedWeek !== 'ACTIVE' ||
    activeTab !== 'all' ||
    Boolean(searchQuery.trim());

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Pusat Kendali Pengawasan KBM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Papan Guru Piket SMKN 1 Tegalsari
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Verifikasi fisik keterlaksanaan KBM langsung di kelas, penanganan guru berhalangan, serta penugasan guru pengganti (inval) secara real-time.
          </p>

          {/* Real-time Laptop Clock & Active Status Indicators */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-4 h-4 text-amber-500 animate-spin-slow" />
              <span>{currentDateString} · {currentTimeString}</span>
            </span>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Hari: <strong>{currentDayName}</strong></span>
            </span>
            <span className="text-xs font-bold text-cyan-900 bg-cyan-50 border border-cyan-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>Jam Ke-<strong>{currentPeriod}</strong> Berlangsung</span>
            </span>
            <span className="text-xs font-bold text-purple-950 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <CalendarDays className="w-4 h-4 text-purple-700" />
              <span>
                Pekan Aktif:{' '}
                <strong className="underline">
                  {effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? 'K10 Produktif & K11 Normatif'
                    : effectiveWeekType === 'P10_NORM_P11_PROD'
                    ? 'K10 Normatif & K11 Produktif'
                    : 'Semua Pekan'}
                </strong>
              </span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition"
            title="Unduh rekap piket format Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={handleBulkValidatePeriod}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Validasi Cepat Jam Ke-{selectedPeriod === 'all' || selectedPeriod === 'current' ? currentPeriod : selectedPeriod} Hadir Semua
            </span>
          </button>
        </div>
      </div>

      {/* Petugas Piket Hari Ini Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-4 md:p-5 text-white shadow-xs border border-emerald-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Tim Petugas Piket Bertugas Hari Ini ({currentDayName})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {piketDutyOfficersToday.length} Guru
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {piketDutyOfficersToday.length > 0 ? (
                  piketDutyOfficersToday.map((officer) => (
                    <span
                      key={officer.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition border border-white/10"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{officer.name}</span>
                      <span className="text-[10px] text-slate-300">({officer.code})</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-300 italic">
                    Belum ada guru yang dijadwalkan piket pada hari {currentDayName}.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-300">
            <span>Login aktif: </span>
            <strong className="text-white">{currentUser.name}</strong>
            <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
              Peran: {currentUser.role.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Real-Time Scoped Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL JADWAL
            </p>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1 tabular-nums">
            {scopedStats.totalInScope}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {selectedDay === 'TODAY' ? `Hari ini (${currentDayName})` : selectedDay}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              SEDANG KBM
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 tracking-tight mt-1 tabular-nums">
            {scopedStats.ongoingCount} Kelas
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Jam Ke-{currentPeriod} Aktif
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SUDAH TERVERIFIKASI
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 tracking-tight mt-1 tabular-nums">
            {scopedStats.verifiedCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Fisik hadir di kelas</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              IZIN / BUTUH INVAL
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 tracking-tight mt-1 tabular-nums">
            {scopedStats.invalNeededCount}
          </p>
          <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
            {scopedStats.invalAssignedCount} terisi guru inval
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              BELUM DIINSPEKSI
            </p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 tracking-tight mt-1 tabular-nums">
            {scopedStats.unverifiedCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Menunggu konfirmasi piket</p>
        </div>
      </div>

      {/* Controls & Filter Bar Real-Time */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-2xs space-y-4">
        {/* Row 1: Filter Hari, Jam, Rotasi Pekan, dan Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Hari */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-semibold text-slate-600">Hari:</span>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="TODAY">⚡ Hari Ini ({currentDayName})</option>
                <option value="SENIN">Senin</option>
                <option value="SELASA">Selasa</option>
                <option value="RABU">Rabu</option>
                <option value="KAMIS">Kamis</option>
                <option value="JUMAT">Jumat</option>
                <option value="ALL">🌐 Semua Hari</option>
              </select>
            </div>

            {/* Filter Jam Pelajaran */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold text-slate-600">Jam:</span>
              <select
                value={selectedPeriod}
                onChange={(e) =>
                  setSelectedPeriod(
                    e.target.value === 'current'
                      ? 'current'
                      : e.target.value === 'all'
                      ? 'all'
                      : Number(e.target.value)
                  )
                }
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="current">⚡ Jam Aktif (Jam Ke-{currentPeriod})</option>
                <option value="all">Semua Jam Pelajaran</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>
                    Jam Ke-{p} {p === currentPeriod ? '(Sedang Berlangsung)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Rotasi Pekan */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
              <span className="font-semibold text-slate-600">Pekan:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ACTIVE">⚡ Pekan Aktif Real-Time</option>
                <option value="P10_PROD_P11_NORM">🟢 Pekan K10 Prod & K11 Norm</option>
                <option value="P10_NORM_P11_PROD">🟣 Pekan K10 Norm & K11 Prod</option>
                <option value="ALL">🌐 Semua Pekan</option>
              </select>
            </div>

            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Pencarian Cepat */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru, kelas, ruang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'all'
                ? 'bg-[#0B1E2E] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({filtered.length})
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'ongoing'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sedang Berlangsung (Jam Ke-{currentPeriod})
          </button>
          <button
            onClick={() => setActiveTab('needs_validation')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'needs_validation'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Menunggu Validasi Piket
          </button>
          <button
            onClick={() => setActiveTab('inval_needed')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'inval_needed'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Guru Izin / Butuh Inval
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'verified'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah Terverifikasi Hadir
          </button>
        </div>
      </div>

      {/* Table of Schedules for Piket */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-3 text-center">JAM</th>
                <th className="py-3 px-3">HARI & WAKTU</th>
                <th className="py-3 px-3">ROTASI PEKAN</th>
                <th className="py-3 px-4">GURU MAPEL</th>
                <th className="py-3 px-4">MAPEL & KELAS</th>
                <th className="py-3 px-3">RUANG</th>
                <th className="py-3 px-3">STATUS GURU</th>
                <th className="py-3 px-3">VALIDASI PIKET</th>
                <th className="py-3 px-3">INVAL / TUGAS MANDIRI</th>
                <th className="py-3 px-3 text-center">AKSI CEPAT PIKET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="font-bold text-slate-700 text-sm">
                      {schedules.length === 0
                        ? 'Belum ada data jadwal pelajaran pada sistem.'
                        : 'Tidak ada jadwal yang cocok dengan filter atau hari yang dipilih.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti pilihan Hari, Jam Pelajaran, atau klik Reset Filter di atas.
                    </p>
                    {isFiltered && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Tampilkan Jadwal Hari Ini
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const record = attendanceRecords[item.id];
                  const teacherStatus = record?.teacherConfirmation?.status || 'belum_konfirmasi';
                  const piketStatus = record?.piketConfirmation?.status || 'belum_konfirmasi';
                  const sDay = getScheduleDayName(item);
                  const isCurrent = isScheduleCurrentlyActive(item);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500 font-medium'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Jam */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-sm tabular-nums text-slate-800">
                            Ke-{item.periodIndex}
                          </span>
                          {isCurrent && (
                            <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white animate-pulse">
                              AKTIF
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hari & Waktu */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{sDay}</div>
                        <div className="text-[11px] font-medium text-slate-500 tabular-nums">
                          {item.timeRange}
                        </div>
                      </td>

                      {/* Rotasi Pekan */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.weekType === 'P10_PROD_P11_NORM' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            K10 Prod · K11 Norm
                          </span>
                        ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            K10 Norm · K11 Prod
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Semua Pekan
                          </span>
                        )}
                      </td>

                      {/* Guru */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                            {item.teacherName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.teacherName}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              Kode: <span className="font-semibold">{item.teacherCode || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mapel & Kelas */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{item.subjectName}</div>
                        <div className="text-[11px] text-cyan-800 font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {item.className}
                        </div>
                      </td>

                      {/* Ruang */}
                      <td className="py-3.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.roomName}
                        </span>
                      </td>

                      {/* Status Guru Mandiri */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            teacherStatus === 'hadir'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : teacherStatus === 'izin'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : teacherStatus === 'sakit'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : teacherStatus === 'dinas_luar'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              teacherStatus === 'hadir'
                                ? 'bg-emerald-500'
                                : teacherStatus === 'izin'
                                ? 'bg-amber-500'
                                : teacherStatus === 'sakit'
                                ? 'bg-rose-500'
                                : teacherStatus === 'dinas_luar'
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {teacherStatus === 'hadir'
                            ? 'Hadir di Kelas'
                            : teacherStatus === 'izin'
                            ? 'Izin Mandiri'
                            : teacherStatus === 'sakit'
                            ? 'Sakit'
                            : teacherStatus === 'dinas_luar'
                            ? 'Dinas Luar'
                            : 'Belum Konfirmasi'}
                        </span>
                      </td>

                      {/* Validasi Piket */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            piketStatus === 'terverifikasi_hadir'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : piketStatus === 'terlambat'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : piketStatus === 'izin_terkonfirmasi'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : piketStatus === 'tidak_hadir'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {piketStatus === 'terverifikasi_hadir'
                            ? '✓ Terverifikasi Hadir'
                            : piketStatus === 'terlambat'
                            ? '⏱ Terlambat'
                            : piketStatus === 'izin_terkonfirmasi'
                            ? 'ℹ Izin Valid'
                            : piketStatus === 'tidak_hadir'
                            ? '✕ Alpa'
                            : '⏳ Menunggu Cek'}
                        </span>
                      </td>

                      {/* Inval / Tugas */}
                      <td className="py-3.5 px-3 text-slate-600">
                        {record?.piketConfirmation?.substituteTeacherName ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              Inval:
                            </span>{' '}
                            <span className="font-semibold text-slate-800">
                              {record.piketConfirmation.substituteTeacherName}
                            </span>
                          </div>
                        ) : record?.piketConfirmation?.assignedTask ? (
                          <div
                            className="text-[11px] truncate max-w-xs text-slate-600"
                            title={record.piketConfirmation.assignedTask}
                          >
                            <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Tugas:
                            </span>{' '}
                            <span>{record.piketConfirmation.assignedTask}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Aksi Cepat Piket */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => quickPiketStatusToggle(item.id, 'terverifikasi_hadir')}
                            title="1-Klik Cepat Validasi Hadir Fisik"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition"
                          >
                            Valid Hadir
                          </button>
                          <button
                            onClick={() => quickPiketStatusToggle(item.id, 'terlambat')}
                            title="1-Klik Tandai Guru Terlambat"
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] rounded-lg transition"
                          >
                            Terlambat
                          </button>
                          <button
                            onClick={() => setActiveModalSchedule(item)}
                            title="Buka Menu Penugasan Guru Pengganti / Catatan Khusus Piket"
                            className="px-2.5 py-1 bg-[#0B1E2E] hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-2xs transition"
                          >
                            Atur Inval
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

      {/* Piket Modal */}
      {activeModalSchedule && (
        <PiketVerifyModal
          schedule={activeModalSchedule}
          isOpen={!!activeModalSchedule}
          onClose={() => setActiveModalSchedule(null)}
        />
      )}
    </div>
  );
};
