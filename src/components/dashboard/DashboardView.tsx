import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Users,
  Activity,
  CheckCircle2,
  UserX,
  AlertCircle,
  ArrowRight,
  Search,
  Filter,
  Check,
  X,
  ShieldCheck,
  BookOpen,
  Tv2,
  CalendarDays,
  Sparkles,
  Calendar,
  RotateCcw,
  Flame,
  CheckSquare,
} from 'lucide-react';
import { ScheduleItem } from '../../types';
import { JournalModal } from '../modals/JournalModal';
import { PiketVerifyModal } from '../modals/PiketVerifyModal';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    currentDateString,
    currentTimeString,
    currentDayName,
    currentDayIndex,
    currentPeriod,
    realtimeWeekType,
    activeWeekFilter,
    effectiveWeekType,
    schedules,
    attendanceRecords,
    departments,
    classes,
    setActiveMenu,
    quickTeacherStatusToggle,
    quickPiketStatusToggle,
  } = useApp();

  const todayUpper = (currentDayName || '').toUpperCase();

  // Deteksi apakah ada jadwal pada hari ini
  const hasSchedulesToday = useMemo(() => {
    return schedules.some((s) => {
      const dName = (s.dayName || '').toUpperCase();
      return dName === todayUpper || s.dayOfWeek === currentDayIndex;
    });
  }, [schedules, todayUpper, currentDayIndex]);

  // State Filter
  // Jika hari ini ada jadwal, default ke 'TODAY' (Hari ini real-time). Jika tidak (misal akhir pekan), default ke 'ALL'.
  const [filterDay, setFilterDay] = useState<string>(() => (hasSchedulesToday ? 'TODAY' : 'ALL'));
  const [tableWeekFilter, setTableWeekFilter] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [filterPeriod, setFilterPeriod] = useState<number | 'all'>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ongoing' | 'completed' | 'unconfirmed' | 'excused'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected schedule for modal actions
  const [selectedJournalSchedule, setSelectedJournalSchedule] = useState<ScheduleItem | null>(null);
  const [selectedPiketSchedule, setSelectedPiketSchedule] = useState<ScheduleItem | null>(null);

  // Helper resolusi jurusan secara real-time
  const getScheduleDept = (item: ScheduleItem): string => {
    const cls = classes.find((c) => c.id === item.classId || c.name === item.className);
    if (cls?.department && cls.department.trim()) return cls.department.trim().toUpperCase();
    if (item.department && item.department.trim()) return item.department.trim().toUpperCase();
    return 'UMUM';
  };

  // Helper normalisasi nama hari dari jadwal
  const getScheduleDayName = (item: ScheduleItem): string => {
    if (item.dayName && item.dayName.trim()) return item.dayName.trim().toUpperCase();
    if (item.dayOfWeek === 1) return 'SENIN';
    if (item.dayOfWeek === 2) return 'SELASA';
    if (item.dayOfWeek === 3) return 'RABU';
    if (item.dayOfWeek === 4) return 'KAMIS';
    if (item.dayOfWeek === 5) return 'JUMAT';
    return 'SENIN';
  };

  // Helper warna badge hari
  const getDayBadge = (day: string) => {
    const d = day.toUpperCase();
    if (d.includes('SENIN')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (d.includes('SELASA')) return 'bg-amber-50 text-amber-900 border-amber-300';
    if (d.includes('RABU')) return 'bg-purple-50 text-purple-800 border-purple-200';
    if (d.includes('KAMIS')) return 'bg-teal-50 text-teal-800 border-teal-200';
    if (d.includes('JUMAT')) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Helper status real-time untuk tiap baris jadwal
  const getScheduleLiveStatus = (item: ScheduleItem) => {
    const record = attendanceRecords[item.id];
    const teacherStatus = record?.teacherConfirmation?.status;
    const piketStatus = record?.piketConfirmation?.status;
    const pNum = typeof item.periodIndex === 'number' ? item.periodIndex : parseInt(String(item.periodIndex), 10);
    const isCurrent = pNum === currentPeriod;
    const isPast = pNum < currentPeriod;

    // Inval / Guru Pengganti / Izin
    if (piketStatus === 'izin_terkonfirmasi' || record?.piketConfirmation?.substituteTeacherName) {
      return {
        label: record?.piketConfirmation?.substituteTeacherName
          ? `Inval: ${record.piketConfirmation.substituteTeacherName}`
          : 'Izin Terkonfirmasi (Tugas Mandiri)',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        dotClass: 'bg-blue-600',
        isPulse: false,
      };
    }

    if (teacherStatus === 'izin' || teacherStatus === 'sakit' || teacherStatus === 'dinas_luar') {
      const typeLabel = teacherStatus === 'sakit' ? 'Sakit' : teacherStatus === 'dinas_luar' ? 'Dinas Luar' : 'Izin';
      return {
        label: `Guru ${typeLabel} (Butuh Inval)`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dotClass: 'bg-amber-600',
        isPulse: true,
      };
    }

    if (piketStatus === 'tidak_hadir') {
      return {
        label: 'Tidak Hadir (Alpa)',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        dotClass: 'bg-rose-600',
        isPulse: false,
      };
    }

    // Terverifikasi oleh Piket
    if (piketStatus === 'terverifikasi_hadir') {
      return {
        label: isCurrent ? 'Terverifikasi (Sedang Belajar)' : 'Terlaksana & Terverifikasi',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dotClass: 'bg-emerald-600',
        isPulse: isCurrent,
      };
    }

    // Guru Hadir Mandiri
    if (teacherStatus === 'hadir') {
      if (isCurrent) {
        return {
          label: 'Sedang Berlangsung (Hadir)',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/40',
          dotClass: 'bg-emerald-500',
          isPulse: true,
        };
      }
      if (isPast) {
        return {
          label: 'Selesai KBM (Menunggu Piket)',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
          dotClass: 'bg-teal-500',
          isPulse: false,
        };
      }
      return {
        label: 'Terkonfirmasi Hadir Awal',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
        dotClass: 'bg-cyan-500',
        isPulse: false,
      };
    }

    if (piketStatus === 'terlambat') {
      return {
        label: 'Terlambat Masuk',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
        isPulse: false,
      };
    }

    // Belum konfirmasi sama sekali
    if (isCurrent) {
      return {
        label: 'Sedang Berlangsung (Belum Konfirmasi)',
        badgeClass: 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-400/50',
        dotClass: 'bg-rose-500',
        isPulse: true,
      };
    }

    if (isPast) {
      return {
        label: 'Terlewat (Belum Konfirmasi)',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotClass: 'bg-slate-400',
        isPulse: false,
      };
    }

    return {
      label: 'Terjadwal (Akan Datang)',
      badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
      dotClass: 'bg-slate-400',
      isPulse: false,
    };
  };

  // Filter jadwal KBM secara real-time
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // 1. Filter Rotasi Pekan
      if (tableWeekFilter === 'ACTIVE') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (tableWeekFilter !== 'ALL') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== tableWeekFilter) return false;
      }

      // 2. Filter Hari
      const schDay = getScheduleDayName(item);
      if (filterDay === 'TODAY') {
        const matchToday = schDay === todayUpper || item.dayOfWeek === currentDayIndex;
        if (!matchToday) return false;
      } else if (filterDay !== 'ALL') {
        if (schDay !== filterDay.toUpperCase()) return false;
      }

      // 3. Filter Jam Pelajaran
      if (filterPeriod !== 'all') {
        const pNum = typeof item.periodIndex === 'number' ? item.periodIndex : parseInt(String(item.periodIndex), 10);
        if (pNum !== filterPeriod) return false;
      }

      // 4. Filter Jurusan
      const deptCode = getScheduleDept(item);
      if (filterDept !== 'all' && deptCode !== filterDept.toUpperCase()) {
        return false;
      }

      // 5. Filter Status Real-Time
      const record = attendanceRecords[item.id];
      const teacherStatus = record?.teacherConfirmation?.status;
      const piketStatus = record?.piketConfirmation?.status;
      const pNum = typeof item.periodIndex === 'number' ? item.periodIndex : parseInt(String(item.periodIndex), 10);
      const isCurrent = pNum === currentPeriod;
      const isPast = pNum < currentPeriod;

      if (filterStatus === 'ongoing') {
        if (!isCurrent) return false;
        if (teacherStatus === 'izin' || teacherStatus === 'sakit') return false;
      } else if (filterStatus === 'completed') {
        const isDone = piketStatus === 'terverifikasi_hadir' || (teacherStatus === 'hadir' && isPast);
        if (!isDone) return false;
      } else if (filterStatus === 'unconfirmed') {
        const hasConfirmed =
          (teacherStatus && teacherStatus !== 'belum_konfirmasi') ||
          (piketStatus && piketStatus !== 'belum_konfirmasi');
        if (hasConfirmed) return false;
      } else if (filterStatus === 'excused') {
        const isExcused =
          teacherStatus === 'izin' ||
          teacherStatus === 'sakit' ||
          teacherStatus === 'dinas_luar' ||
          piketStatus === 'tidak_hadir' ||
          piketStatus === 'izin_terkonfirmasi' ||
          Boolean(record?.piketConfirmation?.substituteTeacherName);
        if (!isExcused) return false;
      }

      // 6. Pencarian Cepat
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.teacherName.toLowerCase().includes(q) ||
          item.subjectName.toLowerCase().includes(q) ||
          item.className.toLowerCase().includes(q) ||
          item.roomName.toLowerCase().includes(q) ||
          schDay.toLowerCase().includes(q) ||
          deptCode.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    schedules,
    classes,
    tableWeekFilter,
    effectiveWeekType,
    filterDay,
    todayUpper,
    currentDayIndex,
    filterPeriod,
    filterDept,
    filterStatus,
    searchQuery,
    attendanceRecords,
    currentPeriod,
  ]);

  // Statistik Real-Time yang sinkron dengan seleksi Hari & Pekan aktif
  const dashboardStats = useMemo(() => {
    // Basis jadwal untuk metrik: pekan & hari yang sedang dipilih
    const baseSchedules = schedules.filter((item) => {
      if (tableWeekFilter === 'ACTIVE') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (tableWeekFilter !== 'ALL') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== tableWeekFilter) return false;
      }

      const schDay = getScheduleDayName(item);
      if (filterDay === 'TODAY') {
        return schDay === todayUpper || item.dayOfWeek === currentDayIndex;
      } else if (filterDay !== 'ALL') {
        return schDay === filterDay.toUpperCase();
      }
      return true;
    });

    const totalJadwal = baseSchedules.length;
    const uniqueTeachers = new Set<string>();
    let sedangBerlangsung = 0;
    let terlaksana = 0;
    let belumKonfirmasi = 0;
    let tidakHadirOrInval = 0;

    baseSchedules.forEach((item) => {
      if (item.teacherName) uniqueTeachers.add(item.teacherName);
      const record = attendanceRecords[item.id];
      const teacherStatus = record?.teacherConfirmation?.status;
      const piketStatus = record?.piketConfirmation?.status;
      const isCurrent = Number(item.periodIndex) === currentPeriod;

      const isExcused =
        teacherStatus === 'izin' ||
        teacherStatus === 'sakit' ||
        teacherStatus === 'dinas_luar' ||
        piketStatus === 'tidak_hadir' ||
        piketStatus === 'izin_terkonfirmasi' ||
        Boolean(record?.piketConfirmation?.substituteTeacherName);

      if (isExcused) {
        tidakHadirOrInval += 1;
      } else if (piketStatus === 'terverifikasi_hadir') {
        terlaksana += 1;
      } else if (teacherStatus === 'hadir') {
        if (isCurrent) {
          sedangBerlangsung += 1;
        } else {
          terlaksana += 1;
        }
      } else {
        if (isCurrent) {
          sedangBerlangsung += 1;
        }
        belumKonfirmasi += 1;
      }
    });

    return {
      totalJadwal,
      guruMengajar: uniqueTeachers.size,
      sedangBerlangsung,
      terlaksana,
      belumKonfirmasi,
      tidakHadir: tidakHadirOrInval,
    };
  }, [
    schedules,
    tableWeekFilter,
    effectiveWeekType,
    filterDay,
    todayUpper,
    currentDayIndex,
    attendanceRecords,
    currentPeriod,
  ]);

  // Reset semua filter kembali ke awal
  const handleResetFilters = () => {
    setFilterDay(hasSchedulesToday ? 'TODAY' : 'ALL');
    setTableWeekFilter('ACTIVE');
    setFilterPeriod('all');
    setFilterDept('all');
    setFilterStatus('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const isFiltered =
    (filterDay !== (hasSchedulesToday ? 'TODAY' : 'ALL')) ||
    tableWeekFilter !== 'ACTIVE' ||
    filterPeriod !== 'all' ||
    filterDept !== 'all' ||
    filterStatus !== 'ALL' ||
    Boolean(searchQuery.trim());

  // Pagination
  const totalPages = Math.ceil(filteredSchedules.length / rowsPerPage) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSchedules.slice(start, start + rowsPerPage);
  }, [filteredSchedules, currentPage, rowsPerPage]);

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Welcome Greeting, Live Clock & Week Rotation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0B1E2E] to-slate-900 rounded-3xl p-6 md:p-7 text-white shadow-md border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Waktu Laptop Real-Time
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Jam Ke-{currentPeriod} Aktif
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Hari: {currentDayName}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Selamat datang, {currentUser.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentDateString} · {currentTimeString}</span>
            </span>
          </div>
        </div>

        {/* Rotasi Pekan Active Card */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px]">Rotasi Jadwal Mingguan:</span>
            </div>
            <div className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${effectiveWeekType === 'P10_PROD_P11_NORM' ? 'bg-emerald-400' : 'bg-purple-400'} animate-pulse`} />
              <span>
                {effectiveWeekType === 'P10_PROD_P11_NORM'
                  ? 'Pekan K10 Produktif & K11 Normatif Adaptif'
                  : effectiveWeekType === 'P10_NORM_P11_PROD'
                  ? 'Pekan K10 Normatif Adaptif & K11 Produktif'
                  : 'Semua Pekan'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {activeWeekFilter === 'AUTO' ? '⚡ Otomatis sinkron kalender laptop' : '📌 Filter manual dipilih'}
            </p>
          </div>

          <button
            onClick={() => setActiveMenu('mode_tv')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#E59819] hover:bg-amber-500 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
          >
            <Tv2 className="w-4 h-4 text-slate-950" />
            <span>Buka Dashboard TV</span>
          </button>
        </div>
      </div>

      {/* 6 Stats Cards: Real-Time & Sinkron Otomatis */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Jadwal */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL JADWAL
            </p>
            <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight tabular-nums mt-1">
              {dashboardStats.totalJadwal}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {filterDay === 'TODAY' ? `Hari Ini (${currentDayName})` : filterDay === 'ALL' ? 'Semua Hari' : filterDay}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Guru Mengajar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              GURU MENGAJAR
            </p>
            <p className="text-2xl md:text-3xl font-black text-cyan-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.guruMengajar}
            </p>
            <p className="text-[10px] text-cyan-600 mt-0.5 truncate">Guru Aktif Terjadwal</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Sedang Berlangsung */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                BERLANGSUNG
              </p>
            </div>
            <p className="text-2xl md:text-3xl font-black text-blue-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.sedangBerlangsung}
            </p>
            <p className="text-[10px] text-blue-600 mt-0.5 truncate">Jam Ke-{currentPeriod} Aktif</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Terlaksana */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TERLAKSANA
            </p>
            <p className="text-2xl md:text-3xl font-black text-emerald-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.terlaksana}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 truncate">Tervalidasi / Hadir</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Belum Konfirmasi */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              BELUM KONFIRMASI
            </p>
            <p className="text-2xl md:text-3xl font-black text-amber-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.belumKonfirmasi}
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5 truncate">Menunggu Guru Mapel</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Guru Izin / Inval */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              IZIN / INVAL
            </p>
            <p className="text-2xl md:text-3xl font-black text-rose-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.tidakHadir}
            </p>
            <p className="text-[10px] text-rose-600 mt-0.5 truncate">Izin, Sakit & Pengganti</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveMenu('pembelajaran_saya')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span>Pembelajaran Saya</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveMenu('guru_piket')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Papan Guru Piket</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveMenu('dashboard_pimpinan')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition"
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Dashboard Pimpinan</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'ALL' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Semua ({filteredSchedules.length})
          </button>
          <button
            onClick={() => setFilterStatus('ongoing')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filterStatus === 'ongoing' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Sedang KBM</span>
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Terlaksana
          </button>
          <button
            onClick={() => setFilterStatus('unconfirmed')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'unconfirmed' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            Belum Konfirmasi
          </button>
          <button
            onClick={() => setFilterStatus('excused')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'excused' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Izin / Inval
          </button>
        </div>
      </div>

      {/* Main Table: Pembelajaran Terintegrasi Real-Time */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header & Controls Bar */}
        <div className="p-5 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Tabel Pembelajaran Real-Time
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sinkronisasi data pengajaran real-time antara jam laptop, guru mapel, dan guru piket SMKN 1 Tegalsari.
              </p>
            </div>

            {/* Pagination Controls Top */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 tabular-nums">
                Menampilkan <strong>{filteredSchedules.length}</strong> jadwal (Hal. {currentPage}/{totalPages})
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar: Hari, Rotasi Pekan, Jam Pelajaran, Jurusan, Pencarian */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            {/* Filter Hari */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-700">Hari:</span>
              <select
                value={filterDay}
                onChange={(e) => {
                  setFilterDay(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="TODAY">⚡ Hari Ini ({currentDayName})</option>
                <option value="ALL">🌐 Semua Hari (Senin–Jumat)</option>
                <option value="SENIN">Senin</option>
                <option value="SELASA">Selasa</option>
                <option value="RABU">Rabu</option>
                <option value="KAMIS">Kamis</option>
                <option value="JUMAT">Jumat</option>
              </select>
            </div>

            {/* Filter Rotasi Pekan */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="font-bold text-slate-700">Pekan:</span>
              <select
                value={tableWeekFilter}
                onChange={(e) => {
                  setTableWeekFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="ACTIVE">
                  ⚡ Pekan Aktif ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})
                </option>
                <option value="P10_PROD_P11_NORM">🟢 Pekan K10 Prod & K11 Norm</option>
                <option value="P10_NORM_P11_PROD">🟣 Pekan K10 Norm & K11 Prod</option>
                <option value="ALL">🌐 Semua Pekan (Gabungan)</option>
              </select>
            </div>

            {/* Filter Jam Pelajaran */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-700">Jam:</span>
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">Semua Jam</option>
                <option value={currentPeriod}>⚡ Jam Ke-{currentPeriod} (Sedang Berlangsung)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => (
                  <option key={p} value={p}>
                    Jam Ke-{p}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jurusan */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">Jurusan:</span>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">Semua Jurusan</option>
                {departments.map((d) => (
                  <option key={d.id || d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-slate-500">Baris:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari guru, mapel, kelas, ruang..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            {/* Reset Filter Button */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                title="Kembalikan semua filter ke pengaturan awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-3 text-center">JAM KE</th>
                <th className="py-3 px-3">WAKTU</th>
                <th className="py-3 px-3 text-center">HARI</th>
                <th className="py-3 px-3">ROTASI PEKAN</th>
                <th className="py-3 px-4">GURU MAPEL</th>
                <th className="py-3 px-4">MATA PELAJARAN</th>
                <th className="py-3 px-3">KELAS</th>
                <th className="py-3 px-3">RUANG</th>
                <th className="py-3 px-3">KONFIRMASI GURU</th>
                <th className="py-3 px-3">VALIDASI PIKET</th>
                <th className="py-3 px-3 text-center">STATUS REAL-TIME</th>
                <th className="py-3 px-3 text-center">MULAI</th>
                <th className="py-3 px-3 text-center">SELESAI</th>
                <th className="py-3 px-3 text-center">AKSI CEPAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {schedules.length === 0
                        ? 'Belum ada data jadwal pelajaran.'
                        : 'Tidak ada jadwal yang cocok dengan filter aktif saat ini.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {isFiltered ? (
                        <span>
                          Coba ganti filter Hari (misal: <strong>Semua Hari</strong> atau <strong>Selasa</strong>) atau klik{' '}
                          <button
                            onClick={handleResetFilters}
                            className="text-cyan-600 underline font-bold hover:text-cyan-800"
                          >
                            Reset Filter
                          </button>{' '}
                          untuk menampilkan seluruh data jadwal.
                        </span>
                      ) : (
                        <span>
                          Jadwal KBM dapat diimpor dalam format Excel/CSV atau ditambahkan melalui menu{' '}
                          <button
                            onClick={() => setActiveMenu('data_master')}
                            className="text-cyan-600 underline font-bold"
                          >
                            Data Master → Jadwal Pelajaran
                          </button>.
                        </span>
                      )}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((schedule) => {
                  const record = attendanceRecords[schedule.id];
                  const teacherConfirmed =
                    record?.teacherConfirmation?.status && record.teacherConfirmation.status !== 'belum_konfirmasi';
                  const piketConfirmed =
                    record?.piketConfirmation?.status && record.piketConfirmation.status !== 'belum_konfirmasi';

                  const isCurrent = schedule.periodIndex === currentPeriod;
                  const liveStatus = getScheduleLiveStatus(schedule);
                  const schDay = getScheduleDayName(schedule);

                  const startTimeDisplay = record?.startedAt || '-';
                  const endTimeDisplay = record?.completedAt || '-';

                  return (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-slate-50/90 transition-colors border-b border-slate-100 text-slate-800 ${
                        isCurrent ? 'bg-cyan-50/30 font-semibold' : ''
                      }`}
                    >
                      {/* Jam Ke */}
                      <td className="py-3 px-3 text-center font-bold tabular-nums">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                            isCurrent
                              ? 'bg-cyan-700 text-white shadow-xs ring-2 ring-cyan-500/50 animate-pulse'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {schedule.periodIndex}
                        </span>
                      </td>

                      {/* Waktu */}
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                        {schedule.timeRange}
                      </td>

                      {/* Hari */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getDayBadge(schDay)}`}>
                          {schDay}
                        </span>
                      </td>

                      {/* Rotasi Pekan */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {schedule.weekType === 'P10_PROD_P11_NORM' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            K10 Prod · K11 Norm
                          </span>
                        ) : schedule.weekType === 'P10_NORM_P11_PROD' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            K10 Norm · K11 Prod
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Semua Pekan
                          </span>
                        )}
                      </td>

                      {/* Guru Mapel */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {schedule.teacherCode && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {schedule.teacherCode}
                            </span>
                          )}
                          <span>{schedule.teacherName}</span>
                        </div>
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <span>{schedule.subjectName}</span>
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {schedule.className}
                        </span>
                      </td>

                      {/* Ruang */}
                      <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                        <span className="text-slate-700">{schedule.roomName}</span>
                      </td>

                      {/* Konfirmasi Guru Mapel */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {teacherConfirmed ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                record.teacherConfirmation.status === 'hadir'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {record.teacherConfirmation.status === 'hadir'
                                ? `Hadir (${record.teacherConfirmation.timestamp || ''})`
                                : 'Izin Resmi'}
                            </span>
                            {record.teacherConfirmation.journalTopic && (
                              <button
                                onClick={() => setSelectedJournalSchedule(schedule)}
                                title={`Materi: ${record.teacherConfirmation.journalTopic}`}
                                className="p-1 rounded text-cyan-700 hover:bg-cyan-100 transition"
                              >
                                <BookOpen className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Belum Konfirmasi
                          </span>
                        )}
                      </td>

                      {/* Validasi Guru Piket */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {piketConfirmed ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                record.piketConfirmation.status === 'terverifikasi_hadir'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : record.piketConfirmation.status === 'terlambat'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-300'
                              }`}
                            >
                              {record.piketConfirmation.status === 'terverifikasi_hadir'
                                ? 'Terverifikasi'
                                : record.piketConfirmation.status === 'terlambat'
                                ? 'Terlambat'
                                : 'Izin / Inval'}
                            </span>
                            {record.piketConfirmation.substituteTeacherName && (
                              <span
                                className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded"
                                title={`Guru Pengganti: ${record.piketConfirmation.substituteTeacherName}`}
                              >
                                Inval
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Belum Divalidasi
                          </span>
                        )}
                      </td>

                      {/* Status Real-Time */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${liveStatus.badgeClass}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${liveStatus.dotClass} ${
                              liveStatus.isPulse ? 'animate-pulse' : ''
                            }`}
                          />
                          <span>{liveStatus.label}</span>
                        </span>
                      </td>

                      {/* Mulai */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                        {startTimeDisplay}
                      </td>

                      {/* Selesai */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                        {endTimeDisplay}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Guru Action Modal Trigger */}
                          <button
                            onClick={() => setSelectedJournalSchedule(schedule)}
                            title="Buka Jurnal KBM & Presensi Guru"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 transition cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>

                          {/* Piket Action Modal Trigger */}
                          <button
                            onClick={() => setSelectedPiketSchedule(schedule)}
                            title="Validasi Fisik Guru Piket / Penugasan Inval"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-Click Fast Check-in */}
                          <button
                            onClick={() => quickTeacherStatusToggle(schedule.id, 'hadir')}
                            title="1-Klik Cepat Guru Hadir"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-Click Fast Verify */}
                          <button
                            onClick={() => quickPiketStatusToggle(schedule.id, 'terverifikasi_hadir')}
                            title="1-Klik Cepat Validasi Piket Hadir"
                            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* Modals */}
      {selectedJournalSchedule && (
        <JournalModal
          schedule={selectedJournalSchedule}
          isOpen={!!selectedJournalSchedule}
          onClose={() => setSelectedJournalSchedule(null)}
        />
      )}

      {selectedPiketSchedule && (
        <PiketVerifyModal
          schedule={selectedPiketSchedule}
          isOpen={!!selectedPiketSchedule}
          onClose={() => setSelectedPiketSchedule(null)}
        />
      )}
    </div>
  );
};
