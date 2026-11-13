import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Users,
  Activity,
  CheckCircle2,
  ArrowRight,
  Search,
  Filter,
  X,
  ShieldCheck,
  BookOpen,
  Tv2,
  CalendarDays,
  Sparkles,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { ScheduleItem, ScheduleLessonStatus } from '../../types';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';
import { areDepartmentsEquivalent, resolveDepartmentCode } from '../../data/departmentUtils';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    currentDateString,
    currentTimeString,
    currentDayName,
    currentDayIndex,
    currentPeriod,
    effectiveWeekType,
    activeWeekFilter,
    schedules,
    classes,
    departments,
    setActiveMenu,
    getScheduleStatus,
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
  const [filterDay, setFilterDay] = useState<string>(() => (hasSchedulesToday ? 'TODAY' : 'ALL'));
  const [tableWeekFilter, setTableWeekFilter] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [filterPeriod, setFilterPeriod] = useState<number | 'all'>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ScheduleLessonStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Helper resolusi jurusan secara real-time
  const getScheduleDept = (item: ScheduleItem): string => {
    const cls = classes.find(
      (c) => c.id === item.classId || c.name?.trim().toUpperCase() === item.className?.trim().toUpperCase()
    );
    return resolveDepartmentCode(
      cls?.department || item.department,
      cls?.name || item.className,
      departments
    );
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

  // Base list sebelum filter status (untuk perhitungan stats)
  const baseSchedules = useMemo(() => {
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
      if (filterDept !== 'all' && !areDepartmentsEquivalent(deptCode, filterDept)) {
        return false;
      }

      // 5. Pencarian
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
    departments,
    tableWeekFilter,
    effectiveWeekType,
    filterDay,
    todayUpper,
    currentDayIndex,
    filterPeriod,
    filterDept,
    searchQuery,
  ]);

  // Filter jadwal dengan filter status
  const filteredSchedules = useMemo(() => {
    if (filterStatus === 'ALL') return baseSchedules;
    return baseSchedules.filter((s) => getScheduleStatus(s) === filterStatus);
  }, [baseSchedules, filterStatus, getScheduleStatus]);

  // Statistik Real-Time 3 Status
  const dashboardStats = useMemo(() => {
    const totalJadwal = baseSchedules.length;
    const uniqueTeachers = new Set<string>();
    let berlangsung = 0;
    let selesai = 0;
    let terjadwal = 0;

    baseSchedules.forEach((item) => {
      if (item.teacherName) uniqueTeachers.add(item.teacherName);
      const st = getScheduleStatus(item);
      if (st === 'Berlangsung') berlangsung++;
      else if (st === 'Selesai') selesai++;
      else terjadwal++;
    });

    return {
      totalJadwal,
      guruMengajar: uniqueTeachers.size,
      berlangsung,
      selesai,
      terjadwal,
    };
  }, [baseSchedules, getScheduleStatus]);

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
    filterDay !== (hasSchedulesToday ? 'TODAY' : 'ALL') ||
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
      {/* Welcome Greeting & Real-time Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0B1E2E] to-slate-900 rounded-3xl p-6 md:p-7 text-white shadow-md border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Waktu Real-Time
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Jam Ke-{currentPeriod || 1} Aktif
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Hari: {currentDayName}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Selamat datang, {currentUser.name || 'Pengguna SIMPATI'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentDateString} · {currentTimeString}</span>
            </span>
          </div>
        </div>

        {/* Rotasi Pekan & Buka TV */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px]">Rotasi Jadwal:</span>
            </div>
            <div className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${effectiveWeekType === 'P10_PROD_P11_NORM' ? 'bg-emerald-400' : 'bg-purple-400'} animate-pulse`} />
              <span>
                {effectiveWeekType === 'P10_PROD_P11_NORM'
                  ? 'Pekan 10 Produktif 11 Normada'
                  : effectiveWeekType === 'P10_NORM_P11_PROD'
                  ? 'Pekan 10 Normada 11 Produktif'
                  : 'Semua Pekan'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {activeWeekFilter === 'AUTO' ? '⚡ Sinkron kalender' : '📌 Filter manual'}
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

      {/* 5 Stats Cards: 3 Statuses Focus */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm ring-2 ring-emerald-500/20">
          <div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                BERLANGSUNG
              </p>
            </div>
            <p className="text-2xl md:text-3xl font-black text-emerald-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.berlangsung}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 truncate">Jam Ke-{currentPeriod || 1} Aktif</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SELESAI
            </p>
            <p className="text-2xl md:text-3xl font-black text-slate-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.selesai}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Jam Pelajaran Lalu</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Terjadwal */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              TERJADWAL
            </p>
            <p className="text-2xl md:text-3xl font-black text-sky-700 tracking-tight tabular-nums mt-1">
              {dashboardStats.terjadwal}
            </p>
            <p className="text-[10px] text-sky-600 mt-0.5 truncate">Jam/Hari Berikutnya</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Navigation & Filter Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveMenu('monitoring')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <Tv2 className="w-3.5 h-3.5 text-cyan-600" />
            <span>Monitoring Pembelajaran</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveMenu('pembelajaran_saya')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span>Pembelajaran Saya</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveMenu('guru_piket')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Papan Guru Piket</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* 3 Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'ALL' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            Semua ({baseSchedules.length})
          </button>
          <button
            onClick={() => setFilterStatus('Berlangsung')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'Berlangsung' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Berlangsung ({dashboardStats.berlangsung})</span>
          </button>
          <button
            onClick={() => setFilterStatus('Selesai')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'Selesai' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            <span>Selesai ({dashboardStats.selesai})</span>
          </button>
          <button
            onClick={() => setFilterStatus('Terjadwal')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'Terjadwal' ? 'bg-sky-700 text-white shadow-xs' : 'text-sky-700 hover:bg-sky-50'
            }`}
          >
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Terjadwal ({dashboardStats.terjadwal})</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Table */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Hari */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span className="font-semibold text-slate-600">Hari:</span>
              <select
                value={filterDay}
                onChange={(e) => {
                  setFilterDay(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="TODAY">Hari Ini ({currentDayName})</option>
                <option value="SENIN">Senin</option>
                <option value="SELASA">Selasa</option>
                <option value="RABU">Rabu</option>
                <option value="KAMIS">Kamis</option>
                <option value="JUMAT">Jumat</option>
                <option value="ALL">Semua Hari</option>
              </select>
            </div>

            {/* Filter Jam Pelajaran */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-slate-600">Jam:</span>
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Semua Jam</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>
                    Jam Ke-{p} {p === currentPeriod ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Rotasi Pekan */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-600" />
              <span className="font-semibold text-slate-600">Pekan:</span>
              <select
                value={tableWeekFilter}
                onChange={(e) => {
                  setTableWeekFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ACTIVE">Pekan Aktif</option>
                <option value="P10_PROD_P11_NORM">Pekan 10 Produktif 11 Normada</option>
                <option value="P10_NORM_P11_PROD">Pekan 10 Normada 11 Produktif</option>
                <option value="ALL">Semua Pekan</option>
              </select>
            </div>

            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru, mapel, kelas, ruang..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
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
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-3 text-center">JAM</th>
                <th className="py-3 px-3">WAKTU</th>
                <th className="py-3 px-3 text-center">HARI</th>
                <th className="py-3 px-3">ROTASI PEKAN</th>
                <th className="py-3 px-4">GURU PENGAJAR</th>
                <th className="py-3 px-4">MATA PELAJARAN</th>
                <th className="py-3 px-3">KELAS</th>
                <th className="py-3 px-3">RUANG</th>
                <th className="py-3 px-4 text-center">STATUS JADWAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {schedules.length === 0
                        ? 'Belum ada data jadwal pelajaran.'
                        : 'Tidak ada jadwal yang cocok dengan filter aktif saat ini.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {isFiltered ? (
                        <span>
                          Coba klik{' '}
                          <button
                            onClick={handleResetFilters}
                            className="text-cyan-600 underline font-bold hover:text-cyan-800 cursor-pointer"
                          >
                            Reset Filter
                          </button>{' '}
                          untuk menampilkan seluruh data jadwal.
                        </span>
                      ) : (
                        <span>
                          Jadwal KBM dapat diimpor atau ditambahkan melalui menu Data Master → Jadwal Pelajaran.
                        </span>
                      )}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((schedule) => {
                  const status = getScheduleStatus(schedule);
                  const schDay = getScheduleDayName(schedule);

                  return (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-slate-50/90 transition-colors border-b border-slate-100 text-slate-800 ${
                        status === 'Berlangsung' ? 'bg-emerald-50/40 font-semibold' : ''
                      }`}
                    >
                      {/* Jam Ke */}
                      <td className="py-3 px-3 text-center font-bold tabular-nums">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                            status === 'Berlangsung'
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/50 animate-pulse'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {schedule.periodIndex}
                        </span>
                      </td>

                      {/* Waktu */}
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                        {schedule.timeRange || `${schedule.startTime} - ${schedule.endTime}`}
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

                      {/* Guru */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {schedule.teacherName.charAt(0)}
                          </div>
                          <div>
                            <div>{schedule.teacherName}</div>
                            {schedule.teacherCode && (
                              <div className="text-[10px] font-normal text-slate-500">
                                Kode: {schedule.teacherCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mapel */}
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        <div>{schedule.subjectName}</div>
                        <div className="text-[10px] text-slate-400">Kode: {schedule.subjectCode}</div>
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {schedule.className}
                        </span>
                      </td>

                      {/* Ruang */}
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {schedule.roomName}
                      </td>

                      {/* Status Jadwal: 3 Statuses */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <ScheduleStatusBadge status={status} size="md" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {filteredSchedules.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Total <strong>{filteredSchedules.length}</strong> jadwal
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
