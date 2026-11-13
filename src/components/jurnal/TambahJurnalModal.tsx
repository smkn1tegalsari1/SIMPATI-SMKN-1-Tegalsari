import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  CalendarDays,
  Sparkles,
  BookOpen,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleWeekType, TeachingJournal } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';
import {
  getWeekRotationFromDate,
  getWeekTypeLabel,
  getWeekTypeShortLabel,
} from '../../data/scheduleWeeks';

export type JournalWeekFilterMode = 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL';

interface TambahJurnalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalToEdit?: TeachingJournal | null;
  initialWeekMode?: JournalWeekFilterMode;
}

interface ScheduledSession {
  key: string;
  className: string;
  classId?: string;
  roomName: string;
  roomId?: string;
  subjectCode: string;
  subjectName: string;
  subjectId?: string;
  weekType: ScheduleWeekType;
  startPeriod: number;
  endPeriod: number;
  totalPeriods: number;
  label: string;
}

export const TambahJurnalModal: React.FC<TambahJurnalModalProps> = ({
  isOpen,
  onClose,
  journalToEdit,
  initialWeekMode = 'AUTO',
}) => {
  const {
    teachers,
    classes,
    rooms,
    subjects,
    schedules,
    currentUser,
    activeWeekFilter,
    effectiveWeekType,
    addJournal,
    updateJournal,
  } = useApp();

  // Helper tanggal ISO YYYY-MM-DD
  const getTodayISO = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Helper hari & tanggal Date dari tanggal ISO
  const getDayInfo = (dateStr: string) => {
    if (!dateStr) return { dayOfWeek: 1, dayName: 'Senin', dateObj: new Date() };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { dayOfWeek: 1, dayName: 'Senin', dateObj: new Date() };
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    const day = dateObj.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
    const dayOfWeek = day === 0 ? 7 : day;
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return {
      dayOfWeek,
      dayName: dayNames[day] || 'Senin',
      dateObj,
    };
  };

  // State form
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [date, setDate] = useState<string>(() => getTodayISO());
  const [weekMode, setWeekMode] = useState<JournalWeekFilterMode>(initialWeekMode);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [endPeriod, setEndPeriod] = useState<number>(8);
  const [topic, setTopic] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('');
  const [draftApplied, setDraftApplied] = useState<boolean>(false);

  // 1. Tentukan guru yang aktif (Otomatis akun login jika peran guru)
  useEffect(() => {
    if (!isOpen) return;

    if (currentUser.role === 'guru') {
      const myTeacher = teachers.find(
        (t) =>
          t.id === currentUser.teacherId ||
          (currentUser.teacherCode && t.code.toLowerCase() === currentUser.teacherCode.toLowerCase()) ||
          t.name.toLowerCase() === currentUser.name.toLowerCase()
      );
      if (myTeacher) {
        setSelectedTeacherId(myTeacher.id);
      } else if (currentUser.teacherId) {
        setSelectedTeacherId(currentUser.teacherId);
      } else if (teachers[0]) {
        setSelectedTeacherId(teachers[0].id);
      }
    } else if (journalToEdit?.teacherId) {
      setSelectedTeacherId(journalToEdit.teacherId);
    } else if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [isOpen, currentUser, teachers, selectedTeacherId, journalToEdit]);

  // Objek guru yang sedang dipilih
  const currentSelectedTeacher = useMemo(() => {
    return (
      teachers.find((t) => t.id === selectedTeacherId) ||
      (currentUser.role === 'guru'
        ? teachers.find(
            (t) =>
              (currentUser.teacherCode && t.code.toLowerCase() === currentUser.teacherCode.toLowerCase()) ||
              t.name.toLowerCase() === currentUser.name.toLowerCase()
          )
        : undefined)
    );
  }, [teachers, selectedTeacherId, currentUser]);

  // Info hari dari tanggal yang dipilih saat ini
  const currentDayInfo = useMemo(() => {
    return getDayInfo(date);
  }, [date]);

  // Resolusi pekan mingguan aktif untuk tanggal / pilihan user
  const resolvedWeekType: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL' = useMemo(() => {
    if (weekMode !== 'AUTO') return weekMode;
    const todayIso = getTodayISO();
    if (date === todayIso && activeWeekFilter !== 'AUTO') {
      return effectiveWeekType;
    }
    return getWeekRotationFromDate(currentDayInfo.dateObj);
  }, [weekMode, date, getTodayISO, activeWeekFilter, effectiveWeekType, currentDayInfo]);

  // 2. Ambil jadwal mengajar guru pada tanggal/hari & pekan mingguan yang dipilih
  const scheduledSessionsOnDate: ScheduledSession[] = useMemo(() => {
    if (!currentDayInfo) return [];

    const teacherName = (currentSelectedTeacher?.name || (currentUser.role === 'guru' ? currentUser.name : '')).toLowerCase();
    const teacherCode = (currentSelectedTeacher?.code || (currentUser.role === 'guru' ? currentUser.teacherCode || currentUser.username || '' : '')).toLowerCase();
    const effectiveTeacherId = currentSelectedTeacher?.id || selectedTeacherId;

    if (!effectiveTeacherId && !teacherName && !teacherCode) return [];

    // Filter jadwal yang cocok dengan guru, hari pada tanggal tersebut, dan pilihan pekan mingguan
    const matchingSchedules = schedules.filter((s) => {
      const matchTeacher =
        (effectiveTeacherId && s.teacherId === effectiveTeacherId) ||
        (teacherName && s.teacherName && s.teacherName.toLowerCase() === teacherName) ||
        (teacherCode && s.teacherCode && s.teacherCode.toLowerCase() === teacherCode);
      if (!matchTeacher) return false;

      let schedDay = s.dayOfWeek;
      if (!schedDay && s.dayName) {
        const m: Record<string, number> = {
          senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 7,
        };
        schedDay = m[s.dayName.toLowerCase()] || 0;
      }
      if (schedDay !== currentDayInfo.dayOfWeek) return false;

      // Filter pekan mingguan
      if (resolvedWeekType !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        if (itemWeek !== 'ALL' && itemWeek !== resolvedWeekType) {
          return false;
        }
      }

      return true;
    });

    if (matchingSchedules.length === 0) return [];

    const sorted = [...matchingSchedules].sort((a, b) => {
      const pa = typeof a.periodIndex === 'number' ? a.periodIndex : parseInt(String(a.periodIndex), 10) || 1;
      const pb = typeof b.periodIndex === 'number' ? b.periodIndex : parseInt(String(b.periodIndex), 10) || 1;
      return pa - pb;
    });

    // Kelompokkan blok jam berurutan berdasarkan kelas + mapel + ruang + pekan
    const sessionBlocks: Array<{
      key: string;
      classId?: string;
      className: string;
      roomName: string;
      subjectCode: string;
      subjectName: string;
      weekType: ScheduleWeekType;
      periods: number[];
    }> = [];

    sorted.forEach((s) => {
      const pNum = typeof s.periodIndex === 'number'
        ? s.periodIndex
        : parseInt(String(s.periodIndex), 10) || 1;
      const itemWeek: ScheduleWeekType = s.weekType || 'ALL';

      const lastBlock = sessionBlocks[sessionBlocks.length - 1];
      const isSameAsLast =
        lastBlock &&
        lastBlock.className === s.className &&
        lastBlock.subjectName === s.subjectName &&
        lastBlock.roomName === s.roomName &&
        lastBlock.weekType === itemWeek &&
        pNum <= lastBlock.periods[lastBlock.periods.length - 1] + 1;

      if (isSameAsLast) {
        if (!lastBlock.periods.includes(pNum)) {
          lastBlock.periods.push(pNum);
        }
      } else {
        sessionBlocks.push({
          key: `${s.className}___${s.subjectName}___${s.roomName}___${itemWeek}___${pNum}`,
          classId: s.classId,
          className: s.className,
          roomName: s.roomName,
          subjectCode: s.subjectCode || '',
          subjectName: s.subjectName,
          weekType: itemWeek,
          periods: [pNum],
        });
      }
    });

    return sessionBlocks.map((g) => {
      const startP = g.periods[0] || 1;
      const endP = g.periods[g.periods.length - 1] || startP;
      return {
        key: g.key,
        classId: g.classId,
        className: g.className,
        roomName: g.roomName,
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        weekType: g.weekType,
        startPeriod: startP,
        endPeriod: endP,
        totalPeriods: g.periods.length,
        label: `${g.className} · ${g.subjectName} (${g.roomName}) · Jam ke-${startP}${endP !== startP ? ` s/d ${endP}` : ''}`,
      };
    });
  }, [selectedTeacherId, currentSelectedTeacher, currentUser, currentDayInfo, schedules, resolvedWeekType]);

  // Fungsi sinkronisasi otomatis satu sesi jadwal ke form
  const applyScheduledSession = useCallback((session: ScheduledSession) => {
    setSelectedSessionKey(session.key);

    // 1. Sinkron Kelas
    const matchedClass = classes.find(
      (c) =>
        (session.classId && c.id === session.classId) ||
        c.name.toLowerCase() === session.className.toLowerCase() ||
        c.code.toLowerCase() === session.className.toLowerCase()
    );
    if (matchedClass) {
      setSelectedClassId(matchedClass.id);
    } else if (classes[0]) {
      setSelectedClassId(classes[0].id);
    }

    // 2. Sinkron Ruang Kelas
    const matchedRoom = rooms.find(
      (r) =>
        r.name.toLowerCase() === session.roomName.toLowerCase() ||
        r.code.toLowerCase() === session.roomName.toLowerCase()
    );
    if (matchedRoom) {
      setSelectedRoomId(matchedRoom.id);
    } else if (rooms[0]) {
      setSelectedRoomId(rooms[0].id);
    }

    // 3. Sinkron Mata Pelajaran & Kode Mapel
    const matchedSubj = subjects.find(
      (s) =>
        (session.subjectCode && s.code.toLowerCase() === session.subjectCode.toLowerCase()) ||
        s.name.toLowerCase() === session.subjectName.toLowerCase()
    );
    if (matchedSubj) {
      setSelectedSubjectId(matchedSubj.id);
      setSubjectCode(matchedSubj.code);
    } else {
      if (subjects[0]) setSelectedSubjectId(subjects[0].id);
      setSubjectCode(session.subjectCode || '');
    }

    // 4. Sinkron Jam Pelajaran (Mulai & Selesai)
    setStartPeriod(session.startPeriod);
    setEndPeriod(session.endPeriod);
  }, [classes, rooms, subjects]);

  // Efek Inisialisasi Modal
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setSuccessToast('');
      setSelectedSessionKey('');
      setDraftApplied(false);
      return;
    }

    setWeekMode(initialWeekMode);

    // Jika mode edit jurnal yang sudah tersimpan
    if (journalToEdit && journalToEdit.id) {
      setSelectedTeacherId(journalToEdit.teacherId);
      setDate(journalToEdit.date);
      setSelectedClassId(journalToEdit.classId || '');
      setSelectedRoomId(journalToEdit.roomId || '');
      const matchedSubj = subjects.find(
        (s) => s.code.toLowerCase() === journalToEdit.subjectCode.toLowerCase() || s.name === journalToEdit.subjectName
      );
      setSelectedSubjectId(matchedSubj ? matchedSubj.id : '');
      setSubjectCode(journalToEdit.subjectCode);
      setStartPeriod(journalToEdit.startPeriod);
      setEndPeriod(journalToEdit.endPeriod);
      setTopic(journalToEdit.topic);
      setDraftApplied(true);
    } else if (journalToEdit && !journalToEdit.id) {
      // Draft prefill dari tombol "Isi Jurnal Sesi Ini"
      setSelectedTeacherId(journalToEdit.teacherId);
      setDate(journalToEdit.date);

      const matchedClass = classes.find(
        (c) =>
          (journalToEdit.classId && c.id === journalToEdit.classId) ||
          c.name.toLowerCase() === journalToEdit.className.toLowerCase()
      );
      setSelectedClassId(matchedClass ? matchedClass.id : journalToEdit.classId || '');

      const matchedRoom = rooms.find(
        (r) =>
          (journalToEdit.roomId && r.id === journalToEdit.roomId) ||
          r.name.toLowerCase() === journalToEdit.roomName.toLowerCase()
      );
      setSelectedRoomId(matchedRoom ? matchedRoom.id : journalToEdit.roomId || '');

      const matchedSubj = subjects.find(
        (s) =>
          s.code.toLowerCase() === journalToEdit.subjectCode.toLowerCase() ||
          s.name.toLowerCase() === journalToEdit.subjectName.toLowerCase()
      );
      setSelectedSubjectId(matchedSubj ? matchedSubj.id : '');
      setSubjectCode(journalToEdit.subjectCode);
      setStartPeriod(journalToEdit.startPeriod);
      setEndPeriod(journalToEdit.endPeriod);
      setTopic('');
      setDraftApplied(false);
    } else {
      // Inisialisasi Baru: Tanggal hari ini
      setDate(getTodayISO());
      setTopic('');
      setDraftApplied(false);
    }
  }, [isOpen, journalToEdit, initialWeekMode, subjects, classes, rooms, getTodayISO]);

  // Efek Sinkronisasi Otomatis saat Tanggal, Guru, atau Pekan Mingguan Berubah
  useEffect(() => {
    if (journalToEdit && journalToEdit.id) return;
    if (!isOpen) return;

    if (journalToEdit && !journalToEdit.id && !draftApplied) {
      // Cocokkan highlight sesi jadwal sesuai draft yang diklik pengguna
      const matchedDraftSession = scheduledSessionsOnDate.find(
        (s) =>
          s.className.toLowerCase() === journalToEdit.className.toLowerCase() &&
          s.subjectName.toLowerCase() === journalToEdit.subjectName.toLowerCase() &&
          journalToEdit.startPeriod >= s.startPeriod &&
          journalToEdit.startPeriod <= s.endPeriod
      );
      if (matchedDraftSession) {
        setSelectedSessionKey(matchedDraftSession.key);
      }
      setDraftApplied(true);
      return;
    }

    if (scheduledSessionsOnDate.length > 0) {
      const targetSession =
        scheduledSessionsOnDate.find((s) => s.key === selectedSessionKey) ||
        scheduledSessionsOnDate[0];
      applyScheduledSession(targetSession);
    } else {
      setSelectedSessionKey('');
      if (!selectedClassId && classes[0]) setSelectedClassId(classes[0].id);
      if (!selectedRoomId && rooms[0]) setSelectedRoomId(rooms[0].id);
      if (!selectedSubjectId && subjects[0]) {
        setSelectedSubjectId(subjects[0].id);
        setSubjectCode(subjects[0].code);
      }
    }
  }, [
    date,
    selectedTeacherId,
    resolvedWeekType,
    scheduledSessionsOnDate,
    journalToEdit,
    draftApplied,
    isOpen,
    applyScheduledSession,
    classes,
    rooms,
    subjects,
    selectedClassId,
    selectedRoomId,
    selectedSubjectId,
    selectedSessionKey,
  ]);

  // Ketika mata pelajaran dipilih manual, otomatis update kode mapel
  const handleSubjectChange = (subjId: string) => {
    setSelectedSubjectId(subjId);
    const found = subjects.find((s) => s.id === subjId);
    if (found) {
      setSubjectCode(found.code);
    } else {
      setSubjectCode('');
    }
  };

  const handleStartPeriodChange = (val: number) => {
    setStartPeriod(val);
    if (endPeriod < val) {
      setEndPeriod(val);
    }
  };

  const handleEndPeriodChange = (val: number) => {
    if (val < startPeriod) {
      setStartPeriod(val);
    }
    setEndPeriod(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const resolvedTeacherId = selectedTeacherId || currentUser.teacherId || currentUser.id;
    if (!resolvedTeacherId) {
      setErrorMsg('Pilih guru terlebih dahulu dari data master!');
      return;
    }
    if (!date) {
      setErrorMsg('Tanggal wajib diisi!');
      return;
    }
    if (!selectedClassId && classes.length > 0) {
      setErrorMsg('Pilih kelas terlebih dahulu dari data master!');
      return;
    }
    if (!selectedRoomId && rooms.length > 0) {
      setErrorMsg('Pilih ruang kelas terlebih dahulu dari data master!');
      return;
    }
    if (!selectedSubjectId && subjects.length > 0) {
      setErrorMsg('Pilih mata pelajaran terlebih dahulu dari data master!');
      return;
    }
    if (!topic.trim()) {
      setErrorMsg('Materi pembelajaran wajib diisi!');
      return;
    }

    const teacher = teachers.find((t) => t.id === resolvedTeacherId) || currentSelectedTeacher;
    const cls = classes.find((c) => c.id === selectedClassId);
    const room = rooms.find((r) => r.id === selectedRoomId);
    const subj = subjects.find((s) => s.id === selectedSubjectId);

    const teacherName = teacher ? teacher.name : currentUser.name || 'Guru';
    const teacherCode = teacher ? teacher.code : currentUser.teacherCode || '';
    const className = cls ? cls.name : journalToEdit?.className || 'Kelas';
    const roomName = room ? room.name : journalToEdit?.roomName || 'Ruang';
    const subjectName = subj ? subj.name : journalToEdit?.subjectName || 'Mapel';
    const resolvedSubjectCode = subjectCode || (subj ? subj.code : 'MAPEL');

    // Waktu rentang jam
    const startTimeStr = PERIOD_TIMES.find((p) => p.period === startPeriod)?.start || '06:45';
    const endTimeStr = PERIOD_TIMES.find((p) => p.period === endPeriod)?.end || '13:00';
    const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

    if (journalToEdit && journalToEdit.id) {
      const updatedItem: TeachingJournal = {
        ...journalToEdit,
        date,
        teacherId: resolvedTeacherId,
        teacherName,
        ...(teacherCode ? { teacherCode } : {}),
        ...(selectedClassId ? { classId: selectedClassId } : {}),
        className,
        ...(selectedRoomId ? { roomId: selectedRoomId } : {}),
        roomName,
        subjectCode: resolvedSubjectCode,
        subjectName,
        startPeriod,
        endPeriod,
        timeRange,
        topic: topic.trim(),
        updatedAt: Date.now(),
      };
      updateJournal(updatedItem);
    } else {
      const newJournal: TeachingJournal = {
        id: `jrn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date,
        teacherId: resolvedTeacherId,
        teacherName,
        ...(teacherCode ? { teacherCode } : {}),
        ...(selectedClassId ? { classId: selectedClassId } : {}),
        className,
        ...(selectedRoomId ? { roomId: selectedRoomId } : {}),
        roomName,
        subjectCode: resolvedSubjectCode,
        subjectName,
        startPeriod,
        endPeriod,
        timeRange,
        topic: topic.trim(),
        createdAt: Date.now(),
      };
      addJournal(newJournal);
    }

    setSuccessToast('Jurnal mengajar berhasil disimpan ke database!');
    setTimeout(() => {
      onClose();
    }, 350);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#FCFAF6] rounded-3xl shadow-2xl border border-[#E9E4DC] overflow-hidden text-slate-800 max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#EFECE6]/80 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              {journalToEdit && journalToEdit.id ? 'Edit Jurnal Mengajar' : 'Tambah Jurnal Mengajar'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Tersinkron otomatis dengan jadwal guru sesuai hari dan rotasi pekan mingguan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs md:text-sm overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Pilihan Pekan Mingguan */}
          <div className="bg-white/90 border border-[#E5DFD5] rounded-2xl p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <CalendarDays className="w-4 h-4 text-[#4E7D78]" />
                <span>Pilihan Pekan Mingguan:</span>
              </span>
              <span className="text-[11px] font-semibold text-[#4E7D78] bg-[#6B9A95]/10 px-2.5 py-0.5 rounded-full">
                {getWeekTypeLabel(resolvedWeekType)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDraftApplied(true);
                  setWeekMode('AUTO');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  weekMode === 'AUTO'
                    ? 'bg-[#0B1E2E] text-white border-[#0B1E2E]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Otomatis (Tanggal)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftApplied(true);
                  setWeekMode('P10_PROD_P11_NORM');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  weekMode === 'P10_PROD_P11_NORM'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                10 Prod · 11 Normada
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftApplied(true);
                  setWeekMode('P10_NORM_P11_PROD');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  weekMode === 'P10_NORM_P11_PROD'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-indigo-50/70 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                10 Normada · 11 Prod
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftApplied(true);
                  setWeekMode('ALL');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  weekMode === 'ALL'
                    ? 'bg-slate-700 text-white border-slate-800'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua Pekan
              </button>
            </div>
          </div>

          {/* Banner Sinkronisasi Jadwal Mengajar */}
          {scheduledSessionsOnDate.length > 0 ? (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Jadwal Mengajar Terdeteksi (Hari {currentDayInfo.dayName}):
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  {scheduledSessionsOnDate.length} Sesi Terjadwal
                </span>
              </div>

              {/* Pilihan Sesi Jadwal yang Ditemukan di Hari & Pekan Tersebut */}
              <div className="flex flex-wrap gap-1.5">
                {scheduledSessionsOnDate.map((session) => {
                  const isSelected = selectedSessionKey === session.key;
                  return (
                    <button
                      key={session.key}
                      type="button"
                      onClick={() => {
                        setDraftApplied(true);
                        applyScheduledSession(session);
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white hover:bg-emerald-50/80 text-emerald-950 border-emerald-200'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{session.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {getWeekTypeShortLabel(session.weekType)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-emerald-700">
                ✓ Kelas, Ruang, Mapel, Kode Mapel, dan Jam pelajaran otomatis tersinkron dari jadwal guru sesuai hari dan pekan mingguan.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Tidak ada jadwal mengajar rutin di hari <strong>{currentDayInfo.dayName}</strong> ({date}) pada{' '}
                <strong>{getWeekTypeShortLabel(resolvedWeekType)}</strong>. Anda dapat mengganti pekan mingguan atau memilih data secara manual di bawah.
              </span>
            </div>
          )}

          {/* Baris 1: Guru | Tanggal | Kelas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Guru */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Guru
              </label>
              <div className="relative">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setDraftApplied(true);
                    setSelectedTeacherId(e.target.value);
                  }}
                  disabled={currentUser.role === 'guru'}
                  className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer disabled:opacity-90 disabled:cursor-not-allowed truncate"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} {t.name}
                    </option>
                  ))}
                  {teachers.length === 0 && (
                    <option value={currentUser.teacherId || currentUser.id || ''}>
                      {currentUser.name || 'Belum ada data guru'}
                    </option>
                  )}
                </select>
              </div>
              {currentUser.role === 'guru' && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Terkunci otomatis sesuai akun login Anda
                </span>
              )}
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDraftApplied(true);
                  setDate(e.target.value);
                }}
                className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Hari {currentDayInfo.dayName}
              </span>
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Kelas
              </label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer truncate"
                  required={classes.length > 0}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {classes.length === 0 && (
                    <option value="">Belum ada data kelas</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Baris 2: Ruang kelas | Kode mapel | Mata pelajaran */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Ruang kelas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Ruang kelas
              </label>
              <div className="relative">
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer truncate"
                  required={rooms.length > 0}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {rooms.length === 0 && (
                    <option value="">Belum ada data ruang</option>
                  )}
                </select>
              </div>
            </div>

            {/* Kode mapel */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Kode mapel
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="MKK / DPK"
                className="w-full bg-[#EBE7E1] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition"
              />
            </div>

            {/* Mata pelajaran */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Mata pelajaran
              </label>
              <div className="relative">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer truncate"
                  required={subjects.length > 0}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                  {subjects.length === 0 && (
                    <option value="">Belum ada data mapel</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Baris 3: Jam mulai | Jam selesai | Materi * */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Jam mulai
              </label>
              <select
                value={startPeriod}
                onChange={(e) => handleStartPeriodChange(Number(e.target.value))}
                className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer"
              >
                {PERIOD_TIMES.map((p) => (
                  <option key={`start-${p.period}`} value={p.period}>
                    Jam ke-{p.period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Jam selesai
              </label>
              <select
                value={endPeriod}
                onChange={(e) => handleEndPeriodChange(Number(e.target.value))}
                className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer"
              >
                {PERIOD_TIMES.map((p) => (
                  <option key={`end-${p.period}`} value={p.period}>
                    Jam ke-{p.period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Materi <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Tuliskan materi atau ringkasan capaian pembelajaran..."
                rows={3}
                required
                className="w-full bg-[#FCFAF7] border-2 border-[#6B9A95]/60 hover:border-[#6B9A95] rounded-xl p-2.5 text-xs md:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] focus:border-[#6B9A95] transition resize-none"
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#6B9A95] hover:bg-[#5E8E89] active:bg-[#537D78] shadow-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
