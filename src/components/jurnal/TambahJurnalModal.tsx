import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Calendar, Sparkles, BookOpen, Clock, MapPin, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';

interface TambahJurnalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalToEdit?: TeachingJournal | null;
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
  startPeriod: number;
  endPeriod: number;
  totalPeriods: number;
  label: string;
}

export const TambahJurnalModal: React.FC<TambahJurnalModalProps> = ({
  isOpen,
  onClose,
  journalToEdit,
}) => {
  const {
    teachers,
    classes,
    rooms,
    subjects,
    schedules,
    currentUser,
    addJournal,
    updateJournal,
  } = useApp();

  // Helper tanggal ISO YYYY-MM-DD
  const getTodayISO = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper hari dari tanggal ISO
  const getDayInfo = (dateStr: string) => {
    if (!dateStr) return { dayOfWeek: 1, dayName: 'Senin' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { dayOfWeek: 1, dayName: 'Senin' };
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
    };
  };

  // State form
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
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
    } else if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [isOpen, currentUser, teachers, selectedTeacherId]);

  // Objek guru yang sedang dipilih
  const currentSelectedTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  // Info hari dari tanggal yang dipilih saat ini
  const currentDayInfo = useMemo(() => {
    return getDayInfo(date);
  }, [date]);

  // 2. Ambil jadwal mengajar guru pada tanggal/hari yang dipilih
  const scheduledSessionsOnDate: ScheduledSession[] = useMemo(() => {
    if (!selectedTeacherId || !currentDayInfo) return [];

    const teacherName = currentSelectedTeacher?.name.toLowerCase() || '';
    const teacherCode = currentSelectedTeacher?.code.toLowerCase() || '';

    // Filter jadwal yang cocok dengan guru dan hari pada tanggal tersebut
    const matchingSchedules = schedules.filter((s) => {
      const matchTeacher =
        s.teacherId === selectedTeacherId ||
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
      return schedDay === currentDayInfo.dayOfWeek;
    });

    if (matchingSchedules.length === 0) return [];

    // Kelompokkan jadwal berdasarkan kelas + mata pelajaran + ruang kelas
    const groups: Record<string, {
      key: string;
      classId?: string;
      className: string;
      roomName: string;
      subjectCode: string;
      subjectName: string;
      periods: number[];
    }> = {};

    matchingSchedules.forEach((s) => {
      const pNum = typeof s.periodIndex === 'number'
        ? s.periodIndex
        : parseInt(String(s.periodIndex), 10) || 1;

      const groupKey = `${s.className}___${s.subjectName}___${s.roomName}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          classId: s.classId,
          className: s.className,
          roomName: s.roomName,
          subjectCode: s.subjectCode || '',
          subjectName: s.subjectName,
          periods: [],
        };
      }
      groups[groupKey].periods.push(pNum);
    });

    return Object.values(groups).map((g) => {
      g.periods.sort((a, b) => a - b);
      const startP = g.periods[0] || 1;
      const endP = g.periods[g.periods.length - 1] || startP;
      return {
        key: g.key,
        classId: g.classId,
        className: g.className,
        roomName: g.roomName,
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        startPeriod: startP,
        endPeriod: endP,
        totalPeriods: g.periods.length,
        label: `${g.className} · ${g.subjectName} (${g.roomName}) · Jam ke-${startP} s/d ${endP}`,
      };
    });
  }, [selectedTeacherId, currentSelectedTeacher, currentDayInfo, schedules]);

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
      return;
    }

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
    } else if (journalToEdit && !journalToEdit.id) {
      // Draft prefill dari tombol "Isi Jurnal" di kartu jadwal
      setSelectedTeacherId(journalToEdit.teacherId);
      setDate(journalToEdit.date);
      if (journalToEdit.classId) setSelectedClassId(journalToEdit.classId);
      if (journalToEdit.roomId) setSelectedRoomId(journalToEdit.roomId);
      const matchedSubj = subjects.find(
        (s) => s.code.toLowerCase() === journalToEdit.subjectCode.toLowerCase() || s.name === journalToEdit.subjectName
      );
      if (matchedSubj) {
        setSelectedSubjectId(matchedSubj.id);
      }
      setSubjectCode(journalToEdit.subjectCode);
      setStartPeriod(journalToEdit.startPeriod);
      setEndPeriod(journalToEdit.endPeriod);
      setTopic('');
    } else {
      // Inisialisasi Baru: Tanggal hari ini
      setDate(getTodayISO());
      setTopic('');
    }
  }, [isOpen, journalToEdit, subjects]);

  // Efek Sinkronisasi Otomatis saat Tanggal atau Guru Berubah
  useEffect(() => {
    // Hanya auto-sinkron jika bukan sedang mengedit jurnal yang sudah tersimpan
    if (journalToEdit && journalToEdit.id) return;
    if (!isOpen) return;

    if (scheduledSessionsOnDate.length > 0) {
      // Jika ada jadwal terdaftar di hari tersebut, otomatis sinkronkan sesi pertama
      const targetSession =
        scheduledSessionsOnDate.find((s) => s.key === selectedSessionKey) ||
        scheduledSessionsOnDate[0];
      applyScheduledSession(targetSession);
    } else {
      setSelectedSessionKey('');
      // Fallback data master jika tidak ada jadwal di hari tersebut
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
    scheduledSessionsOnDate,
    journalToEdit,
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

    if (!selectedTeacherId) {
      setErrorMsg('Pilih guru terlebih dahulu dari data master!');
      return;
    }
    if (!date) {
      setErrorMsg('Tanggal wajib diisi!');
      return;
    }
    if (!selectedClassId) {
      setErrorMsg('Pilih kelas terlebih dahulu dari data master!');
      return;
    }
    if (!selectedRoomId) {
      setErrorMsg('Pilih ruang kelas terlebih dahulu dari data master!');
      return;
    }
    if (!selectedSubjectId) {
      setErrorMsg('Pilih mata pelajaran terlebih dahulu dari data master!');
      return;
    }
    if (!topic.trim()) {
      setErrorMsg('Materi pembelajaran wajib diisi!');
      return;
    }

    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    const cls = classes.find((c) => c.id === selectedClassId);
    const room = rooms.find((r) => r.id === selectedRoomId);
    const subj = subjects.find((s) => s.id === selectedSubjectId);

    const teacherName = teacher ? teacher.name : 'Guru';
    const teacherCode = teacher ? teacher.code : '';
    const className = cls ? cls.name : 'Kelas';
    const roomName = room ? room.name : 'Ruang';
    const subjectName = subj ? subj.name : 'Mapel';
    const resolvedSubjectCode = subjectCode || (subj ? subj.code : 'MAPEL');

    // Waktu rentang jam
    const startTimeStr = PERIOD_TIMES.find((p) => p.period === startPeriod)?.start || '06:45';
    const endTimeStr = PERIOD_TIMES.find((p) => p.period === endPeriod)?.end || '13:00';
    const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

    if (journalToEdit && journalToEdit.id) {
      const updatedItem: TeachingJournal = {
        ...journalToEdit,
        date,
        teacherId: selectedTeacherId,
        teacherName,
        teacherCode,
        classId: selectedClassId,
        className,
        roomId: selectedRoomId,
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
        teacherId: selectedTeacherId,
        teacherName,
        teacherCode,
        classId: selectedClassId,
        className,
        roomId: selectedRoomId,
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
    }, 400);
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
              {journalToEdit && journalToEdit.id ? 'Edit jurnal' : 'Tambah jurnal'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Tersinkron otomatis dengan jadwal mengajar & database master
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable if needed on mobile) */}
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

          {/* Banner Sinkronisasi Jadwal Mengajar */}
          {scheduledSessionsOnDate.length > 0 ? (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Jadwal Mengajar Terdeteksi (Hari {currentDayInfo.dayName}):
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  {scheduledSessionsOnDate.length} Sesi Terjadwal
                </span>
              </div>

              {/* Pilihan Sesi Jadwal yang Ditemukan di Hari Tersebut */}
              <div className="flex flex-wrap gap-1.5">
                {scheduledSessionsOnDate.map((session) => {
                  const isSelected = selectedSessionKey === session.key;
                  return (
                    <button
                      key={session.key}
                      type="button"
                      onClick={() => applyScheduledSession(session)}
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
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-emerald-700">
                ✓ Kelas, Ruang, Mapel, Kode Mapel, dan Jam pelajaran telah otomatis tersinkron dari jadwal guru.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Tidak ada jadwal mengajar rutin di hari <strong>{currentDayInfo.dayName}</strong> ({date}). Anda dapat memilih kelas, ruang, dan mapel secara bebas dari Data Master di bawah.
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
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  disabled={currentUser.role === 'guru'}
                  className="w-full bg-[#F3EFEA] hover:bg-[#EFE9E2] border border-[#DDD6CC] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] transition cursor-pointer disabled:opacity-90 disabled:cursor-not-allowed truncate"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} {t.name}
                    </option>
                  ))}
                  {teachers.length === 0 && (
                    <option value="">Belum ada data guru</option>
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
                onChange={(e) => setDate(e.target.value)}
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
                  required
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
                  required
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

            {/* Kode mapel (Otomatis terisi dari mata pelajaran yang dipilih) */}
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
                  required
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
            {/* Jam mulai */}
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

            {/* Jam selesai */}
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

            {/* Materi * */}
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
