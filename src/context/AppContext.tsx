import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Teacher,
  Subject,
  SchoolClass,
  Room,
  ScheduleItem,
  AttendanceRecord,
  CurrentUser,
  ActiveMenu,
  TeacherAttendanceStatus,
  PiketAttendanceStatus,
  UserRole,
  UserAccount,
  AccountRole,
  DayNameIndo,
  ScheduleWeekType,
} from '../types';
import {
  INITIAL_TEACHERS,
  INITIAL_SUBJECTS,
  INITIAL_CLASSES,
  INITIAL_ROOMS,
  INITIAL_SCHEDULE,
  INITIAL_DEPARTMENTS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_USER_ACCOUNTS,
  PERIOD_TIMES,
} from '../data/initialData';
import { Department, AcademicYear } from '../types';
import {
  getWeekRotationFromDate,
  getWeekTypeLabel,
  getWeekTypeShortLabel,
  isScheduleMatchingWeek,
} from '../data/scheduleWeeks';

interface StatsSummary {
  totalJadwal: number;
  guruMengajar: number;
  sedangBerlangsung: number;
  terlaksana: number;
  belumKonfirmasi: number;
  tidakHadir: number;
}

interface AppContextType {
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  departments: Department[];
  academicYears: AcademicYear[];
  schedules: ScheduleItem[];
  attendanceRecords: Record<string, AttendanceRecord>;
  currentUser: CurrentUser;
  activeMenu: ActiveMenu;
  currentPeriod: number;
  currentTimeString: string;
  currentDateString: string;
  currentDateOnlyString: string;
  currentDayName: string;
  currentDayIndex: number;
  semesterString: string;
  isSimulatedTime: boolean;
  stats: StatsSummary;

  // Rotasi Pekan Mingguan SMK (Pekan K10 Produktif & K11 NormAdaptif vs Pekan K10 NormAdaptif & K11 Produktif)
  realtimeWeekType: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD';
  activeWeekFilter: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL';
  effectiveWeekType: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL';
  setActiveWeekFilter: (w: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL') => void;
  getWeekTypeLabel: (w?: string) => string;
  getWeekTypeShortLabel: (w?: string) => string;
  isScheduleMatchingCurrentWeek: (item: ScheduleItem) => boolean;
  
  // Actions
  setActiveMenu: (menu: ActiveMenu) => void;
  setCurrentUser: (user: CurrentUser) => void;
  switchRole: (role: UserRole, teacherId?: string) => void;
  confirmTeacherAttendance: (
    scheduleId: string,
    status: TeacherAttendanceStatus,
    journalTopic?: string,
    journalNotes?: string,
    studentAbsence?: { sakit: number; izin: number; alpa: number; totalHadir: number }
  ) => void;
  quickTeacherStatusToggle: (scheduleId: string, status: TeacherAttendanceStatus) => void;
  verifyPiketAttendance: (
    scheduleId: string,
    status: PiketAttendanceStatus,
    notes?: string,
    substituteTeacherId?: string,
    assignedTask?: string
  ) => void;
  quickPiketStatusToggle: (scheduleId: string, status: PiketAttendanceStatus) => void;
  setPeriodSimulated: (period: number) => void;
  toggleSimulatedClock: (active: boolean) => void;
  // User Account & Piket Duty Management
  userAccounts: UserAccount[];
  addUserAccount: (account: UserAccount) => void;
  updateUserAccount: (account: UserAccount) => void;
  deleteUserAccount: (id: string) => void;
  syncAccountsFromTeachers: () => { created: number; updated: number; message: string };
  updatePiketDays: (accountId: string, days: string[]) => void;
  loginWithCredentials: (username: string, password: string) => { success: boolean; message: string; user?: CurrentUser };

  // Master CRUD
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  bulkDeleteTeachers: (ids: string[]) => void;
  bulkUpdateTeachers: (ids: string[], updates: Partial<Teacher>) => void;
  importTeachers: (newTeachers: Teacher[]) => void;

  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  bulkDeleteSubjects: (ids: string[]) => void;
  bulkUpdateSubjects: (ids: string[], updates: Partial<Subject>) => void;
  importSubjects: (newSubjects: Subject[]) => void;

  addDepartment: (dept: Department) => void;
  updateDepartment: (dept: Department) => void;
  deleteDepartment: (id: string) => void;
  bulkDeleteDepartments: (ids: string[]) => void;
  bulkUpdateDepartments: (ids: string[], updates: Partial<Department>) => void;

  addClass: (cls: SchoolClass) => void;
  updateClass: (cls: SchoolClass) => void;
  deleteClass: (id: string) => void;
  bulkDeleteClasses: (ids: string[]) => void;
  bulkUpdateClasses: (ids: string[], updates: Partial<SchoolClass>) => void;
  importClasses: (newClasses: SchoolClass[]) => void;

  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
  bulkDeleteRooms: (ids: string[]) => void;
  bulkUpdateRooms: (ids: string[], updates: Partial<Room>) => void;
  importRooms: (newRooms: Room[]) => void;

  addAcademicYear: (ay: AcademicYear) => void;
  updateAcademicYear: (ay: AcademicYear) => void;
  deleteAcademicYear: (id: string) => void;
  bulkDeleteAcademicYears: (ids: string[]) => void;
  bulkUpdateAcademicYears: (ids: string[], updates: Partial<AcademicYear>) => void;
  setActiveAcademicYear: (id: string) => void;

  addSchedule: (item: ScheduleItem) => void;
  updateSchedule: (item: ScheduleItem) => void;
  deleteSchedule: (id: string) => void;
  bulkDeleteSchedules: (ids: string[]) => void;
  bulkUpdateSchedules: (ids: string[], updates: Partial<ScheduleItem>) => void;
  clearAllSchedules: () => void;
  importSchedules: (items: ScheduleItem[]) => void;
  importClassSchedules: (classId: string, items: ScheduleItem[]) => void;
  resetAllData: () => void;
}

// Helper Tanggal, Hari & Waktu Real-Time Bahasa Indonesia sesuai Waktu Laptop
const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatIndonesianDate = (d: Date): string => {
  const dayName = INDO_DAYS[d.getDay()];
  const date = d.getDate();
  const monthName = INDO_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
};

export const formatIndonesianDateOnly = (d: Date): string => {
  const date = d.getDate();
  const monthName = INDO_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${date} ${monthName} ${year}`;
};

export const getDayNameIndo = (d: Date): string => {
  return INDO_DAYS[d.getDay()];
};

export const getPeriodFromTime = (d: Date): number => {
  const mins = d.getHours() * 60 + d.getMinutes();
  for (const p of PERIOD_TIMES) {
    const [sh, sm] = p.start.split(':').map(Number);
    const [eh, em] = p.end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (mins >= startMin && mins <= endMin) {
      return p.period;
    }
  }
  return 1;
};

const STORAGE_KEY = 'simpati_smkn1tegalsari_v3';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Master state with localStorage persistence
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_teachers`);
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const normalizeCategory = (sub: any): Subject => {
      let cat = sub.category;
      if (cat === 'Normatif' || cat === 'Adaptif') {
        const nameUpper = (sub.name || '').toUpperCase();
        if (nameUpper.includes('DINIYAH') || nameUpper.includes('JAWA') || nameUpper.includes('MULOK') || nameUpper.includes('MUATAN LOKAL')) {
          cat = 'Muatan Lokal';
        } else {
          cat = 'Umum';
        }
      } else if (cat !== 'Umum' && cat !== 'Produktif' && cat !== 'Muatan Lokal') {
        cat = 'Umum';
      }
      return { ...sub, category: cat };
    };

    const saved = localStorage.getItem(`${STORAGE_KEY}_subjects`);
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        return parsed.map(normalizeCategory);
      } catch (e) {
        return INITIAL_SUBJECTS;
      }
    }
    return INITIAL_SUBJECTS;
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_classes`);
    if (saved) {
      try {
        const parsed: SchoolClass[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((c) => c.id));
        const missing = INITIAL_CLASSES.filter((c) => !existingIds.has(c.id));
        if (missing.length > 0) {
          return [...parsed, ...missing];
        }
        return parsed;
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_CLASSES;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rooms`);
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_departments`);
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_academic_years`);
    return saved ? JSON.parse(saved) : INITIAL_ACADEMIC_YEARS;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_schedules`);
    if (saved) {
      try {
        const parsed: ScheduleItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasWeekTypes = parsed.some((s) => s.weekType);
          if (hasWeekTypes) {
            return parsed;
          }
        }
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SCHEDULE;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_attendance`);
    return saved ? JSON.parse(saved) : {};
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user_accounts`);
    return saved ? JSON.parse(saved) : INITIAL_USER_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: 'usr-admin',
    name: 'Administrator SIMPATI',
    role: 'admin',
    title: 'Super Admin Sistem',
    username: 'admin',
    piketDays: [],
  });

  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [isSimulatedTime, setIsSimulatedTime] = useState<boolean>(false);
  
  // Real-time state synchronized with user's laptop clock
  const [currentDateString, setCurrentDateString] = useState<string>(() => formatIndonesianDate(new Date()));
  const [currentDateOnlyString, setCurrentDateOnlyString] = useState<string>(() => formatIndonesianDateOnly(new Date()));
  const [currentDayName, setCurrentDayName] = useState<string>(() => getDayNameIndo(new Date()));
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });
  const [currentPeriod, setCurrentPeriod] = useState<number>(() => getPeriodFromTime(new Date()));
  const [currentTimeString, setCurrentTimeString] = useState<string>(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}.${m}.${s} WIB`;
  });

  // Rotasi Pekan Mingguan SMK (Real-Time sesuai Waktu Kalender Laptop)
  const [realtimeWeekType, setRealtimeWeekType] = useState<'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD'>(() =>
    getWeekRotationFromDate(new Date())
  );

  const [activeWeekFilter, setActiveWeekFilterState] = useState<'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_week_filter`);
    return (saved as any) || 'AUTO';
  });

  const setActiveWeekFilter = (w: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL') => {
    setActiveWeekFilterState(w);
    localStorage.setItem(`${STORAGE_KEY}_week_filter`, w);
  };

  const effectiveWeekType = activeWeekFilter === 'AUTO' ? realtimeWeekType : activeWeekFilter;

  const isScheduleMatchingCurrentWeek = (item: ScheduleItem): boolean => {
    return isScheduleMatchingWeek(item.weekType, activeWeekFilter, realtimeWeekType);
  };

  // Compute active academic year
  const activeAy = academicYears.find((ay) => ay.status === 'aktif') || academicYears[0];
  const semesterString = activeAy ? `${activeAy.name}` : 'Semester Ganjil · 2026/2027';

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(academicYears));
  }, [academicYears]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(userAccounts));
  }, [userAccounts]);

  // Live real-time clock & date updating automatically from laptop time every second
  useEffect(() => {
    const updateLiveClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      
      setCurrentTimeString(`${h}.${m}.${s} WIB`);
      setCurrentDateString(formatIndonesianDate(now));
      setCurrentDateOnlyString(formatIndonesianDateOnly(now));
      
      const dayName = getDayNameIndo(now);
      setCurrentDayName(dayName);
      const d = now.getDay();
      setCurrentDayIndex(d === 0 ? 7 : d);

      const currentWeekRot = getWeekRotationFromDate(now);
      setRealtimeWeekType(currentWeekRot);

      if (!isSimulatedTime) {
        setCurrentPeriod(getPeriodFromTime(now));
      }
    };

    updateLiveClock();
    const timer = setInterval(updateLiveClock, 1000);
    return () => clearInterval(timer);
  }, [isSimulatedTime]);

  // Role Switcher
  const switchRole = (role: UserRole, teacherId?: string) => {
    if (role === 'admin') {
      const adminAcc = userAccounts.find((a) => a.role === 'admin') || INITIAL_USER_ACCOUNTS[0];
      setCurrentUser({
        id: adminAcc.id,
        name: adminAcc.name,
        role: 'admin',
        title: 'Super Admin Sistem',
        username: adminAcc.username,
        piketDays: [],
        isPiketToday: false,
      });
    } else if (role === 'guru') {
      const fallbackTeacher: Teacher = INITIAL_TEACHERS[0] || {
        id: 't-default',
        code: 'G01',
        nip: '-',
        name: 'Guru Pengajar',
        title: 'Guru Mata Pelajaran',
        department: 'TKJ',
        email: 'guru@smkn1tegalsari.sch.id',
        phone: '081234567890',
      };
      const targetTeacher = teachers.find((t) => t.id === (teacherId || 't-6')) || teachers[0] || fallbackTeacher;
      const acc = userAccounts.find((a) => a.teacherId === targetTeacher.id);
      const isPiketToday = acc?.piketDays?.includes(currentDayName) || targetTeacher.piketDays?.includes(currentDayName) || targetTeacher.isPiketToday || false;
      setCurrentUser({
        id: acc?.id || `usr-${targetTeacher.id}`,
        name: targetTeacher.name,
        role: 'guru',
        title: isPiketToday ? `Guru Mapel & Guru Piket (${currentDayName})` : targetTeacher.title,
        teacherId: targetTeacher.id,
        username: acc?.username || targetTeacher.code,
        piketDays: acc?.piketDays || targetTeacher.piketDays || [],
        isPiketToday,
        teacherCode: targetTeacher.code,
        nip: targetTeacher.nip,
      });
      setActiveMenu('pembelajaran_saya');
    } else if (role === 'piket') {
      const fallbackTeacher: Teacher = INITIAL_TEACHERS[0] || {
        id: 't-default',
        code: 'G01',
        nip: '-',
        name: 'Guru Pengajar',
        title: 'Guru Mata Pelajaran',
        department: 'TKJ',
        email: 'guru@smkn1tegalsari.sch.id',
        phone: '081234567890',
      };
      // Cari guru yang bertugas piket hari ini sesuai waktu laptop (currentDayName)
      const piketTeacher =
        teachers.find((t) => (t.piketDays && t.piketDays.includes(currentDayName)) || userAccounts.find((a) => a.teacherId === t.id && a.piketDays?.includes(currentDayName))) ||
        teachers.find((t) => t.isPiketToday) ||
        teachers.find((t) => t.id === 't-10') ||
        teachers[0] ||
        fallbackTeacher;
      const acc = userAccounts.find((a) => a.teacherId === piketTeacher.id);
      setCurrentUser({
        id: acc?.id || `usr-piket`,
        name: piketTeacher.name,
        role: 'piket',
        title: `Petugas Guru Piket Hari Ini (${currentDayName})`,
        teacherId: piketTeacher.id,
        username: acc?.username || piketTeacher.code,
        piketDays: acc?.piketDays || [currentDayName],
        isPiketToday: true,
        teacherCode: piketTeacher.code,
        nip: piketTeacher.nip,
      });
      setActiveMenu('guru_piket');
    } else if (role === 'pimpinan') {
      const pimpinanAcc = userAccounts.find((a) => a.role === 'pimpinan') || {
        id: 'usr-kepsek',
        name: 'SUHARTONO, S.Pd., M.T.',
        username: 'kepsek',
        teacherId: 't-8',
        role: 'pimpinan' as const,
        piketDays: [],
        status: 'aktif' as const,
      };
      setCurrentUser({
        id: pimpinanAcc.id,
        name: pimpinanAcc.name,
        role: 'pimpinan',
        title: 'Kepala SMKN 1 Tegalsari',
        teacherId: pimpinanAcc.teacherId,
        username: pimpinanAcc.username,
        piketDays: [],
        isPiketToday: false,
      });
      setActiveMenu('dashboard_pimpinan');
    }
  };

  // Teacher Confirmation
  const confirmTeacherAttendance = (
    scheduleId: string,
    status: TeacherAttendanceStatus,
    journalTopic?: string,
    journalNotes?: string,
    studentAbsence?: { sakit: number; izin: number; alpa: number; totalHadir: number }
  ) => {
    setAttendanceRecords((prev) => {
      const existing = prev[scheduleId] || {
        scheduleId,
        date: new Date().toISOString().split('T')[0],
        teacherConfirmation: { status: 'belum_konfirmasi' },
        piketConfirmation: { status: 'belum_konfirmasi' },
      };

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        ...prev,
        [scheduleId]: {
          ...existing,
          teacherConfirmation: {
            status,
            timestamp: timeStr,
            journalTopic: journalTopic || existing.teacherConfirmation.journalTopic || 'Pembahasan Materi KBM Pokok',
            journalNotes: journalNotes || existing.teacherConfirmation.journalNotes,
            studentAbsence: studentAbsence || existing.teacherConfirmation.studentAbsence,
          },
          startedAt: existing.startedAt || (status === 'hadir' ? timeStr : undefined),
        },
      };
    });
  };

  const quickTeacherStatusToggle = (scheduleId: string, status: TeacherAttendanceStatus) => {
    confirmTeacherAttendance(scheduleId, status);
  };

  // Piket Verification
  const verifyPiketAttendance = (
    scheduleId: string,
    status: PiketAttendanceStatus,
    notes?: string,
    substituteTeacherId?: string,
    assignedTask?: string
  ) => {
    setAttendanceRecords((prev) => {
      const existing = prev[scheduleId] || {
        scheduleId,
        date: new Date().toISOString().split('T')[0],
        teacherConfirmation: { status: 'belum_konfirmasi' },
        piketConfirmation: { status: 'belum_konfirmasi' },
      };

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const subTeacher = substituteTeacherId ? teachers.find((t) => t.id === substituteTeacherId) : undefined;

      return {
        ...prev,
        [scheduleId]: {
          ...existing,
          piketConfirmation: {
            status,
            timestamp: timeStr,
            piketTeacherName: currentUser.name,
            notes: notes || existing.piketConfirmation.notes,
            substituteTeacherId,
            substituteTeacherName: subTeacher ? subTeacher.name : undefined,
            assignedTask,
          },
          completedAt: status === 'terverifikasi_hadir' ? timeStr : existing.completedAt,
        },
      };
    });
  };

  const quickPiketStatusToggle = (scheduleId: string, status: PiketAttendanceStatus) => {
    verifyPiketAttendance(scheduleId, status);
  };

  const setPeriodSimulated = (period: number) => {
    setCurrentPeriod(period);
    setIsSimulatedTime(true);
    const pTime = PERIOD_TIMES.find((p) => p.period === period);
    if (pTime) {
      setCurrentTimeString(`${pTime.start}.00 WIB`);
    }
  };

  const toggleSimulatedClock = (active: boolean) => {
    setIsSimulatedTime(active);
  };

  // User Account CRUD & Guru Sync
  const addUserAccount = (account: UserAccount) => {
    setUserAccounts((prev) => [...prev, account]);
  };

  const updateUserAccount = (account: UserAccount) => {
    setUserAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    
    // Update active currentUser if it matches
    if (currentUser.id === account.id || (account.teacherId && currentUser.teacherId === account.teacherId)) {
      const isPiketToday = account.piketDays?.includes(currentDayName) || false;
      setCurrentUser((prev) => ({
        ...prev,
        name: account.name,
        role: account.role as UserRole,
        username: account.username,
        piketDays: account.piketDays,
        isPiketToday,
      }));
    }

    // Also sync to teacher if connected
    if (account.teacherId) {
      const isPiketToday = account.piketDays?.includes(currentDayName) || false;
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === account.teacherId
            ? {
                ...t,
                name: account.name,
                nip: account.nip || t.nip,
                code: account.teacherCode || t.code,
                piketDays: account.piketDays,
                isPiketToday,
              }
            : t
        )
      );
    }
  };

  const deleteUserAccount = (id: string) => {
    setUserAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updatePiketDays = (accountId: string, days: string[]) => {
    const isPiketToday = days.includes(currentDayName);
    setUserAccounts((prev) =>
      prev.map((a) => {
        if (a.id === accountId) {
          return {
            ...a,
            piketDays: days,
            additionalDuty: days.length > 0 ? `Guru Piket (${days.join(', ')})` : undefined,
          };
        }
        return a;
      })
    );

    const targetAcc = userAccounts.find((a) => a.id === accountId);
    if (targetAcc && targetAcc.teacherId) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === targetAcc.teacherId
            ? { ...t, piketDays: days, isPiketToday }
            : t
        )
      );
    }

    if (currentUser.id === accountId || (targetAcc?.teacherId && currentUser.teacherId === targetAcc.teacherId)) {
      setCurrentUser((prev) => ({
        ...prev,
        piketDays: days,
        isPiketToday,
      }));
    }
  };

  const syncAccountsFromTeachers = () => {
    let created = 0;
    let updated = 0;

    setUserAccounts((prev) => {
      const accounts = [...prev];
      const existingByTeacherId = new Map(accounts.filter((a) => a.teacherId).map((a) => [a.teacherId!, a]));
      const existingUsernames = new Set(accounts.map((a) => a.username.toLowerCase()));

      teachers.forEach((t) => {
        const existingAcc = existingByTeacherId.get(t.id);
        if (existingAcc) {
          const idx = accounts.findIndex((a) => a.id === existingAcc.id);
          if (idx !== -1) {
            const old = accounts[idx];
            if (old.name !== t.name || old.nip !== t.nip || old.teacherCode !== t.code || old.email !== t.email) {
              accounts[idx] = {
                ...old,
                name: t.name,
                nip: t.nip,
                teacherCode: t.code,
                email: t.email,
              };
              updated++;
            }
          }
        } else {
          let usernameCandidate = t.code ? t.code.toUpperCase() : `GURU_${t.id}`;
          if (existingUsernames.has(usernameCandidate.toLowerCase())) {
            usernameCandidate = t.nip ? t.nip.replace(/\s+/g, '') : `GURU_${t.id}`;
          }
          existingUsernames.add(usernameCandidate.toLowerCase());

          const piketDays = t.piketDays || (t.isPiketToday ? [currentDayName] : []);
          const newAccount: UserAccount = {
            id: `usr-${t.id}-${Date.now().toString(36)}`,
            username: usernameCandidate,
            password: 'guru123',
            name: t.name,
            role: 'guru',
            teacherId: t.id,
            teacherCode: t.code,
            nip: t.nip,
            email: t.email,
            piketDays,
            status: 'aktif',
            additionalDuty: piketDays.length > 0 ? `Guru Piket (${piketDays.join(', ')})` : undefined,
          };
          accounts.push(newAccount);
          created++;
        }
      });

      return accounts;
    });

    return {
      created,
      updated,
      message: `Sinkronisasi berhasil: ${created} akun baru ditambahkan, ${updated} akun diperbarui sesuai Data Guru.`,
    };
  };

  const loginWithCredentials = (usernameInput: string, passwordInput: string) => {
    const trimmedUser = usernameInput.trim().toLowerCase();
    const matched = userAccounts.find(
      (acc) =>
        (acc.username.toLowerCase() === trimmedUser ||
          (acc.nip && acc.nip.replace(/\s+/g, '').toLowerCase() === trimmedUser.replace(/\s+/g, '')) ||
          (acc.teacherCode && acc.teacherCode.toLowerCase() === trimmedUser)) &&
        acc.password === passwordInput
    );

    if (!matched) {
      return {
        success: false,
        message: 'Username atau password salah! Silakan periksa kembali username dan password Anda.',
      };
    }

    if (matched.status === 'nonaktif') {
      return {
        success: false,
        message: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi bagian admin.',
      };
    }

    const teacher = matched.teacherId ? teachers.find((t) => t.id === matched.teacherId) : undefined;
    const isPiketToday = matched.piketDays?.includes(currentDayName) || (teacher?.piketDays?.includes(currentDayName) ?? false);

    const newUser: CurrentUser = {
      id: matched.id,
      name: matched.name,
      role: matched.role as UserRole,
      title:
        matched.role === 'admin'
          ? 'Super Admin Sistem'
          : matched.role === 'pimpinan'
          ? (matched.additionalDuty || 'Pimpinan SMKN 1 Tegalsari')
          : isPiketToday
          ? `Guru Mapel & Guru Piket (${currentDayName})`
          : (teacher?.title || 'Guru Mapel'),
      teacherId: matched.teacherId,
      username: matched.username,
      piketDays: matched.piketDays,
      isPiketToday,
      teacherCode: matched.teacherCode || teacher?.code,
      nip: matched.nip || teacher?.nip,
    };

    setCurrentUser(newUser);

    if (matched.role === 'admin') {
      setActiveMenu('dashboard');
    } else if (matched.role === 'pimpinan') {
      setActiveMenu('dashboard_pimpinan');
    } else if (matched.role === 'guru') {
      setActiveMenu('pembelajaran_saya');
    }

    return {
      success: true,
      message: `Login berhasil! Selamat datang, ${matched.name}.`,
      user: newUser,
    };
  };

  // Master CRUD & Bulk Import dengan Sinkronisasi Otomatis ke Akun, Jadwal & Relasi Lainnya
  const addTeacher = (teacher: Teacher) => {
    setTeachers((prev) => [...prev, teacher]);
    // Otomatis sinkronkan dan buatkan akun login untuk guru baru
    setUserAccounts((prev) => {
      const exists = prev.some((a) => a.teacherId === teacher.id || a.username.toLowerCase() === teacher.code.toLowerCase());
      if (exists) return prev;
      const piketDays = teacher.piketDays || (teacher.isPiketToday ? ['Selasa'] : []);
      const newAcc: UserAccount = {
        id: `usr-${teacher.id}`,
        username: teacher.code,
        password: 'guru123',
        name: teacher.name,
        role: 'guru',
        teacherId: teacher.id,
        teacherCode: teacher.code,
        nip: teacher.nip,
        email: teacher.email,
        piketDays,
        status: 'aktif',
        additionalDuty: piketDays.length > 0 ? `Guru Piket (${piketDays.join(', ')})` : undefined,
      };
      return [...prev, newAcc];
    });
  };

  const updateTeacher = (teacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
    // Sinkronkan ke akun login guru
    setUserAccounts((prev) =>
      prev.map((a) =>
        a.teacherId === teacher.id
          ? {
              ...a,
              name: teacher.name,
              nip: teacher.nip,
              teacherCode: teacher.code,
              email: teacher.email,
              piketDays: teacher.piketDays || a.piketDays,
            }
          : a
      )
    );
    // Sinkronkan ke jadwal pelajaran
    setSchedules((prev) =>
      prev.map((s) =>
        s.teacherId === teacher.id
          ? { ...s, teacherName: teacher.name, teacherCode: teacher.code }
          : s
      )
    );
    // Sinkronkan ke wali kelas
    setClasses((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === teacher.id
          ? { ...c, homeroomTeacherName: teacher.name }
          : c
      )
    );
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setUserAccounts((prev) => prev.filter((a) => a.teacherId !== id));
    setSchedules((prev) =>
      prev.map((s) =>
        s.teacherId === id ? { ...s, teacherId: 't-none', teacherName: 'Belum Ditentukan', teacherCode: undefined } : s
      )
    );
    setClasses((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === id ? { ...c, homeroomTeacherId: undefined, homeroomTeacherName: undefined } : c
      )
    );
  };

  const bulkDeleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    setTeachers((prev) => prev.filter((t) => !idSet.has(t.id)));
    setUserAccounts((prev) => prev.filter((a) => !a.teacherId || !idSet.has(a.teacherId)));
    setSchedules((prev) =>
      prev.map((s) =>
        idSet.has(s.teacherId)
          ? { ...s, teacherId: 't-none', teacherName: 'Belum Ditentukan', teacherCode: undefined }
          : s
      )
    );
    setClasses((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId && idSet.has(c.homeroomTeacherId)
          ? { ...c, homeroomTeacherId: undefined, homeroomTeacherName: undefined }
          : c
      )
    );
  };

  const bulkUpdateTeachers = (ids: string[], updates: Partial<Teacher>) => {
    const idSet = new Set(ids);
    setTeachers((prev) =>
      prev.map((t) => (idSet.has(t.id) ? { ...t, ...updates } : t))
    );

    if (updates.department) {
      // Guru's department updated
    }

    if (updates.piketDays !== undefined) {
      const piketList = updates.piketDays;
      setUserAccounts((prev) =>
        prev.map((a) =>
          a.teacherId && idSet.has(a.teacherId)
            ? {
                ...a,
                piketDays: piketList,
                additionalDuty: piketList.length > 0 ? `Guru Piket (${piketList.join(', ')})` : undefined,
              }
            : a
        )
      );
    }
  };

  const importTeachers = (newTeachers: Teacher[]) => setTeachers((prev) => [...prev, ...newTeachers]);

  const addSubject = (subject: Subject) => setSubjects((prev) => [...prev, subject]);
  const updateSubject = (subject: Subject) => {
    const oldSub = subjects.find((s) => s.id === subject.id);
    setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
    // Sinkronkan ke jadwal pelajaran
    setSchedules((prev) =>
      prev.map((s) =>
        s.subjectCode === subject.code || (oldSub && s.subjectName.toLowerCase() === oldSub.name.toLowerCase())
          ? { ...s, subjectName: subject.name, subjectCode: subject.code }
          : s
      )
    );
    // Sinkronkan ke Data Guru (nama mapel yang diampu guru)
    if (oldSub) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.title === oldSub.name || t.title.toLowerCase() === oldSub.name.toLowerCase()
            ? { ...t, title: subject.name }
            : t
        )
      );
    }
  };
  const deleteSubject = (id: string) => {
    const oldSub = subjects.find((s) => s.id === id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (oldSub) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.title === oldSub.name ? { ...t, title: 'Belum Ditentukan' } : t
        )
      );
    }
  };

  const bulkDeleteSubjects = (ids: string[]) => {
    const idSet = new Set(ids);
    const removedSubjects = subjects.filter((s) => idSet.has(s.id));
    const removedNames = new Set(removedSubjects.map((s) => s.name.toLowerCase()));
    setSubjects((prev) => prev.filter((s) => !idSet.has(s.id)));
    if (removedNames.size > 0) {
      setTeachers((prev) =>
        prev.map((t) =>
          removedNames.has(t.title.toLowerCase()) ? { ...t, title: 'Belum Ditentukan' } : t
        )
      );
    }
  };

  const bulkUpdateSubjects = (ids: string[], updates: Partial<Subject>) => {
    const idSet = new Set(ids);
    setSubjects((prev) =>
      prev.map((s) => (idSet.has(s.id) ? { ...s, ...updates } : s))
    );
  };

  const importSubjects = (newSubjects: Subject[]) => setSubjects((prev) => [...prev, ...newSubjects]);

  const addDepartment = (dept: Department) => setDepartments((prev) => [...prev, dept]);
  const updateDepartment = (dept: Department) => {
    let oldCode = '';
    setDepartments((prev) => {
      const existing = prev.find((d) => d.id === dept.id);
      if (existing) oldCode = existing.code;
      return prev.map((d) => (d.id === dept.id ? dept : d));
    });

    if (oldCode && oldCode.toUpperCase() !== dept.code.toUpperCase()) {
      const oldUpper = oldCode.toUpperCase();
      const newCode = dept.code.toUpperCase();
      setClasses((prev) =>
        prev.map((c) =>
          (c.department || '').toUpperCase() === oldUpper
            ? { ...c, department: newCode }
            : c
        )
      );
      setSchedules((prev) =>
        prev.map((s) =>
          (s.department || '').toUpperCase() === oldUpper
            ? { ...s, department: newCode }
            : s
        )
      );
    }
  };

  const deleteDepartment = (id: string) => {
    let deletedCode = '';
    setDepartments((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) deletedCode = target.code;
      return prev.filter((d) => d.id !== id);
    });

    if (deletedCode) {
      const upper = deletedCode.toUpperCase();
      setClasses((prev) =>
        prev.map((c) =>
          (c.department || '').toUpperCase() === upper
            ? { ...c, department: 'UMUM' }
            : c
        )
      );
      setSchedules((prev) =>
        prev.map((s) =>
          (s.department || '').toUpperCase() === upper
            ? { ...s, department: 'UMUM' }
            : s
        )
      );
    }
  };

  const bulkDeleteDepartments = (ids: string[]) => {
    const idSet = new Set(ids);
    const deletedCodes = departments
      .filter((d) => idSet.has(d.id))
      .map((d) => d.code.toUpperCase());

    setDepartments((prev) => prev.filter((d) => !idSet.has(d.id)));

    if (deletedCodes.length > 0) {
      const codeSet = new Set(deletedCodes);
      setClasses((prev) =>
        prev.map((c) =>
          codeSet.has((c.department || '').toUpperCase())
            ? { ...c, department: 'UMUM' }
            : c
        )
      );
      setSchedules((prev) =>
        prev.map((s) =>
          codeSet.has((s.department || '').toUpperCase())
            ? { ...s, department: 'UMUM' }
            : s
        )
      );
    }
  };

  const bulkUpdateDepartments = (ids: string[], updates: Partial<Department>) => {
    const idSet = new Set(ids);
    setDepartments((prev) =>
      prev.map((d) => (idSet.has(d.id) ? { ...d, ...updates } : d))
    );
    if (updates.code) {
      const newCode = updates.code.toUpperCase();
      const oldCodes = departments
        .filter((d) => idSet.has(d.id))
        .map((d) => d.code.toUpperCase());
      const oldSet = new Set(oldCodes);
      setClasses((prev) =>
        prev.map((c) =>
          oldSet.has((c.department || '').toUpperCase())
            ? { ...c, department: newCode }
            : c
        )
      );
      setSchedules((prev) =>
        prev.map((s) =>
          oldSet.has((s.department || '').toUpperCase())
            ? { ...s, department: newCode }
            : s
        )
      );
    }
  };

  const addClass = (cls: SchoolClass) => setClasses((prev) => [...prev, cls]);
  const updateClass = (cls: SchoolClass) => {
    setClasses((prev) => prev.map((c) => (c.id === cls.id ? cls : c)));
    // Sinkronkan nama kelas dan jurusan ke jadwal pelajaran secara real-time
    setSchedules((prev) =>
      prev.map((s) =>
        s.classId === cls.id || s.className === cls.name
          ? { ...s, className: cls.name, department: cls.department }
          : s
      )
    );
  };
  const deleteClass = (id: string) => {
    const targetClass = classes.find((c) => c.id === id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setSchedules((prev) =>
      prev.filter((s) => s.classId !== id && (!targetClass || s.className !== targetClass.name))
    );
  };

  const bulkDeleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    const targetClasses = classes.filter((c) => idSet.has(c.id));
    const targetClassNames = new Set(targetClasses.map((c) => c.name));
    setClasses((prev) => prev.filter((c) => !idSet.has(c.id)));
    setSchedules((prev) =>
      prev.filter((s) => !idSet.has(s.classId) && !targetClassNames.has(s.className))
    );
  };

  const bulkUpdateClasses = (ids: string[], updates: Partial<SchoolClass>) => {
    const idSet = new Set(ids);
    const targetClasses = classes.filter((c) => idSet.has(c.id));
    const targetClassNames = new Set(targetClasses.map((c) => c.name));
    setClasses((prev) =>
      prev.map((c) => (idSet.has(c.id) ? { ...c, ...updates } : c))
    );
    if (updates.department) {
      setSchedules((prev) =>
        prev.map((s) =>
          idSet.has(s.classId) || targetClassNames.has(s.className)
            ? { ...s, department: updates.department! }
            : s
        )
      );
    }
  };

  const importClasses = (newClasses: SchoolClass[]) => setClasses((prev) => [...prev, ...newClasses]);

  const addRoom = (room: Room) => setRooms((prev) => [...prev, room]);
  const updateRoom = (room: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
    // Sinkronkan ke jadwal pelajaran
    setSchedules((prev) =>
      prev.map((s) =>
        s.roomName === room.name || s.roomName.includes(room.code)
          ? { ...s, roomName: room.name, roomType: room.type }
          : s
      )
    );
  };
  const deleteRoom = (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id));

  const bulkDeleteRooms = (ids: string[]) => {
    const idSet = new Set(ids);
    setRooms((prev) => prev.filter((r) => !idSet.has(r.id)));
  };

  const bulkUpdateRooms = (ids: string[], updates: Partial<Room>) => {
    const idSet = new Set(ids);
    setRooms((prev) =>
      prev.map((r) => (idSet.has(r.id) ? { ...r, ...updates } : r))
    );
  };

  const importRooms = (newRooms: Room[]) => setRooms((prev) => [...prev, ...newRooms]);

  const addAcademicYear = (ay: AcademicYear) => setAcademicYears((prev) => [...prev, ay]);
  const updateAcademicYear = (ay: AcademicYear) =>
    setAcademicYears((prev) => prev.map((item) => (item.id === ay.id ? ay : item)));
  const deleteAcademicYear = (id: string) => setAcademicYears((prev) => prev.filter((item) => item.id !== id));

  const bulkDeleteAcademicYears = (ids: string[]) => {
    const idSet = new Set(ids);
    setAcademicYears((prev) => prev.filter((item) => !idSet.has(item.id) || item.status === 'aktif'));
  };

  const bulkUpdateAcademicYears = (ids: string[], updates: Partial<AcademicYear>) => {
    const idSet = new Set(ids);
    setAcademicYears((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, ...updates } : item))
    );
  };

  const setActiveAcademicYear = (id: string) => {
    setAcademicYears((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === id ? 'aktif' : 'non_aktif',
      }))
    );
  };

  const addSchedule = (item: ScheduleItem) => setSchedules((prev) => [...prev, item]);
  const updateSchedule = (item: ScheduleItem) =>
    setSchedules((prev) => prev.map((s) => (s.id === item.id ? item : s)));
  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const bulkDeleteSchedules = (ids: string[]) => {
    const idSet = new Set(ids);
    setSchedules((prev) => prev.filter((s) => !idSet.has(s.id)));
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  };

  const bulkUpdateSchedules = (ids: string[], updates: Partial<ScheduleItem>) => {
    const idSet = new Set(ids);
    setSchedules((prev) =>
      prev.map((s) => (idSet.has(s.id) ? { ...s, ...updates } : s))
    );
  };
  const clearAllSchedules = () => {
    setSchedules([]);
    setAttendanceRecords({});
  };
  const importSchedules = (items: ScheduleItem[]) => setSchedules((prev) => [...prev, ...items]);
  const importClassSchedules = (classId: string, items: ScheduleItem[]) => {
    setSchedules((prev) => {
      // Hapus jadwal kelas yang diimpor, gantikan dengan jadwal baru, pertahankan jadwal kelas lainnya
      const otherClassesSchedules = prev.filter((s) => s.classId !== classId);
      return [...otherClassesSchedules, ...items];
    });
  };

  const resetAllData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_teachers`);
    localStorage.removeItem(`${STORAGE_KEY}_subjects`);
    localStorage.removeItem(`${STORAGE_KEY}_classes`);
    localStorage.removeItem(`${STORAGE_KEY}_rooms`);
    localStorage.removeItem(`${STORAGE_KEY}_departments`);
    localStorage.removeItem(`${STORAGE_KEY}_academic_years`);
    localStorage.removeItem(`${STORAGE_KEY}_schedules`);
    localStorage.removeItem(`${STORAGE_KEY}_attendance`);
    localStorage.removeItem(`${STORAGE_KEY}_user_accounts`);
    setTeachers(INITIAL_TEACHERS);
    setSubjects(INITIAL_SUBJECTS);
    setClasses(INITIAL_CLASSES);
    setRooms(INITIAL_ROOMS);
    setDepartments(INITIAL_DEPARTMENTS);
    setAcademicYears(INITIAL_ACADEMIC_YEARS);
    setSchedules(INITIAL_SCHEDULE);
    setAttendanceRecords({});
    setUserAccounts(INITIAL_USER_ACCOUNTS);
    setCurrentPeriod(1);
    setIsSimulatedTime(false);
  };

  // Hitung statistik secara dinamis & real-time dari array schedules yang aktif
  // Stats Calculation (Hanya menghitung jadwal yang aktif pada pekan yang berlaku)
  const activeSchedulesForStats = schedules.filter((s) => isScheduleMatchingCurrentWeek(s));
  const totalJadwal = activeSchedulesForStats.length;

  const uniqueTeachersSet = new Set<string>();
  let sedangBerlangsungCount = 0;
  let terlaksanaCount = 0;
  let tidakHadirCount = 0;
  let belumKonfirmasiCount = 0;

  activeSchedulesForStats.forEach((schedule) => {
    const rec = attendanceRecords[schedule.id];
    const teacherStatus = rec?.teacherConfirmation?.status;
    const piketStatus = rec?.piketConfirmation?.status;
    const isCurrent = schedule.periodIndex === currentPeriod;

    if (teacherStatus === 'hadir' || piketStatus === 'terverifikasi_hadir') {
      if (schedule.teacherName) uniqueTeachersSet.add(schedule.teacherName);
      if (piketStatus === 'terverifikasi_hadir') {
        terlaksanaCount += 1;
      } else if (isCurrent) {
        sedangBerlangsungCount += 1;
      } else {
        terlaksanaCount += 1;
      }
    } else if (
      teacherStatus === 'sakit' ||
      teacherStatus === 'izin' ||
      teacherStatus === 'dinas_luar' ||
      piketStatus === 'tidak_hadir' ||
      piketStatus === 'izin_terkonfirmasi' ||
      Boolean(rec?.piketConfirmation?.substituteTeacherName)
    ) {
      tidakHadirCount += 1;
    } else {
      if (isCurrent) {
        sedangBerlangsungCount += 1;
      }
      belumKonfirmasiCount += 1;
    }
  });

  const stats: StatsSummary = {
    totalJadwal,
    guruMengajar: uniqueTeachersSet.size,
    sedangBerlangsung: sedangBerlangsungCount,
    terlaksana: terlaksanaCount,
    belumKonfirmasi: belumKonfirmasiCount,
    tidakHadir: tidakHadirCount,
  };

  return (
    <AppContext.Provider
      value={{
        teachers,
        subjects,
        classes,
        rooms,
        departments,
        academicYears,
        schedules,
        attendanceRecords,
        userAccounts,
        currentUser,
        activeMenu,
        currentPeriod,
        currentTimeString,
        currentDateString,
        currentDateOnlyString,
        currentDayName,
        currentDayIndex,
        semesterString,
        isSimulatedTime,
        stats,
        realtimeWeekType,
        activeWeekFilter,
        effectiveWeekType,
        setActiveWeekFilter,
        getWeekTypeLabel,
        getWeekTypeShortLabel,
        isScheduleMatchingCurrentWeek,
        setActiveMenu,
        setCurrentUser,
        switchRole,
        confirmTeacherAttendance,
        quickTeacherStatusToggle,
        verifyPiketAttendance,
        quickPiketStatusToggle,
        setPeriodSimulated,
        toggleSimulatedClock,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        syncAccountsFromTeachers,
        updatePiketDays,
        loginWithCredentials,
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
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

