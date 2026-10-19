import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Tv,
  Filter,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Monitor,
  Building2,
  Search,
  Layers,
  GraduationCap,
  Sparkles,
  Check,
  FileCheck,
  RotateCcw,
  BookOpen,
  CalendarDays,
} from 'lucide-react';
import { DepartmentCode, ScheduleItem } from '../../types';
import { JournalModal } from '../modals/JournalModal';
import { PiketVerifyModal } from '../modals/PiketVerifyModal';

export const MonitoringView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentPeriod,
    currentDateString,
    currentTimeString,
    realtimeWeekType,
    effectiveWeekType,
    departments: masterDepartments,
    classes,
  } = useApp();

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  // Default 'ALL' agar seluruh sesi pembelajaran langsung terlihat per jurusan
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'ALL'>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJournalSchedule, setSelectedJournalSchedule] = useState<ScheduleItem | null>(null);
  const [selectedPiketSchedule, setSelectedPiketSchedule] = useState<ScheduleItem | null>(null);

  // Helper resolusi jurusan secara real-time dari relasi data class, schedule, dan master jurusan
  const getScheduleDept = (item: ScheduleItem): string => {
    // 1. Cek dari rombel kelas real-time terlebih dahulu (prioritas utama jika ada perubahan rombel di master data)
    const cls = classes.find((c) => c.id === item.classId || c.name === item.className);
    if (cls?.department && cls.department.trim()) {
      return cls.department.trim().toUpperCase();
    }
    // 2. Jika tidak ada di kelas, gunakan department yang ada di jadwal jika terisi
    if (item.department && item.department.trim()) {
      return item.department.trim().toUpperCase();
    }
    // 3. Fallback: deteksi dari teks nama kelas (misal: "11 TKJ 1" -> "TKJ")
    if (item.className) {
      for (const d of masterDepartments) {
        if (d.code && item.className.toUpperCase().includes(d.code.toUpperCase())) {
          return d.code.toUpperCase();
        }
      }
    }
    return 'UMUM';
  };

  // 1. Kumpulkan seluruh jurusan secara REAL-TIME dari Master Data & Rombel Kelas
  const dynamicDepartments = useMemo(() => {
    const list: { code: string; name: string; description?: string }[] = [];
    const seen = new Set<string>();

    // Prioritas utama: Master Data Departments (sinkron langsung saat ditambah/diedit/dihapus)
    masterDepartments.forEach((d) => {
      if (d.code && !seen.has(d.code.toUpperCase())) {
        seen.add(d.code.toUpperCase());
        list.push({
          code: d.code.toUpperCase(),
          name: d.name || `Program Keahlian ${d.code}`,
          description: d.description,
        });
      }
    });

    // Tambahkan jika ada rombel kelas yang memakai jurusan lain yang belum terdaftar di master
    classes.forEach((c) => {
      if (c.department && !seen.has(c.department.toUpperCase())) {
        seen.add(c.department.toUpperCase());
        list.push({
          code: c.department.toUpperCase(),
          name: `Jurusan ${c.department.toUpperCase()}`,
        });
      }
    });

    return list;
  }, [masterDepartments, classes]);

  // Otomatis sinkronisasi: jika jurusan yang sedang dipilih dihapus dari Master Data, reset ke 'ALL'
  useEffect(() => {
    if (selectedDept !== 'ALL') {
      const exists = dynamicDepartments.some(
        (d) => d.code.toUpperCase() === selectedDept.toUpperCase()
      );
      if (!exists) {
        setSelectedDept('ALL');
      }
    }
  }, [dynamicDepartments, selectedDept]);

  // Hitung jumlah jadwal aktif per jurusan secara real-time
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schedules.forEach((s) => {
      const d = getScheduleDept(s).toUpperCase();
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [schedules, classes, masterDepartments]);

  // Daftar jam pelajaran yang tersedia
  const availablePeriods = useMemo(() => {
    const setOfPeriods = new Set<number>();
    schedules.forEach((s) => {
      const num = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
      if (!isNaN(num)) setOfPeriods.add(num);
    });
    if (setOfPeriods.size === 0) return [1, 2, 3, 4, 5, 6, 7, 8];
    return Array.from(setOfPeriods).sort((a, b) => a - b);
  }, [schedules]);

  // Filter jadwal KBM secara real-time berdasarkan jurusan, jam pelajaran, rotasi pekan, dan pencarian
  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      // Filter Rotasi Pekan (K10 Produktif & K11 NormAdaptif vs K10 NormAdaptif & K11 Produktif)
      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== selectedWeek) return false;
      }

      const itemDept = getScheduleDept(s).toUpperCase();
      const matchDept = selectedDept === 'ALL' || itemDept === selectedDept.toUpperCase();

      const numPeriod = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
      const matchPeriod =
        selectedPeriod === 'ALL' ||
        numPeriod === selectedPeriod ||
        String(s.periodIndex) === String(selectedPeriod);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.subjectName.toLowerCase().includes(q) ||
        s.teacherName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.roomName.toLowerCase().includes(q) ||
        itemDept.toLowerCase().includes(q);

      return matchDept && matchPeriod && matchSearch;
    });
  }, [schedules, classes, masterDepartments, selectedDept, selectedPeriod, selectedWeek, effectiveWeekType, searchQuery]);

  // Ringkasan metrik pemantauan
  const stats = useMemo(() => {
    let teacherHadir = 0;
    let piketVerified = 0;
    let invalActive = 0;
    let excused = 0;

    filtered.forEach((item) => {
      const record = attendanceRecords[item.id];
      if (record?.teacherConfirmation?.status === 'hadir') teacherHadir++;
      if (record?.piketConfirmation?.status === 'terverifikasi_hadir') piketVerified++;
      if (record?.piketConfirmation?.substituteTeacherName) invalActive++;
      if (
        record?.teacherConfirmation?.status === 'izin' ||
        record?.teacherConfirmation?.status === 'sakit' ||
        record?.teacherConfirmation?.status === 'dinas_luar'
      ) {
        excused++;
      }
    });

    return {
      total: filtered.length,
      teacherHadir,
      piketVerified,
      invalActive,
      excused,
    };
  }, [filtered, attendanceRecords]);

  // Color theme badge per jurusan secara dinamis & adaptif
  const getDeptBadgeStyle = (code: string) => {
    const u = (code || '').toUpperCase();
    if (u.includes('TKJ')) return 'bg-cyan-50 text-cyan-800 border-cyan-300';
    if (u.includes('TKR')) return 'bg-blue-50 text-blue-800 border-blue-300';
    if (u.includes('TSM')) return 'bg-amber-50 text-amber-800 border-amber-300';
    if (u.includes('DPB')) return 'bg-purple-50 text-purple-800 border-purple-300';
    if (u.includes('RPL')) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (u.includes('UMUM')) return 'bg-indigo-50 text-indigo-800 border-indigo-300';
    
    // Palet warna otomatis untuk jurusan custom yang ditambahkan oleh user
    const colors = [
      'bg-teal-50 text-teal-800 border-teal-300',
      'bg-rose-50 text-rose-800 border-rose-300',
      'bg-sky-50 text-sky-800 border-sky-300',
      'bg-violet-50 text-violet-800 border-violet-300',
      'bg-lime-50 text-lime-800 border-lime-300',
    ];
    let hash = 0;
    for (let i = 0; i < u.length; i++) hash += u.charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Top Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-cyan-100 text-cyan-800 px-2.5 py-0.5 rounded-full border border-cyan-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse"></span>
              Live Monitoring Real-Time
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sinkron Data Master Aktif
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 mt-1.5">
            <Tv className="w-7 h-7 text-cyan-600 shrink-0" />
            <span>Monitoring Pembelajaran Real-Time</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau status pelaksanaan KBM seluruh program keahlian di setiap ruang kelas, lab komputer, dan bengkel praktik SMKN 1 Tegalsari.
          </p>

          {/* Real-Time Laptop Clock & Active Week Rotation Display */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentDateString} · {currentTimeString}</span>
            </span>
            <span className="text-xs font-bold text-amber-950 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-700" />
              <span>
                Rotasi Aktif:{' '}
                <strong className="underline">
                  {effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? 'Pekan K10 Produktif & K11 Normatif Adaptif'
                    : effectiveWeekType === 'P10_NORM_P11_PROD'
                    ? 'Pekan K10 Normatif Adaptif & K11 Produktif'
                    : 'Semua Pekan'}
                </strong>
              </span>
            </span>
          </div>
        </div>

        {/* Right Search & Period Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari jurusan, kelas, guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs w-48 sm:w-56"
            />
          </div>

          {/* Quick toggle Jam Sekarang / Semua Jam */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedPeriod('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedPeriod === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Jam
            </button>
            <button
              onClick={() => setSelectedPeriod(currentPeriod || 1)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                selectedPeriod === (currentPeriod || 1)
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Jam Ke-{currentPeriod || 1}</span>
            </button>
          </div>

          {/* Detailed Period Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs text-xs">
            <span className="font-semibold text-slate-500">Pilih:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Jam Pelajaran</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  Jam Ke-{p} {p === currentPeriod ? '(Sekarang)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Department Tabs (Sinkron Otomatis dengan Data Master) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
          <span className="font-bold flex items-center gap-1.5 text-slate-700">
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>Pilih Program Keahlian (Real-Time Master Data):</span>
          </span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {dynamicDepartments.length} Jurusan Terdata
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Semua Jurusan */}
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedDept === 'ALL'
                ? 'bg-[#0B1E2E] text-white shadow-sm ring-2 ring-cyan-500'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <span>Semua Jurusan</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                selectedDept === 'ALL' ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {schedules.length}
            </span>
          </button>

          {/* Tab Tiap Jurusan Real-time */}
          {dynamicDepartments.map((dept) => {
            const count = deptCounts[dept.code.toUpperCase()] || 0;
            const isSelected = selectedDept.toUpperCase() === dept.code.toUpperCase();

            return (
              <button
                key={dept.code}
                onClick={() => setSelectedDept(dept.code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-400'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
                title={dept.name}
              >
                <span>{dept.code}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-cyan-900 text-cyan-100' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {(selectedDept !== 'ALL' || selectedPeriod !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept('ALL');
                setSelectedPeriod('ALL');
                setSearchQuery('');
              }}
              className="text-cyan-700 hover:text-cyan-900 text-xs font-semibold flex items-center gap-1 ml-2 underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Filter Rotasi Pekan (Pekan A vs Pekan B) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-2 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 px-2 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span>Rotasi Pekan:</span>
        </span>

        <button
          onClick={() => setSelectedWeek('ACTIVE')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'ACTIVE'
              ? 'bg-[#0B1E2E] text-white shadow-xs'
              : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Pekan Aktif Real-Time ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})</span>
        </button>

        <button
          onClick={() => setSelectedWeek('P10_PROD_P11_NORM')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'P10_PROD_P11_NORM'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Pekan K10 Produktif & K11 Normatif Adaptif</span>
        </button>

        <button
          onClick={() => setSelectedWeek('P10_NORM_P11_PROD')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'P10_NORM_P11_PROD'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Pekan K10 Normatif Adaptif & K11 Produktif</span>
        </button>

        <button
          onClick={() => setSelectedWeek('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            selectedWeek === 'ALL'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>Semua Pekan (Gabungan)</span>
        </button>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Jadwal Tampil</span>
            <span className="font-extrabold text-slate-900 text-sm tabular-nums">{stats.total} Sesi</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Guru Hadir</span>
            <span className="font-extrabold text-emerald-700 text-sm tabular-nums">{stats.teacherHadir} Kelas</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Piket Terverifikasi</span>
            <span className="font-extrabold text-cyan-700 text-sm tabular-nums">{stats.piketVerified} Tercek</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Guru Inval Aktif</span>
            <span className="font-extrabold text-blue-700 text-sm tabular-nums">{stats.invalActive} Inval</span>
          </div>
        </div>
      </div>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
            <Tv className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Jadwal Pembelajaran</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {schedules.length === 0
                ? 'Belum ada data jadwal pelajaran yang terdaftar pada sistem.'
                : `Tidak ada jadwal yang sesuai dengan filter Jurusan "${selectedDept}", Jam "${selectedPeriod}", atau kata kunci pencarian.`}
            </p>
            {(selectedDept !== 'ALL' || selectedPeriod !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDept('ALL');
                  setSelectedPeriod('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tampilkan Seluruh Jurusan & Jam</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => {
            const record = attendanceRecords[item.id];
            const isTeacherPresent = record?.teacherConfirmation?.status === 'hadir';
            const isPiketVerified = record?.piketConfirmation?.status === 'terverifikasi_hadir';
            const isTeacherExcused =
              record?.teacherConfirmation?.status === 'izin' ||
              record?.teacherConfirmation?.status === 'sakit' ||
              record?.teacherConfirmation?.status === 'dinas_luar';

            const resolvedDept = getScheduleDept(item);
            const deptBadgeClass = getDeptBadgeStyle(resolvedDept);

            const RoomIcon =
              item.roomType === 'Bengkel Praktik'
                ? Wrench
                : item.roomType === 'Lab Komputer'
                ? Monitor
                : Building2;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#0B1E2E] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                      Jam Ke-{item.periodIndex}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      {item.timeRange || `${item.startTime} - ${item.endTime}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Rotasi Pekan Badge */}
                    {item.weekType === 'P10_PROD_P11_NORM' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        K10 Prod · K11 Norm
                      </span>
                    ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300">
                        K10 Norm · K11 Prod
                      </span>
                    ) : null}

                    {/* Real-time Department Badge */}
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${deptBadgeClass}`}
                    >
                      {resolvedDept}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {item.subjectName}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span>{item.teacherName}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-800">{item.className}</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <RoomIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.roomName}</span>
                    </span>
                  </div>

                  {/* Status Pills */}
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div
                      className={`p-2 rounded-lg border text-center font-bold ${
                        isTeacherPresent
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isTeacherExcused
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      Guru: {isTeacherPresent ? 'Hadir' : isTeacherExcused ? (record?.teacherConfirmation?.status || 'Izin') : 'Belum Konfirmasi'}
                    </div>

                    <div
                      className={`p-2 rounded-lg border text-center font-bold ${
                        isPiketVerified
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : record?.piketConfirmation?.substituteTeacherName
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      Piket: {isPiketVerified ? 'Terverifikasi' : record?.piketConfirmation?.substituteTeacherName ? 'Inval Aktif' : 'Belum Cek'}
                    </div>
                  </div>

                  {/* Substitute banner if active */}
                  {record?.piketConfirmation?.substituteTeacherName && (
                    <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded-lg border border-blue-200">
                      <span className="font-bold">Guru Pengganti:</span> {record.piketConfirmation.substituteTeacherName}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedJournalSchedule(item)}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg text-center transition cursor-pointer"
                  >
                    Jurnal KBM
                  </button>
                  <button
                    onClick={() => setSelectedPiketSchedule(item)}
                    className="flex-1 py-1.5 px-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold rounded-lg text-center shadow-2xs transition cursor-pointer"
                  >
                    Verifikasi Piket
                  </button>
                </div>
              </div>
            );
          })
        )}
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
