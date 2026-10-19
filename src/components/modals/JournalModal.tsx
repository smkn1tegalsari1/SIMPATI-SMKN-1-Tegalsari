import React, { useState } from 'react';
import { ScheduleItem, TeacherAttendanceStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, BookOpen, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

interface JournalModalProps {
  schedule: ScheduleItem;
  isOpen: boolean;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({ schedule, isOpen, onClose }) => {
  const { confirmTeacherAttendance, attendanceRecords } = useApp();
  const record = attendanceRecords[schedule.id];

  const [status, setStatus] = useState<TeacherAttendanceStatus>(
    record?.teacherConfirmation.status || 'hadir'
  );
  const [topic, setTopic] = useState<string>(
    record?.teacherConfirmation.journalTopic || `${schedule.subjectName} - Pembahasan Pokok`
  );
  const [notes, setNotes] = useState<string>(
    record?.teacherConfirmation.journalNotes || 'KBM berjalan tertib, siswa aktif mengerjakan modul dan praktik langsung.'
  );
  const [sakit, setSakit] = useState<number>(record?.teacherConfirmation.studentAbsence?.sakit || 0);
  const [izin, setIzin] = useState<number>(record?.teacherConfirmation.studentAbsence?.izin || 0);
  const [alpa, setAlpa] = useState<number>(record?.teacherConfirmation.studentAbsence?.alpa || 0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmTeacherAttendance(schedule.id, status, topic, notes, {
      sakit,
      izin,
      alpa,
      totalHadir: 36 - (sakit + izin + alpa),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Jurnal KBM & Absensi Guru</h3>
              <p className="text-xs text-slate-300">Konfirmasi Kehadiran & Materi Pembelajaran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Info Banner */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Jam Ke-{schedule.periodIndex} ({schedule.timeRange})</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-cyan-600" />
            <span>{schedule.roomName} · {schedule.className}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Status Kehadiran Guru
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('hadir')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  status === 'hadir'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hadir di Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('izin')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  status === 'izin'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Izin Resmi</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('sakit')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  status === 'sakit'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sakit</span>
              </button>
            </div>
          </div>

          {/* Topic & Notes (If Hadir) */}
          {status === 'hadir' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Materi / Pokok Bahasan
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Praktik Pengkabelan UTP & Routing MikroTik"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Jurnal / Progres Belajar
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan ketercapaian kompetensi siswa hari ini..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                />
              </div>

              {/* Student Attendance Mini Counter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ketidakhadiran Siswa di Kelas (Opsional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Sakit</span>
                    <input
                      type="number"
                      min={0}
                      value={sakit}
                      onChange={(e) => setSakit(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-bold text-slate-800 bg-white border border-slate-300 rounded text-sm py-0.5"
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Izin</span>
                    <input
                      type="number"
                      min={0}
                      value={izin}
                      onChange={(e) => setIzin(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-bold text-slate-800 bg-white border border-slate-300 rounded text-sm py-0.5"
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Alpa</span>
                    <input
                      type="number"
                      min={0}
                      value={alpa}
                      onChange={(e) => setAlpa(Number(e.target.value))}
                      className="w-16 mx-auto text-center font-bold text-slate-800 bg-white border border-slate-300 rounded text-sm py-0.5"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {status !== 'hadir' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Alasan
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan keterangan perizinan atau penugasan mandiri bagi siswa..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-sm transition"
            >
              Simpan & Konfirmasi KBM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
