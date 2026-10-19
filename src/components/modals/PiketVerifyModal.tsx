import React, { useState } from 'react';
import { ScheduleItem, PiketAttendanceStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, ShieldCheck, CheckCircle2, Clock, UserCheck, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface PiketVerifyModalProps {
  schedule: ScheduleItem;
  isOpen: boolean;
  onClose: () => void;
}

export const PiketVerifyModal: React.FC<PiketVerifyModalProps> = ({ schedule, isOpen, onClose }) => {
  const { verifyPiketAttendance, attendanceRecords, teachers } = useApp();
  const record = attendanceRecords[schedule.id];

  const [piketStatus, setPiketStatus] = useState<PiketAttendanceStatus>(
    record?.piketConfirmation.status || 'terverifikasi_hadir'
  );
  const [notes, setNotes] = useState<string>(
    record?.piketConfirmation.notes || 'Pemeriksaan fisik ruang kelas: guru dan siswa hadir lengkap.'
  );
  const [subTeacherId, setSubTeacherId] = useState<string>(
    record?.piketConfirmation.substituteTeacherId || ''
  );
  const [assignedTask, setAssignedTask] = useState<string>(
    record?.piketConfirmation.assignedTask || ''
  );

  if (!isOpen) return null;

  // Available teachers for substitution (exclude the original teacher)
  const candidateSubstitutes = teachers.filter((t) => t.id !== schedule.teacherId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPiketAttendance(schedule.id, piketStatus, notes, subTeacherId || undefined, assignedTask || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Papan Verifikasi Guru Piket</h3>
              <p className="text-xs text-slate-300">Validasi Fisik & Opsi Penugasan Inval</p>
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
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">{schedule.teacherName}</span>
            <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
              Jam Ke-{schedule.periodIndex} ({schedule.timeRange})
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>{schedule.subjectName}</span>
            <span>{schedule.roomName} · {schedule.className}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hasil Validasi Fisik Piket
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPiketStatus('terverifikasi_hadir')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  piketStatus === 'terverifikasi_hadir'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terverifikasi Hadir</span>
              </button>
              <button
                type="button"
                onClick={() => setPiketStatus('terlambat')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  piketStatus === 'terlambat'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Terlambat Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => setPiketStatus('izin_terkonfirmasi')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  piketStatus === 'izin_terkonfirmasi'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Izin / Sakit (Tugaskan)</span>
              </button>
              <button
                type="button"
                onClick={() => setPiketStatus('tidak_hadir')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  piketStatus === 'tidak_hadir'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Tidak Hadir (Alpa)</span>
              </button>
            </div>
          </div>

          {/* Conditional Inval & Assignment Section if Izin / Sakit / Tidak Hadir */}
          {(piketStatus === 'izin_terkonfirmasi' || piketStatus === 'tidak_hadir') && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                <span>Tindakan Piket Penanganan Kelas Kosong</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tugaskan Guru Pengganti (Inval)
                </label>
                <select
                  value={subTeacherId}
                  onChange={(e) => setSubTeacherId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Pilih Guru Pengganti (Opsional) --</option>
                  {candidateSubstitutes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title || 'Guru Pengajar'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tugas Mandiri / Modul Terstruktur untuk Kelas
                </label>
                <textarea
                  rows={2}
                  value={assignedTask}
                  onChange={(e) => setAssignedTask(e.target.value)}
                  placeholder="Instruksi tugas mandiri yang diberikan ke ketua kelas..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Piket Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Pemeriksaan Piket
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan inspeksi atau koordinasi dengan ketua kelas..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              Simpan Validasi Piket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
