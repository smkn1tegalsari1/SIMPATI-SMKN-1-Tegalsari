import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Clock,
  MapPin,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Layers,
  Calendar,
  BookCheck,
  KeyRound,
} from 'lucide-react';
import { ScheduleItem, ScheduleLessonStatus, Teacher, TeachingJournal } from '../../types';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';
import { GuruScheduleModal } from './GuruScheduleModal';
import { TambahJurnalModal } from '../jurnal/TambahJurnalModal';
import { EditAkunModal } from '../auth/EditAkunModal';

export const PembelajaranSayaView: React.FC = () => {
  const {
    schedules,
    currentUser,
    teachers,
    classes,
    subjects,
    rooms,
    currentDateString,
    currentTimeString,
    currentPeriod,
    effectiveWeekType,
    getScheduleStatus,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  } = useApp();

  // If logged in as admin or pimpinan, allow selecting which teacher to view as
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    currentUser.teacherId || (teachers[0]?.id ?? '')
  );
  const [selectedWeek, setSelectedWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | ScheduleLessonStatus>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [deleteTargetSchedule, setDeleteTargetSchedule] = useState<ScheduleItem | null>(null);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDraft, setJournalDraft] = useState<TeachingJournal | null>(null);
  const [isEditMyAccountOpen, setIsEditMyAccountOpen] = useState(false);

  // Keep selected teacher in sync when currentUser changes
  useEffect(() => {
    if (currentUser.teacherId) {
      setSelectedTeacherId(currentUser.teacherId);
    } else if (teachers.length > 0 && !teachers.some((t) => t.id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [currentUser.teacherId, teachers, selectedTeacherId]);

  // Safe teacher lookup
  const currentTeacherObj: Teacher = useMemo(() => {
    if (currentUser.role === 'guru') {
      const match = (currentUser.teacherId ? teachers.find((t) => t.id === currentUser.teacherId) : null) ||
        teachers.find((t) => t.id === selectedTeacherId);
      if (match) return match;
      // Fallback object from currentUser
      return {
        id: currentUser.teacherId || currentUser.id || 'guru-current',
        code: currentUser.username || 'GURU',
        nip: '-',
        name: currentUser.name || 'Guru Pengajar',
        title: currentUser.title || 'Guru SMKN 1 Tegalsari',
        email: '',
        phone: '',
      };
    }

    const found = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
    if (found) return found;

    return {
      id: 'guru-default',
      code: 'GURU',
      nip: '-',
      name: currentUser.name || 'Guru Pengajar',
      title: 'Guru SMKN 1 Tegalsari',
      email: '',
      phone: '',
    };
  }, [currentUser, teachers, selectedTeacherId]);

  const effectiveTeacherId = currentTeacherObj.id;

  const teacherBaseSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Cocokkan id atau nama/kode guru jika id belum sinkron
      const matchId = s.teacherId === effectiveTeacherId;
      const matchName = currentTeacherObj?.name && s.teacherName.toLowerCase() === currentTeacherObj.name.toLowerCase();
      const matchCode = currentTeacherObj?.code && s.teacherCode && s.teacherCode.toLowerCase() === currentTeacherObj.code.toLowerCase();

      if (!matchId && !matchName && !matchCode) return false;

      if (selectedWeek === 'ACTIVE') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === effectiveWeekType;
      } else if (selectedWeek !== 'ALL') {
        const itemWeek = s.weekType || 'ALL';
        return itemWeek === 'ALL' || itemWeek === selectedWeek;
      }
      return true;
    });
  }, [schedules, effectiveTeacherId, currentTeacherObj, selectedWeek, effectiveWeekType]);

  const teacherSchedules = useMemo(() => {
    if (selectedStatusTab === 'ALL') return teacherBaseSchedules;
    return teacherBaseSchedules.filter((s) => getScheduleStatus(s) === selectedStatusTab);
  }, [teacherBaseSchedules, selectedStatusTab, getScheduleStatus]);

  // Stat metrics for current teacher
  const stats = useMemo(() => {
    let berlangsung = 0;
    let selesai = 0;
    let terjadwal = 0;

    teacherBaseSchedules.forEach((s) => {
      const st = getScheduleStatus(s);
      if (st === 'Berlangsung') berlangsung++;
      else if (st === 'Selesai') selesai++;
      else terjadwal++;
    });

    return {
      total: teacherBaseSchedules.length,
      berlangsung,
      selesai,
      terjadwal,
    };
  }, [teacherBaseSchedules, getScheduleStatus]);

  // Handlers untuk simpan batch (rentang jam mulai s/d selesai) & hapus jadwal
  const handleSaveBatch = (schedulesToSave: ScheduleItem[]) => {
    if (editingSchedule && schedulesToSave.length === 1) {
      updateSchedule(schedulesToSave[0]);
    } else {
      // Jika sebelumnya sedang mengedit, hapus jadwal lama terlebih dahulu agar tidak duplikat
      if (editingSchedule) {
        deleteSchedule(editingSchedule.id);
      }
      // Tambahkan seluruh jadwal rentang baru
      schedulesToSave.forEach((sch) => {
        addSchedule(sch);
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTargetSchedule) {
      deleteSchedule(deleteTargetSchedule.id);
      setDeleteTargetSchedule(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E2E] via-[#0f283d] to-[#122F47] rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              Jadwal Pelajaran Saya
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Real-Time
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {currentTeacherObj.name}
          </h1>
          <p className="text-xs md:text-sm text-slate-300">
            {currentTeacherObj.title}
            {currentTeacherObj.code ? ` · Kode Guru: ${currentTeacherObj.code}` : ''}
            {currentTeacherObj?.department ? ` · Jurusan ${currentTeacherObj.department}` : ''}
          </p>

          {/* Real-time clock display */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {currentDateString} · {currentTimeString}
            </span>
            <span>·</span>
            <span className="text-emerald-300 font-bold">
              Jam Ke-{currentPeriod || 1}
            </span>
          </div>
        </div>

        {/* Right Section: Add Schedule Button, Edit Account Button & Teacher Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tombol Edit Akun Login Mandiri */}
          <button
            onClick={() => setIsEditMyAccountOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition cursor-pointer backdrop-blur-md active:scale-95"
            title="Edit Username & Password Akun Anda"
          >
            <KeyRound className="w-4 h-4 text-amber-300" />
            <span>Edit Akun Login</span>
          </button>

          {/* Tombol Input Jadwal Mandiri Guru */}
          <button
            onClick={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#0B1E2E] font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95"
            title="Tambah Jadwal Mengajar untuk akun Anda sendiri"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Input Jadwal Mengajar</span>
          </button>

          {/* Teacher selector for Admin/Pimpinan */}
          {currentUser.role !== 'guru' && teachers.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 space-y-1 text-xs">
              <span className="font-bold text-slate-200 block text-[11px]">Pilih Guru:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-slate-900/90 text-white font-bold p-2 rounded-xl border border-slate-700 outline-none w-full cursor-pointer text-xs"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Week Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-cyan-600" />
            <span>Rotasi Pekan:</span>
          </span>
          <button
            onClick={() => setSelectedWeek('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedWeek === 'ACTIVE'
                ? 'bg-[#0B1E2E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pekan Aktif ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})</span>
          </button>
          <button
            onClick={() => setSelectedWeek('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedWeek === 'ALL'
                ? 'bg-[#0B1E2E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Pekan
          </button>
        </div>

        <button
          onClick={() => {
            setEditingSchedule(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-900 font-bold text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Jadwal Lain</span>
        </button>
      </div>

      {/* 3 Status Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total Jadwal</span>
            <span className="font-extrabold text-slate-900 text-base tabular-nums">{stats.total} Jam</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Sedang Berlangsung</span>
            <span className="font-extrabold text-emerald-700 text-base tabular-nums">{stats.berlangsung} Jam</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Selesai</span>
            <span className="font-extrabold text-slate-700 text-base tabular-nums">{stats.selesai} Jam</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Terjadwal</span>
            <span className="font-extrabold text-sky-700 text-base tabular-nums">{stats.terjadwal} Jam</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs 3 Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedStatusTab === 'ALL'
                ? 'bg-[#0B1E2E] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setSelectedStatusTab('Berlangsung')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Berlangsung'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Berlangsung ({stats.berlangsung})</span>
          </button>
          <button
            onClick={() => setSelectedStatusTab('Selesai')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Selesai'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Selesai ({stats.selesai})</span>
          </button>
          <button
            onClick={() => setSelectedStatusTab('Terjadwal')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatusTab === 'Terjadwal'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-sky-800 hover:bg-sky-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Terjadwal ({stats.terjadwal})</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Menampilkan {teacherSchedules.length} dari {stats.total} jadwal mengajar
        </p>
      </div>

      {/* List of Teacher Schedules */}
      {teacherSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-slate-900">Belum Ada Jadwal Pelajaran</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Anda belum memasukkan jadwal pelajaran atau tidak ada jadwal yang sesuai dengan filter yang dipilih.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1E2E] hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Jadwal Mengajar Anda Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teacherSchedules.map((schedule) => {
            const status = getScheduleStatus(schedule);

            return (
              <div
                key={schedule.id}
                className={`bg-white rounded-2xl border shadow-2xs hover:shadow-md transition p-5 space-y-4 relative group ${
                  status === 'Berlangsung'
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Period & Status */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#0B1E2E] text-white font-black text-xs px-2.5 py-1 rounded-lg">
                      {schedule.dayName || 'HARI'} · Jam Ke-{schedule.periodIndex}
                    </span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {schedule.timeRange || `${schedule.startTime} - ${schedule.endTime}`}
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
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
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
                    {schedule.department && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-slate-600">{schedule.department}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Clean Status Footer & Action Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Status:</span>
                    <ScheduleStatusBadge status={status} size="sm" />
                  </div>

                  {/* Edit & Delete & Journal Action for Teacher */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        const todayISO = `${y}-${m}-${d}`;
                        const pNum = typeof schedule.periodIndex === 'number'
                          ? schedule.periodIndex
                          : parseInt(String(schedule.periodIndex), 10) || 1;
                        const matchedRoom = rooms.find((r) => r.name === schedule.roomName);

                        const draft: TeachingJournal = {
                          id: '',
                          date: todayISO,
                          teacherId: schedule.teacherId || effectiveTeacherId,
                          teacherName: schedule.teacherName,
                          teacherCode: schedule.teacherCode,
                          classId: schedule.classId,
                          className: schedule.className,
                          roomId: matchedRoom ? matchedRoom.id : undefined,
                          roomName: schedule.roomName,
                          subjectCode: schedule.subjectCode || 'MAPEL',
                          subjectName: schedule.subjectName,
                          startPeriod: pNum,
                          endPeriod: pNum,
                          topic: '',
                          createdAt: Date.now(),
                        };
                        setJournalDraft(draft);
                        setIsJournalModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#4E7D78] bg-[#6B9A95]/15 hover:bg-[#6B9A95]/25 transition cursor-pointer"
                      title="Isi Jurnal Mengajar untuk kelas ini"
                    >
                      <BookCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Isi Jurnal</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition cursor-pointer"
                      title="Ubah jadwal ini"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetSchedule(schedule)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus jadwal ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Input & Edit Jadwal Guru dengan Deteksi Bentrok & Rentang Jam */}
      <GuruScheduleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        teacher={currentTeacherObj}
        allSchedules={schedules}
        classes={classes}
        subjects={subjects}
        rooms={rooms}
        editingSchedule={editingSchedule}
        onSaveBatch={handleSaveBatch}
      />

      {/* Modal Konfirmasi Hapus Jadwal */}
      {deleteTargetSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Hapus Jadwal Mengajar?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Jadwal <strong>{deleteTargetSchedule.subjectName}</strong> ({deleteTargetSchedule.className}) pada {deleteTargetSchedule.dayName} Jam Ke-{deleteTargetSchedule.periodIndex} akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetSchedule(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs"
              >
                Ya, Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Jurnal Mengajar dari Pembelajaran Saya */}
      <TambahJurnalModal
        isOpen={isJournalModalOpen}
        onClose={() => {
          setIsJournalModalOpen(false);
          setJournalDraft(null);
        }}
        journalToEdit={journalDraft}
      />

      {/* Modal Edit Akun & Password Guru Sendiri */}
      <EditAkunModal
        isOpen={isEditMyAccountOpen}
        onClose={() => setIsEditMyAccountOpen(false)}
      />
    </div>
  );
};
