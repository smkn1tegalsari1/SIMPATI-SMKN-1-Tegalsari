import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Teacher, Subject, SchoolClass, Room, ScheduleItem, ScheduleWeekType } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';

interface GuruScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  allSchedules: ScheduleItem[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  editingSchedule?: ScheduleItem | null;
  onSave: (schedule: ScheduleItem) => void;
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
  onSave,
}) => {
  const [dayName, setDayName] = useState<string>(editingSchedule?.dayName || 'SENIN');
  const [periodIndex, setPeriodIndex] = useState<number>(() => {
    if (editingSchedule && typeof editingSchedule.periodIndex === 'number') {
      return editingSchedule.periodIndex;
    }
    return 1;
  });
  const [weekType, setWeekType] = useState<ScheduleWeekType>(editingSchedule?.weekType || 'ALL');
  const [classId, setClassId] = useState<string>(editingSchedule?.classId || (classes[0]?.id || ''));
  const [subjectId, setSubjectId] = useState<string>(() => {
    if (editingSchedule) {
      const match = subjects.find(
        (s) => s.code === editingSchedule.subjectCode || s.name === editingSchedule.subjectName
      );
      if (match) return match.id;
    }
    return subjects[0]?.id || '';
  });
  const [roomId, setRoomId] = useState<string>(() => {
    if (editingSchedule) {
      const match = rooms.find((r) => r.name === editingSchedule.roomName);
      if (match) return match.id;
    }
    return rooms[0]?.id || '';
  });

  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [customRoomName, setCustomRoomName] = useState<string>('');

  const selectedPeriodObj = useMemo(() => {
    return PERIOD_TIMES.find((p) => p.period === periodIndex) || PERIOD_TIMES[0];
  }, [periodIndex]);

  // Cek Bentrok (Conflict Detection) Terhubung Real-Time
  const conflicts = useMemo(() => {
    const list: {
      type: 'class_conflict' | 'room_conflict' | 'teacher_conflict';
      title: string;
      message: string;
      conflictingItem: ScheduleItem;
    }[] = [];

    const dayUpper = dayName.toUpperCase();

    allSchedules.forEach((s) => {
      // Abaikan jika sedang mengedit jadwal ini sendiri
      if (editingSchedule && s.id === editingSchedule.id) return;

      const sDay = (s.dayName || '').toUpperCase();
      const sDayMatch = sDay === dayUpper;
      if (!sDayMatch) return;

      // Cek apakah jam pelajaran sama
      const sPeriod = typeof s.periodIndex === 'number' ? s.periodIndex : parseInt(String(s.periodIndex), 10);
      if (sPeriod !== periodIndex) return;

      // Cek kesesuaian rotasi pekan (jika salah satu ALL atau keduanya sama)
      const sWeek = s.weekType || 'ALL';
      const weekOverlap = weekType === 'ALL' || sWeek === 'ALL' || weekType === sWeek;
      if (!weekOverlap) return;

      // 1. Bentrok Kelas (Kondisi Utama: Tidak boleh ada 2 guru mengajar kelas yang sama di jam yang sama)
      if (classId && (s.classId === classId || (classes.find((c) => c.id === classId)?.name === s.className))) {
        list.push({
          type: 'class_conflict',
          title: `Bentrok di Kelas ${s.className}`,
          message: `Kelas ini sudah terjadwal pelajaran "${s.subjectName}" bersama ${s.teacherName} pada ${dayUpper} Jam Ke-${periodIndex}.`,
          conflictingItem: s,
        });
      }

      // 2. Bentrok Ruangan (Jika ruangan dipilih dan bentrok dengan kelas lain)
      const selectedRoomObj = rooms.find((r) => r.id === roomId);
      const targetRoomName = selectedRoomObj ? selectedRoomObj.name : customRoomName.trim();
      if (targetRoomName && s.roomName && targetRoomName.toLowerCase() === s.roomName.toLowerCase()) {
        list.push({
          type: 'room_conflict',
          title: `Bentrok di Ruangan ${s.roomName}`,
          message: `Ruangan ini sedang digunakan oleh kelas ${s.className} (${s.subjectName} - ${s.teacherName}) pada jam ini.`,
          conflictingItem: s,
        });
      }

      // 3. Bentrok Guru Sendiri (Guru tidak bisa mengajar 2 kelas sekaligus di jam yang sama)
      if (s.teacherId === teacher.id) {
        list.push({
          type: 'teacher_conflict',
          title: `Anda Sudah Memiliki Jadwal di Jam Ini`,
          message: `Anda telah dijadwalkan mengajar di kelas ${s.className} (${s.subjectName}) pada ${dayUpper} Jam Ke-${periodIndex}.`,
          conflictingItem: s,
        });
      }
    });

    return list;
  }, [allSchedules, editingSchedule, dayName, periodIndex, weekType, classId, roomId, customRoomName, teacher.id, classes, rooms]);

  const hasClassConflict = conflicts.some((c) => c.type === 'class_conflict');
  const hasTeacherConflict = conflicts.some((c) => c.type === 'teacher_conflict');
  const hasRoomConflict = conflicts.some((c) => c.type === 'room_conflict');

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasClassConflict) {
      alert('Jadwal tidak dapat disimpan karena bentrok dengan jadwal lain di kelas tersebut!');
      return;
    }

    const dayMap: Record<string, number> = {
      SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5,
    };

    const selClass = classes.find((c) => c.id === classId);
    const selSubject = subjects.find((s) => s.id === subjectId);
    const selRoom = rooms.find((r) => r.id === roomId);

    const subjectNameResult = selSubject?.name || customSubjectName.trim() || 'Mata Pelajaran';
    const subjectCodeResult = selSubject?.code || 'MAPEL';
    const roomNameResult = selRoom?.name || customRoomName.trim() || 'Ruang Teori';
    const roomTypeResult = selRoom?.type || 'Teori';
    const classNameResult = selClass?.name || 'Kelas';
    const departmentResult = selClass?.department || teacher.department || 'UMUM';

    const newSchedule: ScheduleItem = {
      id: editingSchedule ? editingSchedule.id : `sc-guru-${Date.now()}`,
      dayOfWeek: dayMap[dayName.toUpperCase()] || 1,
      dayName: dayName.toUpperCase(),
      periodIndex,
      timeRange: selectedPeriodObj.range,
      startTime: selectedPeriodObj.start,
      endTime: selectedPeriodObj.end,
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

    onSave(newSchedule);
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
                {teacher.name} <span className="text-amber-400 font-mono">({teacher.code})</span>
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
                <span>Terdeteksi Bentrok Jadwal Real-Time!</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {conflicts.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-200">
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
                  ⛔ Sistem tidak mengizinkan penyimpanan jadwal jika kelas yang sama sudah memiliki guru lain pada jam tersebut. Silakan pilih jam, hari, atau kelas lain.
                </p>
              )}
            </div>
          )}

          {conflicts.length === 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Jadwal Bersih:</strong> Tidak ada bentrok dengan guru lain di kelas maupun di ruangan ini.
              </span>
            </div>
          )}

          {/* Baris 1: Hari & Jam Pelajaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hari Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <select
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="SENIN">SENIN</option>
                <option value="SELASA">SELASA</option>
                <option value="RABU">RABU</option>
                <option value="KAMIS">KAMIS</option>
                <option value="JUMAT">JUMAT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Pelajaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={periodIndex}
                onChange={(e) => setPeriodIndex(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                {PERIOD_TIMES.map((p) => (
                  <option key={p.period} value={p.period}>
                    Jam Ke-{p.period} ({p.range})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 2: Rotasi Pekan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Rotasi Pekan Mingguan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                  weekType === 'ALL'
                    ? 'bg-[#0B1E2E] text-white border-transparent font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="weekType"
                  value="ALL"
                  checked={weekType === 'ALL'}
                  onChange={() => setWeekType('ALL')}
                  className="hidden"
                />
                <span className="truncate">🌐 Setiap Pekan</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
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
                <span className="truncate">🟢 K10 Prod · K11 Norm</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
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
                <span className="truncate">🟣 K10 Norm · K11 Prod</span>
              </label>
            </div>
          </div>

          {/* Baris 3: Kelas & Rombel */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kelas / Rombongan Belajar <span className="text-rose-500">*</span>
            </label>
            {classes.length > 0 ? (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`w-full text-xs font-bold bg-slate-50 border rounded-xl p-3 focus:outline-none focus:ring-2 cursor-pointer ${
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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Belum ada data Rombel Kelas pada Data Master. Silakan minta Administrator menambahkan data kelas terlebih dahulu.
              </div>
            )}
          </div>

          {/* Baris 4: Mata Pelajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            {subjects.length > 0 ? (
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.category}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Contoh: Pemrograman Web & Perangkat Bergerak"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            )}
          </div>

          {/* Baris 5: Ruangan / Bengkel / Lab */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ruang / Bengkel / Lab Praktik <span className="text-rose-500">*</span>
            </label>
            {rooms.length > 0 ? (
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className={`w-full text-xs font-bold bg-slate-50 border rounded-xl p-3 focus:outline-none focus:ring-2 cursor-pointer ${
                  hasRoomConflict
                    ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:ring-amber-500'
                    : 'border-slate-300 text-slate-800 focus:ring-cyan-500'
                }`}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) - {r.type} - {r.building}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Contoh: LAB C1 / BENGKEL TKR A"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
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
              <span>{editingSchedule ? 'Simpan Perubahan Jadwal' : 'Tambahkan ke Jadwal Saya'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
