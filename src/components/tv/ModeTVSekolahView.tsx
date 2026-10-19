import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Tv2,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Filter,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Building2,
  UserCheck,
  UserX,
  ShieldCheck,
  BookOpen,
  Users,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { ScheduleItem } from '../../types';

interface TimeStatusResult {
  status: 'sedang_berlangsung' | 'sudah_selesai' | 'terjadwal';
  label: 'Sedang Berlangsung' | 'Sudah Selesai' | 'Terjadwal';
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

// Helper to determine status:
// "sedang berlangsung jika sesuai jamnya, sudah selesai jika jamnya melebihi jam sekarang, terjadwal jika belum waktunya"
export const computeScheduleStatus = (
  schedule: ScheduleItem,
  currentHour: number,
  currentMinute: number
): TimeStatusResult => {
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  let startMinutes = -1;
  let endMinutes = -1;

  // 1. Try from startTime and endTime
  if (schedule.startTime && schedule.endTime) {
    const [sh, sm] = schedule.startTime.replace('.', ':').split(':').map(Number);
    const [eh, em] = schedule.endTime.replace('.', ':').split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm)) startMinutes = sh * 60 + sm;
    if (!isNaN(eh) && !isNaN(em)) endMinutes = eh * 60 + em;
  }

  // 2. Try parsing from timeRange (e.g. "06:45–07:20", "06.45 - 07.20")
  if ((startMinutes === -1 || endMinutes === -1) && schedule.timeRange) {
    const cleanRange = schedule.timeRange.replace(/[–—]/g, '-');
    const parts = cleanRange.split('-');
    if (parts.length >= 2) {
      const [sh, sm] = parts[0].trim().replace('.', ':').split(':').map(Number);
      const [eh, em] = parts[1].trim().replace('.', ':').split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) startMinutes = sh * 60 + sm;
      if (!isNaN(eh) && !isNaN(em)) endMinutes = eh * 60 + em;
    }
  }

  // 3. Fallback based on standard SMKN 1 Tegalsari periods if periodIndex is 1..11
  if (startMinutes === -1 || endMinutes === -1) {
    const periodMap: Record<number, [number, number, number, number]> = {
      1: [6, 45, 7, 20],
      2: [7, 20, 7, 55],
      3: [7, 55, 8, 30],
      4: [8, 45, 9, 20],
      5: [9, 20, 9, 55],
      6: [10, 10, 10, 45],
      7: [10, 45, 11, 20],
      8: [12, 30, 13, 5],
      9: [13, 5, 13, 40],
      10: [13, 40, 14, 15],
      11: [14, 15, 14, 50],
    };
    const pNum = Number(schedule.periodIndex);
    if (periodMap[pNum]) {
      const [sh, sm, eh, em] = periodMap[pNum];
      startMinutes = sh * 60 + sm;
      endMinutes = eh * 60 + em;
    } else {
      // Default fallback
      startMinutes = 7 * 60;
      endMinutes = 7 * 60 + 45;
    }
  }

  if (currentTotalMinutes < startMinutes) {
    return {
      status: 'terjadwal',
      label: 'Terjadwal',
      badgeBg: 'bg-blue-500/15',
      badgeText: 'text-blue-300',
      badgeBorder: 'border-blue-500/30',
      dotColor: 'bg-blue-400',
    };
  } else if (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes) {
    return {
      status: 'sedang_berlangsung',
      label: 'Sedang Berlangsung',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      dotColor: 'bg-emerald-400',
    };
  } else {
    return {
      status: 'sudah_selesai',
      label: 'Sudah Selesai',
      badgeBg: 'bg-slate-700/50',
      badgeText: 'text-slate-400',
      badgeBorder: 'border-slate-600/40',
      dotColor: 'bg-slate-500',
    };
  }
};

export const ModeTVSekolahView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentDateString,
    currentTimeString,
    currentDayName,
    currentDayIndex,
    semesterString,
    effectiveWeekType,
    realtimeWeekType,
    departments,
    classes,
    setActiveMenu,
  } = useApp();

  // View presentation mode: 'table' (large readable data rows) or 'cards' (high-contrast grid)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Time simulation vs Live clock
  const [useSimulatedTime, setUseSimulatedTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('07:15');
  const [realClock, setRealClock] = useState<Date>(new Date());

  // Filter states: sync default day with real-time laptop day (if 1..5, else ALL)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'sedang_berlangsung' | 'sudah_selesai' | 'terjadwal'>('ALL');
  const [dayFilter, setDayFilter] = useState<number | 'ALL'>(() => (currentDayIndex <= 5 ? currentDayIndex : 'ALL'));
  const [weekFilter, setWeekFilter] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected schedule detail modal
  const [detailSchedule, setDetailSchedule] = useState<ScheduleItem | null>(null);

  // Auto-pagination / rotation for unattended TV displays
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10); // 10 rows per page in TV table mode, or 'ALL'

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRealClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Compute effective hours and minutes
  const { effectiveHour, effectiveMinute, formattedClock } = useMemo(() => {
    if (useSimulatedTime) {
      const [h, m] = simulatedTime.split(':').map(Number);
      const safeH = isNaN(h) ? 7 : h;
      const safeM = isNaN(m) ? 0 : m;
      return {
        effectiveHour: safeH,
        effectiveMinute: safeM,
        formattedClock: `${String(safeH).padStart(2, '0')}:${String(safeM).padStart(2, '0')}:00 WIB (Simulasi)`,
      };
    } else {
      const h = realClock.getHours();
      const m = realClock.getMinutes();
      const s = realClock.getSeconds();
      return {
        effectiveHour: h,
        effectiveMinute: m,
        formattedClock: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} WIB`,
      };
    }
  }, [useSimulatedTime, simulatedTime, realClock]);

  // Compute status for all schedules and apply filters
  const enrichedSchedules = useMemo(() => {
    return schedules.map((item) => {
      const timeStatus = computeScheduleStatus(item, effectiveHour, effectiveMinute);
      const rec = attendanceRecords[item.id];

      // Guru hadir status info
      const teacherStatusRaw = rec?.teacherConfirmation?.status;
      let teacherPresenceLabel = 'Belum Hadir';
      let teacherPresenceBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      let teacherIcon = UserX;

      if (teacherStatusRaw === 'hadir') {
        teacherPresenceLabel = 'Hadir';
        teacherPresenceBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        teacherIcon = UserCheck;
      } else if (teacherStatusRaw === 'izin') {
        teacherPresenceLabel = 'Izin';
        teacherPresenceBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        teacherIcon = UserCheck;
      } else if (teacherStatusRaw === 'sakit') {
        teacherPresenceLabel = 'Sakit';
        teacherPresenceBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        teacherIcon = UserX;
      } else if (teacherStatusRaw === 'dinas_luar') {
        teacherPresenceLabel = 'Dinas Luar';
        teacherPresenceBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        teacherIcon = UserCheck;
      }

      // Piket confirmation status info
      const piketStatusRaw = rec?.piketConfirmation?.status;
      const isSub = Boolean(rec?.piketConfirmation?.substituteTeacherName);
      let piketLabel = 'Menunggu Konfirmasi';
      let piketBadge = 'bg-amber-500/15 text-amber-300 border-amber-500/30';

      if (piketStatusRaw === 'terverifikasi_hadir') {
        piketLabel = 'Terverifikasi Hadir';
        piketBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      } else if (isSub) {
        piketLabel = `Inval: ${rec?.piketConfirmation?.substituteTeacherName}`;
        piketBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      } else if (piketStatusRaw === 'terlambat') {
        piketLabel = 'Terlambat';
        piketBadge = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      } else if (piketStatusRaw === 'izin_terkonfirmasi') {
        piketLabel = 'Izin Terkonfirmasi';
        piketBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      } else if (piketStatusRaw === 'tidak_hadir') {
        piketLabel = 'Tidak Hadir';
        piketBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      }

      return {
        ...item,
        timeStatus,
        attendance: rec,
        teacherPresence: {
          raw: teacherStatusRaw,
          label: teacherPresenceLabel,
          badge: teacherPresenceBadge,
          icon: teacherIcon,
        },
        piketPresence: {
          raw: piketStatusRaw,
          label: piketLabel,
          badge: piketBadge,
          isSub,
          subName: rec?.piketConfirmation?.substituteTeacherName,
        },
      };
    });
  }, [schedules, attendanceRecords, effectiveHour, effectiveMinute]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return enrichedSchedules.filter((item) => {
      // Filter Rotasi Pekan
      if (weekFilter === 'ACTIVE') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (weekFilter !== 'ALL') {
        const itemWeek = item.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== weekFilter) return false;
      }

      // Filter Day
      if (dayFilter !== 'ALL' && item.dayOfWeek !== dayFilter) {
        return false;
      }

      // Filter Status
      if (statusFilter !== 'ALL' && item.timeStatus.status !== statusFilter) {
        return false;
      }

      // Filter Dept
      if (selectedDept !== 'ALL') {
        const cls = classes.find((c) => c.id === item.classId || c.name === item.className);
        const itemDept = (cls?.department || item.department || 'UMUM').toUpperCase();
        if (itemDept !== selectedDept.toUpperCase()) {
          return false;
        }
      }

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTeacher = item.teacherName.toLowerCase().includes(q) || (item.teacherCode && item.teacherCode.toLowerCase().includes(q));
        const matchSubject = item.subjectName.toLowerCase().includes(q) || (item.subjectCode && item.subjectCode.toLowerCase().includes(q));
        const matchClass = item.className.toLowerCase().includes(q);
        const matchRoom = (item.roomName && item.roomName.toLowerCase().includes(q));
        if (!matchTeacher && !matchSubject && !matchClass && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedSchedules, dayFilter, statusFilter, selectedDept, searchQuery, weekFilter, effectiveWeekType]);

  // Summary statistics for TV Header Cards
  const stats = useMemo(() => {
    const isMatchingWeek = (s: any) => {
      if (weekFilter === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === effectiveWeekType;
      } else if (weekFilter !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === weekFilter;
      }
      return true;
    };

    const targetPool = enrichedSchedules.filter((s) => (dayFilter === 'ALL' || s.dayOfWeek === dayFilter) && isMatchingWeek(s));
    const total = targetPool.length;
    const sedangBerlangsung = targetPool.filter((s) => s.timeStatus.status === 'sedang_berlangsung').length;
    const terjadwal = targetPool.filter((s) => s.timeStatus.status === 'terjadwal').length;
    const sudahSelesai = targetPool.filter((s) => s.timeStatus.status === 'sudah_selesai').length;
    const guruHadir = targetPool.filter((s) => s.teacherPresence.label === 'Hadir').length;
    const piketTerverifikasi = targetPool.filter((s) => s.piketPresence.raw === 'terverifikasi_hadir').length;

    return {
      total,
      sedangBerlangsung,
      terjadwal,
      sudahSelesai,
      guruHadir,
      piketTerverifikasi,
    };
  }, [enrichedSchedules, dayFilter, weekFilter, effectiveWeekType]);

  // Pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredSchedules.length / pageSize));

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [dayFilter, statusFilter, selectedDept, searchQuery, pageSize, weekFilter]);

  // Auto rotate timer
  useEffect(() => {
    if (!autoRotate || totalPages <= 1) return;
    const timer = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, 12000); // 12 seconds per slide
    return () => clearInterval(timer);
  }, [autoRotate, totalPages]);

  const pagedSchedules = useMemo(() => {
    if (pageSize === 0) return filteredSchedules;
    const start = page * pageSize;
    return filteredSchedules.slice(start, start + pageSize);
  }, [filteredSchedules, page, pageSize]);

  return (
    <div className="min-h-screen bg-[#07131E] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-900 font-sans antialiased">
      {/* =========================================================
          TOP DISPLAY BANNER: BRANDING & LIVE DIGITAL CLOCK
      ========================================================== */}
      <header className="px-5 py-4 md:px-8 md:py-5 bg-[#091B2B] border-b border-slate-800/80 shadow-2xl shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & School Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30 ring-4 ring-cyan-500/20">
              <GraduationCap className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs font-black tracking-widest uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Tv2 className="w-3 h-3" />
                  DASHBOARD TV SEKOLAH
                </span>
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                  SMKN 1 TEGALSARI BANYUWANGI
                </span>
              </div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-white mt-0.5 leading-none">
                INFORMASI KBM & JADWAL PELAJARAN
              </h1>
            </div>
          </div>

          {/* Center/Right: Live Big Digital Clock */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right">
              <div className="text-2xl md:text-3xl lg:text-4xl font-black font-mono tracking-tight text-amber-400 tabular-nums drop-shadow-md flex items-center justify-end gap-2">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-amber-500 animate-pulse hidden sm:inline" />
                <span>{formattedClock}</span>
              </div>
              <div className="text-xs md:text-sm font-semibold text-slate-300 mt-1 flex flex-wrap items-center justify-end gap-2">
                <span>{currentDateString} · {semesterString}</span>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 shadow-xs">
                  {effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? '🟢 Pekan K10 Prod · K11 Norm'
                    : '🟣 Pekan K10 Norm · K11 Prod'}
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-sm"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5 text-amber-400" /> : <Maximize2 className="w-5 h-5 text-amber-400" />}
              </button>

              <button
                onClick={() => setActiveMenu('dashboard')}
                title="Kembali ke Dashboard Admin"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">Kembali</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          STATISTICS SUMMARY STRIP
      ========================================================== */}
      <section className="px-5 py-3 md:px-8 bg-[#061421] border-b border-slate-800/60 shrink-0">
        <div className="max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card Total */}
          <div className="bg-[#0B1E2E] border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Jadwal</p>
              <p className="text-xl md:text-2xl font-black text-white">{stats.total}</p>
            </div>
            <BookOpen className="w-7 h-7 text-cyan-400/60" />
          </div>

          {/* Card Sedang Berlangsung */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'sedang_berlangsung' ? 'ALL' : 'sedang_berlangsung')}
            className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition shadow-sm ${
              statusFilter === 'sedang_berlangsung'
                ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-[#0A2420] border-emerald-800/50 hover:border-emerald-500/60'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Sedang Berlangsung</p>
              </div>
              <p className="text-xl md:text-2xl font-black text-emerald-300">{stats.sedangBerlangsung}</p>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>

          {/* Card Terjadwal */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'terjadwal' ? 'ALL' : 'terjadwal')}
            className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition shadow-sm ${
              statusFilter === 'terjadwal'
                ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-[#0B1E32] border-blue-900/50 hover:border-blue-500/60'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Terjadwal</p>
              <p className="text-xl md:text-2xl font-black text-blue-300">{stats.terjadwal}</p>
            </div>
            <Clock className="w-7 h-7 text-blue-400/70" />
          </div>

          {/* Card Sudah Selesai */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'sudah_selesai' ? 'ALL' : 'sudah_selesai')}
            className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition shadow-sm ${
              statusFilter === 'sudah_selesai'
                ? 'bg-slate-800 border-slate-500 ring-2 ring-slate-400/30'
                : 'bg-[#0C1A27] border-slate-800 hover:border-slate-600'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sudah Selesai</p>
              <p className="text-xl md:text-2xl font-black text-slate-300">{stats.sudahSelesai}</p>
            </div>
            <Check className="w-7 h-7 text-slate-500" />
          </div>

          {/* Card Guru Hadir */}
          <div className="bg-[#0B1E2E] border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Guru Hadir</p>
              <p className="text-xl md:text-2xl font-black text-amber-400">
                {stats.guruHadir} <span className="text-xs text-slate-500 font-normal">/ {stats.total}</span>
              </p>
            </div>
            <UserCheck className="w-7 h-7 text-amber-400/80" />
          </div>

          {/* Card Terverifikasi Piket */}
          <div className="bg-[#0B1E2E] border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verifikasi Piket</p>
              <p className="text-xl md:text-2xl font-black text-cyan-400">
                {stats.piketTerverifikasi} <span className="text-xs text-slate-500 font-normal">/ {stats.total}</span>
              </p>
            </div>
            <ShieldCheck className="w-7 h-7 text-cyan-400/80" />
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTROLS TOOLBAR: SIMULATOR, FILTERS, SEARCH & AUTO ROTATE
      ========================================================== */}
      <section className="px-5 py-3 md:px-8 bg-[#081827] border-b border-slate-800/70 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Group: Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[200px] max-w-[260px] flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru, mapel, kelas, ruang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D2235] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Rotasi Pekan */}
            <div className="flex items-center gap-1.5 bg-[#0D2235] border border-slate-700/80 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Pekan:</span>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value as any)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer max-w-[190px] truncate"
              >
                <option value="ACTIVE" className="bg-[#0D2235] text-amber-300">
                  ⚡ Pekan Aktif ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})
                </option>
                <option value="P10_PROD_P11_NORM" className="bg-[#0D2235] text-emerald-400">
                  🟢 Pekan K10 Prod & K11 Norm
                </option>
                <option value="P10_NORM_P11_PROD" className="bg-[#0D2235] text-purple-400">
                  🟣 Pekan K10 Norm & K11 Prod
                </option>
                <option value="ALL" className="bg-[#0D2235] text-white">
                  🌐 Semua Pekan
                </option>
              </select>
            </div>

            {/* Filter Hari */}
            <div className="flex items-center gap-1.5 bg-[#0D2235] border border-slate-700/80 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Hari:</span>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                {currentDayIndex <= 5 && (
                  <option value={currentDayIndex} className="bg-[#0D2235] text-amber-300">
                    Hari Ini ({currentDayName})
                  </option>
                )}
                <option value={1} className="bg-[#0D2235] text-white">Senin</option>
                <option value={2} className="bg-[#0D2235] text-white">Selasa</option>
                <option value={3} className="bg-[#0D2235] text-white">Rabu</option>
                <option value={4} className="bg-[#0D2235] text-white">Kamis</option>
                <option value={5} className="bg-[#0D2235] text-white">Jumat</option>
                <option value="ALL" className="bg-[#0D2235] text-white">Semua Hari (Senin - Jumat)</option>
              </select>
            </div>

            {/* Filter Status Waktu */}
            <div className="flex items-center gap-1.5 bg-[#0D2235] border border-slate-700/80 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#0D2235] text-white">Semua Status</option>
                <option value="sedang_berlangsung" className="bg-[#0D2235] text-emerald-400">Sedang Berlangsung</option>
                <option value="terjadwal" className="bg-[#0D2235] text-blue-400">Terjadwal</option>
                <option value="sudah_selesai" className="bg-[#0D2235] text-slate-400">Sudah Selesai</option>
              </select>
            </div>

            {/* Filter Jurusan */}
            <div className="flex items-center gap-1.5 bg-[#0D2235] border border-slate-700/80 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Jurusan:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#0D2235] text-white">Semua Jurusan</option>
                {departments.map((d) => (
                  <option key={d.id || d.code} value={d.code} className="bg-[#0D2235] text-cyan-300">
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Group: Time Simulator & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Simulator Picker */}
            <div className="flex items-center gap-2 bg-[#0C1E2F] border border-amber-500/40 rounded-xl px-3 py-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold text-amber-400">Uji Jam KBM:</span>
              <select
                value={useSimulatedTime ? simulatedTime : 'REAL'}
                onChange={(e) => {
                  if (e.target.value === 'REAL') {
                    setUseSimulatedTime(false);
                  } else {
                    setUseSimulatedTime(true);
                    setSimulatedTime(e.target.value);
                  }
                }}
                className="bg-transparent font-extrabold text-white text-xs outline-none cursor-pointer"
              >
                <option value="REAL" className="bg-[#0B1E2E] text-amber-300">⏱️ Waktu Nyata Browser</option>
                <option value="07:00" className="bg-[#0B1E2E] text-white">07:00 WIB (Jam Ke-1)</option>
                <option value="07:35" className="bg-[#0B1E2E] text-white">07:35 WIB (Jam Ke-2)</option>
                <option value="08:10" className="bg-[#0B1E2E] text-white">08:10 WIB (Jam Ke-3)</option>
                <option value="09:00" className="bg-[#0B1E2E] text-white">09:00 WIB (Jam Ke-4)</option>
                <option value="09:40" className="bg-[#0B1E2E] text-white">09:40 WIB (Jam Ke-5)</option>
                <option value="10:25" className="bg-[#0B1E2E] text-white">10:25 WIB (Jam Ke-6)</option>
                <option value="11:00" className="bg-[#0B1E2E] text-white">11:00 WIB (Jam Ke-7)</option>
                <option value="12:45" className="bg-[#0B1E2E] text-white">12:45 WIB (Jam Ke-8)</option>
                <option value="13:20" className="bg-[#0B1E2E] text-white">13:20 WIB (Jam Ke-9)</option>
                <option value="14:00" className="bg-[#0B1E2E] text-white">14:00 WIB (Jam Ke-10)</option>
                <option value="15:30" className="bg-[#0B1E2E] text-white">15:30 WIB (KBM Usai)</option>
              </select>
            </div>

            {/* Auto rotate toggle for Smart TV */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Putar Otomatis Halaman Tiap 12 Detik"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                autoRotate
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-[#0D2235] border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5" />}
              <span>Auto-Slide</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#0D2235] border border-slate-700/80 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Data TV"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'table' ? 'bg-[#E59819] text-[#0A1622]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Tampilan Kartu Grid TV"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'cards' ? 'bg-[#E59819] text-[#0A1622]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT AREA: TV DATA TABLE OR TV CARDS GRID
      ========================================================== */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1920px] w-full mx-auto overflow-y-auto">
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-24 bg-[#0B1E2E]/60 rounded-3xl border border-slate-800 p-8">
            <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600 animate-pulse" />
            <h3 className="text-2xl font-black text-slate-300">Tidak Ada Jadwal Ditemukan</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Tidak ada jadwal KBM yang sesuai dengan kriteria filter atau pencarian saat ini.
            </p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setDayFilter('ALL');
                setSelectedDept('ALL');
                setSearchQuery('');
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-extrabold text-xs hover:bg-amber-400 transition"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* =========================================================
              VIEW 1: TV DATA TABLE (HIGH-CONTRAST & CLEAR READABILITY)
              Columns required by user:
              1. Jam Pelajaran
              2. Nama Mapel
              3. Nama Guru
              4. Kelas
              5. Ruangan
              6. Guru Hadir
              7. Konfirmasi Guru Piket
              8. Status (sedang berlangsung, sudah selesai, terjadwal)
          ========================================================== */
          <div className="bg-[#091D2C] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#061522] border-b border-slate-800 text-[11px] md:text-xs font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-4 w-12 text-center">No</th>
                    <th className="py-4 px-4 min-w-[150px]">Jam Pelajaran</th>
                    <th className="py-4 px-5 min-w-[220px]">Nama Mapel</th>
                    <th className="py-4 px-5 min-w-[200px]">Nama Guru</th>
                    <th className="py-4 px-4 min-w-[110px]">Kelas</th>
                    <th className="py-4 px-4 min-w-[130px]">Ruangan</th>
                    <th className="py-4 px-4 min-w-[130px] text-center">Guru Hadir</th>
                    <th className="py-4 px-4 min-w-[180px] text-center">Konfirmasi Guru Piket</th>
                    <th className="py-4 px-5 min-w-[180px] text-center">Status</th>
                    <th className="py-4 px-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {pagedSchedules.map((item, idx) => {
                    const rowNumber = page * pageSize + idx + 1;
                    const isOngoing = item.timeStatus.status === 'sedang_berlangsung';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDetailSchedule(item)}
                        className={`transition-colors cursor-pointer group ${
                          isOngoing
                            ? 'bg-emerald-950/25 hover:bg-emerald-950/40 border-l-4 border-l-emerald-400'
                            : 'hover:bg-[#0D263B] border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* 0. Row Number */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-slate-500 font-bold">
                          {rowNumber}
                        </td>

                        {/* 1. Jam Pelajaran */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              Jam Ke-{item.periodIndex}
                            </span>
                            <span className="font-mono text-xs text-slate-300 font-semibold tracking-wide mt-0.5">
                              {item.timeRange || `${item.startTime} - ${item.endTime}`}
                            </span>
                          </div>
                        </td>

                        {/* 2. Nama Mapel */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-black text-white text-sm md:text-base leading-tight group-hover:text-cyan-300 transition-colors">
                              {item.subjectName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800/90 text-cyan-400 border border-slate-700">
                                {item.subjectCode || 'MAPEL'}
                              </span>
                              {item.weekType === 'P10_PROD_P11_NORM' ? (
                                <span className="inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                                  K10 Prod · K11 Norm
                                </span>
                              ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                                <span className="inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-600/40">
                                  K10 Norm · K11 Prod
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* 3. Nama Guru */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-extrabold text-slate-100 text-sm">
                              {item.teacherName}
                            </p>
                            {item.teacherCode && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                Kode: {item.teacherCode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Kelas */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shadow-xs">
                            {item.className}
                          </span>
                        </td>

                        {/* 5. Ruangan */}
                        <td className="py-4 px-4">
                          <div>
                            <span className="font-black text-amber-400 text-sm block">
                              {item.roomName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {item.roomType || 'Ruang Teori'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Guru Hadir */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-xs ${item.teacherPresence.badge}`}
                          >
                            <item.teacherPresence.icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.teacherPresence.label}</span>
                          </span>
                        </td>

                        {/* 7. Konfirmasi Guru Piket */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-xs max-w-[200px] truncate ${item.piketPresence.badge}`}
                            title={item.piketPresence.label}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.piketPresence.label}</span>
                          </span>
                        </td>

                        {/* 8. Status (sedang berlangsung / sudah selesai / terjadwal) */}
                        <td className="py-4 px-5 text-center">
                          <div
                            className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border shadow-sm ${item.timeStatus.badgeBg} ${item.timeStatus.badgeText} ${item.timeStatus.badgeBorder}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${item.timeStatus.dotColor} ${isOngoing ? 'animate-ping' : ''}`}></span>
                            <span>{item.timeStatus.label}</span>
                          </div>
                        </td>

                        {/* Action / Detail View */}
                        <td className="py-4 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSchedule(item);
                            }}
                            title="Lihat Detail Jurnal & KBM"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* =========================================================
              VIEW 2: TV CARDS GRID (VISUAL SIGNAGE LAYOUT)
          ========================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {pagedSchedules.map((item) => {
              const isOngoing = item.timeStatus.status === 'sedang_berlangsung';

              return (
                <div
                  key={item.id}
                  onClick={() => setDetailSchedule(item)}
                  className={`bg-[#0D2235] border rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 cursor-pointer hover:border-cyan-500/60 transition duration-200 relative overflow-hidden group ${
                    isOngoing
                      ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 bg-gradient-to-br from-[#0B2520] to-[#0D2235]'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Top Header Card: Ruangan & Kelas */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-base font-black text-amber-400">
                        {item.roomName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.weekType === 'P10_PROD_P11_NORM' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                          K10 Prod · K11 Norm
                        </span>
                      ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-600/40">
                          K10 Norm · K11 Prod
                        </span>
                      ) : null}
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                        {item.className}
                      </span>
                    </div>
                  </div>

                  {/* Jam Pelajaran & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Jam Ke-{item.periodIndex} ({item.timeRange})</span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${item.timeStatus.badgeBg} ${item.timeStatus.badgeText} ${item.timeStatus.badgeBorder}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.timeStatus.dotColor} ${isOngoing ? 'animate-ping' : ''}`}></span>
                      <span>{item.timeStatus.label}</span>
                    </div>
                  </div>

                  {/* Subject & Teacher Info */}
                  <div className="space-y-1.5 py-1">
                    <h3 className="text-base md:text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-cyan-300 transition-colors">
                      {item.subjectName}
                    </h3>
                    <p className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>{item.teacherName}</span>
                    </p>
                  </div>

                  {/* Guru Hadir & Konfirmasi Piket Strip */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Guru Hadir:</span>
                      <span className={`px-2.5 py-0.5 rounded-lg font-black border text-[11px] ${item.teacherPresence.badge}`}>
                        {item.teacherPresence.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Konfirmasi Piket:</span>
                      <span className={`px-2.5 py-0.5 rounded-lg font-black border text-[11px] truncate max-w-[150px] ${item.piketPresence.badge}`}>
                        {item.piketPresence.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================
          BOTTOM TICKER & PAGINATION FOOTER
      ========================================================== */}
      <footer className="px-5 py-3 md:px-8 bg-[#061421] border-t border-slate-800 text-xs text-slate-400 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Ticker marquee / message */}
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-extrabold text-slate-200">
              SIMPATI SMKN 1 Tegalsari · Digital Signage Monitoring KBM Real-Time
            </span>
            <span className="text-slate-500 hidden lg:inline">
              | Memantau pelaksanaan jam pelajaran di seluruh ruang kelas, laboratorium komputer, dan bengkel praktik
            </span>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-3">
            {/* Page size picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[#0B1E2E] border border-slate-700 rounded-lg px-2 py-1 text-white font-bold outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={0}>Semua</option>
              </select>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  Prev
                </button>
                <span className="font-extrabold text-white">
                  Hal {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* =========================================================
          MODAL DETAIL JADWAL KBM
      ========================================================== */}
      {detailSchedule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#091D2C] border border-slate-700 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {detailSchedule.className} · {detailSchedule.roomName}
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  {detailSchedule.subjectName}
                </h3>
                <p className="text-sm font-semibold text-amber-400 mt-0.5">
                  Pengajar: {detailSchedule.teacherName}
                </p>
              </div>
              <button
                onClick={() => setDetailSchedule(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0B1E2E] p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block">Jam Pelajaran:</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  Jam Ke-{detailSchedule.periodIndex} ({detailSchedule.timeRange})
                </span>
              </div>

              <div className="bg-[#0B1E2E] p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block">Status Waktu:</span>
                {(() => {
                  const s = computeScheduleStatus(detailSchedule, effectiveHour, effectiveMinute);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black mt-1 ${s.badgeBg} ${s.badgeText} border ${s.badgeBorder}`}>
                      <span className={`w-2 h-2 rounded-full ${s.dotColor}`}></span>
                      {s.label}
                    </span>
                  );
                })()}
              </div>

              <div className="bg-[#0B1E2E] p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block">Presensi Guru:</span>
                <span className="text-sm font-bold text-white mt-1 block capitalize">
                  {attendanceRecords[detailSchedule.id]?.teacherConfirmation?.status || 'Belum Konfirmasi'}
                </span>
              </div>

              <div className="bg-[#0B1E2E] p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block">Verifikasi Guru Piket:</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {attendanceRecords[detailSchedule.id]?.piketConfirmation?.status === 'terverifikasi_hadir'
                    ? 'Terverifikasi Hadir'
                    : attendanceRecords[detailSchedule.id]?.piketConfirmation?.substituteTeacherName
                    ? `Inval: ${attendanceRecords[detailSchedule.id]?.piketConfirmation?.substituteTeacherName}`
                    : 'Menunggu Konfirmasi'}
                </span>
              </div>
            </div>

            {/* Jurnal Guru if present */}
            {attendanceRecords[detailSchedule.id]?.teacherConfirmation?.journalTopic && (
              <div className="bg-[#0B1E2E] p-3.5 rounded-2xl border border-slate-800 text-xs">
                <span className="text-amber-400 font-bold block mb-1">Materi / Jurnal Guru:</span>
                <p className="text-slate-200">
                  {attendanceRecords[detailSchedule.id]?.teacherConfirmation?.journalTopic}
                </p>
                {attendanceRecords[detailSchedule.id]?.teacherConfirmation?.journalNotes && (
                  <p className="text-slate-400 mt-1 italic">
                    {attendanceRecords[detailSchedule.id]?.teacherConfirmation?.journalNotes}
                  </p>
                )}
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailSchedule(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ModeTVSekolahView;
