import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building2,
  BarChart3,
  Calendar,
  FileCheck,
  Layers,
  GraduationCap,
  Clock,
  Search,
  BookOpen,
  Cpu,
  Car,
  Wrench,
  Code2,
  School,
  Sparkles,
  Check,
  ChevronRight,
  Filter,
  CalendarDays,
} from 'lucide-react';

export const DashboardPimpinanView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentDateString,
    currentTimeString,
    semesterString,
    effectiveWeekType,
    realtimeWeekType,
    departments,
    classes,
  } = useApp();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>('');

  // Filter schedules by selected week rotation
  const effectiveSchedules = schedules.filter((s) => {
    if (selectedWeek === 'ACTIVE') {
      const itemWeek = s.weekType || 'ALL';
      return itemWeek === 'ALL' || itemWeek === effectiveWeekType;
    } else if (selectedWeek !== 'ALL') {
      const itemWeek = s.weekType || 'ALL';
      return itemWeek === 'ALL' || itemWeek === selectedWeek;
    }
    return true;
  });

  // Overall Metrics calculation
  const totalSlots = effectiveSchedules.length;
  let presentSlots = 0;
  let verifiedSlots = 0;
  let excusedSlots = 0;
  let substituteSlots = 0;

  effectiveSchedules.forEach((s) => {
    const rec = attendanceRecords[s.id];
    if (rec?.teacherConfirmation?.status === 'hadir') presentSlots += 1;
    if (rec?.piketConfirmation?.status === 'terverifikasi_hadir') verifiedSlots += 1;
    if (
      rec?.teacherConfirmation?.status === 'izin' ||
      rec?.teacherConfirmation?.status === 'sakit' ||
      rec?.teacherConfirmation?.status === 'dinas_luar'
    ) {
      excusedSlots += 1;
    }
    if (rec?.piketConfirmation?.substituteTeacherName) substituteSlots += 1;
  });

  const verifiedOrPresentTotal = effectiveSchedules.filter((s) => {
    const rec = attendanceRecords[s.id];
    return (
      rec?.piketConfirmation?.status === 'terverifikasi_hadir' ||
      rec?.teacherConfirmation?.status === 'hadir' ||
      Boolean(rec?.piketConfirmation?.substituteTeacherName)
    );
  }).length;

  const completionPercentage =
    totalSlots > 0 ? Math.round((verifiedOrPresentTotal / totalSlots) * 100) : 0;
  const teacherPunctuality = totalSlots === 0 ? 0 : presentSlots > 0 ? 98 : 0;

  // Department metrics: Ambil SEMUA Jurusan (dari Data Master Departments + Schedules + Classes)
  const allDeptMap = new Map<
    string,
    { code: string; name: string; description?: string }
  >();

  // 1. Masukkan seluruh Master Department
  departments.forEach((d) => {
    if (d.code) {
      allDeptMap.set(d.code.toUpperCase(), {
        code: d.code,
        name: d.name,
        description: d.description,
      });
    }
  });

  // 2. Tambahkan jika ada department unik di data kelas atau jadwal
  classes.forEach((c) => {
    if (c.department && !allDeptMap.has(c.department.toUpperCase())) {
      allDeptMap.set(c.department.toUpperCase(), {
        code: c.department,
        name: `Program Keahlian ${c.department}`,
        description: `Jurusan ${c.department}`,
      });
    }
  });

  schedules.forEach((s) => {
    if (s.department && !allDeptMap.has(s.department.toUpperCase())) {
      allDeptMap.set(s.department.toUpperCase(), {
        code: s.department,
        name: `Program Keahlian ${s.department}`,
        description: `Jurusan ${s.department}`,
      });
    }
  });

  // Susun data statistik per jurusan
  const deptStats = Array.from(allDeptMap.values()).map((dept) => {
    const upperCode = dept.code.toUpperCase();

    // Rombel kelas untuk jurusan ini
    const deptClasses = classes.filter(
      (c) => (c.department || '').toUpperCase() === upperCode
    );

    // Jadwal untuk jurusan ini (cocokkan kode department langsung atau melalui rombel kelas)
    const deptSchedules = schedules.filter((s) => {
      const matchScheduleDept = (s.department || '').toUpperCase() === upperCode;
      const classObj = classes.find((c) => c.id === s.classId);
      const matchClassDept = (classObj?.department || '').toUpperCase() === upperCode;
      return matchScheduleDept || matchClassDept;
    });

    let completed = 0;
    let guruHadir = 0;
    let piketHadir = 0;
    let izinSakit = 0;
    let invalTerisi = 0;

    deptSchedules.forEach((s) => {
      const rec = attendanceRecords[s.id];
      const isTeacherHadir = rec?.teacherConfirmation?.status === 'hadir';
      const isPiketHadir = rec?.piketConfirmation?.status === 'terverifikasi_hadir';
      const hasInval = Boolean(rec?.piketConfirmation?.substituteTeacherName);
      const isExcused =
        rec?.teacherConfirmation?.status === 'izin' ||
        rec?.teacherConfirmation?.status === 'sakit' ||
        rec?.teacherConfirmation?.status === 'dinas_luar';

      if (isTeacherHadir) guruHadir += 1;
      if (isPiketHadir) piketHadir += 1;
      if (hasInval) invalTerisi += 1;
      if (isExcused) izinSakit += 1;

      // Dianggap terlaksana jika terverifikasi oleh piket, guru konfirmasi hadir, atau terisi inval
      if (isPiketHadir || isTeacherHadir || hasInval) {
        completed += 1;
      }
    });

    const total = deptSchedules.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      code: dept.code,
      name: dept.name,
      description: dept.description,
      total,
      completed,
      percentage,
      guruHadir,
      piketHadir,
      izinSakit,
      invalTerisi,
      classCount: deptClasses.length,
    };
  });

  // Filter department cards by search query
  const filteredDeptStats = deptStats.filter((d) => {
    if (!deptSearchQuery) return true;
    const q = deptSearchQuery.toLowerCase();
    return (
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  // Helper icon per jurusan
  const getDeptIcon = (code: string) => {
    const u = code.toUpperCase();
    if (u.includes('TKJ')) return Cpu;
    if (u.includes('TKR') || u.includes('OTOMOTIF')) return Car;
    if (u.includes('TSM') || u.includes('MOTOR')) return Wrench;
    if (u.includes('DPB') || u.includes('BANGUNAN') || u.includes('ARSITEK')) return Building2;
    if (u.includes('RPL') || u.includes('PERANGKAT')) return Code2;
    if (u.includes('UMUM')) return BookOpen;
    return GraduationCap;
  };

  // Helper color theme per jurusan
  const getDeptColorTheme = (code: string) => {
    const u = code.toUpperCase();
    if (u.includes('TKJ')) {
      return {
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        iconBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        progressBar: 'bg-cyan-600',
        activeRing: 'ring-2 ring-cyan-500 bg-cyan-50/20',
      };
    }
    if (u.includes('TKR')) {
      return {
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
        progressBar: 'bg-blue-600',
        activeRing: 'ring-2 ring-blue-500 bg-blue-50/20',
      };
    }
    if (u.includes('TSM')) {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
        progressBar: 'bg-amber-600',
        activeRing: 'ring-2 ring-amber-500 bg-amber-50/20',
      };
    }
    if (u.includes('DPB')) {
      return {
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
        progressBar: 'bg-purple-600',
        activeRing: 'ring-2 ring-purple-500 bg-purple-50/20',
      };
    }
    if (u.includes('RPL')) {
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        progressBar: 'bg-emerald-600',
        activeRing: 'ring-2 ring-emerald-500 bg-emerald-50/20',
      };
    }
    if (u.includes('UMUM')) {
      return {
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        progressBar: 'bg-indigo-600',
        activeRing: 'ring-2 ring-indigo-500 bg-indigo-50/20',
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      progressBar: 'bg-slate-700',
      activeRing: 'ring-2 ring-slate-500 bg-slate-50/20',
    };
  };

  // Filter logs for leadership table
  const filteredLogSchedules = schedules
    .filter((s) => {
      if (selectedDeptFilter === 'ALL') return true;
      const upper = selectedDeptFilter.toUpperCase();
      const matchScheduleDept = (s.department || '').toUpperCase() === upper;
      const classObj = classes.find((c) => c.id === s.classId);
      const matchClassDept = (classObj?.department || '').toUpperCase() === upper;
      return matchScheduleDept || matchClassDept;
    })
    .slice(0, 10);

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Crown className="w-4 h-4" />
            <span>Eksekutif Monitoring SMKN 1 Tegalsari</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Dashboard Pimpinan & Manajemen Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analisis makro keterlaksanaan jam pembelajaran guru, ketepatan waktu, dan pemenuhan kurikulum sekolah.
          </p>
        </div>

        <div className="text-right text-xs bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-2xs">
          <span className="font-bold text-slate-800 block flex items-center justify-end gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{currentDateString}</span>
          </span>
          <span className="text-cyan-800 font-extrabold text-[11px] block tabular-nums">{currentTimeString}</span>
          <span className="text-slate-400 text-[10px] block">{semesterString}</span>
        </div>
      </div>

      {/* Rotasi Pekan Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 px-2 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span>Filter Rotasi Pekan:</span>
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
          <span>Semua Pekan (Akumulatif)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keterlaksanaan KBM
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
            {completionPercentage}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {verifiedOrPresentTotal} dari {totalSlots} kelas terverifikasi / aktif
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ketepatan Waktu Guru
            </span>
            <div className="w-9 h-9 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
            {teacherPunctuality}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Tingkat kehadiran guru di jam ke-1</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Guru Berhalangan
            </span>
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-2 tabular-nums">
            {excusedSlots} Guru
          </p>
          <p className="text-xs text-slate-500 mt-1">Izin resmi atau dinas luar sekolah</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inval Terfasilitasi
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-700 mt-2 tabular-nums">
            {substituteSlots} Kelas
          </p>
          <p className="text-xs text-slate-500 mt-1">Didampingi guru pengganti piket</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Department Breakdown (Keterlaksanaan KBM per Program Keahlian) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Keterlaksanaan KBM per Program Keahlian (SMKN 1 Tegalsari)
              </h2>
              <span className="text-xs font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                {deptStats.length} Program Keahlian
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pantau rasio keterlaksanaan pembelajaran seluruh jurusan yang terdaftar di SMKN 1 Tegalsari secara realtime. Klik salah satu jurusan untuk menyaring atensi piket.
            </p>
          </div>

          {/* Quick Search & Reset */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari jurusan..."
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-44 sm:w-56"
              />
            </div>
            {selectedDeptFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedDeptFilter('ALL')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                title="Tampilkan semua data di tabel log"
              >
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Filter Cepat:
          </span>
          <button
            onClick={() => setSelectedDeptFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedDeptFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Jurusan ({deptStats.length})
          </button>
          {deptStats.map((d) => {
            const isSelected = selectedDeptFilter === d.code;
            return (
              <button
                key={d.code}
                onClick={() => setSelectedDeptFilter(isSelected ? 'ALL' : d.code)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-700 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{d.code}</span>
                <span
                  className={`text-[10px] px-1 rounded ${
                    isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.percentage}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Department Cards Grid - Displays ALL Departments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {filteredDeptStats.map((d) => {
            const IconComponent = getDeptIcon(d.code);
            const theme = getDeptColorTheme(d.code);
            const isSelected = selectedDeptFilter === d.code;

            // Status badge color based on percentage
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            if (d.total > 0 && d.percentage === 100) {
              statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
            } else if (d.total > 0 && d.percentage >= 60) {
              statusBadge = 'bg-cyan-50 text-cyan-800 border-cyan-300';
            } else if (d.total > 0 && d.percentage > 0) {
              statusBadge = 'bg-amber-50 text-amber-800 border-amber-300';
            } else if (d.total === 0) {
              statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
            }

            return (
              <div
                key={d.code}
                onClick={() => setSelectedDeptFilter(isSelected ? 'ALL' : d.code)}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isSelected
                    ? `${theme.activeRing} border-cyan-500 shadow-sm`
                    : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${theme.iconBg}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${theme.badge}`}
                        >
                          {d.code}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold bg-cyan-700 text-white px-1.5 py-0.2 rounded-full">
                            Terpilih
                          </span>
                        )}
                      </div>
                      <h3
                        className="font-extrabold text-sm text-slate-900 mt-1 leading-snug line-clamp-1"
                        title={d.name}
                      >
                        {d.name}
                      </h3>
                    </div>
                  </div>

                  {/* Percentage Pill */}
                  <div
                    className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${statusBadge}`}
                  >
                    {d.percentage}%
                  </div>
                </div>

                {/* Description or Subtitle */}
                {d.description && (
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-1" title={d.description}>
                    {d.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3.5 overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.percentage === 100
                        ? 'bg-emerald-500'
                        : d.percentage >= 50
                        ? theme.progressBar
                        : d.percentage > 0
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.max(d.percentage, d.total === 0 ? 0 : 4)}%` }}
                  />
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      KBM Terlaksana
                    </span>
                    <span className="font-extrabold text-slate-800 tabular-nums">
                      {d.completed}{' '}
                      <span className="text-slate-400 font-normal">/ {d.total} sesi</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Rombel Kelas
                    </span>
                    <span className="font-extrabold text-slate-800 tabular-nums">
                      {d.classCount} Kelas
                    </span>
                  </div>
                </div>

                {/* Attendance Mini Indicator */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                  {d.total > 0 ? (
                    <>
                      {d.piketHadir > 0 && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                          <Check className="w-2.5 h-2.5" /> {d.piketHadir} Piket Terverifikasi
                        </span>
                      )}
                      {d.invalTerisi > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-200">
                          {d.invalTerisi} Inval
                        </span>
                      )}
                      {d.izinSakit > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                          {d.izinSakit} Izin
                        </span>
                      )}
                      {d.completed === 0 && (
                        <span className="text-slate-400 italic text-[11px]">
                          Menunggu konfirmasi / verifikasi
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">
                      Tidak ada slot jadwal hari ini
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDeptStats.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-600">Jurusan tidak ditemukan</p>
              <p>Tidak ada program keahlian yang cocok dengan kata kunci "{deptSearchQuery}".</p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Important Attention Table for Leadership */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Log Atensi Khusus Piket Hari Ini
              </h2>
              {selectedDeptFilter !== 'ALL' && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  Filter: Jurusan {selectedDeptFilter}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar pemantauan jadwal KBM dan penanganan guru piket di kelas.
            </p>
          </div>

          {selectedDeptFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 underline"
            >
              Lihat Semua Jurusan
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-3">WAKTU</th>
                <th className="py-2.5 px-3">JURUSAN</th>
                <th className="py-2.5 px-3">GURU MAPEL</th>
                <th className="py-2.5 px-3">KELAS & RUANG</th>
                <th className="py-2.5 px-3">STATUS & CATATAN PIKET</th>
                <th className="py-2.5 px-3">PENANGANAN INVAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogSchedules.map((s) => {
                const rec = attendanceRecords[s.id];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 tabular-nums">
                      {s.timeRange || `${s.startTime} - ${s.endTime}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {s.department}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{s.teacherName}</div>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {s.subjectName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="font-semibold text-slate-800">{s.className}</div>
                      <div className="text-[11px] text-slate-400">{s.roomName}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {rec?.piketConfirmation?.status === 'terverifikasi_hadir' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <Check className="w-3 h-3" /> Terverifikasi Hadir
                        </span>
                      ) : rec?.teacherConfirmation?.status === 'izin' ||
                        rec?.teacherConfirmation?.status === 'sakit' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> Berhalangan ({rec.teacherConfirmation.status})
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          {rec?.piketConfirmation?.notes || 'Menunggu verifikasi lapangan'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">
                      {rec?.piketConfirmation?.substituteTeacherName || (
                        <span className="text-slate-400 font-normal">Kelas Reguler Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLogSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada jadwal yang terdaftar{' '}
                    {selectedDeptFilter !== 'ALL' ? `untuk jurusan ${selectedDeptFilter}` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
