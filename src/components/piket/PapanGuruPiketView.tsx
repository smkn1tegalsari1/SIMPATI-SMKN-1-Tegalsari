import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Users,
  CalendarDays,
  Sparkles,
  RotateCcw,
  X,
  Download,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScheduleItem, ScheduleLessonStatus } from '../../types';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';

export const PapanGuruPiketView: React.FC = () => {
  const {
    schedules,
    currentPeriod,
    currentDateString,
    currentTimeString,
    currentDayName,
    currentDayIndex,
    effectiveWeekType,
    teachers,
    userAccounts,
    getScheduleStatus,
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
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'current' | 'all'>('all');
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | ScheduleLessonStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Base filtered schedules (sebelum filter status tab)
  const baseFiltered = useMemo(() => {
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

      // 4. Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.teacherName.toLowerCase().includes(q) ||
          s.subjectName.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          s.roomName.toLowerCase().includes(q) ||
          (s.teacherCode && s.teacherCode.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [schedules, selectedDay, selectedWeek, selectedPeriod, searchQuery, effectiveWeekType, todayUpper, currentDayIndex, currentPeriod]);

  // Filtered schedules setelah status tab
  const filtered = useMemo(() => {
    if (selectedStatusTab === 'ALL') return baseFiltered;
    return baseFiltered.filter((s) => getScheduleStatus(s) === selectedStatusTab);
  }, [baseFiltered, selectedStatusTab, getScheduleStatus]);

  // Statistik Real-time 3 status
  const stats = useMemo(() => {
    let berlangsung = 0;
    let selesai = 0;
    let terjadwal = 0;

    baseFiltered.forEach((item) => {
      const st = getScheduleStatus(item);
      if (st === 'Berlangsung') berlangsung++;
      else if (st === 'Selesai') selesai++;
      else terjadwal++;
    });

    return {
      total: baseFiltered.length,
      berlangsung,
      selesai,
      terjadwal,
    };
  }, [baseFiltered, getScheduleStatus]);

  const handleResetFilters = () => {
    setSelectedDay(hasSchedulesToday ? 'TODAY' : 'ALL');
    setSelectedPeriod('all');
    setSelectedWeek('ACTIVE');
    setSelectedStatusTab('ALL');
    setSearchQuery('');
  };

  const isFiltered =
    selectedDay !== (hasSchedulesToday ? 'TODAY' : 'ALL') ||
    selectedPeriod !== 'all' ||
    selectedWeek !== 'ACTIVE' ||
    selectedStatusTab !== 'ALL' ||
    searchQuery !== '';

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filtered.map((item, index) => {
      const sDay = getScheduleDayName(item);
      const status = getScheduleStatus(item);
      const weekLabel =
        item.weekType === 'P10_PROD_P11_NORM'
          ? 'Pekan K10 Prod & K11 Norm'
          : item.weekType === 'P10_NORM_P11_PROD'
          ? 'Pekan K10 Norm & K11 Prod'
          : 'Semua Pekan';

      return {
        No: index + 1,
        'Jam Ke': item.periodIndex,
        Hari: sDay,
        Waktu: item.timeRange || `${item.startTime} - ${item.endTime}`,
        'Rotasi Pekan': weekLabel,
        'Kode Guru': item.teacherCode || '-',
        'Nama Guru': item.teacherName,
        'Mata Pelajaran': item.subjectName,
        Kelas: item.className,
        Ruangan: item.roomName,
        'Status Jadwal': status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal_Piket');
    XLSX.writeFile(
      workbook,
      `Monitoring_Jadwal_Piket_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Banner Guru Piket */}
      <div className="bg-gradient-to-r from-[#0B1E2E] via-[#0f283d] to-[#122F47] rounded-3xl p-6 md:p-8 text-white shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Papan Pemantauan Guru Piket
              </span>
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Real-Time
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Pemantauan Jadwal Pelajaran Guru Piket
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Monitoring pelaksanaan jadwal pembelajaran SMKN 1 Tegalsari dengan 3 status: Berlangsung, Selesai, dan Terjadwal.
            </p>
          </div>

          {/* Action Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Real-time Clock & Duty Officers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Waktu Operasional Real-Time:</span>
              <span className="font-extrabold text-white text-sm">
                {currentDateString} · {currentTimeString}
              </span>
              <span className="text-emerald-300 font-bold block text-[11px] mt-0.5">
                Jam Ke-{currentPeriod || 1} Sedang Berlangsung
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Petugas Piket Hari Ini ({currentDayName}):</span>
              <div className="font-extrabold text-white text-xs truncate">
                {piketDutyOfficersToday.length > 0
                  ? piketDutyOfficersToday.map((t) => t.name).join(', ')
                  : 'Seluruh Petugas Piket Terjadwal'}
              </div>
              <span className="text-slate-300 text-[11px] block mt-0.5">
                {piketDutyOfficersToday.length} petugas bertugas hari ini
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total Jadwal</span>
            <span className="font-extrabold text-slate-900 text-base tabular-nums">{stats.total} Sesi</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Sedang Berlangsung</span>
            <span className="font-extrabold text-emerald-700 text-base tabular-nums">{stats.berlangsung} Sesi</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Selesai</span>
            <span className="font-extrabold text-slate-700 text-base tabular-nums">{stats.selesai} Sesi</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Terjadwal</span>
            <span className="font-extrabold text-sky-700 text-base tabular-nums">{stats.terjadwal} Sesi</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Row 1: Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Hari */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
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
                <option value="all">Semua Jam Pelajaran</option>
                <option value="current">⚡ Jam Aktif (Jam Ke-{currentPeriod})</option>
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
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer"
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

        {/* Row 2: Status Tab Pills (3 Status) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedStatusTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              selectedStatusTab === 'ALL'
                ? 'bg-[#0B1E2E] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setSelectedStatusTab('Berlangsung')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Berlangsung'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Berlangsung ({stats.berlangsung})</span>
          </button>
          <button
            onClick={() => setSelectedStatusTab('Selesai')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Selesai'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Selesai ({stats.selesai})</span>
          </button>
          <button
            onClick={() => setSelectedStatusTab('Terjadwal')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Terjadwal'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-sky-700 hover:bg-sky-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Terjadwal ({stats.terjadwal})</span>
          </button>
        </div>
      </div>

      {/* Table of Schedules */}
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
                <th className="py-3 px-4 text-center">STATUS JADWAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="font-bold text-slate-700 text-sm">
                      {schedules.length === 0
                        ? 'Belum ada data jadwal pelajaran pada sistem.'
                        : 'Tidak ada jadwal yang cocok dengan filter atau status yang dipilih.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti pilihan Hari, Jam Pelajaran, Status, atau klik Reset Filter di atas.
                    </p>
                    {isFiltered && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tampilkan Jadwal Hari Ini</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const sDay = getScheduleDayName(item);
                  const status = getScheduleStatus(item);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        status === 'Berlangsung'
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
                          {status === 'Berlangsung' && (
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
                          {item.timeRange || `${item.startTime} - ${item.endTime}`}
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

                      {/* Status Jadwal: 3 Statuses */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ScheduleStatusBadge status={status} size="md" />
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
