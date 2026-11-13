import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Calendar,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  Sparkles,
  Info,
  X,
  BookOpen,
  MapPin,
  UserCheck,
  Building,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MATRIX_PERIODS,
  VOCATIONAL_PROGRAMS,
  PRESET_KELAS_X,
  PRESET_KELAS_XI,
  PRESET_KELAS_XII,
  MatrixRowClass,
  MatrixSlotData,
} from '../../data/monitoringMatrixPreset';
import {
  areDepartmentsEquivalent,
  getDepartmentInfo,
  resolveDepartmentCode,
} from '../../data/departmentUtils';

interface MonitoringJadwalMatrixProps {
  onSwitchToCardView?: () => void;
}

export const MonitoringJadwalMatrix: React.FC<MonitoringJadwalMatrixProps> = ({
  onSwitchToCardView,
}) => {
  const {
    schedules,
    classes: masterClasses,
    departments: masterDepartments,
    teachers,
    subjects,
    rooms,
    currentDateString,
    currentTimeString,
    effectiveWeekType,
    attendanceRecords,
    isCloudConnected,
    addSchedule,
    deleteSchedule,
    currentUser,
  } = useApp();

  // State
  const [selectedGrade, setSelectedGrade] = useState<10 | 11 | 12>(10);
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Senin (sesuai dokumen lampiran)
  const [selectedWeekMode, setSelectedWeekMode] = useState<
    'P10_NORM_P11_PROD' | 'P10_PROD_P11_NORM' | 'AUTO' | 'PRODUKTIF' | 'NORMATIF'
  >('P10_NORM_P11_PROD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Modal State
  const [activeSlotModal, setActiveSlotModal] = useState<{
    row: MatrixRowClass;
    periodIndex: number;
    slot: MatrixSlotData | null;
  } | null>(null);

  // Form quick assign slot modal
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
  const [assignTeacherId, setAssignTeacherId] = useState<string>('');
  const [assignSubjectId, setAssignSubjectId] = useState<string>('');
  const [assignRoomName, setAssignRoomName] = useState<string>('');

  // Hari list
  const days = [
    { value: 1, label: 'Senin' },
    { value: 2, label: 'Selasa' },
    { value: 3, label: 'Rabu' },
    { value: 4, label: 'Kamis' },
    { value: 5, label: 'Jumat' },
  ];

  // Grade title helper
  const gradeRoman = selectedGrade === 10 ? 'X' : selectedGrade === 11 ? 'XI' : 'XII';

  // Week label helper
  const currentWeekLabel = useMemo(() => {
    if (selectedWeekMode === 'P10_NORM_P11_PROD' || selectedWeekMode === 'PRODUKTIF') {
      return 'Pekan 10 Normada 11 Produktif';
    }
    if (selectedWeekMode === 'P10_PROD_P11_NORM' || selectedWeekMode === 'NORMATIF') {
      return 'Pekan 10 Produktif 11 Normada';
    }
    return effectiveWeekType === 'P10_PROD_P11_NORM'
      ? 'Pekan 10 Produktif 11 Normada'
      : 'Pekan 10 Normada 11 Produktif';
  }, [selectedWeekMode, effectiveWeekType]);

  // Helper cek kecocokan pekan rotasi
  const isWeekMatching = (sWeek?: string): boolean => {
    if (!sWeek || sWeek === 'ALL') return true;
    const targetWeek =
      selectedWeekMode === 'AUTO'
        ? effectiveWeekType
        : selectedWeekMode === 'P10_NORM_P11_PROD' || selectedWeekMode === 'PRODUKTIF'
        ? 'P10_NORM_P11_PROD'
        : 'P10_PROD_P11_NORM';
    return sWeek === targetWeek;
  };

  // Generate matrix data REAL-TIME dari Firestore DB masterClasses dan schedules
  const matrixRows: MatrixRowClass[] = useMemo(() => {
    // 1. Dapatkan preset dasar untuk tingkat kelas ini
    let baseRows: MatrixRowClass[];
    if (selectedGrade === 10) baseRows = PRESET_KELAS_X;
    else if (selectedGrade === 11) baseRows = PRESET_KELAS_XI;
    else baseRows = PRESET_KELAS_XII;

    // Ambil daftar kelas dari database master jika ada
    const fallbackProgCodes = VOCATIONAL_PROGRAMS.map((p) => p.code);
    const dbClasses = masterClasses.filter((c) => c.grade === selectedGrade);
    const targetClasses: { id: string; className: string; programCode: string; programName: string }[] =
      dbClasses.length > 0
        ? dbClasses.map((c) => {
            const prog = resolveDepartmentCode(
              c.department,
              c.name,
              masterDepartments,
              fallbackProgCodes
            );
            const deptInfo = getDepartmentInfo(prog, masterDepartments);
            const presetProg = VOCATIONAL_PROGRAMS.find((p) =>
              areDepartmentsEquivalent(p.code, prog)
            );
            const progName = deptInfo?.name || presetProg?.name || `Program ${prog}`;
            return {
              id: c.id,
              className: c.name,
              programCode: prog,
              programName: progName,
            };
          })
        : baseRows.map((b) => {
            const prog = resolveDepartmentCode(
              b.programCode,
              b.className,
              masterDepartments,
              fallbackProgCodes
            );
            const deptInfo = getDepartmentInfo(prog, masterDepartments);
            return {
              id: b.id,
              className: b.className,
              programCode: prog,
              programName: deptInfo?.name || b.programName,
            };
          });

    return targetClasses.map((cls, idx) => {
      // Cari preset fallback untuk kelas ini jika ada
      const fallbackPreset = baseRows.find(
        (b) => b.className.toUpperCase() === cls.className.toUpperCase() || b.id === cls.id
      );

      const slots: Record<number, MatrixSlotData | null> = {};

      MATRIX_PERIODS.forEach((p) => {
        // Cari di schedules database terlebih dahulu secara real-time
        const dbItem = schedules.find((s) => {
          const matchClass =
            s.classId === cls.id || s.className?.trim().toUpperCase() === cls.className.trim().toUpperCase();
          if (!matchClass) return false;

          const sDay =
            s.dayOfWeek ||
            (s.dayName
              ? { SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5 }[s.dayName.toUpperCase()]
              : 1);
          if (sDay !== selectedDay) return false;

          const num = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
          if (num !== p.index) return false;

          return isWeekMatching(s.weekType);
        });

        if (dbItem) {
          const tCode = dbItem.teacherCode || dbItem.teacherName?.substring(0, 3).toUpperCase() || 'GUR';
          const sCode = dbItem.subjectCode || dbItem.subjectName?.substring(0, 4).toUpperCase() || 'MP';
          slots[p.index] = {
            teacherCode: tCode,
            teacherName: dbItem.teacherName,
            nip: teachers.find((t) => t.id === dbItem.teacherId)?.nip,
            subjectCode: sCode,
            subjectName: dbItem.subjectName,
            displayCode: `${tCode} - ${sCode}`,
            roomName: dbItem.roomName || 'Kelas',
            roomType: dbItem.roomType || 'Teori',
          };
        } else {
          // Bila tidak ada di database jadwal, slot harus bernilai null (kosong)
          slots[p.index] = null;
        }
      });

      return {
        id: cls.id,
        classNumber: idx + 1,
        className: cls.className,
        grade: selectedGrade,
        programCode: cls.programCode,
        programName: cls.programName,
        slots,
      };
    });
  }, [
    selectedGrade,
    selectedDay,
    selectedWeekMode,
    schedules,
    masterClasses,
    masterDepartments,
    teachers,
    effectiveWeekType,
  ]);

  // Daftar Program Keahlian di sidebar disinkronkan dari Master Jurusan & kelas aktif
  const sidebarPrograms = useMemo(() => {
    const baseList =
      masterDepartments.length > 0
        ? masterDepartments.map((d) => ({
            code: d.code.trim().toUpperCase(),
            name: d.name || `Program ${d.code}`,
          }))
        : VOCATIONAL_PROGRAMS.map((p) => ({
            code: p.code,
            name: p.name,
          }));

    const seen = new Set(baseList.map((b) => b.code));
    const extras: { code: string; name: string }[] = [];
    matrixRows.forEach((r) => {
      const code = (r.programCode || '').trim().toUpperCase();
      if (
        code &&
        !seen.has(code) &&
        !baseList.some((b) => areDepartmentsEquivalent(b.code, code))
      ) {
        seen.add(code);
        extras.push({ code, name: r.programName || `Program ${code}` });
      }
    });
    return [...baseList, ...extras];
  }, [masterDepartments, matrixRows]);

  // Filter berdasarkan Program Keahlian & Search Query
  const filteredRows = useMemo(() => {
    return matrixRows.filter((row) => {
      // Filter program (mendukung alias seperti KL <-> KLR)
      if (selectedProgram !== 'ALL' && !areDepartmentsEquivalent(row.programCode, selectedProgram)) {
        return false;
      }
      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClass = row.className.toLowerCase().includes(q);
        const matchProgram = row.programName.toLowerCase().includes(q) || row.programCode.toLowerCase().includes(q);
        const matchSlots = Object.values(row.slots).some((slot) => {
          if (!slot) return false;
          return (
            slot.displayCode.toLowerCase().includes(q) ||
            slot.teacherName.toLowerCase().includes(q) ||
            slot.subjectName.toLowerCase().includes(q) ||
            slot.roomName.toLowerCase().includes(q)
          );
        });
        return matchClass || matchProgram || matchSlots;
      }
      return true;
    });
  }, [matrixRows, selectedProgram, searchQuery]);

  // --------------------------------------------------------------------------
  // STATISTIK METRIK KPI (SESUAI DENGAN 4 KARTU DI ATAS)
  // --------------------------------------------------------------------------
  const kpiStats = useMemo(() => {
    const totalClasses = filteredRows.length;
    let totalEmptySlots = 0;
    let completeClassesCount = 0;

    // Hitung per kelas untuk mencari top 3 slot kosong terbanyak
    const classEmptyCounts: { className: string; emptyCount: number; programCode: string }[] = [];

    filteredRows.forEach((row) => {
      let emptyInThisClass = 0;
      MATRIX_PERIODS.forEach((p) => {
        if (!row.slots[p.index]) {
          emptyInThisClass++;
        }
      });

      totalEmptySlots += emptyInThisClass;
      if (emptyInThisClass === 0) {
        completeClassesCount++;
      }

      classEmptyCounts.push({
        className: row.className,
        emptyCount: emptyInThisClass,
        programCode: row.programCode,
      });
    });

    // Urutkan kelas berdasarkan slot kosong terbanyak (descending)
    const sortedByEmpty = [...classEmptyCounts].sort((a, b) => b.emptyCount - a.emptyCount);
    const top3Empty = sortedByEmpty.slice(0, 3).filter((item) => item.emptyCount > 0);

    return {
      totalClasses,
      totalEmptySlots,
      completeClassesCount,
      top3Empty,
    };
  }, [filteredRows]);

  // Program badge color helper
  const getProgramBadge = (code: string) => {
    const prog = VOCATIONAL_PROGRAMS.find((p) => areDepartmentsEquivalent(p.code, code));
    if (!prog) return { bg: 'bg-slate-600', text: 'text-white' };
    return { bg: prog.badgeBg, text: prog.badgeText };
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-12 print:p-0 print:m-0 print:space-y-3">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROLS TOOLBAR (GRADE, DAY, ROTATION, PRINT)         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Grade Selector Tabs: Kelas 10, 11, 12 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setSelectedGrade(10)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedGrade === 10
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Kelas 10 (X)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(11)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedGrade === 11
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Kelas 11 (XI)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(12)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedGrade === 12
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Kelas 12 (XII)
          </button>
        </div>

        {/* Hari Selector */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {days.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setSelectedDay(d.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedDay === d.value
                  ? 'bg-cyan-700 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Week Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span className="hidden sm:inline">Rotasi:</span>
            <select
              value={
                selectedWeekMode === 'PRODUKTIF'
                  ? 'P10_NORM_P11_PROD'
                  : selectedWeekMode === 'NORMATIF'
                  ? 'P10_PROD_P11_NORM'
                  : selectedWeekMode
              }
              onChange={(e) => setSelectedWeekMode(e.target.value as any)}
              className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="P10_NORM_P11_PROD">Pekan 10 Normada 11 Produktif</option>
              <option value="P10_PROD_P11_NORM">Pekan 10 Produktif 11 Normada</option>
              <option value="AUTO">
                ⚡ Ikuti Kalender ({effectiveWeekType === 'P10_PROD_P11_NORM' ? '10 Prod · 11 Normada' : '10 Normada · 11 Prod'})
              </option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru / mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg w-36 sm:w-44 focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          {/* Cloud Firestore Sync Status & Force Sync Button */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 select-none"
            title={isCloudConnected ? "Tersambung ke Cloud Firestore terpusat" : "Tersambung ke database lokal"}
          >
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="hidden sm:inline">{isCloudConnected ? 'Cloud Sync Aktif' : 'Lokal'}</span>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Cetak atau Simpan sebagai PDF"
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cetak / PDF</span>
          </button>

          {/* Toggle to Card View if provided */}
          {onSwitchToCardView && (
            <button
              type="button"
              onClick={onSwitchToCardView}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 underline ml-1"
            >
              Mode Kartu
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. HEADER BANNER (SESUAI GAMBAR LAMPIRAN IDENTIK)             */}
      {/* Dark Navy #082032, SMKN 1 Tegalsari, Dwi Dharma Nugraha, Gold Calendar Box */}
      {/* ------------------------------------------------------------- */}
      <div role="banner" className="bg-[#082032] text-white rounded-2xl px-6 py-4.5 shadow-md border border-[#11324d] flex flex-wrap items-center justify-between gap-4">
        {/* Left: School Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#082032] shadow-sm shrink-0 ring-2 ring-cyan-400/40">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase text-white leading-tight">
              SMKN 1 TEGALSARI
            </h1>
            <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mt-0.5">
              DWI DHARMA NUGRAHA
            </p>
          </div>
        </div>

        {/* Right: Monitoring Title & Subtitle with Gold Box */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F5B82E] flex items-center justify-center text-[#082032] shadow-sm shrink-0">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="text-left">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">
              Monitoring Jadwal Mengajar Kelas {gradeRoman}
            </h2>
            <p className="text-sm font-bold text-[#F5B82E] tracking-wide mt-0.5">
              {currentWeekLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TOP 4 KPI METRIC CARDS (SESUAI GAMBAR LAMPIRAN)            */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Metrik Monitoring" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Kelas Ditampilkan */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">
              {kpiStats.totalClasses}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              Kelas Ditampilkan
            </div>
          </div>
        </div>

        {/* Card 2: Slot Kosong */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 leading-none">
              {kpiStats.totalEmptySlots}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              Slot Kosong
            </div>
          </div>
        </div>

        {/* Card 3: Kelas Lengkap */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 leading-none">
              {kpiStats.completeClassesCount}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              Kelas Lengkap
            </div>
          </div>
        </div>

        {/* Card 4: Kelas Slot Kosong Terbanyak (Pale Yellow with Amber border) */}
        <div className="bg-[#FEFCE8] rounded-2xl p-3.5 shadow-xs border border-amber-300 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black text-amber-900 uppercase tracking-wide">
              Kelas Slot Kosong Terbanyak
            </div>
            <div className="text-xs text-amber-950 font-bold mt-1 leading-snug">
              {kpiStats.top3Empty.length > 0 ? (
                kpiStats.top3Empty.map((item, idx) => (
                  <span key={item.className}>
                    {idx > 0 && <span className="text-amber-400 mx-1.5 font-normal">|</span>}
                    <span>
                      {idx + 1}. {item.className} : {item.emptyCount} jam
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-emerald-700 font-semibold">Semua kelas terisi penuh!</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN CONTENT AREA: LEFT SIDEBAR + RIGHT MATRIX TABLE       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* LEFT COLUMN: FILTER DATA SIDEBAR */}
        <aside aria-label="Filter Program Keahlian" className="w-full lg:w-56 shrink-0 space-y-3.5 print:hidden">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            {/* Sidebar Dark Navy Header */}
            <div className="bg-[#0B1E2E] px-4 py-3 flex items-center gap-2 text-white">
              <Filter className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Filter Data
              </h2>
            </div>

            {/* Program Keahlian List */}
            <div className="p-4 space-y-2.5">
              <div className="text-xs font-extrabold text-slate-800 tracking-tight mb-2">
                Program Keahlian
              </div>

              {/* Radio Semua Program */}
              <label className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none">
                <input
                  type="radio"
                  name="programFilter"
                  checked={selectedProgram === 'ALL'}
                  onChange={() => setSelectedProgram('ALL')}
                  className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300"
                />
                <span className="font-semibold">Semua Program</span>
              </label>

              {/* Radio per Program */}
              {sidebarPrograms.map((prog) => {
                // Hitung jumlah kelas yang ada untuk program ini di grade yang dipilih
                const count = matrixRows.filter((r) =>
                  areDepartmentsEquivalent(r.programCode, prog.code)
                ).length;
                const isSelected =
                  selectedProgram !== 'ALL' &&
                  areDepartmentsEquivalent(selectedProgram, prog.code);
                return (
                  <label
                    key={prog.code}
                    className="flex items-center justify-between gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none group"
                    title={prog.name}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="programFilter"
                        checked={isSelected}
                        onChange={() => setSelectedProgram(prog.code)}
                        className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300"
                      />
                      <span className="font-medium group-hover:font-semibold">
                        {prog.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Bottom Motivation Card (Solid Cyan) */}
          <div className="bg-[#0284c7] text-white rounded-2xl p-4 text-center shadow-xs flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-bold leading-relaxed px-1">
              Bersama Kita Wujudkan Pendidikan Berkualitas
            </p>
          </div>
        </aside>

        {/* RIGHT COLUMN: MONITORING MATRIX GRID TABLE */}
        <main className="w-full min-w-0 flex-1 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {/* Header: Dark Navy #0B2135 */}
              <thead>
                <tr className="bg-[#0B2135] text-white border-b border-slate-700 select-none">
                  <th scope="col" className="py-2.5 px-2 text-center font-bold text-[11px] w-10">
                    No
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-bold text-[11px] whitespace-nowrap min-w-[90px]">
                    Nama Kelas
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-center font-bold text-[11px] min-w-[70px]">
                    Program
                  </th>
                  {MATRIX_PERIODS.map((p) => (
                    <th
                      key={p.index}
                      scope="col"
                      className="py-2 px-1.5 text-center font-bold text-[10px] min-w-[80px] border-l border-slate-700/60"
                    >
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal text-cyan-300/90">{p.time}</div>
                    </th>
                  ))}
                  <th scope="col" className="py-2.5 px-2.5 text-center font-bold text-[11px] min-w-[80px] border-l border-slate-700/60">
                    Jumlah Kosong
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const progBadge = getProgramBadge(row.programCode);

                    // Hitung jumlah kosong
                    let emptyCount = 0;
                    MATRIX_PERIODS.forEach((p) => {
                      if (!row.slots[p.index]) emptyCount++;
                    });

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* No */}
                        <td className="py-2 px-2 text-center text-slate-600 font-semibold text-xs">
                          {row.classNumber}
                        </td>

                        {/* Nama Kelas */}
                        <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap text-xs">
                          {row.className}
                        </td>

                        {/* Program Badge */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${progBadge.bg} ${progBadge.text} shadow-2xs`}
                          >
                            {row.programCode}
                          </span>
                        </td>

                        {/* Periods J1 to J11 */}
                        {MATRIX_PERIODS.map((p) => {
                          const slot = row.slots[p.index];

                          if (!slot) {
                            // Slot Kosong: background pink #FEE2E2 dengan tanda strip merah
                            return (
                              <td
                                key={p.index}
                                onClick={() =>
                                  setActiveSlotModal({
                                    row,
                                    periodIndex: p.index,
                                    slot: null,
                                  })
                                }
                                className="py-1 px-1 text-center bg-[#FEE2E2] border-l border-slate-200 cursor-pointer hover:bg-rose-200/80 transition-colors"
                                title={`Jam ${p.label} (${p.time}) - Slot Kosong pada ${row.className}`}
                              >
                                <span className="font-black text-rose-500 text-sm select-none">
                                  -
                                </span>
                              </td>
                            );
                          }

                          // Slot Terisi: Tampilan [KodeGuru - SingkatanMapel]
                          return (
                            <td
                              key={p.index}
                              onClick={() =>
                                setActiveSlotModal({
                                  row,
                                  periodIndex: p.index,
                                  slot,
                                })
                              }
                              className="py-1 px-1 text-center border-l border-slate-200 cursor-pointer transition-all hover:bg-cyan-50/70"
                              title={`${slot.displayCode}\n${slot.subjectName}\nGuru: ${slot.teacherName}\nRuang: ${slot.roomName}`}
                            >
                              <div className="bg-slate-50 border border-slate-200/80 rounded px-1 py-1 hover:border-cyan-400 hover:shadow-2xs">
                                <span className="font-semibold text-slate-800 text-[10px] block truncate max-w-[85px] mx-auto">
                                  {slot.displayCode}
                                </span>
                              </div>
                            </td>
                          );
                        })}

                        {/* Jumlah Kosong Column */}
                        <td className="py-2 px-2.5 text-center border-l border-slate-200">
                          {emptyCount > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white font-black text-[11px] shadow-2xs">
                              {emptyCount}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-[11px] shadow-2xs">
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                        <p className="font-bold text-slate-800">Tidak ada kelas yang cocok dengan filter</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Silakan reset filter program keahlian atau kata kunci pencarian.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgram('ALL');
                            setSearchQuery('');
                          }}
                          className="mt-3 px-3 py-1 bg-cyan-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Summary Bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div>
              Menampilkan <strong>{filteredRows.length}</strong> rombongan belajar Kelas {gradeRoman} · Total Slot Kosong:{' '}
              <strong className="text-rose-600">{kpiStats.totalEmptySlots} jam</strong>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block"></span>
                <span>Terisi (Guru - Mapel)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#FEE2E2] border border-rose-300 inline-block"></span>
                <span>Slot Kosong (-)</span>
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. INTERACTIVE SLOT MODAL (DETAIL KBM & GURU)                 */}
      {/* ------------------------------------------------------------- */}
      {activeSlotModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#082032] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {activeSlotModal.row.className} · Jam Ke-{activeSlotModal.periodIndex}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Detail Slot Pembelajaran
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlotModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {activeSlotModal.slot ? (
                <>
                  {/* Status Box */}
                  <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black text-sm">
                      {activeSlotModal.slot.teacherCode}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-cyan-900 truncate">
                        {activeSlotModal.slot.displayCode}
                      </div>
                      <div className="text-[11px] text-cyan-700">
                        {MATRIX_PERIODS[activeSlotModal.periodIndex - 1]?.range} WIB
                      </div>
                    </div>
                  </div>

                  {/* Mata Pelajaran */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Mata Pelajaran
                    </label>
                    <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span>{activeSlotModal.slot.subjectName}</span>
                    </div>
                  </div>

                  {/* Guru Pengajar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Guru Pengajar
                    </label>
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{activeSlotModal.slot.teacherName}</span>
                    </div>
                    {activeSlotModal.slot.nip && (
                      <div className="text-xs text-slate-500 font-mono ml-6">
                        NIP. {activeSlotModal.slot.nip}
                      </div>
                    )}
                  </div>

                  {/* Ruang Belajar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Ruangan & Lokasi
                    </label>
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{activeSlotModal.slot.roomName}</span>
                      {activeSlotModal.slot.roomType && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {activeSlotModal.slot.roomType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin Action: Kosongkan Slot */}
                  {currentUser.role === 'admin' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Manajemen Jadwal:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const matchingSchedules = schedules.filter((s) => {
                            const matchClass =
                              s.classId === activeSlotModal.row.id ||
                              s.className?.trim().toUpperCase() === activeSlotModal.row.className.trim().toUpperCase();
                            const num =
                              typeof s.periodIndex === 'number'
                                ? s.periodIndex
                                : parseInt(String(s.periodIndex), 10);
                            const sDay =
                              s.dayOfWeek ||
                              (s.dayName
                                ? { SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5 }[s.dayName.toUpperCase()]
                                : 1);
                            return (
                              matchClass &&
                              num === activeSlotModal.periodIndex &&
                              sDay === selectedDay &&
                              isWeekMatching(s.weekType)
                            );
                          });

                          if (matchingSchedules.length > 0) {
                            matchingSchedules.forEach((sch) => {
                              deleteSchedule(sch.id);
                            });
                            setSyncToast(`Jadwal jam ke-${activeSlotModal.periodIndex} untuk ${activeSlotModal.row.className} berhasil dikosongkan.`);
                          } else {
                            const fallbackSched = schedules.find((s) => {
                              const matchClass =
                                s.classId === activeSlotModal.row.id ||
                                s.className?.trim().toUpperCase() === activeSlotModal.row.className.trim().toUpperCase();
                              const num =
                                typeof s.periodIndex === 'number'
                                  ? s.periodIndex
                                  : parseInt(String(s.periodIndex), 10);
                              return matchClass && num === activeSlotModal.periodIndex;
                            });
                            if (fallbackSched) {
                              deleteSchedule(fallbackSched.id);
                              setSyncToast(`Jadwal jam ke-${activeSlotModal.periodIndex} untuk ${activeSlotModal.row.className} berhasil dikosongkan.`);
                            } else {
                              setSyncToast(`Slot berhasil dikosongkan pada database.`);
                            }
                          }
                          setActiveSlotModal(null);
                        }}
                        className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Kosongkan Slot Ini
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 space-y-3">
                  {!isAssignOpen ? (
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-base">
                          Slot Belajar Belum Terisi
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                          Tidak ada guru atau mata pelajaran yang terjadwal pada jam pelajaran ke-{activeSlotModal.periodIndex} ({MATRIX_PERIODS[activeSlotModal.periodIndex - 1]?.range}) untuk kelas {activeSlotModal.row.className}.
                        </p>
                      </div>

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setIsAssignOpen(true)}
                          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          + Tugaskan Guru & Mapel Sekarang
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Inline Quick Assign Form */
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Tugaskan Jadwal KBM</span>
                        <button
                          type="button"
                          onClick={() => setIsAssignOpen(false)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                        >
                          Batal
                        </button>
                      </div>

                      {/* Pilih Guru */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Pilih Guru Pengajar:</label>
                        <select
                          value={assignTeacherId}
                          onChange={(e) => setAssignTeacherId(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">-- Pilih Guru --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              [{t.code}] {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Pilih Mapel */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Pilih Mata Pelajaran:</label>
                        <select
                          value={assignSubjectId}
                          onChange={(e) => setAssignSubjectId(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">-- Pilih Mapel --</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              [{s.code}] {s.name} ({s.department || 'UMUM'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Pilih Ruang */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Ruangan:</label>
                        <select
                          value={assignRoomName}
                          onChange={(e) => setAssignRoomName(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">Ruang Kelas Standar</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name} ({r.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={!assignTeacherId || !assignSubjectId}
                        onClick={() => {
                          const tch = teachers.find((t) => t.id === assignTeacherId);
                          const sbj = subjects.find((s) => s.id === assignSubjectId);
                          if (!tch || !sbj) return;

                          const p = MATRIX_PERIODS[activeSlotModal.periodIndex - 1];
                          const newSchedule: any = {
                            id: `sched-${activeSlotModal.row.className.toLowerCase().replace(/\s+/g, '-')}-j${activeSlotModal.periodIndex}-${Date.now()}`,
                            dayOfWeek: selectedDay,
                            dayName: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'][selectedDay - 1],
                            periodIndex: activeSlotModal.periodIndex,
                            timeRange: p?.range || '06:45 - 07:20',
                            startTime: p?.time || '06:45',
                            endTime: p?.range?.split('-')[1]?.trim() || '07:20',
                            teacherId: tch.id,
                            teacherName: tch.name,
                            teacherCode: tch.code,
                            subjectCode: sbj.code,
                            subjectName: sbj.name,
                            classId: activeSlotModal.row.id,
                            className: activeSlotModal.row.className,
                            department: activeSlotModal.row.programCode,
                            roomName: assignRoomName || 'Ruang Kelas',
                            roomType: 'Teori',
                            weekType:
                              selectedGrade === 12
                                ? 'ALL'
                                : selectedWeekMode === 'P10_NORM_P11_PROD' || selectedWeekMode === 'PRODUKTIF'
                                ? 'P10_NORM_P11_PROD'
                                : selectedWeekMode === 'P10_PROD_P11_NORM' || selectedWeekMode === 'NORMATIF'
                                ? 'P10_PROD_P11_NORM'
                                : effectiveWeekType,
                          };

                          addSchedule(newSchedule);
                          setSyncToast(`Jadwal ${sbj.name} (${tch.name}) berhasil disimpan dan disinkronkan ke Cloud Firestore!`);
                          setActiveSlotModal(null);
                          setIsAssignOpen(false);
                          setAssignTeacherId('');
                          setAssignSubjectId('');
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        Simpan Jadwal ke Database
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setActiveSlotModal(null);
                  setIsAssignOpen(false);
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 shadow-xs"
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
