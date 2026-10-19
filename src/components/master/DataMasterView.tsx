import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  Users,
  BookOpen,
  School,
  Building2,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
  Pencil,
  X,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  Sliders,
  Copy,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Teacher, Subject, SchoolClass, Room, Department, AcademicYear, ScheduleItem, ScheduleWeekType } from '../../types';
import { BulkImportModal } from './BulkImportModal';
import { ScheduleImportModal } from './ScheduleImportModal';
import { BulkDeleteMasterModal } from './BulkDeleteMasterModal';
import { BulkEditMasterModal } from './BulkEditMasterModal';

export const DataMasterView: React.FC = () => {
  const {
    teachers,
    subjects,
    classes,
    rooms,
    departments,
    academicYears,
    schedules,
    currentDateString,
    currentTimeString,
    currentDayName,
    realtimeWeekType,
    activeWeekFilter,
    effectiveWeekType,
    getWeekTypeLabel,
    getWeekTypeShortLabel,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    bulkDeleteTeachers,
    bulkUpdateTeachers,
    importTeachers,
    addSubject,
    updateSubject,
    deleteSubject,
    bulkDeleteSubjects,
    bulkUpdateSubjects,
    importSubjects,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    bulkDeleteDepartments,
    bulkUpdateDepartments,
    addClass,
    updateClass,
    deleteClass,
    bulkDeleteClasses,
    bulkUpdateClasses,
    importClasses,
    addRoom,
    updateRoom,
    deleteRoom,
    bulkDeleteRooms,
    bulkUpdateRooms,
    importRooms,
    addAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    bulkDeleteAcademicYears,
    bulkUpdateAcademicYears,
    setActiveAcademicYear,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    bulkDeleteSchedules,
    bulkUpdateSchedules,
    clearAllSchedules,
    importSchedules,
    importClassSchedules,
  } = useApp();

  // Delete Confirmation & In-App Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal' | 'semua_jadwal';
    id?: string;
    title: string;
    subtitle?: string;
    badge?: string;
    warningNote?: string;
  } | null>(null);
  const [deleteAlertModal, setDeleteAlertModal] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'guru':
          if (deleteTarget.id) {
            deleteTeacher(deleteTarget.id);
            setToastNotification(`Data Guru "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'mapel':
          if (deleteTarget.id) {
            deleteSubject(deleteTarget.id);
            setToastNotification(`Mata Pelajaran "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'jurusan':
          if (deleteTarget.id) {
            deleteDepartment(deleteTarget.id);
            setToastNotification(`Jurusan "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'kelas':
          if (deleteTarget.id) {
            deleteClass(deleteTarget.id);
            setToastNotification(`Kelas "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'ruang':
          if (deleteTarget.id) {
            deleteRoom(deleteTarget.id);
            setToastNotification(`Ruangan "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'tahun_pelajaran':
          if (deleteTarget.id) {
            deleteAcademicYear(deleteTarget.id);
            setToastNotification(`Tahun Pelajaran "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'jadwal':
          if (deleteTarget.id) {
            deleteSchedule(deleteTarget.id);
            setToastNotification(`Jadwal "${deleteTarget.title}" berhasil dihapus.`);
          }
          break;
        case 'semua_jadwal':
          clearAllSchedules();
          setToastNotification('Seluruh jadwal pelajaran berhasil dikosongkan.');
          break;
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const [activeTab, setActiveTab] = useState<'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal'>('guru');
  const [search, setSearch] = useState('');

  // Bulk Selection & Action States (Centang Banyak)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearch('');
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    if (ids.length === 0) return;
    const isAllSelected = ids.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleBulkDeleteConfirm = () => {
    const count = selectedIds.length;
    if (count === 0) return;

    switch (activeTab) {
      case 'guru':
        bulkDeleteTeachers(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} data Guru secara bersamaan.`);
        break;
      case 'mapel':
        bulkDeleteSubjects(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} data Mata Pelajaran secara bersamaan.`);
        break;
      case 'jurusan':
        bulkDeleteDepartments(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} data Jurusan secara bersamaan.`);
        break;
      case 'kelas':
        bulkDeleteClasses(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} data Kelas dan jadwal terkait secara bersamaan.`);
        break;
      case 'ruang':
        bulkDeleteRooms(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} data Ruangan secara bersamaan.`);
        break;
      case 'tahun_pelajaran': {
        const activeYearSelected = academicYears.some((ay) => selectedIds.includes(ay.id) && ay.status === 'aktif');
        bulkDeleteAcademicYears(selectedIds);
        if (activeYearSelected) {
          setToastNotification(`Berhasil menghapus tahun ajaran non-aktif terpilih. Tahun ajaran yang aktif tetap dipertahankan.`);
        } else {
          setToastNotification(`Berhasil menghapus ${count} data Tahun Pelajaran secara bersamaan.`);
        }
        break;
      }
      case 'jadwal':
        bulkDeleteSchedules(selectedIds);
        setToastNotification(`Berhasil menghapus ${count} slot Jadwal Pelajaran secara bersamaan.`);
        break;
    }
    setSelectedIds([]);
  };

  const handleApplyBulkGuru = (updates: Partial<Teacher>) => {
    bulkUpdateTeachers(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Guru secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkMapel = (updates: Partial<Subject>) => {
    bulkUpdateSubjects(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Mata Pelajaran secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkJurusan = (updates: Partial<Department>) => {
    bulkUpdateDepartments(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Jurusan secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkKelas = (updates: Partial<SchoolClass>) => {
    bulkUpdateClasses(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Kelas secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkRuang = (updates: Partial<Room>) => {
    bulkUpdateRooms(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Ruangan secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkTahunPelajaran = (updates: Partial<AcademicYear>) => {
    bulkUpdateAcademicYears(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} data Tahun Pelajaran secara bersamaan.`);
    setSelectedIds([]);
  };

  const handleApplyBulkJadwal = (updates: Partial<ScheduleItem>) => {
    bulkUpdateSchedules(selectedIds, updates);
    setToastNotification(`Berhasil memperbarui ${selectedIds.length} slot Jadwal Pelajaran secara bersamaan.`);
    setSelectedIds([]);
  };

  const getSelectedItemsPreview = () => {
    switch (activeTab) {
      case 'guru':
        return teachers
          .filter((t) => selectedIds.includes(t.id))
          .map((t) => ({ id: t.id, title: t.name, subtitle: t.title || 'Guru Pengajar', badge: t.code }));
      case 'mapel':
        return subjects
          .filter((s) => selectedIds.includes(s.id))
          .map((s) => ({ id: s.id, title: s.name, subtitle: `${s.category} • ${s.jp} JP / Minggu`, badge: s.code }));
      case 'jurusan':
        return departments
          .filter((d) => selectedIds.includes(d.id))
          .map((d) => ({ id: d.id, title: d.name, subtitle: d.description || 'Program Keahlian', badge: d.code }));
      case 'kelas':
        return classes
          .filter((c) => selectedIds.includes(c.id))
          .map((c) => ({ id: c.id, title: c.name, subtitle: `Tingkat ${c.grade} • ${c.department} • Walikelas: ${c.homeroomTeacherName || 'Belum Ditentukan'}`, badge: c.code }));
      case 'ruang':
        return rooms
          .filter((r) => selectedIds.includes(r.id))
          .map((r) => ({ id: r.id, title: r.name, subtitle: `Gedung: ${r.building} • Tipe: ${r.type}`, badge: r.code }));
      case 'tahun_pelajaran':
        return academicYears
          .filter((ay) => selectedIds.includes(ay.id))
          .map((ay) => ({ id: ay.id, title: ay.name, subtitle: `${ay.startDate} s.d. ${ay.endDate}`, badge: ay.status === 'aktif' ? 'Aktif' : 'Non-Aktif' }));
      case 'jadwal':
        return schedules
          .filter((s) => selectedIds.includes(s.id))
          .map((s) => ({ id: s.id, title: `${s.subjectName} (${s.className})`, subtitle: `${s.dayName || 'Jadwal'} Jam Ke-${s.periodIndex} (${s.timeRange || s.startTime}) • ${s.teacherName}`, badge: s.roomName }));
      default:
        return [];
    }
  };

  const renderBulkActionBar = (tabLabel: string) => {
    if (selectedIds.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0B1E2E] via-slate-900 to-[#0B1E2E] text-white p-3.5 rounded-xl border border-cyan-500/40 shadow-md animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-400/30">
            {selectedIds.length}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {selectedIds.length} Data {tabLabel} Dicentang
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.2 rounded-full border border-cyan-700 font-semibold">
                Operasi Masal
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Gunakan opsi di samping untuk mengubah atau menghapus serentak tanpa perlu satu per satu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBulkEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Masal ({selectedIds.length})</span>
          </button>

          <button
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Masal ({selectedIds.length})</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded-lg transition cursor-pointer"
            title="Batalkan centang semua"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
        </div>
      </div>
    );
  };

  // Import Modal States
  const [importType, setImportType] = useState<null | 'guru' | 'mapel' | 'kelas' | 'ruang'>(null);

  // Manual Add Modal States
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [tCode, setTCode] = useState('');
  const [tName, setTName] = useState('');
  const [tTitle, setTTitle] = useState('');

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [sCode, setSCode] = useState('');
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState<'Umum' | 'Produktif' | 'Muatan Lokal'>('Umum');
  const [sJp, setSJp] = useState<number>(4);
  const [filterSubjectCat, setFilterSubjectCat] = useState<'ALL' | 'Umum' | 'Produktif' | 'Muatan Lokal'>('ALL');

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [dCode, setDCode] = useState('');
  const [dName, setDName] = useState('');
  const [dDesc, setDDesc] = useState('');

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cGrade, setCGrade] = useState<10 | 11 | 12>(11);
  const [cDept, setCDept] = useState(departments[0]?.code || 'TKJ');
  const [cHomeroom, setCHomeroom] = useState('');

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [rCode, setRCode] = useState('');
  const [rName, setRName] = useState('');
  const [rBuilding, setRBuilding] = useState('');
  const [rType, setRType] = useState<'Teori' | 'Lab Komputer' | 'Bengkel Praktik'>('Teori');

  const [isAddAyOpen, setIsAddAyOpen] = useState(false);
  const [ayName, setAyName] = useState('');
  const [ayStartDate, setAyStartDate] = useState('');
  const [ayEndDate, setAyEndDate] = useState('');

  // Edit States for all menus (Guru, Mapel, Jurusan, Kelas, Ruang, Tahun Pelajaran, Jadwal)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  // Jadwal States (Import, Add, Filters)
  const [isScheduleImportOpen, setIsScheduleImportOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [schFilterDay, setSchFilterDay] = useState<string>('SEMUA');
  const [schFilterClass, setSchFilterClass] = useState<string>('SEMUA');
  const [schFilterTeacher, setSchFilterTeacher] = useState<string>('SEMUA');
  const [schFilterWeek, setSchFilterWeek] = useState<string>('SEMUA');

  // Manual Add Schedule form state
  const [schDayName, setSchDayName] = useState<'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT'>('SENIN');
  const [schPeriod, setSchPeriod] = useState<number | string>(1);
  const [schTimeRange, setSchTimeRange] = useState('06.45 - 07.20');
  const [schClassId, setSchClassId] = useState(classes[0]?.id || '');
  const [schSubjectId, setSchSubjectId] = useState(subjects[0]?.id || '');
  const [schTeacherId, setSchTeacherId] = useState(teachers[0]?.id || '');
  const [schRoomId, setSchRoomId] = useState(rooms[0]?.id || '');
  const [schWeekType, setSchWeekType] = useState<ScheduleWeekType>('P10_PROD_P11_NORM');

  // Handlers for Manual Add
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName) return;
    const selectedMapel = tTitle || subjects[0]?.name || 'BAHASA INGGRIS';
    const newT: Teacher = {
      id: `t-${Date.now()}`,
      code: tCode || `G${teachers.length + 1}`,
      nip: '-',
      name: tName,
      title: selectedMapel, // Nama Mapel yang sinkron dengan menu data mapel
      email: `${tName.toLowerCase().replace(/[^a-z]/g, '')}@smkn1tegalsari.sch.id`,
      phone: '081234567890',
      isPiketToday: false,
    };
    addTeacher(newT);
    setTCode('');
    setTName('');
    setTTitle('');
    setIsAddTeacherOpen(false);
  };

  const handleUpdateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    updateTeacher(editingTeacher);
    setEditingTeacher(null);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sCode || !sName) return;
    const newSub: Subject = {
      id: `sb-${Date.now()}`,
      code: sCode,
      name: sName,
      category: sCategory,
      jp: sJp || 2,
    };
    addSubject(newSub);
    setSCode('');
    setSName('');
    setSJp(4);
    setIsAddSubjectOpen(false);
  };

  const handleUpdateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    updateSubject(editingSubject);
    setEditingSubject(null);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dCode || !dName) return;
    const newDept: Department = {
      id: `dp-${Date.now()}`,
      code: dCode.toUpperCase(),
      name: dName,
      description: dDesc,
    };
    addDepartment(newDept);
    setDCode('');
    setDName('');
    setDDesc('');
    setIsAddDeptOpen(false);
  };

  const handleUpdateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment) return;
    updateDepartment(editingDepartment);
    setEditingDepartment(null);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode || !cName) return;
    const teacherObj = teachers.find((t) => t.id === cHomeroom);
    const newCls: SchoolClass = {
      id: `cl-${Date.now()}`,
      code: cCode,
      name: cName,
      grade: cGrade,
      department: cDept,
      homeroomTeacherId: cHomeroom || undefined,
      homeroomTeacherName: teacherObj ? teacherObj.name : undefined,
      totalStudents: 36,
    };
    addClass(newCls);
    setCCode('');
    setCName('');
    setCHomeroom('');
    setIsAddClassOpen(false);
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const teacherObj = teachers.find((t) => t.id === editingClass.homeroomTeacherId);
    updateClass({
      ...editingClass,
      homeroomTeacherName: teacherObj ? teacherObj.name : editingClass.homeroomTeacherName,
    });
    setEditingClass(null);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rCode || !rName) return;
    const newRm: Room = {
      id: `rm-${Date.now()}`,
      code: rCode,
      name: rName,
      building: rBuilding || 'Gedung Utama',
      type: rType,
    };
    addRoom(newRm);
    setRCode('');
    setRName('');
    setRBuilding('');
    setIsAddRoomOpen(false);
  };

  const handleUpdateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    updateRoom(editingRoom);
    setEditingRoom(null);
  };

  const handleSaveAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ayName) return;
    const newAy: AcademicYear = {
      id: `ay-${Date.now()}`,
      name: ayName,
      startDate: ayStartDate || '2026-07-15',
      endDate: ayEndDate || '2026-12-20',
      status: academicYears.length === 0 ? 'aktif' : 'non_aktif',
    };
    addAcademicYear(newAy);
    setAyName('');
    setAyStartDate('');
    setAyEndDate('');
    setIsAddAyOpen(false);
  };

  const handleUpdateAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcademicYear) return;
    updateAcademicYear(editingAcademicYear);
    setEditingAcademicYear(null);
  };

  // Handlers for Jadwal Pelajaran (Tambah Manual, Edit, & Impor)
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const selClass = classes.find((c) => c.id === schClassId) || classes[0];
    const selSub = subjects.find((s) => s.id === schSubjectId) || subjects[0];
    const selTeacher = teachers.find((t) => t.id === schTeacherId) || teachers[0];
    const selRoom = rooms.find((r) => r.id === schRoomId) || rooms[0];

    const dayMap: Record<string, number> = {
      SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5,
    };

    const timeParts = schTimeRange.split('-').map((t) => t.trim().replace('.', ':'));
    const startTime = timeParts[0] || '06:45';
    const endTime = timeParts[1] || '07:20';

    const newItem: ScheduleItem = {
      id: `sc-man-${Date.now()}`,
      dayOfWeek: dayMap[schDayName] || 1,
      dayName: schDayName,
      periodIndex: schPeriod,
      timeRange: schTimeRange,
      startTime,
      endTime,
      teacherId: selTeacher ? selTeacher.id : 't-none',
      teacherName: selTeacher ? selTeacher.name : 'Guru Pengajar',
      teacherCode: selTeacher?.code,
      subjectCode: selSub ? selSub.code : 'MPL',
      subjectName: selSub ? selSub.name : 'Mata Pelajaran',
      classId: selClass ? selClass.id : 'cl-1',
      className: selClass ? selClass.name : 'Kelas',
      department: selClass ? selClass.department : 'TKJ',
      roomName: selRoom ? selRoom.name : 'Ruang Teori',
      roomType: selRoom ? selRoom.type : 'Teori',
      weekType: schWeekType,
    };

    addSchedule(newItem);
    setIsAddScheduleOpen(false);
  };

  const handleUpdateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    const selClass = classes.find((c) => c.id === editingSchedule.classId);
    const selSub = subjects.find((s) => s.code === editingSchedule.subjectCode || s.name === editingSchedule.subjectName);
    const selTeacher = teachers.find((t) => t.id === editingSchedule.teacherId);
    const selRoom = rooms.find((r) => r.name === editingSchedule.roomName);

    const dayMap: Record<string, number> = {
      SENIN: 1, SELASA: 2, RABU: 3, KAMIS: 4, JUMAT: 5,
    };

    const timeParts = (editingSchedule.timeRange || '').split('-').map((t) => t.trim().replace('.', ':'));
    const startTime = timeParts[0] || editingSchedule.startTime || '07:00';
    const endTime = timeParts[1] || editingSchedule.endTime || '07:45';

    const updated: ScheduleItem = {
      ...editingSchedule,
      dayOfWeek: dayMap[(editingSchedule.dayName || 'SELASA').toUpperCase()] || editingSchedule.dayOfWeek || 1,
      startTime,
      endTime,
      className: selClass ? selClass.name : editingSchedule.className,
      department: selClass ? selClass.department : editingSchedule.department,
      teacherName: selTeacher ? selTeacher.name : editingSchedule.teacherName,
      teacherCode: selTeacher ? selTeacher.code : editingSchedule.teacherCode,
      subjectName: selSub ? selSub.name : editingSchedule.subjectName,
      subjectCode: selSub ? selSub.code : editingSchedule.subjectCode,
      roomName: selRoom ? selRoom.name : editingSchedule.roomName,
      roomType: selRoom ? selRoom.type : editingSchedule.roomType,
      weekType: editingSchedule.weekType || 'P10_PROD_P11_NORM',
    };

    updateSchedule(updated);
    setEditingSchedule(null);
  };

  const handleDuplicateScheduleToOtherWeek = (s: ScheduleItem) => {
    const targetWeek: ScheduleWeekType =
      s.weekType === 'P10_PROD_P11_NORM' ? 'P10_NORM_P11_PROD' : 'P10_PROD_P11_NORM';
    const targetLabel =
      targetWeek === 'P10_PROD_P11_NORM'
        ? 'Pekan K10 Produktif & K11 NormAdaptif'
        : 'Pekan K10 NormAdaptif & K11 Produktif';

    const dup: ScheduleItem = {
      ...s,
      id: `sc-dup-${Date.now()}`,
      weekType: targetWeek,
    };
    addSchedule(dup);
    setToastNotification(`Jadwal "${s.subjectName} (${s.className})" berhasil diduplikat ke ${targetLabel}.`);
  };

  const handleImportScheduleData = (
    newScheds: ScheduleItem[],
    newTeach: Teacher[],
    newSubs: Subject[],
    newRooms: Room[],
    targetClassId: string
  ) => {
    if (newTeach && newTeach.length > 0) {
      importTeachers(newTeach);
    }
    if (newSubs && newSubs.length > 0) {
      importSubjects(newSubs);
    }
    if (newRooms && newRooms.length > 0) {
      importRooms(newRooms);
    }
    importClassSchedules(targetClassId, newScheds);
    const targetClassObj = classes.find((c) => c.id === targetClassId);
    setToastNotification(
      `Berhasil mengimpor ${newScheds.length} jadwal pelajaran untuk kelas ${
        targetClassObj?.name || 'terpilih'
      } dan menyinkronkan data guru & ruangan!`
    );
  };

  // Bulk Import Handlers
  const handleImportTeachers = (parsed: Record<string, string>[]) => {
    const list: Teacher[] = parsed.map((p, i) => ({
      id: `t-imp-${Date.now()}-${i}`,
      code: p.kode || `G${teachers.length + i + 1}`,
      nip: p.nip || '-',
      name: p.nama || `Guru ${i + 1}`,
      title: p.mapel || p.jabatan || subjects[0]?.name || 'BAHASA INGGRIS',
      email: `${(p.nama || 'guru').toLowerCase().replace(/[^a-z]/g, '')}@smkn1tegalsari.sch.id`,
      phone: '081234567890',
      isPiketToday: false,
    }));
    importTeachers(list);
    setToastNotification(`Berhasil mengimpor ${list.length} data Guru!`);
  };

  // Export Data Guru (Excel / CSV) sinkron dengan template
  const handleExportTeachers = () => {
    try {
      const headers = ['Kode Guru', 'Nama Lengkap', 'Nama Mapel'];
      const rows = teachers.map((t) => [t.code, t.name, t.title || '']);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 32 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
      XLSX.writeFile(wb, `data_guru_smkn1tegalsari_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToastNotification(`Berhasil mengekspor ${teachers.length} data Guru!`);
    } catch {
      // Fallback CSV
      const headers = 'Kode Guru,Nama Lengkap,Nama Mapel';
      const rows = teachers.map((t) => `"${t.code}","${t.name}","${t.title || ''}"`).join('\n');
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `data_guru_smkn1tegalsari_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastNotification(`Berhasil mengekspor ${teachers.length} data Guru (CSV)!`);
    }
  };

  // Export Data Mata Pelajaran (Excel)
  const handleExportSubjects = () => {
    try {
      const headers = ['Kode Mapel', 'Nama Mata Pelajaran', 'Kategori', 'Jumlah JP'];
      const rows = subjects.map((s) => [s.code, s.name, s.category, s.jp]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Mata Pelajaran');
      XLSX.writeFile(wb, `data_mapel_smkn1tegalsari_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setToastNotification(`Berhasil mengekspor ${subjects.length} data Mata Pelajaran!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportSubjects = (parsed: Record<string, string>[]) => {
    const list: Subject[] = parsed.map((p, i) => {
      const catLower = (p.kategori || '').toLowerCase();
      let cat: 'Umum' | 'Produktif' | 'Muatan Lokal' = 'Umum';
      if (catLower.includes('prod')) {
        cat = 'Produktif';
      } else if (catLower.includes('muatan') || catLower.includes('lokal') || catLower.includes('mulok')) {
        cat = 'Muatan Lokal';
      } else {
        cat = 'Umum';
      }

      return {
        id: `sb-imp-${Date.now()}-${i}`,
        code: p.kode || `MAPEL-${i + 1}`,
        name: p.nama || 'Mata Pelajaran',
        category: cat,
        jp: parseInt(p.jp || '4', 10) || 4,
      };
    });
    importSubjects(list);
    setToastNotification(`Berhasil mengimpor ${list.length} data Mata Pelajaran!`);
  };

  const handleImportClasses = (parsed: Record<string, string>[]) => {
    const list: SchoolClass[] = parsed.map((p, i) => {
      const teacherObj = teachers.find((t) => t.name.toLowerCase().includes((p.walikelas || '').toLowerCase()));
      const gradeNum = p.tingkat?.includes('10') ? 10 : p.tingkat?.includes('12') ? 12 : 11;
      return {
        id: `cl-imp-${Date.now()}-${i}`,
        code: p.kode || `KL-${i + 1}`,
        name: p.nama || `Kelas ${i + 1}`,
        grade: gradeNum as 10 | 11 | 12,
        department: p.jurusan || departments[0]?.code || 'TKJ',
        homeroomTeacherId: teacherObj?.id,
        homeroomTeacherName: teacherObj ? teacherObj.name : p.walikelas || undefined,
        totalStudents: 36,
      };
    });
    importClasses(list);
    setToastNotification(`Berhasil mengimpor ${list.length} data Kelas!`);
  };

  const handleImportRooms = (parsed: Record<string, string>[]) => {
    const list: Room[] = parsed.map((p, i) => {
      const isLab = (p.nama || '').toLowerCase().includes('lab');
      const isBengkel = (p.nama || '').toLowerCase().includes('bengkel');
      return {
        id: `rm-imp-${Date.now()}-${i}`,
        code: p.kode || `R-${i + 1}`,
        name: p.nama || `Ruang ${i + 1}`,
        building: p.gedung || 'Gedung Sekolah',
        type: isBengkel ? 'Bengkel Praktik' : isLab ? 'Lab Komputer' : 'Teori',
      };
    });
    importRooms(list);
    setToastNotification(`Berhasil mengimpor ${list.length} data Ruangan!`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Master Data Akademik & Kurikulum</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Data Master SMKN 1 Tegalsari
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data pendidik, mata pelajaran, jurusan, kelas, fasilitas ruang/bengkel, tahun pelajaran, dan jadwal pelajaran mingguan.
          </p>
        </div>

        {/* Real-time Laptop Clock & Active Week Rotation Display */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentDateString} · {currentTimeString}</span>
          </span>
          <span className="text-xs font-bold text-slate-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-cyan-700" />
            <span>
              Rotasi Aktif:{' '}
              <strong className="underline text-amber-950">
                {effectiveWeekType === 'P10_PROD_P11_NORM'
                  ? 'Pekan K10 Prod & K11 Norm'
                  : effectiveWeekType === 'P10_NORM_P11_PROD'
                  ? 'Pekan K10 Norm & K11 Prod'
                  : 'Semua Pekan'}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('guru')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'guru' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Guru ({teachers.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('mapel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'mapel' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mata Pelajaran ({subjects.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('jurusan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'jurusan' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Jurusan ({departments.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('kelas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'kelas' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Kelas & Rombel ({classes.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('ruang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'ruang' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ruangan & Bengkel ({rooms.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('tahun_pelajaran')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'tahun_pelajaran' ? 'bg-[#0B1E2E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tahun Pelajaran ({academicYears.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('jadwal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'jadwal' ? 'bg-[#0B1E2E] text-amber-300 ring-2 ring-amber-400/50 shadow-md' : 'text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-amber-500" />
          <span>Jadwal Pelajaran ({schedules.length})</span>
        </button>
      </div>

      {/* 1. TAB: DATA GURU */}
      {activeTab === 'guru' && (() => {
        const filteredTeachers = teachers.filter((t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.nip && t.nip.includes(search)) ||
          t.code.toLowerCase().includes(search.toLowerCase()) ||
          t.title.toLowerCase().includes(search.toLowerCase())
        );
        const isAllSelected = filteredTeachers.length > 0 && filteredTeachers.every((t) => selectedIds.includes(t.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            {renderBulkActionBar('Guru')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode, nama guru, mapel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportTeachers}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Unduh seluruh data guru dalam format Excel/CSV yang sinkron dengan template impor"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Ekspor Data Guru</span>
                </button>
                <button
                  onClick={() => setImportType('guru')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Impor Data Guru (CSV/Excel)</span>
                </button>
                <button
                  onClick={() => setIsAddTeacherOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredTeachers.map((t) => t.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center">KODE GURU</th>
                    <th className="py-2.5 px-3">NAMA LENGKAP</th>
                    <th className="py-2.5 px-3">NAMA MAPEL (YANG DIAMPU)</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((t) => {
                    const isChecked = selectedIds.includes(t.id);
                    return (
                      <tr key={t.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(t.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang guru ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-800 bg-cyan-50/50 rounded-md">
                          {t.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{t.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-cyan-900 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span>{t.title}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingTeacher(t)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Data Guru"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'guru',
                                  id: t.id,
                                  title: t.name,
                                  subtitle: `Mapel: ${t.title || '-'}`,
                                  badge: `Kode: ${t.code}`,
                                  warningNote: 'Data guru akan dihapus permanen. Jadwal mengajar yang terhubung dengan guru ini akan otomatis dialihkan menjadi "Belum Ditentukan".'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 2. TAB: MATA PELAJARAN */}
      {activeTab === 'mapel' && (() => {
        const filteredSubjects = subjects.filter((s) => {
          const matchSearch =
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.code.toLowerCase().includes(search.toLowerCase());
          const matchCat = filterSubjectCat === 'ALL' || s.category === filterSubjectCat;
          return matchSearch && matchCat;
        });
        const isAllSelected = filteredSubjects.length > 0 && filteredSubjects.every((s) => selectedIds.includes(s.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {renderBulkActionBar('Mata Pelajaran')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode mapel, nama mapel..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                  />
                </div>

                {/* Filter Kategori Mapel */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <span className="font-semibold text-slate-600">Kategori:</span>
                  <select
                    value={filterSubjectCat}
                    onChange={(e) => setFilterSubjectCat(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Kategori (3 Kategori)</option>
                    <option value="Umum">Umum</option>
                    <option value="Produktif">Produktif</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportSubjects}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                  title="Ekspor Data Mapel format Excel"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => setImportType('mapel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Impor Data Mapel</span>
                </button>
                <button
                  onClick={() => setIsAddSubjectOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Mata Pelajaran</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredSubjects.map((s) => s.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center">KODE MAPEL</th>
                    <th className="py-2.5 px-3">NAMA MATA PELAJARAN</th>
                    <th className="py-2.5 px-3">KATEGORI</th>
                    <th className="py-2.5 px-3 text-center">JUMLAH JP</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((s) => {
                    const isChecked = selectedIds.includes(s.id);
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(s.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang mapel ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{s.code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                              s.category === 'Produktif'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : s.category === 'Muatan Lokal'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.category === 'Produktif'
                                  ? 'bg-emerald-500'
                                  : s.category === 'Muatan Lokal'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            {s.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {s.jp} JP / Minggu
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingSubject(s)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Mata Pelajaran"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'mapel',
                                  id: s.id,
                                  title: s.name,
                                  subtitle: `Kode: ${s.code} • Kategori: ${s.category} • Beban: ${s.jp} JP/Minggu`,
                                  badge: `${s.jp} JP`,
                                  warningNote: 'Mata pelajaran ini akan dihapus. Guru pengampu mapel ini dan data terkait akan disesuaikan.'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Mapel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 3. TAB: JURUSAN */}
      {activeTab === 'jurusan' && (() => {
        const filteredDepartments = departments.filter((d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.code.toLowerCase().includes(search.toLowerCase()) ||
          (d.description || '').toLowerCase().includes(search.toLowerCase())
        );
        const isAllSelected = filteredDepartments.length > 0 && filteredDepartments.every((d) => selectedIds.includes(d.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {renderBulkActionBar('Jurusan')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode jurusan, nama jurusan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>
              <button
                onClick={() => setIsAddDeptOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jurusan Baru</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredDepartments.map((d) => d.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center">KODE JURUSAN</th>
                    <th className="py-2.5 px-3">NAMA JURUSAN</th>
                    <th className="py-2.5 px-3">DESKRIPSI KEAHLIAN</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((d) => {
                    const isChecked = selectedIds.includes(d.id);
                    return (
                      <tr key={d.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(d.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang jurusan ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50 rounded">
                          {d.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">{d.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{d.description || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingDepartment(d)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Jurusan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'jurusan',
                                  id: d.id,
                                  title: d.name,
                                  subtitle: `Kode Jurusan: ${d.code} • ${d.description || 'Program Keahlian'}`,
                                  badge: d.code,
                                  warningNote: 'Jurusan ini akan dihapus dari daftar kompetensi keahlian sekolah.'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Jurusan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 4. TAB: KELAS & ROMBEL */}
      {activeTab === 'kelas' && (() => {
        const filteredClasses = classes.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          (c.homeroomTeacherName || '').toLowerCase().includes(search.toLowerCase())
        );
        const isAllSelected = filteredClasses.length > 0 && filteredClasses.every((c) => selectedIds.includes(c.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {renderBulkActionBar('Kelas')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode kelas, nama kelas, walikelas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImportType('kelas')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Impor Data Kelas</span>
                </button>
                <button
                  onClick={() => setIsAddClassOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas Baru</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredClasses.map((c) => c.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center">KODE KELAS</th>
                    <th className="py-2.5 px-3">NAMA KELAS</th>
                    <th className="py-2.5 px-3 text-center">TINGKAT</th>
                    <th className="py-2.5 px-3">JURUSAN</th>
                    <th className="py-2.5 px-3">WALI KELAS</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.map((c) => {
                    const isChecked = selectedIds.includes(c.id);
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(c.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang kelas ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{c.code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">{c.name}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">Kelas {c.grade}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{c.department}</td>
                        <td className="py-2.5 px-3 font-semibold text-cyan-900">
                          {c.homeroomTeacherName || <span className="text-slate-400 italic">Belum ditentukan</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingClass(c)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Data Kelas"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'kelas',
                                  id: c.id,
                                  title: c.name,
                                  subtitle: `Tingkat: ${c.grade} • Jurusan: ${c.department} • Walikelas: ${c.homeroomTeacherName || 'Belum Ditentukan'}`,
                                  badge: `Kode: ${c.code}`,
                                  warningNote: 'Menghapus kelas ini juga akan sekaligus membersihkan seluruh jadwal pelajaran yang terdaftar pada kelas ini.'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 5. TAB: RUANGAN & BENGKEL */}
      {activeTab === 'ruang' && (() => {
        const filteredRooms = rooms.filter((r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.code.toLowerCase().includes(search.toLowerCase()) ||
          r.building.toLowerCase().includes(search.toLowerCase())
        );
        const isAllSelected = filteredRooms.length > 0 && filteredRooms.every((r) => selectedIds.includes(r.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {renderBulkActionBar('Ruangan & Bengkel')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode ruangan, nama ruangan, gedung..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImportType('ruang')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Impor Data Ruangan</span>
                </button>
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Ruangan</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredRooms.map((r) => r.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center">KODE RUANGAN</th>
                    <th className="py-2.5 px-3">NAMA RUANGAN</th>
                    <th className="py-2.5 px-3">NAMA GEDUNG</th>
                    <th className="py-2.5 px-3">TIPE FASILITAS</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((r) => {
                    const isChecked = selectedIds.includes(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang ruangan ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{r.code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">{r.building}</td>
                        <td className="py-2.5 px-3">
                          <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingRoom(r)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Ruangan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'ruang',
                                  id: r.id,
                                  title: r.name,
                                  subtitle: `Lokasi: ${r.building} • Tipe: ${r.type}`,
                                  badge: `Kode: ${r.code}`,
                                  warningNote: 'Fasilitas ruangan/bengkel ini akan dihapus dari daftar sarana prasarana sekolah.'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Ruangan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 6. TAB: TAHUN PELAJARAN */}
      {activeTab === 'tahun_pelajaran' && (() => {
        const filteredAY = academicYears.filter((ay) =>
          ay.name.toLowerCase().includes(search.toLowerCase()) ||
          ay.status.toLowerCase().includes(search.toLowerCase())
        );
        const isAllSelected = filteredAY.length > 0 && filteredAY.every((ay) => selectedIds.includes(ay.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {renderBulkActionBar('Tahun Pelajaran')}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Atur tahun pelajaran aktif dan semester. Tahun pelajaran yang aktif akan digunakan pada header sistem SIMPATI dan berita acara laporan.
              </p>
              <button
                onClick={() => setIsAddAyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tahun Pelajaran</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredAY.map((ay) => ay.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3">TAHUN PELAJARAN</th>
                    <th className="py-2.5 px-3">TANGGAL DIMULAI</th>
                    <th className="py-2.5 px-3">TANGGAL SELESAI</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                    <th className="py-2.5 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAY.map((ay) => {
                    const isChecked = selectedIds.includes(ay.id);
                    return (
                      <tr key={ay.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(ay.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang tahun pelajaran ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">{ay.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">{ay.startDate}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">{ay.endDate}</td>
                        <td className="py-2.5 px-3 text-center">
                          {ay.status === 'aktif' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-300">
                              <Check className="w-3 h-3" /> Aktif Digunakan
                            </span>
                          ) : (
                            <button
                              onClick={() => setActiveAcademicYear(ay.id)}
                              className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300 transition cursor-pointer"
                            >
                              Jadikan Aktif
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingAcademicYear(ay)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Tahun Pelajaran"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (ay.status === 'aktif') {
                                  setDeleteAlertModal(
                                    `Tahun pelajaran "${ay.name}" saat ini berstatus AKTIF dan menjadi acuan utama jadwal KBM SIMPATI. Anda tidak dapat menghapus tahun pelajaran yang sedang aktif. Silakan aktifkan tahun ajaran lainnya terlebih dahulu.`
                                  );
                                  return;
                                }
                                setDeleteTarget({
                                  type: 'tahun_pelajaran',
                                  id: ay.id,
                                  title: ay.name,
                                  subtitle: `Periode: ${ay.startDate} s.d. ${ay.endDate}`,
                                  badge: 'Non-Aktif',
                                  warningNote: 'Tahun pelajaran ini akan dihapus dari arsip tahun ajaran sekolah.'
                                });
                              }}
                              disabled={ay.status === 'aktif'}
                              className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition cursor-pointer"
                              title={ay.status === 'aktif' ? 'Tahun aktif tidak dapat dihapus' : 'Hapus Tahun Pelajaran'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 7. TAB: JADWAL PELAJARAN (ROTASI MINGGUAN SMK) */}
      {activeTab === 'jadwal' && (() => {
        const countP1 = schedules.filter((s) => s.weekType === 'P10_PROD_P11_NORM').length;
        const countP2 = schedules.filter((s) => s.weekType === 'P10_NORM_P11_PROD').length;
        const countAll = schedules.filter((s) => s.weekType === 'ALL' || !s.weekType).length;

        const filteredSchedules = schedules
          .filter((s) => {
            const q = search.toLowerCase();
            const matchesSearch =
              !q ||
              s.subjectName.toLowerCase().includes(q) ||
              s.subjectCode.toLowerCase().includes(q) ||
              s.teacherName.toLowerCase().includes(q) ||
              (s.teacherCode && s.teacherCode.toLowerCase().includes(q)) ||
              s.className.toLowerCase().includes(q) ||
              s.roomName.toLowerCase().includes(q) ||
              (s.dayName ? s.dayName.toLowerCase().includes(q) : false);

            const scheduleDay = (s.dayName || 'SELASA').toUpperCase();
            const matchesDay = schFilterDay === 'SEMUA' || scheduleDay === schFilterDay;
            const matchesClass = schFilterClass === 'SEMUA' || s.classId === schFilterClass;
            const matchesTeacher = schFilterTeacher === 'SEMUA' || s.teacherId === schFilterTeacher;
            const matchesWeek =
              schFilterWeek === 'SEMUA' ||
              (schFilterWeek === 'ALL' && (s.weekType === 'ALL' || !s.weekType)) ||
              s.weekType === schFilterWeek;

            return matchesSearch && matchesDay && matchesClass && matchesTeacher && matchesWeek;
          })
          .sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.localeCompare(b.startTime);
          });

        const isAllSelected = filteredSchedules.length > 0 && filteredSchedules.every((s) => selectedIds.includes(s.id));

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            {renderBulkActionBar('Jadwal Pelajaran')}

            {/* Header Info & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-cyan-50/40 to-amber-50/40 p-4 rounded-xl border border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-cyan-800 font-bold text-xs uppercase tracking-wide">
                  <CalendarDays className="w-4 h-4 text-cyan-700" />
                  <span>Sistem Jadwal Blok Mingguan SMKN 1 Tegalsari</span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Jadwal Pelajaran Rotasi Kelas 10 & 11 Terintegrasi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mendukung 2 jadwal berbeda setiap minggu: <strong>Pekan K10 Produktif & K11 Normatif Adaptif</strong> serta <strong>Pekan K10 Normatif Adaptif & K11 Produktif</strong>. Sinkron otomatis ke seluruh modul.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsScheduleImportOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-950" />
                  <span>Impor Jadwal (Format Excel/CSV)</span>
                </button>

                <button
                  onClick={() => {
                    setSchClassId(classes[0]?.id || '');
                    setSchSubjectId(subjects[0]?.id || '');
                    setSchTeacherId(teachers[0]?.id || '');
                    setSchRoomId(rooms[0]?.id || '');
                    setSchWeekType('P10_PROD_P11_NORM');
                    setIsAddScheduleOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1E2E] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Tambah Jadwal Manual</span>
                </button>
              </div>
            </div>

            {/* TAB ROTASI MINGGUAN KHUSUS SMK */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSchFilterWeek('SEMUA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  schFilterWeek === 'SEMUA'
                    ? 'bg-[#0B1E2E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <span>Semua Jadwal</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{schedules.length}</span>
              </button>

              <button
                onClick={() => setSchFilterWeek('P10_PROD_P11_NORM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  schFilterWeek === 'P10_PROD_P11_NORM'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Pekan K10 Produktif & K11 Normatif Adaptif</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30">{countP1}</span>
              </button>

              <button
                onClick={() => setSchFilterWeek('P10_NORM_P11_PROD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  schFilterWeek === 'P10_NORM_P11_PROD'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Pekan K10 Normatif Adaptif & K11 Produktif</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30">{countP2}</span>
              </button>

              <button
                onClick={() => setSchFilterWeek('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  schFilterWeek === 'ALL'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>Berlaku Kedua Pekan (Rutin)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">{countAll}</span>
              </button>

              {/* Indikator Kalender Laptop Real-Time */}
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Waktu Laptop Real-Time:{' '}
                  <strong className="underline">
                    {realtimeWeekType === 'P10_PROD_P11_NORM'
                      ? 'Pekan K10 Produktif & K11 NormAdaptif'
                      : 'Pekan K10 NormAdaptif & K11 Produktif'}
                  </strong>
                </span>
                <button
                  onClick={() => setSchFilterWeek(realtimeWeekType)}
                  className="ml-1 text-cyan-800 hover:text-cyan-950 font-extrabold underline cursor-pointer text-[10px]"
                >
                  Tampilkan
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              {/* Search */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian Cepat</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari mapel, guru, kelas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                  />
                </div>
              </div>

              {/* Filter Pekan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Rotasi Pekan</label>
                <select
                  value={schFilterWeek}
                  onChange={(e) => setSchFilterWeek(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold text-slate-800"
                >
                  <option value="SEMUA">Semua Rotasi Pekan</option>
                  <option value="P10_PROD_P11_NORM">Pekan K10 Prod & K11 Norm</option>
                  <option value="P10_NORM_P11_PROD">Pekan K10 Norm & K11 Prod</option>
                  <option value="ALL">Berlaku Kedua Pekan</option>
                </select>
              </div>

              {/* Filter Hari */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Hari</label>
                <select
                  value={schFilterDay}
                  onChange={(e) => setSchFilterDay(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold text-slate-800"
                >
                  <option value="SEMUA">Semua Hari</option>
                  <option value="SENIN">SENIN</option>
                  <option value="SELASA">SELASA</option>
                  <option value="RABU">RABU</option>
                  <option value="KAMIS">KAMIS</option>
                  <option value="JUMAT">JUMAT</option>
                </select>
              </div>

              {/* Filter Kelas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Kelas</label>
                <select
                  value={schFilterClass}
                  onChange={(e) => setSchFilterClass(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold text-slate-800"
                >
                  <option value="SEMUA">Semua Kelas ({classes.length} Rombel)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Guru */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Guru</label>
                <select
                  value={schFilterTeacher}
                  onChange={(e) => setSchFilterTeacher(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold text-slate-800"
                >
                  <option value="SEMUA">Semua Guru ({teachers.length} Guru)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.code}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Bar and Quick Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Menampilkan <strong className="text-cyan-700">{filteredSchedules.length}</strong> dari total <strong>{schedules.length}</strong> jadwal pelajaran.
                </span>
                {(schFilterDay !== 'SEMUA' || schFilterClass !== 'SEMUA' || schFilterTeacher !== 'SEMUA' || schFilterWeek !== 'SEMUA' || search) && (
                  <button
                    onClick={() => {
                      setSchFilterDay('SEMUA');
                      setSchFilterClass('SEMUA');
                      setSchFilterTeacher('SEMUA');
                      setSchFilterWeek('SEMUA');
                      setSearch('');
                    }}
                    className="text-cyan-700 hover:text-cyan-900 font-bold underline text-[11px] cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {schedules.length > 0 && (
                <button
                  onClick={() => {
                    setDeleteTarget({
                      type: 'semua_jadwal',
                      title: 'Kosongkan Seluruh Jadwal Pelajaran',
                      subtitle: `Total: ${schedules.length} slot jadwal pelajaran terdaftar`,
                      badge: 'Semua Kelas',
                      warningNote: 'Seluruh jadwal pelajaran akan dihapus. Data Master Guru, Mapel, Kelas, dan Ruangan TETAP AMAN dan tidak akan terhapus.'
                    });
                  }}
                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bersihkan Seluruh Jadwal</span>
                </button>
              )}
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200 tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => toggleSelectAll(filteredSchedules.map((s) => s.id))}
                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        title="Pilih / Batalkan Semua"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-center w-12">NO</th>
                    <th className="py-2.5 px-3">ROTASI PEKAN</th>
                    <th className="py-2.5 px-3">HARI & JAM</th>
                    <th className="py-2.5 px-3">PUKUL (WAKTU)</th>
                    <th className="py-2.5 px-3">KELAS & JURUSAN</th>
                    <th className="py-2.5 px-3">MATA PELAJARAN</th>
                    <th className="py-2.5 px-3">GURU PENGAJAR</th>
                    <th className="py-2.5 px-3">RUANG / BENGKEL</th>
                    <th className="py-2.5 px-3 text-center w-28">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map((item, idx) => {
                    const dayBadgeColor: Record<string, string> = {
                      SENIN: 'bg-blue-50 text-blue-700 border-blue-200',
                      SELASA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      RABU: 'bg-purple-50 text-purple-700 border-purple-200',
                      KAMIS: 'bg-amber-50 text-amber-800 border-amber-200',
                      JUMAT: 'bg-teal-50 text-teal-700 border-teal-200',
                    };

                    const dayDisplay = item.dayName || 'SELASA';
                    const isChecked = selectedIds.includes(item.id);

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-cyan-50/70 ring-1 ring-inset ring-cyan-200' : ''}`}>
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            title="Centang jadwal ini"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* ROTASI PEKAN */}
                        <td className="py-2.5 px-3">
                          {item.weekType === 'P10_PROD_P11_NORM' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              K10 Prod · K11 Norm
                            </span>
                          ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              K10 Norm · K11 Prod
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                              Semua Pekan
                            </span>
                          )}
                        </td>

                        {/* HARI & JAM */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                dayBadgeColor[dayDisplay.toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {dayDisplay}
                            </span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              Jam {item.periodIndex}
                            </span>
                          </div>
                        </td>

                        {/* PUKUL */}
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700 tabular-nums whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.timeRange || `${item.startTime} - ${item.endTime}`}</span>
                          </div>
                        </td>

                        {/* KELAS & JURUSAN */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 whitespace-nowrap">{item.className}</span>
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {item.department}
                            </span>
                          </div>
                        </td>

                        {/* MAPEL */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{item.subjectName}</span>
                              {item.subjectCode && (
                                <span className="font-mono text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-1 rounded">
                                  {item.subjectCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* GURU */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{item.teacherName}</span>
                              {item.teacherCode && (
                                <span className="font-mono text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-bold">
                                  {item.teacherCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* RUANG / BENGKEL */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{item.roomName}</span>
                            <span className="text-[10px] text-slate-400">({item.roomType})</span>
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDuplicateScheduleToOtherWeek(item)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Duplikat jadwal ini ke pekan rotasi pasangannya"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSchedule(item)}
                              className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'jadwal',
                                  id: item.id,
                                  title: `${item.subjectName} - ${item.className}`,
                                  subtitle: `Hari ${item.dayName || 'HARI'} • Jam Ke-${item.periodIndex} (${item.startTime} - ${item.endTime}) • Guru: ${item.teacherName}`,
                                  badge: item.roomName,
                                  warningNote: 'Slot jadwal pelajaran ini akan dihapus permanen dari jadwal kelas dan agenda mengajar guru.'
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Empty state */}
              {schedules.length === 0 && (
                <div className="p-12 text-center space-y-3">
                  <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-700 text-sm">Belum Ada Jadwal Pelajaran</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gunakan tombol <strong>Impor Jadwal</strong> untuk memasukkan jadwal secara masal dengan format SMKN 1 Tegalsari (titik koma ';') atau klik <strong>Tambah Jadwal Manual</strong>.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setIsScheduleImportOpen(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Impor Format SMKN 1 Tegalsari</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===================== MODALS FOR ADD ===================== */}

      {/* MODAL: TAMBAH GURU */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Guru Baru</h3>
            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Guru</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: G13 atau BPW"
                  value={tCode}
                  onChange={(e) => setTCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AHMAD FAUZI, S.Pd"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Mapel <span className="text-cyan-700 font-semibold">(Sinkron dengan Menu Data Mapel)</span>
                </label>
                <select
                  required
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold bg-white"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      [{sub.code}] {sub.name} ({sub.category} - {sub.jp} JP)
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Nama mapel yang diampu guru otomatis terhubung dengan database Mata Pelajaran.
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH MAPEL */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Mata Pelajaran</h3>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MKK-TKJ-4"
                  value={sCode}
                  onChange={(e) => setSCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Administrasi Sistem Jaringan"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={sCategory}
                    onChange={(e) => setSCategory(e.target.value as 'Umum' | 'Produktif' | 'Muatan Lokal')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Produktif">Produktif</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah JP</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={sJp}
                    onChange={(e) => setSJp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH JURUSAN */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Jurusan Baru</h3>
            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Jurusan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RPL atau TAB"
                  value={dCode}
                  onChange={(e) => setDCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Jurusan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teknik Alat Berat"
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Keahlian kompetensi dan fokus pembelajaran jurusan..."
                  value={dDesc}
                  onChange={(e) => setDDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Jurusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH KELAS */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Kelas Baru</h3>
            <form onSubmit={handleSaveClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Kelas</label>
                  <input
                    type="text"
                    required
                    placeholder="11-TKJ-3"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={cGrade}
                    onChange={(e) => setCGrade(Number(e.target.value) as 10 | 11 | 12)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F Akhir)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 11 TKJ 3"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan (Data dari Menu Jurusan)</label>
                <select
                  value={cDept}
                  onChange={(e) => setCDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Wali Kelas (Data dari Menu Guru)</label>
                <select
                  value={cHomeroom}
                  onChange={(e) => setCHomeroom(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Pilih Wali Kelas (Opsional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title || 'Guru Pengajar'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH RUANGAN */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Ruangan / Bengkel</h3>
            <form onSubmit={handleSaveRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Ruangan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: LAB-C3 atau BENGKEL-TKR-C"
                  value={rCode}
                  onChange={(e) => setRCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ruangan / Bengkel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: LAB KOMPUTER C3 (SERVER)"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Gedung</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung C / Gedung Bengkel Otomotif"
                  value={rBuilding}
                  onChange={(e) => setRBuilding(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Fasilitas</label>
                <select
                  value={rType}
                  onChange={(e) => setRType(e.target.value as 'Teori' | 'Lab Komputer' | 'Bengkel Praktik')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Teori">Ruang Teori (Kelas)</option>
                  <option value="Lab Komputer">Laboratorium Komputer</option>
                  <option value="Bengkel Praktik">Bengkel Praktik Kejuruan</option>
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Ruangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH TAHUN PELAJARAN */}
      {isAddAyOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Tahun Pelajaran</h3>
            <form onSubmit={handleSaveAcademicYear} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran & Semester</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2027/2028 Ganjil"
                  value={ayName}
                  onChange={(e) => setAyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Dimulai</label>
                  <input
                    type="date"
                    required
                    value={ayStartDate}
                    onChange={(e) => setAyStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={ayEndDate}
                    onChange={(e) => setAyEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAyOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Simpan Tahun Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODALS FOR EDIT ===================== */}

      {/* EDIT MODAL: GURU */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Data Guru</span>
              </h3>
              <button onClick={() => setEditingTeacher(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Guru</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.code}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Mapel <span className="text-cyan-700 font-semibold">(Sinkron dengan Menu Data Mapel)</span>
                </label>
                <select
                  required
                  value={editingTeacher.title}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold bg-white"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      [{sub.code}] {sub.name} ({sub.category} - {sub.jp} JP)
                    </option>
                  ))}
                  {editingTeacher.title && !subjects.some((s) => s.name === editingTeacher.title) && (
                    <option value={editingTeacher.title}>{editingTeacher.title}</option>
                  )}
                </select>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Nama mapel yang diampu guru selalu sinkron dengan database Data Mapel.
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: MAPEL */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Mata Pelajaran</span>
              </h3>
              <button onClick={() => setEditingSubject(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  required
                  value={editingSubject.code}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={editingSubject.category}
                    onChange={(e) => setEditingSubject({ ...editingSubject, category: e.target.value as 'Umum' | 'Produktif' | 'Muatan Lokal' })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Produktif">Produktif</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah JP</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editingSubject.jp}
                    onChange={(e) => setEditingSubject({ ...editingSubject, jp: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: JURUSAN */}
      {editingDepartment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Jurusan</span>
              </h3>
              <button onClick={() => setEditingDepartment(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Jurusan</label>
                <input
                  type="text"
                  required
                  value={editingDepartment.code}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Jurusan</label>
                <input
                  type="text"
                  required
                  value={editingDepartment.name}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Keahlian</label>
                <textarea
                  rows={2}
                  value={editingDepartment.description || ''}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDepartment(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Jurusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: KELAS */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Data Kelas</span>
              </h3>
              <button onClick={() => setEditingClass(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Kelas</label>
                  <input
                    type="text"
                    required
                    value={editingClass.code}
                    onChange={(e) => setEditingClass({ ...editingClass, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={editingClass.grade}
                    onChange={(e) => setEditingClass({ ...editingClass, grade: Number(e.target.value) as 10 | 11 | 12 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={10}>Kelas 10 (Fase E)</option>
                    <option value={11}>Kelas 11 (Fase F)</option>
                    <option value={12}>Kelas 12 (Fase F Akhir)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan</label>
                <select
                  value={editingClass.department}
                  onChange={(e) => setEditingClass({ ...editingClass, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={editingClass.homeroomTeacherId || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Pilih Wali Kelas (Opsional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title || 'Guru Pengajar'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: RUANGAN */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Ruangan / Bengkel</span>
              </h3>
              <button onClick={() => setEditingRoom(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Ruangan</label>
                <input
                  type="text"
                  required
                  value={editingRoom.code}
                  onChange={(e) => setEditingRoom({ ...editingRoom, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ruangan / Bengkel</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Gedung</label>
                <input
                  type="text"
                  required
                  value={editingRoom.building}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Fasilitas</label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as 'Teori' | 'Lab Komputer' | 'Bengkel Praktik' })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Teori">Ruang Teori (Kelas)</option>
                  <option value="Lab Komputer">Laboratorium Komputer</option>
                  <option value="Bengkel Praktik">Bengkel Praktik Kejuruan</option>
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Ruangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: TAHUN PELAJARAN */}
      {editingAcademicYear && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Tahun Pelajaran</span>
              </h3>
              <button onClick={() => setEditingAcademicYear(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAcademicYear} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran & Semester</label>
                <input
                  type="text"
                  required
                  value={editingAcademicYear.name}
                  onChange={(e) => setEditingAcademicYear({ ...editingAcademicYear, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Dimulai</label>
                  <input
                    type="date"
                    required
                    value={editingAcademicYear.startDate}
                    onChange={(e) => setEditingAcademicYear({ ...editingAcademicYear, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={editingAcademicYear.endDate}
                    onChange={(e) => setEditingAcademicYear({ ...editingAcademicYear, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAcademicYear(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Tahun Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH JADWAL MANUAL */}
      {isAddScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">Tambah Jadwal Pelajaran Baru</h3>
              </div>
              <button
                onClick={() => setIsAddScheduleOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5">
              {/* Pilihan Rotasi Pekan (Sistem Blok Mingguan SMK) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Pilihan Rotasi Pekan (Sistem Blok Mingguan SMK)</span>
                </label>
                <div className="space-y-1.5">
                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    schWeekType === 'P10_PROD_P11_NORM'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="addSchWeekType"
                      checked={schWeekType === 'P10_PROD_P11_NORM'}
                      onChange={() => setSchWeekType('P10_PROD_P11_NORM')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div>Pekan Kelas 10 Produktif & Kelas 11 Normatif Adaptif</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Kelas 10 praktik kejuruan (Produktif), Kelas 11 mata pelajaran umum (Normatif Adaptif).
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    schWeekType === 'P10_NORM_P11_PROD'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="addSchWeekType"
                      checked={schWeekType === 'P10_NORM_P11_PROD'}
                      onChange={() => setSchWeekType('P10_NORM_P11_PROD')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div>Pekan Kelas 10 Normatif Adaptif & Kelas 11 Produktif</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Kelas 10 mata pelajaran umum (Normatif Adaptif), Kelas 11 praktik kejuruan (Produktif).
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    schWeekType === 'ALL'
                      ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="addSchWeekType"
                      checked={schWeekType === 'ALL'}
                      onChange={() => setSchWeekType('ALL')}
                      className="mt-0.5 text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <div>Berlaku Kedua Pekan (Rutin Tiap Minggu)</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Jadwal yang selalu aktif di kedua rotasi pekan (upacara, ekskul, mapel rutin).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Hari & Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hari</label>
                  <select
                    value={schDayName}
                    onChange={(e) => setSchDayName(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  >
                    <option value="SENIN">SENIN</option>
                    <option value="SELASA">SELASA</option>
                    <option value="RABU">RABU</option>
                    <option value="KAMIS">KAMIS</option>
                    <option value="JUMAT">JUMAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Ke</label>
                  <select
                    value={schPeriod}
                    onChange={(e) => setSchPeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => (
                      <option key={p} value={p}>
                        Jam Ke-{p}
                      </option>
                    ))}
                    <option value="UPACARA">UPACARA</option>
                    <option value="EKS">EKSTRAKURIKULER</option>
                  </select>
                </div>
              </div>

              {/* Rentang Waktu (Pukul) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rentang Waktu (Pukul)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={schTimeRange}
                    onChange={(e) => setSchTimeRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  >
                    <option value="06.45 - 07.20">06.45 - 07.20 (Jam 1)</option>
                    <option value="07.20 - 07.55">07.20 - 07.55 (Jam 2)</option>
                    <option value="07.55 - 08.30">07.55 - 08.30 (Jam 3)</option>
                    <option value="08.30 - 09.05">08.30 - 09.05 (Jam 4)</option>
                    <option value="09.40 - 10.15">09.40 - 10.15 (Jam 5)</option>
                    <option value="10.15 - 10.50">10.15 - 10.50 (Jam 6)</option>
                    <option value="10.50 - 11.25">10.50 - 11.25 (Jam 7)</option>
                    <option value="12.25 - 13.00">12.25 - 13.00 (Jam 8)</option>
                    <option value="13.00 - 13.35">13.00 - 13.35 (Jam 9)</option>
                    <option value="13.35 - 14.10">13.35 - 14.10 (Jam 10)</option>
                    <option value="14.10 - 14.45">14.10 - 14.45 (Jam 11)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Atau ketik kustom: 07.00 - 08.30"
                    value={schTimeRange}
                    onChange={(e) => setSchTimeRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Kelas & Rombel (Relasi ke Kelas & Jurusan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelas & Rombel <span className="text-cyan-600 font-normal">(Terkoneksi Data Kelas & Jurusan)</span>
                </label>
                <select
                  required
                  value={schClassId}
                  onChange={(e) => setSchClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Tingkat {c.grade} ({c.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran (Relasi ke Data Mapel) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-cyan-600 font-normal">(Terkoneksi Data Mapel)</span>
                </label>
                <select
                  required
                  value={schSubjectId}
                  onChange={(e) => setSchSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} ({s.category} - {s.jp} JP)
                    </option>
                  ))}
                </select>
              </div>

              {/* Guru Pengajar (Relasi ke Data Guru) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guru Pengajar <span className="text-cyan-600 font-normal">(Terkoneksi Data Guru)</span>
                </label>
                <select
                  required
                  value={schTeacherId}
                  onChange={(e) => setSchTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.name} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ruangan / Bengkel (Relasi ke Data Ruangan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ruangan / Bengkel Praktik <span className="text-cyan-600 font-normal">(Terkoneksi Data Ruang)</span>
                </label>
                <select
                  required
                  value={schRoomId}
                  onChange={(e) => setSchRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.name} — {r.type} ({r.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Jadwal Pelajaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: JADWAL PELAJARAN */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <span>Edit Jadwal Pelajaran</span>
              </h3>
              <button onClick={() => setEditingSchedule(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="space-y-3.5">
              {/* Pilihan Rotasi Pekan (Sistem Blok Mingguan SMK) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Pilihan Rotasi Pekan (Sistem Blok Mingguan SMK)</span>
                </label>
                <div className="space-y-1.5">
                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    (editingSchedule.weekType || 'P10_PROD_P11_NORM') === 'P10_PROD_P11_NORM'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="editSchWeekType"
                      checked={(editingSchedule.weekType || 'P10_PROD_P11_NORM') === 'P10_PROD_P11_NORM'}
                      onChange={() =>
                        setEditingSchedule({
                          ...editingSchedule,
                          weekType: 'P10_PROD_P11_NORM',
                        })
                      }
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div>Pekan Kelas 10 Produktif & Kelas 11 Normatif Adaptif</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Kelas 10 praktik kejuruan (Produktif), Kelas 11 mata pelajaran umum (Normatif Adaptif).
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    editingSchedule.weekType === 'P10_NORM_P11_PROD'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="editSchWeekType"
                      checked={editingSchedule.weekType === 'P10_NORM_P11_PROD'}
                      onChange={() =>
                        setEditingSchedule({
                          ...editingSchedule,
                          weekType: 'P10_NORM_P11_PROD',
                        })
                      }
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div>Pekan Kelas 10 Normatif Adaptif & Kelas 11 Produktif</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Kelas 10 mata pelajaran umum (Normatif Adaptif), Kelas 11 praktik kejuruan (Produktif).
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    editingSchedule.weekType === 'ALL'
                      ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="editSchWeekType"
                      checked={editingSchedule.weekType === 'ALL'}
                      onChange={() =>
                        setEditingSchedule({
                          ...editingSchedule,
                          weekType: 'ALL',
                        })
                      }
                      className="mt-0.5 text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <div>Berlaku Kedua Pekan (Rutin Tiap Minggu)</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Jadwal yang selalu aktif di kedua rotasi pekan (upacara, ekskul, mapel rutin).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Hari & Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hari</label>
                  <select
                    value={editingSchedule.dayName}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        dayName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  >
                    <option value="SENIN">SENIN</option>
                    <option value="SELASA">SELASA</option>
                    <option value="RABU">RABU</option>
                    <option value="KAMIS">KAMIS</option>
                    <option value="JUMAT">JUMAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Ke</label>
                  <input
                    type="text"
                    required
                    value={editingSchedule.periodIndex}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        periodIndex: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  />
                </div>
              </div>

              {/* Rentang Waktu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rentang Waktu (Pukul)</label>
                <input
                  type="text"
                  required
                  value={editingSchedule.timeRange}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      timeRange: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              {/* Kelas & Rombel (Relasi ke Data Kelas & Jurusan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelas / Rombel <span className="text-cyan-600 font-normal">(Sinkron ke Data Kelas)</span>
                </label>
                <select
                  value={editingSchedule.classId}
                  onChange={(e) => {
                    const c = classes.find((cls) => cls.id === e.target.value);
                    if (c) {
                      setEditingSchedule({
                        ...editingSchedule,
                        classId: c.id,
                        className: c.name,
                        department: c.department,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Tingkat {c.grade} ({c.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran (Relasi ke Data Mapel) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-cyan-600 font-normal">(Sinkron ke Data Mapel)</span>
                </label>
                <select
                  value={
                    subjects.find(
                      (s) =>
                        s.code === editingSchedule.subjectCode ||
                        s.name.toLowerCase() === editingSchedule.subjectName.toLowerCase()
                    )?.id || ''
                  }
                  onChange={(e) => {
                    const s = subjects.find((sub) => sub.id === e.target.value);
                    if (s) {
                      setEditingSchedule({
                        ...editingSchedule,
                        subjectCode: s.code,
                        subjectName: s.name,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guru Pengajar (Relasi ke Data Guru) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guru Pengajar <span className="text-cyan-600 font-normal">(Sinkron ke Data Guru)</span>
                </label>
                <select
                  value={editingSchedule.teacherId}
                  onChange={(e) => {
                    const t = teachers.find((tch) => tch.id === e.target.value);
                    if (t) {
                      setEditingSchedule({
                        ...editingSchedule,
                        teacherId: t.id,
                        teacherName: t.name,
                        teacherCode: t.code,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.name} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ruangan / Bengkel (Relasi ke Data Ruangan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ruangan / Bengkel Praktik <span className="text-cyan-600 font-normal">(Sinkron ke Data Ruang)</span>
                </label>
                <select
                  value={rooms.find((r) => r.name === editingSchedule.roomName)?.id || ''}
                  onChange={(e) => {
                    const r = rooms.find((rm) => rm.id === e.target.value);
                    if (r) {
                      setEditingSchedule({
                        ...editingSchedule,
                        roomName: r.name,
                        roomType: r.type,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.name} — {r.type} ({r.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg"
                >
                  Perbarui Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL FOR GURU */}
      <BulkImportModal
        isOpen={importType === 'guru'}
        onClose={() => setImportType(null)}
        title="Impor Massal Data Guru"
        entityName="Guru"
        columns={[
          { key: 'kode', label: 'Kode Guru', example: 'G14' },
          { key: 'nama', label: 'Nama Lengkap', example: 'BAMBANG HERMAWAN, S.Pd' },
          { key: 'mapel', label: 'Nama Mapel', example: 'BAHASA INGGRIS' },
        ]}
        onImport={handleImportTeachers}
      />

      {/* BULK IMPORT MODAL FOR MAPEL */}
      <BulkImportModal
        isOpen={importType === 'mapel'}
        onClose={() => setImportType(null)}
        title="Impor Massal Mata Pelajaran"
        entityName="Mata Pelajaran"
        columns={[
          { key: 'kode', label: 'Kode Mapel', example: 'MKK-TKJ-5' },
          { key: 'nama', label: 'Nama Mapel', example: 'Keamanan Jaringan & Cyber Security' },
          { key: 'kategori', label: 'Kategori (Umum / Produktif / Muatan Lokal)', example: 'Umum' },
          { key: 'jp', label: 'Jumlah JP', example: '6' },
        ]}
        onImport={handleImportSubjects}
      />

      {/* BULK IMPORT MODAL FOR KELAS */}
      <BulkImportModal
        isOpen={importType === 'kelas'}
        onClose={() => setImportType(null)}
        title="Impor Massal Data Kelas"
        entityName="Kelas"
        columns={[
          { key: 'kode', label: 'Kode Kelas', example: '10-TKJ-2' },
          { key: 'nama', label: 'Nama Kelas', example: '10 TKJ 2' },
          { key: 'tingkat', label: 'Tingkat', example: '10' },
          { key: 'jurusan', label: 'Jurusan', example: 'TKJ' },
          { key: 'walikelas', label: 'Nama Walikelas', example: 'BAYU PANDU WIBISONO, S.Kom' },
        ]}
        onImport={handleImportClasses}
      />

      {/* BULK IMPORT MODAL FOR RUANGAN */}
      <BulkImportModal
        isOpen={importType === 'ruang'}
        onClose={() => setImportType(null)}
        title="Impor Massal Ruangan dan Bengkel"
        entityName="Ruangan"
        columns={[
          { key: 'kode', label: 'Kode Ruangan', example: 'LAB-C3' },
          { key: 'nama', label: 'Nama Ruangan', example: 'LAB C3 (CYBER SECURITY)' },
          { key: 'gedung', label: 'Nama Gedung', example: 'Gedung C Lantai 2' },
        ]}
        onImport={handleImportRooms}
      />

      {/* BULK IMPORT MODAL FOR JADWAL PELAJARAN (FORMAT SMKN 1 TEGALSARI) */}
      <ScheduleImportModal
        isOpen={isScheduleImportOpen}
        onClose={() => setIsScheduleImportOpen(false)}
        classes={classes}
        rooms={rooms}
        teachers={teachers}
        subjects={subjects}
        onImport={handleImportScheduleData}
      />

      {/* MODAL: KONFIRMASI HAPUS DATA (IN-APP DIALOG) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {deleteTarget.type === 'semua_jadwal'
                    ? 'Konfirmasi Kosongkan Jadwal'
                    : 'Konfirmasi Hapus Data'}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tindakan ini akan menghapus data yang dipilih dari sistem.
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
                title="Batal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Item Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {deleteTarget.type === 'guru'
                      ? 'DATA GURU'
                      : deleteTarget.type === 'mapel'
                      ? 'MATA PELAJARAN'
                      : deleteTarget.type === 'jurusan'
                      ? 'PROGRAM KEAHLIAN'
                      : deleteTarget.type === 'kelas'
                      ? 'ROMBEL KELAS'
                      : deleteTarget.type === 'ruang'
                      ? 'RUANG & BENGKEL'
                      : deleteTarget.type === 'tahun_pelajaran'
                      ? 'TAHUN PELAJARAN'
                      : deleteTarget.type === 'jadwal'
                      ? 'JADWAL PELAJARAN'
                      : 'AKSI SISTEM'}
                  </span>
                  {deleteTarget.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {deleteTarget.badge}
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{deleteTarget.title}</h4>
                {deleteTarget.subtitle && (
                  <p className="text-xs text-slate-600 mt-0.5">{deleteTarget.subtitle}</p>
                )}
              </div>

              {/* Warning box */}
              {deleteTarget.warningNote && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    {deleteTarget.warningNote}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deleteTarget.type === 'semua_jadwal'
                    ? 'Ya, Bersihkan Jadwal'
                    : 'Ya, Hapus Data Ini'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERINGATAN / ALERT DIALOG */}
      {deleteAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  Tidak Dapat Dihapus
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Informasi sistem keamanan data
                </p>
              </div>
              <button
                onClick={() => setDeleteAlertModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {deleteAlertModal}
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDeleteAlertModal(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-cyan-800 hover:bg-cyan-900 rounded-xl transition cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom-2 duration-200 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold leading-snug">{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-auto transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL: HAPUS MASAL (BULK DELETE) */}
      <BulkDeleteMasterModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        activeTab={activeTab}
        selectedCount={selectedIds.length}
        selectedItemsPreview={getSelectedItemsPreview()}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* MODAL: EDIT MASAL (BULK EDIT) */}
      <BulkEditMasterModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        activeTab={activeTab}
        selectedCount={selectedIds.length}
        teachers={teachers}
        subjects={subjects}
        classes={classes}
        rooms={rooms}
        departments={departments}
        academicYears={academicYears}
        onApplyGuru={handleApplyBulkGuru}
        onApplyMapel={handleApplyBulkMapel}
        onApplyJurusan={handleApplyBulkJurusan}
        onApplyKelas={handleApplyBulkKelas}
        onApplyRuang={handleApplyBulkRuang}
        onApplyTahunPelajaran={handleApplyBulkTahunPelajaran}
        onApplyJadwal={handleApplyBulkJadwal}
      />
    </div>
  );
};
