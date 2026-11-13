import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  AlertTriangle,
  Clock,
  School,
  Building2,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Teacher, Subject, SchoolClass, Room, ScheduleItem, ScheduleWeekType } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';
import { resolveDepartmentCode } from '../../data/departmentUtils';

interface GuruScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  allSchedules: ScheduleItem[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  editingSchedule?: ScheduleItem | null;
  onSaveBatch: (schedules: ScheduleItem[]) => void;
}

export const GuruScheduleModal: React.FC<GuruScheduleModalProps> = ({
  isOpen,
  onClose,
  teacher,
  allSchedules,
  classes,
  subjects,
  rooms,
  editingSchedule,
  onSaveBatch,
}) => {
  const [dayName, setDayName] = useState<string>('SENIN');
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [endPeriod, setEndPeriod] = useState<number>(1);
  const [weekType, setWeekType] = useState<ScheduleWeekType>('P10_PROD_P11_NORM');
  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [customRoomName, setCustomRoomName] = useState<string>('');

  // Sinkronkan state saat modal dibuka atau saat data master / editingSchedule diperbarui
  useEffect(() => {
    if (editingSchedule) {
      setDayName(editingSchedule.dayName || 'SENIN');
      const pNum = typeof editingSchedule.periodIndex === 'number'
        ? editingSchedule.periodIndex
        : parseInt(String(editingSchedule.periodIndex), 10) || 1;
      setStartPeriod(pNum);
      setEndPeriod(pNum);
      // Jika jadwal lama bernilai ALL, alihkan ke P10_PROD_P11_NORM
      setWeekType(
        editingSchedule.weekType && editingSchedule.weekType !== 'ALL'
          ? editingSchedule.weekType
          : 'P10_PROD_P11_NORM'
      );

      // 1. Sinkron Kelas
      const matchClass = classes.find(
        (c) => c.id === editingSchedule.classId || c.name === editingSchedule.className
      );
      setClassId(matchClass ? matchClass.id : editingSchedule.classId || (classes[0]?.id || ''));

      // 2. Sinkron Mata Pelajaran dari Data Master Real-Time
      const matchSubject = subjects.find(
        (s) =>
          s.id === editingSchedule.subjectCode ||
          s.code === editingSchedule.subjectCode ||
          s.name.toLowerCase() === (editingSchedule.subjectName || '').toLowerCase()
      );
      if (matchSubject) {
        setSubjectId(matchSubject.id);
        setCustomSubjectName('');
      } else {
        setSubjectId(subjects[0]?.id || '');
        setCustomSubjectName(editingSchedule.subjectName || '');
      }

      // 3. Sinkron Ruangan dari Data Master Real-Time
      const matchRoom = rooms.find(
        (r) =>
          r.name.toLowerCase() === (editingSchedule.roomName || '').toLowerCase() ||
          r.code.toLowerCase() === (editingSchedule.roomName || '').toLowerCase()
      );
      if (matchRoom) {
        setRoomId(matchRoom.id);
        setCustomRoomName('');
      } else {
        setRoomId(rooms[0]?.id || '');
        setCustomRoomName(editingSchedule.roomName || '');
      }
    } else {
      setDayName('SENIN');
      setStartPeriod(1);
      setEndPeriod(1);
      setWeekType('P10_PROD_P11_NORM');

      // Set default sesuai data master terbaru jika ada
      setClassId((prev) => (classes.some((c) => c.id === prev) ? prev : classes[0]?.id || ''));
      setSubjectId((prev) => (subjects.some((s) => s.id === prev) ? prev : subjects[0]?.id || ''));
      setRoomId((prev) => (rooms.some((r) => r.id === prev) ? prev : rooms[0]?.id || ''));
      setCustomSubjectName('');
      setCustomRoomName('');
    }
  }, [editingSchedule, isOpen, classes, subjects, rooms]);

  // Pastikan endPeriod selalu >= startPeriod
  const handleStartPeriodChange = (val: number) => {
    setStartPeriod(val);
    if (val > endPeriod) {
      setEndPeriod(val);
    }
  };

  const handleEndPeriodChange = (val: number) => {
    if (val < startPeriod) {
      setStartPeriod(val);
    }
    setEndPeriod(val);
  };

  // Hitung durasi jam pelajaran (JP)
  const totalJP = Math.max(1, endPeriod - startPeriod + 1);

  // Daftar jam pelajaran yang akan diisi
  const targetPeriods = useMemo(() => {
    const list: number[] = [];
    for (let p = startPeriod; p <= endPeriod; p++) {
      list.push(p);
    }
    return list;
  }, [startPeriod, endPeriod]);

  // Rentang jam detail (contoh: 06:45 s/d 09:20)
  const timeRangeSummary = useMemo(() => {
    const startObj = PERIOD_TIMES.find((p) => p.period === startPeriod);
    const endObj = PERIOD_TIMES.find((p) => p.period === endPeriod);
    if (!startObj || !endObj) return '';
    return `${startObj.start} – ${endObj.end}`;
  }, [startPeriod, endPeriod]);

  // Lookup objek terpilih dari Data Master secara real-time
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c.id === classId) || null;
  }, [classes, classId]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => s.id === subjectId) || null;
  }, [subjects, subjectId]);

  const selectedRoomObj = useMemo(() => {
    return rooms.find((r) => r.id === roomId) || null;
  }, [rooms, roomId]);

  // Cek Bentrok (Conflict Detection) untuk SEMUA jam di rentang terpilih
  const conflicts = useMemo(() => {
    const list: {
      period: number;
      type: 'class_conflict' | 'room_conflict' | 'teacher_conflict';
      title: string;
      message: string;
      conflictingItem: ScheduleItem;
    }[] = [];

    const dayUpper = dayName.toUpperCase();

    targetPeriods.forEach((periodNum) => {
      allSchedules.forEach((s) => {
        // Abaikan jika sedang mengedit jadwal ini sendiri
        if (editingSchedule && s.id === editingSchedule.id) return;

        const sDay = (s.dayName || '').toUpperCase();
        if (sDay !== dayUpper) return;

        // Cek apakah jam pelajaran sama
        const sPeriod = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
        if (sPeriod !== periodNum) return;

        // Cek kesesuaian rotasi pekan (jika salah satu ALL atau keduanya sama)
        const sWeek = s.weekType || 'ALL';
        const weekOverlap = weekType === 'ALL' || sWeek === 'ALL' || weekType === sWeek;
        if (!weekOverlap) return;

        // 1. Bentrok Kelas (Kondisi Utama: Tidak boleh ada 2 guru mengajar kelas yang sama di jam yang sama)
        if (classId && (s.classId === classId || (classes.find((c) => c.id === classId)?.name === s.className))) {
          list.push({
            period: periodNum,
            type: 'class_conflict',
            title: `Bentrok di Jam Ke-${periodNum} (Kelas ${s.className})`,
            message: `Kelas ini sudah terjadwal pelajaran "${s.subjectName}" bersama ${s.teacherName}.`,
            conflictingItem: s,
          });
        }

        // 2. Bentrok Ruangan
        const targetRoomName = selectedRoomObj ? selectedRoomObj.name : customRoomName.trim();
        if (targetRoomName && s.roomName && targetRoomName.toLowerCase() === s.roomName.toLowerCase()) {
          list.push({
            period: periodNum,
            type: 'room_conflict',
            title: `Bentrok di Jam Ke-${periodNum} (Ruang ${s.roomName})`,
            message: `Ruangan ini sedang digunakan oleh kelas ${s.className} (${s.subjectName} - ${s.teacherName}).`,
            conflictingItem: s,
          });
        }

        // 3. Bentrok Guru Sendiri
        if (s.teacherId === teacher.id) {
          list.push({
            period: periodNum,
            type: 'teacher_conflict',
            title: `Bentrok di Jam Ke-${periodNum} (Jadwal Anda Sendiri)`,
            message: `Anda telah dijadwalkan mengajar di kelas ${s.className} (${s.subjectName}).`,
            conflictingItem: s,
          });
        }
      });
    });

    return list;
  }, [allSchedules, editingSchedule, dayName, targetPeriods, weekType, classId, selectedRoomObj, customRoomName, teacher.id, classes]);

  const hasClassConflict = conflicts.some((c) => c.type === 'class_conflict');
  const hasTeacherConflict = conflicts.some((c) => c.type === 'teacher_conflict');

  // Submit Handler: Menghasilkan array jadwal untuk startPeriod s/d endPeriod
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasClassConflict) {
      alert('Jadwal tidak dapat disimpan karena terdapat bentrok jam di kelas tersebut!');
      return;
    }

    const dayMap: Record<string, number> = {
      SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5,
    };

    const selClass = selectedClassObj;
    const selSubject = selectedSubjectObj;
    const selRoom = selectedRoomObj;

    const subjectNameResult = selSubject?.name || customSubjectName.trim() || 'Mata Pelajaran';
    const subjectCodeResult = selSubject?.code || 'MAPEL';
    const roomNameResult = selRoom?.name || customRoomName.trim() || 'Ruang Teori';
    const roomTypeResult = selRoom?.type || 'Teori';
    const classNameResult = selClass?.name || 'Kelas';
    const departmentResult = resolveDepartmentCode(
      selClass?.department || teacher.department,
      selClass?.name
    );

    const schedulesToSave: ScheduleItem[] = targetPeriods.map((pNum, index) => {
      const periodObj = PERIOD_TIMES.find((p) => p.period === pNum) || {
        period: pNum,
        range: `${pNum}`,
        start: '07:00',
        end: '07:45',
      };

      // Jika sedang edit 1 jadwal dan rentang hanya 1 jam, pertahankan id lamanya
      const scheduleId = (editingSchedule && targetPeriods.length === 1)
        ? editingSchedule.id
        : `sc-guru-${Date.now()}-${index}-${pNum}`;

      return {
        id: scheduleId,
        dayOfWeek: dayMap[dayName.toUpperCase()] || 1,
        dayName: dayName.toUpperCase(),
        periodIndex: pNum,
        timeRange: periodObj.range,
        startTime: periodObj.start,
        endTime: periodObj.end,
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherCode: teacher.code,
        classId: selClass ? selClass.id : 'cl-custom',
        className: classNameResult,
        subjectCode: subjectCodeResult,
        subjectName: subjectNameResult,
        department: departmentResult,
        roomName: roomNameResult,
        roomType: roomTypeResult,
        weekType,
      };
    });

    onSaveBatch(schedulesToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-6">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#0B1E2E] via-[#0f283d] to-[#122F47] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/30 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-snug">
                {editingSchedule ? 'Ubah Jadwal Pembelajaran' : 'Input Jadwal Mengajar Guru'}
              </h3>
              <p className="text-xs text-slate-300">
                {teacher.name} <span className="text-amber-400 font-mono font-bold">({teacher.code})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Bentrok Alert Box */}
          {conflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-sm text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Terdeteksi {conflicts.length} Bentrok Jadwal Real-Time!</span>
              </div>
              <ul className="space-y-1.5 text-xs max-h-40 overflow-y-auto pr-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 bg-white/85 p-2.5 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" />
                    <div>
                      <strong className="text-rose-950 font-bold block">{c.title}</strong>
                      <span className="text-slate-700">{c.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {hasClassConflict && (
                <p className="text-[11px] font-bold text-rose-700 pt-1 border-t border-rose-200">
                  ⛔ Jadwal tidak dapat disimpan karena kelas tersebut sudah memiliki jadwal dengan guru lain pada jam tersebut. Silakan ubah rentang jam atau pilih hari/kelas lain.
                </p>
              )}
            </div>
          )}

          {conflicts.length === 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Jadwal Bersih:</strong> Tidak ada bentrok dengan guru lain di kelas maupun di ruangan ini.
                </span>
              </div>
              <span className="bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px] shrink-0">
                {totalJP} JP Aman
              </span>
            </div>
          )}

          {/* Baris 1: Hari Pelaksanaan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hari Pelaksanaan <span className="text-rose-500">*</span>
            </label>
            <select
              value={dayName}
              onChange={(e) => setDayName(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-2xs"
            >
              <option value="SENIN">SENIN</option>
              <option value="SELASA">SELASA</option>
              <option value="RABU">RABU</option>
              <option value="KAMIS">KAMIS</option>
              <option value="JUMAT">JUMAT</option>
            </select>
          </div>

          {/* Baris 2: Rentang Jam Pelajaran (Mulai s/d Selesai) */}
          <div className="bg-gradient-to-br from-slate-50 to-cyan-50/40 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                <span>Rentang Jam Pelajaran (JP) <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[11px] font-extrabold text-cyan-900 bg-cyan-100/80 px-2.5 py-0.5 rounded-full border border-cyan-200">
                Total: {totalJP} Jam Pelajaran (JP)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Jam Mulai */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mulai Jam Pelajaran:
                </span>
                <select
                  value={startPeriod}
                  onChange={(e) => handleStartPeriodChange(Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-2xs"
                >
                  {PERIOD_TIMES.map((p) => (
                    <option key={p.period} value={p.period}>
                      Jam Ke-{p.period} ({p.start})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jam Selesai */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Sampai Selesai Jam:
                </span>
                <select
                  value={endPeriod}
                  onChange={(e) => handleEndPeriodChange(Number(e.target.value))}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-2xs"
                >
                  {PERIOD_TIMES.map((p) => (
                    <option key={p.period} value={p.period} disabled={p.period < startPeriod}>
                      Jam Ke-{p.period} ({p.end}) {p.period < startPeriod ? '(Di bawah jam mulai)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick helper badge info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/60">
              <span className="flex items-center gap-1 font-medium">
                <span>Waktu Pembelajaran:</span>
                <strong className="text-cyan-800 tabular-nums">{timeRangeSummary} WIB</strong>
              </span>
              <span className="text-slate-500">
                Akan otomatis dibuatkan {totalJP} sesi jam sekaligus (Jam Ke-{startPeriod} {startPeriod !== endPeriod ? `s/d Ke-${endPeriod}` : ''})
              </span>
            </div>
          </div>

          {/* Baris 3: Rotasi Pekan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Rotasi Pekan Mingguan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  weekType === 'P10_PROD_P11_NORM'
                    ? 'bg-emerald-700 text-white border-transparent font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="weekType"
                  value="P10_PROD_P11_NORM"
                  checked={weekType === 'P10_PROD_P11_NORM'}
                  onChange={() => setWeekType('P10_PROD_P11_NORM')}
                  className="hidden"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 shrink-0" />
                <div className="truncate">
                  <span className="font-bold">🟢 K10 Prod · K11 Norm</span>
                  <p className={`text-[10px] ${weekType === 'P10_PROD_P11_NORM' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Kelas 10 Produktif & Kelas 11 NormAdaptif
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  weekType === 'P10_NORM_P11_PROD'
                    ? 'bg-purple-700 text-white border-transparent font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="weekType"
                  value="P10_NORM_P11_PROD"
                  checked={weekType === 'P10_NORM_P11_PROD'}
                  onChange={() => setWeekType('P10_NORM_P11_PROD')}
                  className="hidden"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-purple-300 shrink-0" />
                <div className="truncate">
                  <span className="font-bold">🟣 K10 Norm · K11 Prod</span>
                  <p className={`text-[10px] ${weekType === 'P10_NORM_P11_PROD' ? 'text-purple-100' : 'text-slate-500'}`}>
                    Kelas 10 NormAdaptif & Kelas 11 Produktif
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Baris 4: Kelas & Rombel (Data Master Real-Time) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-cyan-600" />
                <span>Kelas / Rombongan Belajar <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                {classes.length} Rombel Terdata
              </span>
            </div>
            {classes.length > 0 ? (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`w-full text-xs font-bold bg-slate-50 border rounded-xl p-3 focus:outline-none focus:ring-2 cursor-pointer shadow-2xs ${
                  hasClassConflict
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                    : 'border-slate-300 text-slate-800 focus:ring-cyan-500'
                }`}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.department ? `(${c.department})` : ''} - Tingkat {c.grade}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Belum ada data Rombel Kelas pada Data Master. Hubungi Administrator untuk menambahkan kelas.</span>
              </div>
            )}
          </div>

          {/* Baris 5: Mata Pelajaran (Data Master Real-Time) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                <span>Mata Pelajaran <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                {subjects.length} Mapel Real-Time
              </span>
            </div>

            {subjects.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setCustomSubjectName('');
                  }}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-2xs"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) · Kategori: {s.category} {s.department ? `· ${s.department}` : ''}
                    </option>
                  ))}
                </select>

                {selectedSubjectObj && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                      Kode: {selectedSubjectObj.code}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      Kategori: {selectedSubjectObj.category}
                    </span>
                    {selectedSubjectObj.jp && (
                      <span className="text-slate-500 font-medium">
                        (Alokasi: {selectedSubjectObj.jp} JP/Minggu)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ketik nama mata pelajaran (contoh: Pemrograman Web & Bergerak)"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                />
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ℹ️ Data Master Mapel saat ini masih kosong. Anda dapat mengetikkan nama mata pelajaran secara langsung atau Administrator dapat mengimpor data mapel di menu Data Master.
                </p>
              </div>
            )}
          </div>

          {/* Baris 6: Ruangan / Bengkel / Lab (Data Master Real-Time) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                <span>Ruang / Bengkel / Lab Praktik <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                {rooms.length} Ruang Real-Time
              </span>
            </div>

            {rooms.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setCustomRoomName('');
                  }}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer text-slate-800 shadow-2xs"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) · Tipe: {r.type} · Gedung: {r.building}
                    </option>
                  ))}
                </select>

                {selectedRoomObj && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {selectedRoomObj.type}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      Gedung: {selectedRoomObj.building}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ketik nama ruang/bengkel (contoh: LAB C2 / BENGKEL TKR A)"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                />
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ℹ️ Data Master Ruangan saat ini masih kosong. Anda dapat mengetikkan nama ruangan secara langsung atau Administrator dapat mengimpor data ruangan di menu Data Master.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={hasClassConflict}
              className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md ${
                hasClassConflict
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#0B1E2E] hover:bg-slate-800 text-amber-300 hover:text-amber-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {editingSchedule && totalJP === 1
                  ? 'Simpan Perubahan Jadwal'
                  : `Tambahkan ${totalJP} Jam ke Jadwal Saya`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
