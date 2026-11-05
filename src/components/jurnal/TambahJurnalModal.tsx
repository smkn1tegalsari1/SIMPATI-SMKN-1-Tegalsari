import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { PERIOD_TIMES } from '../../data/initialData';

interface TambahJurnalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalToEdit?: TeachingJournal | null;
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
    currentUser,
    addJournal,
    updateJournal,
  } = useApp();

  // Helper untuk format tanggal default hari ini YYYY-MM-DD
  const getTodayISO = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  // Sinkronkan state ketika modal dibuka atau data edit berubah
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setSuccessToast('');
      return;
    }

    if (journalToEdit) {
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
    } else {
      // Default: Guru login atau guru pertama di Data Master
      let defaultTId = '';
      if (currentUser.role === 'guru') {
        const myTeacher = teachers.find(
          (t) => t.id === currentUser.teacherId || (currentUser.teacherCode && t.code === currentUser.teacherCode)
        );
        defaultTId = myTeacher ? myTeacher.id : (currentUser.teacherId || (teachers[0]?.id || ''));
      } else {
        defaultTId = teachers[0]?.id || '';
      }
      setSelectedTeacherId(defaultTId);

      setDate(getTodayISO());

      const defaultClass = classes[0]?.id || '';
      setSelectedClassId(defaultClass);

      const defaultRoom = rooms[0]?.id || '';
      setSelectedRoomId(defaultRoom);

      const defaultSubj = subjects[0];
      if (defaultSubj) {
        setSelectedSubjectId(defaultSubj.id);
        setSubjectCode(defaultSubj.code);
      } else {
        setSelectedSubjectId('');
        setSubjectCode('');
      }

      setStartPeriod(1);
      setEndPeriod(8);
      setTopic('');
    }
  }, [isOpen, journalToEdit, teachers, classes, rooms, subjects, currentUser]);

  // Ketika mata pelajaran dipilih, otomatis isi kode mapel secara real-time
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

    if (journalToEdit) {
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
        className="w-full max-w-2xl bg-[#FCFAF6] rounded-3xl shadow-2xl border border-[#E9E4DC] overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-[#EFECE6]/80">
          <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
            {journalToEdit ? 'Edit jurnal' : 'Tambah jurnal'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs md:text-sm">
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
                  disabled={currentUser.role === 'guru' && teachers.some((t) => t.id === currentUser.teacherId)}
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
          <div className="pt-3">
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
