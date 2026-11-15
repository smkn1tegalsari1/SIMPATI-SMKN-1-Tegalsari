import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  School,
  Building2,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRightLeft,
} from 'lucide-react';
import { Teacher, Subject, SchoolClass, Room, ScheduleItem, ScheduleWeekType } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';
import { resolveDepartmentCode } from '../../data/departmentUtils';
import { analyzeScheduleConflicts } from '../../data/scheduleConflict';
import { getWeekTypeShortLabel } from '../../data/scheduleWeeks';

interface GuruScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  allSchedules: ScheduleItem[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  editingSchedule?: ScheduleItem | null;
  defaultWeekType?: ScheduleWeekType;
  onSaveBatch: (schedules: ScheduleItem[], replaceIds?: string[]) => void | Promise<void>;
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
  defaultWeekType = 'P10_PROD_P11_NORM',
  onSaveBatch,
}) => {
  const [dayName, setDayName] = useState<string>('SENIN');
  const [startPeriod, setStartPeriod] = useState<number>(1);
  const [endPeriod, setEndPeriod] = useState<number>(1);
  const [weekType, setWeekType] = useState<ScheduleWeekType>(
    defaultWeekType === 'ALL' ? 'P10_PROD_P11_NORM' : defaultWeekType
  );
  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [replaceOwnSameClass, setReplaceOwnSameClass] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const wasOpenRef = useRef<boolean>(false);
  const prevEditIdRef = useRef<string | null>(null);

  // Inisialisasi state hanya saat modal transisi terbuka (false -> true) atau editingSchedule.id berubah
  // agar background Cloud sync tidak me-reset input pilihan guru saat form sedang diisi.
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      prevEditIdRef.current = null;
      return;
    }

    const currentEditId = editingSchedule?.id || null;
    const justOpened = !wasOpenRef.current;
    const editTargetChanged = prevEditIdRef.current !== currentEditId;

    if (!justOpened && !editTargetChanged) return;

    wasOpenRef.current = true;
    prevEditIdRef.current = currentEditId;
    setSubmitError('');
    setReplaceOwnSameClass(false);

    if (editingSchedule) {
      setDayName(editingSchedule.dayName || 'SENIN');
      const pNum =
        typeof editingSchedule.periodIndex === 'number'
          ? editingSchedule.periodIndex
          : parseInt(String(editingSchedule.periodIndex), 10) || 1;
      setStartPeriod(pNum);
      setEndPeriod(pNum);
      setWeekType(
        editingSchedule.weekType && editingSchedule.weekType !== 'ALL'
          ? editingSchedule.weekType
          : defaultWeekType === 'ALL'
          ? 'P10_PROD_P11_NORM'
          : defaultWeekType
      );

      // 1. Sinkron Kelas
      const matchClass = classes.find(
        (c) =>
          c.id === editingSchedule.classId ||
          c.name.trim().toUpperCase() === (editingSchedule.className || '').trim().toUpperCase()
      );
      setClassId(matchClass ? matchClass.id : editingSchedule.classId || classes[0]?.id || '');

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
      setWeekType(defaultWeekType === 'ALL' ? 'P10_PROD_P11_NORM' : defaultWeekType);

      setClassId(classes[0]?.id || '');
      setSubjectId(subjects[0]?.id || '');
      setRoomId(rooms[0]?.id || '');
      setCustomSubjectName('');
      setCustomRoomName('');
    }
  }, [isOpen, editingSchedule, defaultWeekType, classes, subjects, rooms]);

  // Reset konfirmasi timpa jadwal sendiri setiap kali target slot berubah
  useEffect(() => {
    setReplaceOwnSameClass(false);
    setSubmitError('');
  }, [dayName, startPeriod, endPeriod, weekType, classId]);

  // Jaga agar dropdown tetap valid bila data master baru tiba setelah modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    if (!classId && classes.length > 0) setClassId(classes[0].id);
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
    if (!roomId && rooms.length > 0) setRoomId(rooms[0].id);
  }, [isOpen, classes, subjects, rooms, classId, subjectId, roomId]);

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

  // Rentang jam detail (contoh: 06:45 - 09:20)
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

  const selectedClassName = selectedClassObj?.name || editingSchedule?.className || '';
  const targetRoomName = selectedRoomObj ? selectedRoomObj.name : customRoomName.trim();

  // Analisis Bentrok Real-Time terdeduplikasi + peta slot J1-J11 + cek rotasi pekan pasangan
  const conflictAnalysis = useMemo(() => {
    return analyzeScheduleConflicts({
      allSchedules,
      editingSchedule,
      dayName,
      targetPeriods,
      weekType,
      classId,
      className: selectedClassName,
      targetRoomName,
      teacher,
    });
  }, [
    allSchedules,
    editingSchedule,
    dayName,
    targetPeriods,
    weekType,
    classId,
    selectedClassName,
    targetRoomName,
    teacher,
  ]);

  const {
    conflicts,
    hasOtherTeacherClassConflict,
    hasOwnSameClassConflict,
    hasOwnOtherClassConflict,
    hasRoomConflict,
    ownSameClassScheduleIds,
    otherWeekAvailability,
    weekFillCounts,
  } = conflictAnalysis;

  const isBlocked =
    hasOtherTeacherClassConflict || (hasOwnSameClassConflict && !replaceOwnSameClass);

  // Submit Handler: Menghasilkan array jadwal untuk startPeriod s/d endPeriod
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOtherTeacherClassConflict) {
      setSubmitError(
        `Jadwal tidak dapat disimpan karena kelas ${selectedClassName} sudah terisi guru lain pada rotasi pekan ${getWeekTypeShortLabel(weekType)}.`
      );
      return;
    }
    if (hasOwnSameClassConflict && !replaceOwnSameClass) {
      setSubmitError(
        'Centang opsi perbarui jadwal Anda sendiri atau pindah ke rotasi pekan yang kosong terlebih dahulu.'
      );
      return;
    }
    setSubmitError('');

    const dayMap: Record<string, number> = {
      SENIN: 1,
      SELASA: 2,
      RABU: 3,
      KAMIS: 4,
      JUMAT: 5,
    };

    const selClass = selectedClassObj;
    const selSubject = selectedSubjectObj;
    const selRoom = selectedRoomObj;

    const subjectNameResult = selSubject?.name || customSubjectName.trim() || 'Mata Pelajaran';
    const subjectCodeResult = selSubject?.code || 'MAPEL';
    const roomNameResult = selRoom?.name || customRoomName.trim() || 'Ruang Teori';
    const roomTypeResult = selRoom?.type || 'Teori';
    const classNameResult = selClass?.name || editingSchedule?.className || 'Kelas';
    const departmentResult = resolveDepartmentCode(
      selClass?.department || teacher.department,
      selClass?.name
    );

    const isSingleOwnReplace =
      ownSameClassScheduleIds.length === 1 && targetPeriods.length === 1;

    const schedulesToSave: ScheduleItem[] = targetPeriods.map((pNum, index) => {
      const periodObj = PERIOD_TIMES.find((p) => p.period === pNum) || {
        period: pNum,
        range: `${pNum}`,
        start: '07:00',
        end: '07:45',
      };

      const matchingOwnForPeriod =
        replaceOwnSameClass && !editingSchedule
          ? conflicts.find(
              (c) => c.type === 'own_same_class' && c.period === pNum
            )?.conflictingItem
          : undefined;

      const scheduleId =
        editingSchedule && targetPeriods.length === 1
          ? editingSchedule.id
          : matchingOwnForPeriod?.id
          ? matchingOwnForPeriod.id
          : isSingleOwnReplace
          ? ownSameClassScheduleIds[0]
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
        classId: selClass ? selClass.id : editingSchedule?.classId || 'cl-custom',
        className: classNameResult,
        subjectCode: subjectCodeResult,
        subjectName: subjectNameResult,
        department: departmentResult,
        roomName: roomNameResult,
        roomType: roomTypeResult,
        weekType,
      };
    });

    const replaceIds = replaceOwnSameClass
      ? Array.from(
          new Set([
            ...(editingSchedule?.id ? [editingSchedule.id] : []),
            ...ownSameClassScheduleIds,
          ])
        )
      : editingSchedule?.id
      ? [editingSchedule.id]
      : undefined;

    await onSaveBatch(schedulesToSave, replaceIds);
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
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Bentrok / Slot Sendiri Alert Box */}
          {conflicts.length > 0 && (
            <div
              className={`p-4 rounded-2xl border-2 space-y-2.5 animate-in fade-in ${
                hasOtherTeacherClassConflict
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex items-center gap-2 font-black text-sm ${
                    hasOtherTeacherClassConflict ? 'text-rose-800' : 'text-amber-900'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 ${
                      hasOtherTeacherClassConflict ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <span>
                    {hasOtherTeacherClassConflict
                      ? `Terdeteksi ${conflicts.length} Bentrok Jadwal di Rotasi ${getWeekTypeShortLabel(weekType)}`
                      : hasOwnSameClassConflict
                      ? `Slot Jam Sudah Terisi oleh Jadwal Anda Sendiri (${getWeekTypeShortLabel(weekType)})`
                      : `Peringatan ${conflicts.length} Ketersediaan Ruang / Jam Anda`}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${
                    hasOtherTeacherClassConflict
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {getWeekTypeShortLabel(weekType)}
                </span>
              </div>

              <ul className="space-y-1.5 text-xs max-h-40 overflow-y-auto pr-1">
                {conflicts.map((c, i) => {
                  const isHardBlock = c.type === 'other_teacher_class';
                  return (
                    <li
                      key={`${c.type}-${c.period}-${i}`}
                      className={`flex items-start justify-between gap-2 bg-white/90 p-2.5 rounded-xl border shadow-2xs ${
                        isHardBlock ? 'border-rose-200' : 'border-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            isHardBlock ? 'bg-rose-600' : 'bg-amber-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <strong className="text-slate-900 font-bold block">{c.title}</strong>
                          <span className="text-slate-700">{c.message}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {c.weekLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Jika bentrok dengan jadwal milik guru sendiri pada kelas yang sama */}
              {!hasOtherTeacherClassConflict && hasOwnSameClassConflict && (
                <div className="pt-2 border-t border-amber-200/80 space-y-2">
                  <p className="text-[11px] font-semibold text-amber-900 leading-relaxed">
                    Kelas <strong>{selectedClassName}</strong> terlihat kosong jika Anda memantau rotasi pekan lainnya, tetapi pada rotasi{' '}
                    <strong>{getWeekTypeShortLabel(weekType)}</strong> jam ini sudah Anda isi sendiri.
                  </p>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-amber-300 cursor-pointer hover:bg-amber-50/70 transition">
                    <input
                      type="checkbox"
                      checked={replaceOwnSameClass}
                      onChange={(e) => setReplaceOwnSameClass(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-400 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Timpa / perbarui jadwal saya yang sudah ada di slot jam ini</span>
                    </span>
                  </label>
                </div>
              )}

              {/* Penjelasan jelas jika benar-benar terisi guru lain */}
              {hasOtherTeacherClassConflict && (
                <p className="text-[11px] font-bold text-rose-700 pt-1.5 border-t border-rose-200">
                  ⛔ Jadwal pada rotasi {getWeekTypeShortLabel(weekType)} tidak dapat disimpan karena kelas tersebut sudah memiliki jadwal dengan guru lain. Silakan pindah ke rotasi pekan yang kosong atau ubah rentang jam.
                </p>
              )}

              {/* Peringatan lembut untuk ruang / kelas lain */}
              {!hasOtherTeacherClassConflict &&
                !hasOwnSameClassConflict &&
                (hasOwnOtherClassConflict || hasRoomConflict) && (
                  <p className="text-[11px] font-semibold text-amber-800 pt-1 border-t border-amber-200">
                    ⚠️ Catatan: Ada penggunaan ruangan atau jam paralel Anda di kelas lain pada pekan ini. Pastikan memang terjadwal paralel jika ingin tetap menyimpan.
                  </p>
                )}

              {/* Aksi cepat 1-klik pindah ke rotasi pekan pasangan jika kelas KOSONG di rotasi tsb */}
              {otherWeekAvailability && otherWeekAvailability.isClassCompletelyFree && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-[11px] text-emerald-900 leading-snug min-w-0 flex-1">
                    <strong className="block text-emerald-800">
                      💡 Kelas {selectedClassName} KOSONG pada Rotasi {otherWeekAvailability.shortLabel}!
                    </strong>
                    <span>
                      Seluruh {otherWeekAvailability.classFreeCount}/{otherWeekAvailability.totalTargetPeriods} jam pilihan tersedia tanpa bentrok di {otherWeekAvailability.label}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekType(otherWeekAvailability.weekType)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-xs transition cursor-pointer shrink-0"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Pindah ke {otherWeekAvailability.shortLabel}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {conflicts.length === 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Jadwal Bersih ({getWeekTypeShortLabel(weekType)}):</strong> Kelas, guru, dan ruangan kosong pada slot ini.
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

          {/* Baris 3: Rotasi Pekan (dengan jumlah slot terisi per rotasi untuk kelas & hari ini) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Rotasi Pekan Mingguan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
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
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold">K10 Prod · K11 Norm</span>
                    <p
                      className={`text-[10px] truncate ${
                        weekType === 'P10_PROD_P11_NORM' ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      Kelas 10 Produktif & 11 Normada
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                    weekType === 'P10_PROD_P11_NORM'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {weekFillCounts.P10_PROD_P11_NORM}/11 terisi
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
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
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-300 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold">K10 Norm · K11 Prod</span>
                    <p
                      className={`text-[10px] truncate ${
                        weekType === 'P10_NORM_P11_PROD' ? 'text-purple-100' : 'text-slate-500'
                      }`}
                    >
                      Kelas 10 Normada & 11 Produktif
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
                    weekType === 'P10_NORM_P11_PROD'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {weekFillCounts.P10_NORM_P11_PROD}/11 terisi
                </span>
              </label>
            </div>
          </div>

          {/* Baris 4: Kelas & Rombel (Data Master Real-Time) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
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
                  hasOtherTeacherClassConflict
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                    : hasOwnSameClassConflict
                    ? 'border-amber-400 bg-amber-50/40 text-amber-950 focus:ring-amber-500'
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

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

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
              disabled={isBlocked}
              className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md ${
                isBlocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#0B1E2E] hover:bg-slate-800 text-amber-300 hover:text-amber-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {editingSchedule && totalJP === 1
                  ? 'Simpan Perubahan Jadwal'
                  : replaceOwnSameClass && hasOwnSameClassConflict
                  ? `Perbarui ${totalJP} Jam di Jadwal Saya`
                  : `Tambahkan ${totalJP} Jam ke Jadwal Saya`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
