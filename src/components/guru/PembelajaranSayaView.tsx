import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck2,
  User,
  PlusCircle,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { ScheduleItem } from '../../types';
import { JournalModal } from '../modals/JournalModal';

export const PembelajaranSayaView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentUser,
    teachers,
    quickTeacherStatusToggle,
    currentDateString,
    currentTimeString,
    currentPeriod,
    effectiveWeekType,
    realtimeWeekType,
  } = useApp();

  // If logged in as admin or pimpinan, allow selecting which teacher to view as
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    currentUser.teacherId || (teachers[0]?.id ?? 't-6')
  );
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');

  // Keep selected teacher in sync when currentUser changes (e.g. login or switch role)
  useEffect(() => {
    if (currentUser.teacherId) {
      setSelectedTeacherId(currentUser.teacherId);
    } else if (teachers.length > 0 && !teachers.some((t) => t.id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [currentUser.teacherId, teachers]);

  const [activeJournalSchedule, setActiveJournalSchedule] = useState<ScheduleItem | null>(null);

  // Safe teacher lookup with fallbacks
  const currentTeacherObj =
    teachers.find((t) => t.id === selectedTeacherId) ||
    (currentUser.teacherId ? teachers.find((t) => t.id === currentUser.teacherId) : null) ||
    teachers[0] ||
    null;

  const effectiveTeacherId = currentTeacherObj?.id || selectedTeacherId || currentUser.teacherId || '';
  
  const teacherSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.teacherId !== effectiveTeacherId) return false;
      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === effectiveWeekType;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === selectedWeek;
      }
      return true;
    });
  }, [schedules, effectiveTeacherId, selectedWeek, effectiveWeekType]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E2E] via-[#0f283d] to-[#122F47] rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              Portal Pengajar SIMPATI
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Real-Time
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {currentTeacherObj ? currentTeacherObj.name : currentUser.name || 'Guru Pengajar'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300">
            {currentTeacherObj ? currentTeacherObj.title : currentUser.title || 'Guru SMKN 1 Tegalsari'}
            {currentTeacherObj?.department ? ` · Jurusan ${currentTeacherObj.department}` : ''}
          </p>

          {/* Real-time laptop clock display */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-xl border border-white/10">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {currentDateString} · {currentTimeString}
            </span>
            <span className="font-semibold text-cyan-200 flex items-center gap-1 bg-cyan-900/40 px-2.5 py-1 rounded-xl border border-cyan-500/20 text-[11px]">
              Jam KBM Ke-{currentPeriod}
            </span>
          </div>
        </div>

        {/* Switch Teacher Quick Selector (convenient for testing any teacher) */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs">
          <label className="block text-slate-300 font-semibold mb-1.5">
            Pilih Profil Guru Pengajar:
          </label>
          <select
            value={currentTeacherObj?.id || selectedTeacherId || ''}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="bg-[#0B1E2E] text-white font-bold px-3 py-2 rounded-xl border border-white/30 outline-none w-64 cursor-pointer"
          >
            {teachers.length === 0 ? (
              <option value="">(Belum ada data guru)</option>
            ) : (
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code ? `[${t.code}] ` : ''}{t.name}{t.title ? ` — ${t.title}` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Week Rotation Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 px-2 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span>Rotasi Pekan:</span>
        </span>

        <button
          onClick={() => setSelectedWeek('ACTIVE')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'ACTIVE'
              ? 'bg-[#0B1E2E] text-white shadow-xs'
              : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Pekan Aktif Real-Time ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})</span>
        </button>

        <button
          onClick={() => setSelectedWeek('P10_PROD_P11_NORM')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'P10_PROD_P11_NORM'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Pekan K10 Produktif & K11 Normatif Adaptif</span>
        </button>

        <button
          onClick={() => setSelectedWeek('P10_NORM_P11_PROD')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
            selectedWeek === 'P10_NORM_P11_PROD'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Pekan K10 Normatif Adaptif & K11 Produktif</span>
        </button>

        <button
          onClick={() => setSelectedWeek('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            selectedWeek === 'ALL'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>Semua Pekan (Gabungan)</span>
        </button>
      </div>

      {/* Schedule Summary Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Jadwal Mengajar Saya Hari Ini
          </h2>
          <p className="text-xs text-slate-500">
            Total {teacherSchedules.length} jam pertemuan terjadwal pada filter yang dipilih
          </p>
        </div>
      </div>

      {/* List of Teacher Schedules */}
      {teacherSchedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">Tidak Ada Jam Mengajar Hari Ini</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Anda sedang tidak memiliki jadwal KBM aktif hari ini. Anda dapat bertugas mendampingi atau membantu pos guru piket.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teacherSchedules.map((schedule) => {
            const record = attendanceRecords[schedule.id];
            const isConfirmed = record?.teacherConfirmation?.status && record.teacherConfirmation.status !== 'belum_konfirmasi';
            const isHadir = record?.teacherConfirmation?.status === 'hadir';
            const isPiketChecked = record?.piketConfirmation?.status === 'terverifikasi_hadir';

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 space-y-4"
              >
                {/* Header Period */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-slate-900 font-black text-xs px-2.5 py-1 rounded-lg">
                      Jam Ke-{schedule.periodIndex}
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {schedule.timeRange}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {schedule.weekType === 'P10_PROD_P11_NORM' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        K10 Prod · K11 Norm
                      </span>
                    ) : schedule.weekType === 'P10_NORM_P11_PROD' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300">
                        K10 Norm · K11 Prod
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                        Semua Pekan
                      </span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {schedule.className}
                    </span>
                  </div>
                </div>

                {/* Subject & Room */}
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                    {schedule.subjectName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                      {schedule.roomName}
                    </span>
                    <span>·</span>
                    <span>{schedule.roomType}</span>
                  </div>
                </div>

                {/* Status Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Status Konfirmasi Guru:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        isHadir
                          ? 'bg-emerald-100 text-emerald-800'
                          : isConfirmed
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isHadir
                        ? `Hadir (${record.teacherConfirmation.timestamp || 'Tercatat'})`
                        : isConfirmed
                        ? 'Izin / Sakit'
                        : 'Belum Konfirmasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Validasi Fisik Guru Piket:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        isPiketChecked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPiketChecked ? 'Terverifikasi Hadir' : 'Menunggu Pengecekan Piket'}
                    </span>
                  </div>

                  {record?.teacherConfirmation?.journalTopic && (
                    <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Materi Terisi: </span>
                      {record.teacherConfirmation.journalTopic}
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveJournalSchedule(schedule)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{isConfirmed ? 'Edit Jurnal & Absensi' : 'Mulai Mengajar & Isi Jurnal'}</span>
                  </button>

                  {!isHadir && (
                    <button
                      onClick={() => quickTeacherStatusToggle(schedule.id, 'hadir')}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                      title="1-Klik Cepat Konfirmasi Hadir"
                    >
                      Hadir Cepat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Journal Modal */}
      {activeJournalSchedule && (
        <JournalModal
          schedule={activeJournalSchedule}
          isOpen={!!activeJournalSchedule}
          onClose={() => setActiveJournalSchedule(null)}
        />
      )}
    </div>
  );
};
