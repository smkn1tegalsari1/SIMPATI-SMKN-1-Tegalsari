import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  CalendarDays,
  Clock,
  User,
  GraduationCap,
  DoorOpen,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  BookCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleWeekType, TeachingJournal } from '../../types';
import { TambahJurnalModal, JournalWeekFilterMode } from './TambahJurnalModal';
import { PERIOD_TIMES } from '../../data/initialData';
import {
  resolveWeekRotationForDate,
  getWeekTypeLabel,
  getWeekTypeShortLabel,
  isScheduleMatchingWeek,
} from '../../data/scheduleWeeks';

interface SyncedScheduleCard {
  key: string;
  dayOfWeek: number;
  dayName: string;
  teacherId: string;
  teacherName: string;
  teacherCode?: string;
  classId?: string;
  className: string;
  roomName: string;
  subjectCode: string;
  subjectName: string;
  weekType: ScheduleWeekType;
  startPeriod: number;
  endPeriod: number;
  timeRange: string;
}

const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Senin', upper: 'SENIN' },
  { dayOfWeek: 2, label: 'Selasa', upper: 'SELASA' },
  { dayOfWeek: 3, label: 'Rabu', upper: 'RABU' },
  { dayOfWeek: 4, label: 'Kamis', upper: 'KAMIS' },
  { dayOfWeek: 5, label: 'Jumat', upper: 'JUMAT' },
] as const;

const DAY_NAME_TO_NUM: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  minggu: 7,
};

const toISODateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDateForDayOfWeekInCurrentWeek = (targetDayOfWeek: number): string => {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const diff = targetDayOfWeek - currentDay;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return toISODateLocal(target);
};

export const JurnalMengajarView: React.FC = () => {
  const {
    journals,
    deleteJournal,
    teachers,
    classes,
    rooms,
    schedules,
    currentUser,
    currentDayIndex,
    currentDayName,
    realtimeWeekType,
    effectiveWeekType,
    monthlyWeekSchedules,
  } = useApp();

  // Resolusi data guru milik akun login jika role guru
  const loggedInTeacher = useMemo(() => {
    if (currentUser.role !== 'guru') return undefined;
    return teachers.find(
      (t) =>
        (currentUser.teacherId && t.id === currentUser.teacherId) ||
        (currentUser.teacherCode && t.code.toLowerCase() === currentUser.teacherCode.toLowerCase()) ||
        (currentUser.username && t.code.toLowerCase() === currentUser.username.toLowerCase()) ||
        (currentUser.name && t.name.toLowerCase() === currentUser.name.toLowerCase())
    );
  }, [currentUser, teachers]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJournal, setEditingJournal] = useState<TeachingJournal | null>(null);
  const [modalInitialWeekMode, setModalInitialWeekMode] = useState<JournalWeekFilterMode>('AUTO');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<TeachingJournal | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State sinkronisasi jadwal guru sesuai hari & pilihan pekan mingguan
  const defaultWeekday = currentDayIndex >= 1 && currentDayIndex <= 5 ? currentDayIndex : 1;
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<number | 'ALL'>(defaultWeekday);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<
    'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'
  >('ACTIVE');
  const [scheduleTeacherId, setScheduleTeacherId] = useState<string>(
    currentUser.role === 'guru'
      ? loggedInTeacher?.id || currentUser.teacherId || ''
      : teachers[0]?.id || ''
  );

  // Filter states riwayat jurnal
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTeacherId, setFilterTeacherId] = useState<string>(
    currentUser.role === 'guru'
      ? loggedInTeacher?.id || currentUser.teacherId || 'MY_ACCOUNT'
      : 'ALL'
  );
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterDateOption, setFilterDateOption] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  const [filterJournalWeek, setFilterJournalWeek] = useState<
    'ALL' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD'
  >('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  // Otomatis sinkronkan guru saat akun guru login / berubah / data guru selesai dimuat
  useEffect(() => {
    if (currentUser.role === 'guru') {
      const resolvedId = loggedInTeacher?.id || currentUser.teacherId || 'MY_ACCOUNT';
      setFilterTeacherId(resolvedId);
      setScheduleTeacherId(loggedInTeacher?.id || currentUser.teacherId || '');
    } else {
      setFilterTeacherId('ALL');
      if (teachers.length > 0 && !teachers.some((t) => t.id === scheduleTeacherId)) {
        setScheduleTeacherId(teachers[0].id);
      }
    }
  }, [currentUser.role, currentUser.teacherId, currentUser.id, loggedInTeacher, teachers]);

  // Sinkronkan default hari saat hari real-time berubah (mis. masuk hari kerja baru)
  useEffect(() => {
    const weekday = currentDayIndex >= 1 && currentDayIndex <= 5 ? currentDayIndex : 1;
    setSelectedScheduleDay(weekday);
  }, [currentDayIndex]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const todayISO = useMemo(() => toISODateLocal(new Date()), []);

  // Helper mencocokkan entri guru dengan akun guru terpilih
  const isMatchingTeacher = (
    itemTeacherId?: string,
    itemTeacherName?: string,
    itemTeacherCode?: string,
    targetId?: string
  ) => {
    if (!targetId || targetId === 'ALL') return true;

    const targetTeacher =
      teachers.find((t) => t.id === targetId) ||
      (currentUser.role === 'guru' ? loggedInTeacher : undefined);

    if (itemTeacherId && itemTeacherId === targetId) return true;
    if (targetTeacher) {
      if (itemTeacherId && itemTeacherId === targetTeacher.id) return true;
      if (
        itemTeacherCode &&
        targetTeacher.code &&
        itemTeacherCode.toLowerCase() === targetTeacher.code.toLowerCase()
      ) {
        return true;
      }
      if (
        itemTeacherName &&
        targetTeacher.name &&
        itemTeacherName.toLowerCase() === targetTeacher.name.toLowerCase()
      ) {
        return true;
      }
    } else if (currentUser.role === 'guru') {
      if (currentUser.teacherId && itemTeacherId === currentUser.teacherId) return true;
      if (
        currentUser.teacherCode &&
        itemTeacherCode &&
        itemTeacherCode.toLowerCase() === currentUser.teacherCode.toLowerCase()
      ) {
        return true;
      }
      if (
        currentUser.name &&
        itemTeacherName &&
        itemTeacherName.toLowerCase() === currentUser.name.toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  };

  // Guru aktif untuk sinkronisasi jadwal
  const activeSyncTeacher = useMemo(() => {
    if (currentUser.role === 'guru') {
      return (
        loggedInTeacher || {
          id: currentUser.teacherId || currentUser.id || 'guru-current',
          code: currentUser.teacherCode || currentUser.username || 'GURU',
          nip: currentUser.nip || '-',
          name: currentUser.name || 'Guru Pengajar',
          title: currentUser.title || 'Guru Mapel',
          email: '',
          phone: '',
        }
      );
    }
    return teachers.find((t) => t.id === scheduleTeacherId) || teachers[0];
  }, [currentUser, loggedInTeacher, teachers, scheduleTeacherId]);

  const resolvedScheduleWeek: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL' =
    selectedWeekFilter === 'ACTIVE' ? effectiveWeekType : selectedWeekFilter;

  // Sesi Jadwal Guru Tersinkron sesuai Hari & Pekan Mingguan
  const syncedScheduleCards: SyncedScheduleCard[] = useMemo(() => {
    if (!activeSyncTeacher) return [];

    const filtered = schedules.filter((s) => {
      const matchTeacher = isMatchingTeacher(
        s.teacherId,
        s.teacherName,
        s.teacherCode,
        activeSyncTeacher.id
      );
      if (!matchTeacher) return false;

      const sDay =
        s.dayOfWeek ||
        (s.dayName ? DAY_NAME_TO_NUM[s.dayName.trim().toLowerCase()] : 0) ||
        1;
      if (selectedScheduleDay !== 'ALL' && sDay !== selectedScheduleDay) {
        return false;
      }

      if (selectedWeekFilter === 'ACTIVE') {
        return isScheduleMatchingWeek(s.weekType, effectiveWeekType, realtimeWeekType);
      }
      if (selectedWeekFilter !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === selectedWeekFilter;
      }
      return true;
    });

    if (filtered.length === 0) return [];

    const sorted = [...filtered].sort((a, b) => {
      const da = a.dayOfWeek || (a.dayName ? DAY_NAME_TO_NUM[a.dayName.trim().toLowerCase()] : 0) || 1;
      const db = b.dayOfWeek || (b.dayName ? DAY_NAME_TO_NUM[b.dayName.trim().toLowerCase()] : 0) || 1;
      if (da !== db) return da - db;
      const pa = typeof a.periodIndex === 'number' ? a.periodIndex : parseInt(String(a.periodIndex), 10) || 1;
      const pb = typeof b.periodIndex === 'number' ? b.periodIndex : parseInt(String(b.periodIndex), 10) || 1;
      return pa - pb;
    });

    const blocks: Array<{
      key: string;
      dayOfWeek: number;
      dayName: string;
      teacherId: string;
      teacherName: string;
      teacherCode?: string;
      classId?: string;
      className: string;
      roomName: string;
      subjectCode: string;
      subjectName: string;
      weekType: ScheduleWeekType;
      periods: number[];
    }> = [];

    sorted.forEach((s) => {
      const sDay =
        s.dayOfWeek ||
        (s.dayName ? DAY_NAME_TO_NUM[s.dayName.trim().toLowerCase()] : 0) ||
        1;
      const dayLabel = WEEK_DAYS.find((d) => d.dayOfWeek === sDay)?.label || s.dayName || 'Senin';
      const pNum =
        typeof s.periodIndex === 'number'
          ? s.periodIndex
          : parseInt(String(s.periodIndex), 10) || 1;
      const itemWeek: ScheduleWeekType = s.weekType || 'ALL';
      const last = blocks[blocks.length - 1];

      const canMerge =
        last &&
        last.dayOfWeek === sDay &&
        last.className === s.className &&
        last.subjectName === s.subjectName &&
        last.roomName === s.roomName &&
        last.weekType === itemWeek &&
        pNum <= last.periods[last.periods.length - 1] + 1;

      if (canMerge) {
        if (!last.periods.includes(pNum)) {
          last.periods.push(pNum);
        }
      } else {
        blocks.push({
          key: `${sDay}_${s.className}_${s.subjectName}_${s.roomName}_${itemWeek}_${pNum}`,
          dayOfWeek: sDay,
          dayName: dayLabel,
          teacherId: s.teacherId || activeSyncTeacher.id,
          teacherName: s.teacherName || activeSyncTeacher.name,
          teacherCode: s.teacherCode || activeSyncTeacher.code,
          classId: s.classId,
          className: s.className,
          roomName: s.roomName,
          subjectCode: s.subjectCode || 'MAPEL',
          subjectName: s.subjectName,
          weekType: itemWeek,
          periods: [pNum],
        });
      }
    });

    return blocks.map((b) => {
      const startP = b.periods[0] || 1;
      const endP = b.periods[b.periods.length - 1] || startP;
      const startTimeStr = PERIOD_TIMES.find((p) => p.period === startP)?.start || '06:45';
      const endTimeStr = PERIOD_TIMES.find((p) => p.period === endP)?.end || '13:00';
      return {
        key: b.key,
        dayOfWeek: b.dayOfWeek,
        dayName: b.dayName,
        teacherId: b.teacherId,
        teacherName: b.teacherName,
        teacherCode: b.teacherCode,
        classId: b.classId,
        className: b.className,
        roomName: b.roomName,
        subjectCode: b.subjectCode,
        subjectName: b.subjectName,
        weekType: b.weekType,
        startPeriod: startP,
        endPeriod: endP,
        timeRange: `${startTimeStr} - ${endTimeStr} WIB`,
      };
    });
  }, [activeSyncTeacher, schedules, selectedScheduleDay, selectedWeekFilter, effectiveWeekType, realtimeWeekType]);

  // Jurnal yang relevan untuk role aktif (jika guru login -> hanya jurnal guru tsb)
  const scopedJournals = useMemo(() => {
    if (currentUser.role === 'guru') {
      const targetId = loggedInTeacher?.id || currentUser.teacherId || 'MY_ACCOUNT';
      return journals.filter((j) =>
        isMatchingTeacher(j.teacherId, j.teacherName, j.teacherCode, targetId)
      );
    }
    return journals;
  }, [journals, currentUser.role, loggedInTeacher, currentUser.teacherId, teachers]);

  // Filter journals berdasarkan semua filter UI
  const filteredJournals = useMemo(() => {
    return scopedJournals.filter((item) => {
      if (filterTeacherId !== 'ALL' && currentUser.role !== 'guru') {
        if (!isMatchingTeacher(item.teacherId, item.teacherName, item.teacherCode, filterTeacherId)) {
          return false;
        }
      }

      if (filterClassId !== 'ALL' && item.classId !== filterClassId && item.className !== filterClassId) {
        return false;
      }

      if (filterDateOption === 'TODAY') {
        if (item.date !== todayISO) return false;
      } else if (filterDateOption === 'CUSTOM' && customDate) {
        if (item.date !== customDate) return false;
      }

      if (filterJournalWeek !== 'ALL' && item.date) {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const dObj = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          if (resolveWeekRotationForDate(dObj, monthlyWeekSchedules) !== filterJournalWeek) {
            return false;
          }
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTopic = item.topic.toLowerCase().includes(q);
        const matchTeacher =
          item.teacherName.toLowerCase().includes(q) ||
          (item.teacherCode && item.teacherCode.toLowerCase().includes(q));
        const matchSubject =
          item.subjectName.toLowerCase().includes(q) || item.subjectCode.toLowerCase().includes(q);
        const matchClass = item.className.toLowerCase().includes(q);
        const matchRoom = item.roomName.toLowerCase().includes(q);
        if (!matchTopic && !matchTeacher && !matchSubject && !matchClass && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [
    scopedJournals,
    filterTeacherId,
    currentUser.role,
    filterClassId,
    filterDateOption,
    customDate,
    filterJournalWeek,
    searchTerm,
    todayISO,
    teachers,
    monthlyWeekSchedules,
  ]);

  // Statistik Jurnal
  const totalCount = scopedJournals.length;
  const todayCount = scopedJournals.filter((j) => j.date === todayISO).length;
  const activeTeachersCount = new Set(scopedJournals.map((j) => j.teacherId)).size;
  const classesServedCount = new Set(scopedJournals.map((j) => j.className)).size;

  const handleOpenAdd = () => {
    setEditingJournal(null);
    setModalInitialWeekMode(
      selectedWeekFilter === 'ACTIVE' ? 'AUTO' : selectedWeekFilter
    );
    setIsModalOpen(true);
  };

  const handleOpenFromScheduleCard = (card: SyncedScheduleCard, existingJournal?: TeachingJournal) => {
    if (existingJournal) {
      setEditingJournal(existingJournal);
      setModalInitialWeekMode(
        selectedWeekFilter === 'ACTIVE' ? 'AUTO' : selectedWeekFilter
      );
      setIsModalOpen(true);
      return;
    }

    const targetDate =
      card.dayOfWeek === currentDayIndex
        ? todayISO
        : getDateForDayOfWeekInCurrentWeek(card.dayOfWeek);

    const matchedClass = classes.find(
      (c) =>
        (card.classId && c.id === card.classId) ||
        c.name.toLowerCase() === card.className.toLowerCase()
    );
    const matchedRoom = rooms.find(
      (r) =>
        r.name.toLowerCase() === card.roomName.toLowerCase() ||
        r.code.toLowerCase() === card.roomName.toLowerCase()
    );

    const draft: TeachingJournal = {
      id: '',
      date: targetDate,
      teacherId: activeSyncTeacher?.id || card.teacherId,
      teacherName: activeSyncTeacher?.name || card.teacherName,
      teacherCode: activeSyncTeacher?.code || card.teacherCode,
      classId: matchedClass?.id || card.classId,
      className: card.className,
      roomId: matchedRoom?.id,
      roomName: card.roomName,
      subjectCode: card.subjectCode || 'MAPEL',
      subjectName: card.subjectName,
      startPeriod: card.startPeriod,
      endPeriod: card.endPeriod,
      timeRange: card.timeRange,
      topic: '',
      createdAt: Date.now(),
    };

    setEditingJournal(draft);
    setModalInitialWeekMode(
      card.weekType && card.weekType !== 'ALL'
        ? card.weekType
        : selectedWeekFilter === 'ACTIVE'
        ? 'AUTO'
        : selectedWeekFilter
    );
    setIsModalOpen(true);
  };

  const handleOpenEdit = (journal: TeachingJournal) => {
    setEditingJournal(journal);
    setModalInitialWeekMode('AUTO');
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    deleteJournal(deleteConfirmTarget.id);
    setToastMessage(`Jurnal "${deleteConfirmTarget.subjectName} (${deleteConfirmTarget.className})" berhasil dihapus.`);
    setDeleteConfirmTarget(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredJournals.length === 0) {
      setToastMessage('Tidak ada data jurnal yang sesuai filter untuk diekspor.');
      return;
    }
    const headers = [
      'Tanggal',
      'Guru',
      'Kode Guru',
      'Kelas',
      'Ruang',
      'Kode Mapel',
      'Mata Pelajaran',
      'Jam Mulai',
      'Jam Selesai',
      'Materi Pembelajaran',
    ];
    const rows = filteredJournals.map((j) => [
      `"${j.date}"`,
      `"${j.teacherName.replace(/"/g, '""')}"`,
      `"${j.teacherCode || ''}"`,
      `"${j.className.replace(/"/g, '""')}"`,
      `"${j.roomName.replace(/"/g, '""')}"`,
      `"${j.subjectCode}"`,
      `"${j.subjectName.replace(/"/g, '""')}"`,
      `"Jam ke-${j.startPeriod}"`,
      `"Jam ke-${j.endPeriod}"`,
      `"${j.topic.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jurnal_mengajar_${todayISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage(`Berhasil mengekspor ${filteredJournals.length} entri jurnal mengajar.`);
  };

  const getWeekBadgeClasses = (wt?: ScheduleWeekType | string) => {
    if (wt === 'P10_PROD_P11_NORM') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (wt === 'P10_NORM_P11_PROD') {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:underline text-[11px] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#6B9A95]/15 text-[#4E7D78] flex items-center justify-center font-bold">
              <BookCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Jurnal Mengajar Guru
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentUser.role === 'guru'
                  ? `Tersinkron otomatis dengan jadwal mengajar ${activeSyncTeacher?.name || currentUser.name} (${currentDayName})`
                  : 'Pencatatan materi pembelajaran harian tersinkron jadwal guru & rotasi pekan mingguan'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
            title="Ekspor CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
            title="Cetak Jurnal"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6B9A95] hover:bg-[#5A8782] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurnal</span>
          </button>
        </div>
      </div>

      {/* PANEL SINKRONISASI JADWAL MENGAJAR GURU (SESUAI HARI & PILIHAN PEKAN MINGGUAN) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <RefreshCw className="w-3 h-3" />
                Jadwal Guru Tersinkron
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <CalendarDays className="w-3 h-3 text-cyan-700" />
                {getWeekTypeLabel(resolvedScheduleWeek)}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {activeSyncTeacher
                ? `Jadwal Mengajar: ${activeSyncTeacher.name}${activeSyncTeacher.code ? ` (${activeSyncTeacher.code})` : ''}`
                : 'Sinkronisasi Jadwal Mengajar Guru'}
            </h2>
          </div>

          {/* Selector Guru (khusus non-guru) & Pilihan Pekan Mingguan */}
          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role !== 'guru' && (
              <select
                value={scheduleTeacherId}
                onChange={(e) => setScheduleTeacherId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
              >
                {teachers.length === 0 && <option value="">Belum ada data guru</option>}
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#4E7D78] shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">Pekan:</span>
              <select
                value={selectedWeekFilter}
                onChange={(e) => setSelectedWeekFilter(e.target.value as any)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="ACTIVE">
                  Pekan Aktif ({getWeekTypeShortLabel(effectiveWeekType)})
                </option>
                <option value="P10_PROD_P11_NORM">Pekan 10 Produktif 11 Normada</option>
                <option value="P10_NORM_P11_PROD">Pekan 10 Normada 11 Produktif</option>
                <option value="ALL">Semua Pekan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pilihan Hari (Otomatis default ke Hari Ini) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEK_DAYS.map((d) => {
              const isToday = d.dayOfWeek === currentDayIndex;
              const isSelected = selectedScheduleDay === d.dayOfWeek;
              return (
                <button
                  key={d.dayOfWeek}
                  type="button"
                  onClick={() => setSelectedScheduleDay(d.dayOfWeek)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#0B1E2E] text-white border-[#0B1E2E] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{d.label}</span>
                  {isToday && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isSelected
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      Hari Ini
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedScheduleDay('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                selectedScheduleDay === 'ALL'
                  ? 'bg-[#6B9A95] text-white border-[#6B9A95] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua Hari (Senin–Jumat)
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {syncedScheduleCards.length} sesi mengajar ditemukan
          </span>
        </div>

        {/* Kartu Jadwal Tersinkron */}
        {syncedScheduleCards.length === 0 ? (
          <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Tidak ada jadwal mengajar pada{' '}
              {selectedScheduleDay === 'ALL'
                ? 'hari Senin–Jumat'
                : `hari ${WEEK_DAYS.find((d) => d.dayOfWeek === selectedScheduleDay)?.label || ''}`}{' '}
              untuk {getWeekTypeShortLabel(resolvedScheduleWeek)}.
            </p>
            <p className="text-xs text-slate-500">
              Coba pilih hari lain, ganti pilihan pekan mingguan di atas, atau klik <strong>Tambah Jurnal</strong> untuk mencatat kegiatan manual.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {syncedScheduleCards.map((card) => {
              const targetDate =
                card.dayOfWeek === currentDayIndex
                  ? todayISO
                  : getDateForDayOfWeekInCurrentWeek(card.dayOfWeek);

              const matchingLoggedJournal = scopedJournals.find(
                (j) =>
                  j.date === targetDate &&
                  j.className.toLowerCase() === card.className.toLowerCase() &&
                  j.subjectName.toLowerCase() === card.subjectName.toLowerCase() &&
                  j.startPeriod === card.startPeriod
              );

              return (
                <div
                  key={card.key}
                  className={`rounded-2xl p-4 border transition flex flex-col justify-between gap-3 ${
                    matchingLoggedJournal
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-[#FCFAF6] border-[#E7E0D5] hover:border-[#6B9A95]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0B1E2E] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                        <Calendar className="w-3 h-3 text-[#4E7D78]" />
                        {card.dayName} · Jam ke-{card.startPeriod}
                        {card.endPeriod !== card.startPeriod ? ` s/d ${card.endPeriod}` : ''}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getWeekBadgeClasses(
                          card.weekType
                        )}`}
                      >
                        {getWeekTypeShortLabel(card.weekType)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {card.subjectName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-800">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {card.className}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                          {card.roomName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{card.timeRange}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    {matchingLoggedJournal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sudah Diisi ({targetDate})
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700">
                        Belum diisi ({targetDate})
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenFromScheduleCard(card, matchingLoggedJournal)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        matchingLoggedJournal
                          ? 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-[#6B9A95] hover:bg-[#5A8782] text-white shadow-2xs'
                      }`}
                    >
                      {matchingLoggedJournal ? (
                        <>
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Jurnal</span>
                        </>
                      ) : (
                        <>
                          <BookCheck className="w-3.5 h-3.5" />
                          <span>Isi Jurnal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Jurnal
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500">entri dicatat</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 bg-emerald-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Jurnal Hari Ini
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{todayCount}</span>
            <span className="text-xs text-emerald-600">kegiatan</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-cyan-200/90 bg-cyan-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">
            {currentUser.role === 'guru' ? 'Jadwal Tersinkron' : 'Guru Mengisi'}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-cyan-700">
              {currentUser.role === 'guru' ? syncedScheduleCards.length : activeTeachersCount}
            </span>
            <span className="text-xs text-cyan-600">
              {currentUser.role === 'guru' ? 'sesi sesuai filter' : `dari ${teachers.length} guru`}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/90 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Kelas Terdata
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-700">{classesServedCount}</span>
            <span className="text-xs text-amber-600">dari {classes.length} rombel</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Riwayat Jurnal */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari materi pembelajaran, guru, mapel, kelas, atau ruang..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] focus:bg-white transition"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterDateOption('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Tanggal
            </button>
            <button
              onClick={() => setFilterDateOption('TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'TODAY'
                  ? 'bg-[#6B9A95] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterDateOption('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'CUSTOM'
                  ? 'bg-[#6B9A95] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pilih Tanggal
            </button>
            {filterDateOption === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
              />
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {/* Filter Guru */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {currentUser.role === 'guru' ? (
              <div className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 truncate">
                {activeSyncTeacher?.name || currentUser.name}
              </div>
            ) : (
              <select
                value={filterTeacherId}
                onChange={(e) => setFilterTeacherId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
              >
                <option value="ALL">Semua Guru ({teachers.length})</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filter Kelas */}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
            >
              <option value="ALL">Semua Kelas ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pekan Mingguan Riwayat Jurnal */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterJournalWeek}
              onChange={(e) => setFilterJournalWeek(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
            >
              <option value="ALL">Semua Pekan Mingguan</option>
              <option value="P10_PROD_P11_NORM">Pekan 10 Produktif 11 Normada</option>
              <option value="P10_NORM_P11_PROD">Pekan 10 Normada 11 Produktif</option>
            </select>
          </div>

          {/* Reset filter shortcut */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {filteredJournals.length} dari {scopedJournals.length} entri
            </span>
            {((currentUser.role !== 'guru' && filterTeacherId !== 'ALL') ||
              filterClassId !== 'ALL' ||
              filterDateOption !== 'ALL' ||
              filterJournalWeek !== 'ALL' ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  if (currentUser.role !== 'guru') setFilterTeacherId('ALL');
                  setFilterClassId('ALL');
                  setFilterDateOption('ALL');
                  setFilterJournalWeek('ALL');
                  setCustomDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content List / Table */}
      {filteredJournals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#6B9A95]/10 text-[#6B9A95] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Belum Ada Catatan Jurnal Mengajar
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {scopedJournals.length === 0
                ? 'Klik tombol "Isi Jurnal" pada jadwal tersinkron di atas atau klik "Tambah Jurnal" untuk mencatat materi pembelajaran.'
                : 'Tidak ada jurnal yang sesuai dengan kriteria filter atau pencarian Anda.'}
            </p>
          </div>
          <div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6B9A95] hover:bg-[#5A8782] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jurnal Sekarang</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 w-44">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Guru</th>
                  <th className="py-3.5 px-4">Kelas & Ruang</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Materi Pembelajaran</th>
                  <th className="py-3.5 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJournals.map((j) => {
                  const parts = (j.date || '').split('-');
                  let journalWeekLabel = '';
                  let journalWeekType: ScheduleWeekType = 'ALL';
                  if (parts.length === 3) {
                    const dObj = new Date(
                      parseInt(parts[0], 10),
                      parseInt(parts[1], 10) - 1,
                      parseInt(parts[2], 10)
                    );
                    journalWeekType = resolveWeekRotationForDate(dObj, monthlyWeekSchedules);
                    journalWeekLabel = getWeekTypeShortLabel(journalWeekType);
                  }

                  return (
                    <tr
                      key={j.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Tanggal & Jam */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{j.date}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-[#4E7D78] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            Jam ke-{j.startPeriod} s/d {j.endPeriod}
                          </span>
                        </div>
                        {j.timeRange && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {j.timeRange}
                          </div>
                        )}
                        {journalWeekLabel && (
                          <span
                            className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getWeekBadgeClasses(
                              journalWeekType
                            )}`}
                          >
                            {journalWeekLabel}
                          </span>
                        )}
                      </td>

                      {/* Guru */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900">
                          {j.teacherName}
                        </div>
                        {j.teacherCode && (
                          <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            {j.teacherCode}
                          </span>
                        )}
                      </td>

                      {/* Kelas & Ruang */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>{j.className}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {j.roomName}
                          </span>
                        </div>
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-800">
                          {j.subjectName}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                          Kode: {j.subjectCode}
                        </div>
                      </td>

                      {/* Materi */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="p-2.5 bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                          {j.topic}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(j)}
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                            title="Edit Jurnal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget(j)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Jurnal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Jurnal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Hapus Jurnal Mengajar?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Jurnal <strong>{deleteConfirmTarget.subjectName}</strong> ({deleteConfirmTarget.className}) tanggal{' '}
                <strong>{deleteConfirmTarget.date}</strong> akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs"
              >
                Ya, Hapus Jurnal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Jurnal */}
      <TambahJurnalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingJournal(null);
        }}
        journalToEdit={editingJournal}
        initialWeekMode={modalInitialWeekMode}
      />
    </div>
  );
};
