import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  CalendarDays,
  Activity,
  Calendar,
} from 'lucide-react';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';

export const DashboardPimpinanView: React.FC = () => {
  const {
    schedules,
    currentDateString,
    currentTimeString,
    semesterString,
    effectiveWeekType,
    departments,
    classes,
    getScheduleStatus,
  } = useApp();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>('');

  // Filter schedules by selected week rotation
  const effectiveSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === effectiveWeekType;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === selectedWeek;
      }
      return true;
    });
  }, [schedules, selectedWeek, effectiveWeekType]);

  // Overall Metrics calculation based on 3 statuses
  const totalSlots = effectiveSchedules.length;
  let berlangsungSlots = 0;
  let selesaiSlots = 0;
  let terjadwalSlots = 0;

  effectiveSchedules.forEach((s) => {
    const st = getScheduleStatus(s);
    if (st === 'Berlangsung') berlangsungSlots += 1;
    else if (st === 'Selesai') selesaiSlots += 1;
    else terjadwalSlots += 1;
  });

  const completionPercentage =
    totalSlots > 0 ? Math.round(((selesaiSlots + berlangsungSlots) / totalSlots) * 100) : 0;

  // Department metrics: Ambil SEMUA Jurusan
  const allDeptMap = new Map<
    string,
    { code: string; name: string; description?: string }
  >();

  departments.forEach((d) => {
    if (d.code) {
      allDeptMap.set(d.code.toUpperCase(), {
        code: d.code,
        name: d.name,
        description: d.description,
      });
    }
  });

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

  // Susun data statistik 3 status per jurusan
  const deptStats = Array.from(allDeptMap.values()).map((dept) => {
    const upperCode = dept.code.toUpperCase();

    const deptClasses = classes.filter(
      (c) => (c.department || '').toUpperCase() === upperCode
    );

    const deptSchedules = effectiveSchedules.filter((s) => {
      const matchScheduleDept = (s.department || '').toUpperCase() === upperCode;
      const classObj = classes.find((c) => c.id === s.classId);
      const matchClassDept = (classObj?.department || '').toUpperCase() === upperCode;
      return matchScheduleDept || matchClassDept;
    });

    let berlangsung = 0;
    let selesai = 0;
    let terjadwal = 0;

    deptSchedules.forEach((s) => {
      const st = getScheduleStatus(s);
      if (st === 'Berlangsung') berlangsung += 1;
      else if (st === 'Selesai') selesai += 1;
      else terjadwal += 1;
    });

    const total = deptSchedules.length;
    const percentage = total > 0 ? Math.round(((selesai + berlangsung) / total) * 100) : 0;

    return {
      code: dept.code,
      name: dept.name,
      description: dept.description,
      classesCount: deptClasses.length,
      totalSchedules: total,
      berlangsung,
      selesai,
      terjadwal,
      percentage,
    };
  });

  const filteredDeptStats = deptStats.filter((d) => {
    if (!deptSearchQuery.trim()) return true;
    const q = deptSearchQuery.toLowerCase();
    return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
  });

  const getDeptColorTheme = (code: string) => {
    const u = (code || '').toUpperCase();
    if (u.includes('TKJ')) {
      return {
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        progressBar: 'bg-cyan-600',
        activeRing: 'ring-2 ring-cyan-500 bg-cyan-50/20',
      };
    }
    if (u.includes('TKR')) {
      return {
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        progressBar: 'bg-blue-600',
        activeRing: 'ring-2 ring-blue-500 bg-blue-50/20',
      };
    }
    if (u.includes('TSM')) {
      return {
        badge: 'bg-amber-50 text-amber-900 border-amber-300',
        progressBar: 'bg-amber-600',
        activeRing: 'ring-2 ring-amber-500 bg-amber-50/20',
      };
    }
    if (u.includes('DPB')) {
      return {
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        progressBar: 'bg-purple-600',
        activeRing: 'ring-2 ring-purple-500 bg-purple-50/20',
      };
    }
    if (u.includes('RPL')) {
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        progressBar: 'bg-emerald-600',
        activeRing: 'ring-2 ring-emerald-500 bg-emerald-50/20',
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      progressBar: 'bg-slate-700',
      activeRing: 'ring-2 ring-slate-500 bg-slate-50/20',
    };
  };

  // Filter schedules for table
  const filteredLogSchedules = effectiveSchedules
    .filter((s) => {
      if (selectedDeptFilter === 'ALL') return true;
      const upper = selectedDeptFilter.toUpperCase();
      const matchScheduleDept = (s.department || '').toUpperCase() === upper;
      const classObj = classes.find((c) => c.id === s.classId);
      const matchClassDept = (classObj?.department || '').toUpperCase() === upper;
      return matchScheduleDept || matchClassDept;
    })
    .slice(0, 15);

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
            Analisis makro status pelaksanaan jadwal pembelajaran (Berlangsung, Selesai, Terjadwal) per program keahlian.
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
          <span>Pekan Aktif Real-Time ({effectiveWeekType === 'P10_PROD_P11_NORM' ? '10 Prod · 11 Normada' : '10 Normada · 11 Prod'})</span>
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
          <span>Pekan 10 Produktif 11 Normada</span>
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
          <span>Pekan 10 Normada 11 Produktif</span>
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

      {/* KPI Cards: 3 Statuses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
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
            {selesaiSlots + berlangsungSlots} dari {totalSlots} sesi telah / sedang berjalan
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs ring-2 ring-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Sedang Berlangsung
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-2 tabular-nums">
            {berlangsungSlots} Sesi
          </p>
          <p className="text-xs text-emerald-600 mt-1">Sedang aktif di kelas / lab / bengkel</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selesai Terlaksana
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-800 mt-2 tabular-nums">
            {selesaiSlots} Sesi
          </p>
          <p className="text-xs text-slate-500 mt-1">Sesi jam pelajaran yang telah tuntas</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
              Jadwal Terjadwal
            </span>
            <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-sky-700 mt-2 tabular-nums">
            {terjadwalSlots} Sesi
          </p>
          <p className="text-xs text-sky-600 mt-1">Menunggu jam pelaksanaan berikutnya</p>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Status Pembelajaran per Program Keahlian
              </h2>
              <span className="text-xs font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                {deptStats.length} Program Keahlian
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rasio status jadwal pembelajaran pada masing-masing jurusan (Berlangsung, Selesai, Terjadwal).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari jurusan..."
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Grid per jurusan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeptStats.map((dept) => {
            const theme = getDeptColorTheme(dept.code);
            const isSelected = selectedDeptFilter.toUpperCase() === dept.code.toUpperCase();

            return (
              <div
                key={dept.code}
                onClick={() =>
                  setSelectedDeptFilter(isSelected ? 'ALL' : dept.code)
                }
                className={`p-4 rounded-2xl border border-slate-200/90 transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? theme.activeRing : 'bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${theme.badge}`}>
                    {dept.code}
                  </span>
                  <span className="text-xs font-black text-slate-800 tabular-nums">
                    {dept.percentage}% Terlaksana
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 mt-2 truncate" title={dept.name}>
                  {dept.name}
                </h3>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full ${theme.progressBar} transition-all duration-500`}
                    style={{ width: `${dept.percentage}%` }}
                  />
                </div>

                {/* Status counts */}
                <div className="grid grid-cols-3 gap-1 pt-3 text-center text-[11px] font-bold">
                  <div className="bg-emerald-50 text-emerald-800 rounded-lg py-1 border border-emerald-200">
                    <span className="block text-[9px] font-normal text-emerald-600">Berlangsung</span>
                    {dept.berlangsung}
                  </div>
                  <div className="bg-slate-100 text-slate-700 rounded-lg py-1 border border-slate-200">
                    <span className="block text-[9px] font-normal text-slate-500">Selesai</span>
                    {dept.selesai}
                  </div>
                  <div className="bg-sky-50 text-sky-800 rounded-lg py-1 border border-sky-200">
                    <span className="block text-[9px] font-normal text-sky-600">Terjadwal</span>
                    {dept.terjadwal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Log Schedules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Daftar Jadwal & Status Pelaksanaan Pelajaran
              </h2>
              {selectedDeptFilter !== 'ALL' && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  Filter: Jurusan {selectedDeptFilter}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Status real-time setiap jam pertemuan (Berlangsung, Selesai, Terjadwal).
            </p>
          </div>

          {selectedDeptFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 underline cursor-pointer"
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
                <th className="py-2.5 px-3 text-center">STATUS JADWAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogSchedules.map((s) => {
                const status = getScheduleStatus(s);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 tabular-nums whitespace-nowrap">
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
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <ScheduleStatusBadge status={status} size="sm" />
                    </td>
                  </tr>
                );
              })}

              {filteredLogSchedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
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
