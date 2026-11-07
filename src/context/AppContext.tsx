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
  ScheduleLessonStatus,
  TeachingJournal,
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
  INITIAL_JOURNALS,
  PERIOD_TIMES,
  ensureDefaultAccounts,
  isProtectedAccount,
} from '../data/initialData';
import { Department, AcademicYear } from '../types';
import {
  getWeekRotationFromDate,
  getWeekTypeLabel,
  getWeekTypeShortLabel,
  isScheduleMatchingWeek,
} from '../data/scheduleWeeks';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, testFirestoreConnection } from '../lib/firebase';

export interface StatsSummary {
  totalJadwal: number;
  guruMengajar: number;
  sedangBerlangsung: number;
  terlaksana: number;
  terjadwal: number;
  berlangsungCount: number;
  selesaiCount: number;
  terjadwalCount: number;
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
  journals: TeachingJournal[];
  currentUser: CurrentUser;
  isAuthenticated: boolean;
  isServerConnected: boolean;
  isCloudConnected: boolean;
  logout: () => void;
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
  getScheduleStatus: (schedule: ScheduleItem) => ScheduleLessonStatus;
  
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
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; message: string; user?: CurrentUser }>;

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
  clearTableData: (tableKey: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal' | 'semua') => void;
  importSchedules: (items: ScheduleItem[]) => void;
  importClassSchedules: (classId: string, items: ScheduleItem[]) => void;
  resetAllData: () => void;

  // Jurnal Mengajar
  addJournal: (journal: TeachingJournal) => void;
  updateJournal: (journal: TeachingJournal) => void;
  deleteJournal: (id: string) => void;

  // Sinkronisasi Database Terpusat
  refreshFromServer: () => Promise<void>;
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

// Helper penetapan 3 status jadwal pelajaran: Berlangsung | Selesai | Terjadwal
export const getScheduleLessonStatus = (
  schedule: ScheduleItem,
  currentDayIndex: number,
  currentPeriod: number,
  currentDayName?: string
): ScheduleLessonStatus => {
  // Bila weekend (Sabtu/Minggu), fallback ke hari Selasa (2) tempat sampel jadwal aktif berada
  const effectiveDayIndex = currentDayIndex >= 6 ? 2 : currentDayIndex;

  let schedDay = schedule.dayOfWeek;
  const dayNameLower = (schedule.dayName || '').trim().toLowerCase();
  if (!schedDay && dayNameLower) {
    const dayMap: Record<string, number> = {
      senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 7
    };
    schedDay = dayMap[dayNameLower] || 1;
  }

  const periodNum = typeof schedule.periodIndex === 'number'
    ? schedule.periodIndex
    : parseInt(String(schedule.periodIndex), 10);

  const isToday =
    (schedDay && schedDay === effectiveDayIndex) ||
    (currentDayName && dayNameLower && dayNameLower === currentDayName.trim().toLowerCase());

  if (isToday) {
    if (isNaN(periodNum)) return 'Terjadwal';
    const activePeriod = currentPeriod > 0 ? currentPeriod : 1;
    if (periodNum === activePeriod) {
      return 'Berlangsung';
    } else if (periodNum < activePeriod) {
      return 'Selesai';
    } else {
      return 'Terjadwal';
    }
  }

  if (schedDay < effectiveDayIndex) {
    return 'Selesai';
  }
  return 'Terjadwal';
};

const STORAGE_KEY = 'simpati_smkn1tegalsari_v3';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Master state with localStorage persistence
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_teachers`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_TEACHERS;
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
    if (saved !== null) {
      try {
        const parsed: any[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(normalizeCategory);
      } catch (e) {
        return [];
      }
    }
    return INITIAL_SUBJECTS;
  });

  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_classes`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_CLASSES;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rooms`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_ROOMS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_departments`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_DEPARTMENTS;
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_academic_years`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_ACADEMIC_YEARS;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_schedules`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_SCHEDULE;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_attendance`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user_accounts`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return ensureDefaultAccounts(parsed);
      } catch (e) {
        return ensureDefaultAccounts(INITIAL_USER_ACCOUNTS);
      }
    }
    return ensureDefaultAccounts(INITIAL_USER_ACCOUNTS);
  });

  const [journals, setJournals] = useState<TeachingJournal[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_journals`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_JOURNALS;
  });

  const [clientId] = useState<string>(() => `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const isRemoteUpdatingRef = React.useRef<boolean>(false);
  const isInitialMount = React.useRef<boolean>(true);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem(`${STORAGE_KEY}_session`);
      return !!savedSession;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    try {
      const savedSession = localStorage.getItem(`${STORAGE_KEY}_session`);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user) return parsed.user;
      }
    } catch {}
    return {
      id: '',
      name: '',
      role: 'guru',
      title: '',
      username: '',
      piketDays: [],
    };
  });

  const logout = () => {
    localStorage.removeItem(`${STORAGE_KEY}_session`);
    setIsAuthenticated(false);
    setCurrentUser({
      id: '',
      name: '',
      role: 'guru',
      title: '',
      username: '',
      piketDays: [],
    });
    setActiveMenu('monitoring');
  };

  const syncToServer = async (key: string, data: any) => {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          data,
          updatedBy: currentUser.name || 'Pengguna SIMPATI',
          clientId,
        }),
      });
    } catch (err) {
      console.warn('[SIMPATI Sync] Gagal sinkronisasi data ke server:', err);
    }
  };

  // Helper sinkronisasi global Firestore ke dokumen database cloud bersama
  const syncToCloud = async (patch: Record<string, any>) => {
    try {
      await setDoc(
        doc(db, 'simpati_data', 'main_store'),
        {
          ...patch,
          lastUpdated: Date.now(),
          lastUpdatedBy: currentUser.name || 'Pengguna SIMPATI',
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[SIMPATI Cloud] Gagal sinkronisasi data ke Firestore:', err);
    }
  };

  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('monitoring');
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

  // Helper fungsi mutasi data: menyimpan langsung ke state, localStorage, server lokal, dan Cloud Firestore terpusat
  const updateTeachersAndSync = (updater: Teacher[] | ((prev: Teacher[]) => Teacher[])) => {
    setTeachers((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('teachers', next);
      syncToCloud({ teachers: next });
      return next;
    });
  };

  const updateSubjectsAndSync = (updater: Subject[] | ((prev: Subject[]) => Subject[])) => {
    setSubjects((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('subjects', next);
      syncToCloud({ subjects: next });
      return next;
    });
  };

  const updateClassesAndSync = (updater: SchoolClass[] | ((prev: SchoolClass[]) => SchoolClass[])) => {
    setClasses((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('classes', next);
      syncToCloud({ classes: next });
      return next;
    });
  };

  const updateDepartmentsAndSync = (updater: Department[] | ((prev: Department[]) => Department[])) => {
    setDepartments((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('departments', next);
      syncToCloud({ departments: next });
      return next;
    });
  };

  const updateRoomsAndSync = (updater: Room[] | ((prev: Room[]) => Room[])) => {
    setRooms((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('rooms', next);
      syncToCloud({ rooms: next });
      return next;
    });
  };

  const updateAcademicYearsAndSync = (updater: AcademicYear[] | ((prev: AcademicYear[]) => AcademicYear[])) => {
    setAcademicYears((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('academicYears', next);
      syncToCloud({ academicYears: next });
      return next;
    });
  };

  const updateSchedulesAndSync = (updater: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[])) => {
    setSchedules((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('schedules', next);
      syncToCloud({ schedules: next });
      return next;
    });
  };

  const updateAttendanceRecordsAndSync = (updater: Record<string, AttendanceRecord> | ((prev: Record<string, AttendanceRecord>) => Record<string, AttendanceRecord>)) => {
    setAttendanceRecords((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('attendanceRecords', next);
      syncToCloud({ attendanceRecords: next });
      return next;
    });
  };

  const updateUserAccountsAndSync = (updater: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => {
    setUserAccounts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const reconciled = ensureDefaultAccounts(next);
      try {
        localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled));
      } catch (e) {}
      syncToServer('userAccounts', reconciled);
      syncToCloud({ userAccounts: reconciled });
      return reconciled;
    });
  };

  const updateJournalsAndSync = (updater: TeachingJournal[] | ((prev: TeachingJournal[]) => TeachingJournal[])) => {
    setJournals((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(next));
      } catch (e) {}
      syncToServer('journals', next);
      syncToCloud({ journals: next });
      return next;
    });
  };

  // Fungsi sinkronisasi manual/otomatis langsung dari database cloud Firestore dan server terpusat
  const refreshFromServer = async () => {
    // 1. Prioritaskan pengambilan dari Cloud Firestore (Database terpusat bersama)
    try {
      const snap = await getDoc(doc(db, 'simpati_data', 'main_store'));
      if (snap.exists()) {
        const s = snap.data();
        if (Array.isArray(s.teachers)) { setTeachers(s.teachers); try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(s.teachers)); } catch (e) {} }
        if (Array.isArray(s.subjects)) { setSubjects(s.subjects); try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(s.subjects)); } catch (e) {} }
        if (Array.isArray(s.classes)) { setClasses(s.classes); try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(s.classes)); } catch (e) {} }
        if (Array.isArray(s.departments)) { setDepartments(s.departments); try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(s.departments)); } catch (e) {} }
        if (Array.isArray(s.rooms)) { setRooms(s.rooms); try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(s.rooms)); } catch (e) {} }
        if (Array.isArray(s.academicYears)) { setAcademicYears(s.academicYears); try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(s.academicYears)); } catch (e) {} }
        if (Array.isArray(s.schedules)) { setSchedules(s.schedules); try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(s.schedules)); } catch (e) {} }
        if (s.attendanceRecords && typeof s.attendanceRecords === 'object') { setAttendanceRecords(s.attendanceRecords); try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(s.attendanceRecords)); } catch (e) {} }
        if (Array.isArray(s.userAccounts)) {
          const reconciled = ensureDefaultAccounts(s.userAccounts);
          setUserAccounts(reconciled);
          try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
        }
        if (Array.isArray(s.journals)) { setJournals(s.journals); try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(s.journals)); } catch (e) {} }
        if (s.activeWeekFilter) { setActiveWeekFilterState(s.activeWeekFilter); try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, s.activeWeekFilter); } catch (e) {} }
        setIsCloudConnected(true);
        setIsServerConnected(true);
        return;
      }
    } catch (err) {
      console.warn('[SIMPATI Cloud] Refresh via Firestore cloud fallback ke local server:', err);
    }

    // 2. Fallback ke endpoint server HTTP lokal jika Firestore sedang offline
    try {
      const res = await fetch('/api/state');
      const json = await res.json();
      if (json.success && json.data) {
        const s = json.data;
        if (Array.isArray(s.teachers)) { setTeachers(s.teachers); try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(s.teachers)); } catch (e) {} }
        if (Array.isArray(s.subjects)) { setSubjects(s.subjects); try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(s.subjects)); } catch (e) {} }
        if (Array.isArray(s.classes)) { setClasses(s.classes); try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(s.classes)); } catch (e) {} }
        if (Array.isArray(s.departments)) { setDepartments(s.departments); try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(s.departments)); } catch (e) {} }
        if (Array.isArray(s.rooms)) { setRooms(s.rooms); try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(s.rooms)); } catch (e) {} }
        if (Array.isArray(s.academicYears)) { setAcademicYears(s.academicYears); try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(s.academicYears)); } catch (e) {} }
        if (Array.isArray(s.schedules)) { setSchedules(s.schedules); try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(s.schedules)); } catch (e) {} }
        if (s.attendanceRecords && typeof s.attendanceRecords === 'object') { setAttendanceRecords(s.attendanceRecords); try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(s.attendanceRecords)); } catch (e) {} }
        if (Array.isArray(s.userAccounts)) {
          const reconciled = ensureDefaultAccounts(s.userAccounts);
          setUserAccounts(reconciled);
          try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
        }
        if (Array.isArray(s.journals)) { setJournals(s.journals); try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(s.journals)); } catch (e) {} }
        if (s.activeWeekFilter) { setActiveWeekFilterState(s.activeWeekFilter); try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, s.activeWeekFilter); } catch (e) {} }
        setIsServerConnected(true);
      }
    } catch (err) {
      console.warn('[SIMPATI] Server state awal tidak dapat diambil:', err);
    }
  };

  // Hubungkan ke Cloud Firestore Terpusat & Server Lokal: Dengarkan pembaruan real-time di semua perangkat
  useEffect(() => {
    let isMounted = true;

    // 1. Dengarkan database Cloud Firestore secara real-time ke dokumen bersama
    const unsubscribeFirestore = onSnapshot(
      doc(db, 'simpati_data', 'main_store'),
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          const s = snapshot.data();
          if (Array.isArray(s.teachers)) { setTeachers(s.teachers); try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(s.teachers)); } catch (e) {} }
          if (Array.isArray(s.subjects)) { setSubjects(s.subjects); try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(s.subjects)); } catch (e) {} }
          if (Array.isArray(s.classes)) { setClasses(s.classes); try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(s.classes)); } catch (e) {} }
          if (Array.isArray(s.departments)) { setDepartments(s.departments); try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(s.departments)); } catch (e) {} }
          if (Array.isArray(s.rooms)) { setRooms(s.rooms); try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(s.rooms)); } catch (e) {} }
          if (Array.isArray(s.academicYears)) { setAcademicYears(s.academicYears); try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(s.academicYears)); } catch (e) {} }
          if (Array.isArray(s.schedules)) { setSchedules(s.schedules); try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(s.schedules)); } catch (e) {} }
          if (s.attendanceRecords && typeof s.attendanceRecords === 'object') { setAttendanceRecords(s.attendanceRecords); try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(s.attendanceRecords)); } catch (e) {} }
          if (Array.isArray(s.userAccounts)) {
            const reconciled = ensureDefaultAccounts(s.userAccounts);
            setUserAccounts(reconciled);
            try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
          }
          if (Array.isArray(s.journals)) { setJournals(s.journals); try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(s.journals)); } catch (e) {} }
          if (s.activeWeekFilter) { setActiveWeekFilterState(s.activeWeekFilter); try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, s.activeWeekFilter); } catch (e) {} }
          setIsCloudConnected(true);
          setIsServerConnected(true);
        } else {
          // Inisialisasi awal database cloud jika belum ada
          try {
            const initialStore = {
              teachers: INITIAL_TEACHERS,
              subjects: INITIAL_SUBJECTS,
              classes: INITIAL_CLASSES,
              departments: INITIAL_DEPARTMENTS,
              rooms: INITIAL_ROOMS,
              academicYears: INITIAL_ACADEMIC_YEARS,
              schedules: INITIAL_SCHEDULE,
              attendanceRecords: {},
              userAccounts: ensureDefaultAccounts(INITIAL_USER_ACCOUNTS),
              journals: INITIAL_JOURNALS,
              activeWeekFilter: 'ACTIVE',
              lastUpdated: Date.now(),
              lastUpdatedBy: 'System Cloud Seed',
            };
            await setDoc(doc(db, 'simpati_data', 'main_store'), initialStore);
            setIsCloudConnected(true);
          } catch (seedErr) {
            console.warn('[SIMPATI Cloud] Inisialisasi cloud store awal:', seedErr);
          }
        }
      },
      (err) => {
        console.warn('[SIMPATI Cloud] Firestore listener error, fallback aktif:', err);
        setIsCloudConnected(false);
      }
    );

    // 2. Panggil refresh awal dan dengarkan server SSE lokal
    refreshFromServer();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onopen = () => {
        if (isMounted) setIsServerConnected(true);
      };
      eventSource.onmessage = (event) => {
        try {
          const payloadData = JSON.parse(event.data);
          if (payloadData.type === 'state_updated' && payloadData.payload) {
            const { key, data, originClientId } = payloadData.payload;
            if (originClientId === clientId) return;

            if (key === 'teachers' && Array.isArray(data)) { setTeachers(data); try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'subjects' && Array.isArray(data)) { setSubjects(data); try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'classes' && Array.isArray(data)) { setClasses(data); try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'departments' && Array.isArray(data)) { setDepartments(data); try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'rooms' && Array.isArray(data)) { setRooms(data); try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'academicYears' && Array.isArray(data)) { setAcademicYears(data); try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'schedules' && Array.isArray(data)) { setSchedules(data); try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'attendanceRecords' && typeof data === 'object' && data !== null) { setAttendanceRecords(data); try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'userAccounts' && Array.isArray(data)) {
              const reconciled = ensureDefaultAccounts(data);
              setUserAccounts(reconciled);
              try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
            }
            else if (key === 'journals' && Array.isArray(data)) { setJournals(data); try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'activeWeekFilter' && typeof data === 'string') { setActiveWeekFilterState(data as any); try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, data); } catch (e) {} }
          }
        } catch (e) {
          console.error('[SIMPATI SSE] Parse error:', e);
        }
      };
      eventSource.onerror = () => {
        if (isMounted) setIsServerConnected(false);
      };
    } catch (e) {
      console.warn('[SIMPATI] SSE error:', e);
    }

    return () => {
      isMounted = false;
      unsubscribeFirestore();
      if (eventSource) eventSource.close();
    };
  }, [clientId]);

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
        name: 'CANDRA SURO LAKSONO, S.Pi',
        username: 'kepsek',
        teacherId: 't-kepsek',
        role: 'pimpinan' as const,
        piketDays: [],
        status: 'aktif' as const,
        nip: '19840925 201101 1 011',
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
        nip: pimpinanAcc.nip || '19840925 201101 1 011',
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
    updateAttendanceRecordsAndSync((prev) => {
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
    updateAttendanceRecordsAndSync((prev) => {
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
    updateUserAccountsAndSync((prev) => [...prev, account]);
  };

  const updateUserAccount = (account: UserAccount) => {
    updateUserAccountsAndSync((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    
    // Update active currentUser if it matches
    if (
      currentUser.id === account.id ||
      (account.teacherId && currentUser.teacherId === account.teacherId) ||
      (currentUser.username && currentUser.username.toLowerCase() === account.username.toLowerCase())
    ) {
      const isPiketToday = account.piketDays?.includes(currentDayName) || false;
      const updatedUser: CurrentUser = {
        ...currentUser,
        name: account.name,
        role: account.role as UserRole,
        username: account.username,
        teacherCode: account.teacherCode || currentUser.teacherCode,
        piketDays: account.piketDays,
        isPiketToday,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(`${STORAGE_KEY}_session`, JSON.stringify({ user: updatedUser, token: 'session-token' }));
      } catch (e) {}
    }

    // Also sync to teacher if connected
    if (account.teacherId) {
      const isPiketToday = account.piketDays?.includes(currentDayName) || false;
      updateTeachersAndSync((prev) =>
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
    // Lindungi akun sistem utama agar tidak pernah terhapus
    if (id === 'usr-admin' || id === 'usr-kepsek' || id === 'usr-waka-kurikulum') {
      console.warn('[SIMPATI] Akun sistem utama tidak dapat dihapus.');
      return;
    }
    updateUserAccountsAndSync((prev) =>
      prev.filter((a) => a.id !== id && !isProtectedAccount(a))
    );
  };

  const updatePiketDays = (accountId: string, days: string[]) => {
    const isPiketToday = days.includes(currentDayName);
    updateUserAccountsAndSync((prev) =>
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
      updateTeachersAndSync((prev) =>
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

    updateUserAccountsAndSync((prev) => {
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

  const loginWithCredentials = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; message: string; user?: CurrentUser }> => {
    // 1. Verifikasi dengan endpoint backend /api/auth/login
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await resp.json();
      if (resp.ok && data.success && data.user) {
        const u = data.user;
        const isPiketToday = u.piketDays?.includes(currentDayName) || false;
        const authUser: CurrentUser = {
          ...u,
          isPiketToday,
        };
        setCurrentUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(`${STORAGE_KEY}_session`, JSON.stringify({ user: authUser, token: 'session-token' }));

        if (authUser.role === 'admin') setActiveMenu('dashboard');
        else if (authUser.role === 'pimpinan') setActiveMenu('dashboard_pimpinan');
        else if (authUser.role === 'piket') setActiveMenu('guru_piket');
        else setActiveMenu('pembelajaran_saya');

        return {
          success: true,
          message: data.message || `Login berhasil! Selamat datang, ${authUser.name}.`,
          user: authUser,
        };
      } else if (!resp.ok && data.message) {
        return {
          success: false,
          message: data.message,
        };
      }
    } catch (err) {
      // Server offline / fallback ke verifikasi lokal
    }

    // 2. Verifikasi lokal terhadap userAccounts
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
        message: 'Username atau password salah! Pastikan akun telah didaftarkan oleh Admin.',
      };
    }

    if (matched.status === 'nonaktif') {
      return {
        success: false,
        message: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi admin sekolah.',
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
    setIsAuthenticated(true);
    localStorage.setItem(`${STORAGE_KEY}_session`, JSON.stringify({ user: newUser, token: 'session-token' }));

    if (newUser.role === 'admin') {
      setActiveMenu('dashboard');
    } else if (newUser.role === 'pimpinan') {
      setActiveMenu('dashboard_pimpinan');
    } else if (newUser.role === 'piket') {
      setActiveMenu('guru_piket');
    } else {
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
    updateTeachersAndSync((prev) => [...prev, teacher]);
    // Otomatis sinkronkan dan buatkan akun login untuk guru baru
    updateUserAccountsAndSync((prev) => {
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
    updateTeachersAndSync((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
    // Sinkronkan ke akun login guru
    updateUserAccountsAndSync((prev) =>
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
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.teacherId === teacher.id
          ? { ...s, teacherName: teacher.name, teacherCode: teacher.code }
          : s
      )
    );
    // Sinkronkan ke wali kelas
    updateClassesAndSync((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === teacher.id
          ? { ...c, homeroomTeacherName: teacher.name }
          : c
      )
    );
  };

  const deleteTeacher = (id: string) => {
    updateTeachersAndSync((prev) => prev.filter((t) => t.id !== id));
    updateUserAccountsAndSync((prev) => prev.filter((a) => a.teacherId !== id));
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.teacherId === id ? { ...s, teacherId: 't-none', teacherName: 'Belum Ditentukan', teacherCode: undefined } : s
      )
    );
    updateClassesAndSync((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === id ? { ...c, homeroomTeacherId: undefined, homeroomTeacherName: undefined } : c
      )
    );
  };

  const bulkDeleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    updateTeachersAndSync((prev) => prev.filter((t) => !idSet.has(t.id)));
    updateUserAccountsAndSync((prev) => prev.filter((a) => !a.teacherId || !idSet.has(a.teacherId)));
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        idSet.has(s.teacherId)
          ? { ...s, teacherId: 't-none', teacherName: 'Belum Ditentukan', teacherCode: undefined }
          : s
      )
    );
    updateClassesAndSync((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId && idSet.has(c.homeroomTeacherId)
          ? { ...c, homeroomTeacherId: undefined, homeroomTeacherName: undefined }
          : c
      )
    );
  };

  const bulkUpdateTeachers = (ids: string[], updates: Partial<Teacher>) => {
    const idSet = new Set(ids);
    updateTeachersAndSync((prev) =>
      prev.map((t) => (idSet.has(t.id) ? { ...t, ...updates } : t))
    );

    if (updates.piketDays !== undefined) {
      const piketList = updates.piketDays;
      updateUserAccountsAndSync((prev) =>
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

  const importTeachers = (newTeachers: Teacher[]) => updateTeachersAndSync((prev) => [...prev, ...newTeachers]);

  const addSubject = (subject: Subject) => updateSubjectsAndSync((prev) => [...prev, subject]);
  const updateSubject = (subject: Subject) => {
    const oldSub = subjects.find((s) => s.id === subject.id);
    updateSubjectsAndSync((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
    // Sinkronkan ke jadwal pelajaran
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.subjectCode === subject.code || (oldSub && s.subjectName.toLowerCase() === oldSub.name.toLowerCase())
          ? { ...s, subjectName: subject.name, subjectCode: subject.code }
          : s
      )
    );
    // Sinkronkan ke Data Guru (nama mapel yang diampu guru)
    if (oldSub) {
      updateTeachersAndSync((prev) =>
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
    updateSubjectsAndSync((prev) => prev.filter((s) => s.id !== id));
    if (oldSub) {
      updateTeachersAndSync((prev) =>
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
    updateSubjectsAndSync((prev) => prev.filter((s) => !idSet.has(s.id)));
    if (removedNames.size > 0) {
      updateTeachersAndSync((prev) =>
        prev.map((t) =>
          removedNames.has(t.title.toLowerCase()) ? { ...t, title: 'Belum Ditentukan' } : t
        )
      );
    }
  };

  const bulkUpdateSubjects = (ids: string[], updates: Partial<Subject>) => {
    const idSet = new Set(ids);
    updateSubjectsAndSync((prev) =>
      prev.map((s) => (idSet.has(s.id) ? { ...s, ...updates } : s))
    );
  };

  const importSubjects = (newSubjects: Subject[]) => updateSubjectsAndSync((prev) => [...prev, ...newSubjects]);

  const addDepartment = (dept: Department) => updateDepartmentsAndSync((prev) => [...prev, dept]);
  const updateDepartment = (dept: Department) => {
    let oldCode = '';
    updateDepartmentsAndSync((prev) => {
      const existing = prev.find((d) => d.id === dept.id);
      if (existing) oldCode = existing.code;
      return prev.map((d) => (d.id === dept.id ? dept : d));
    });

    if (oldCode && oldCode.toUpperCase() !== dept.code.toUpperCase()) {
      const oldUpper = oldCode.toUpperCase();
      const newCode = dept.code.toUpperCase();
      updateClassesAndSync((prev) =>
        prev.map((c) =>
          (c.department || '').toUpperCase() === oldUpper
            ? { ...c, department: newCode }
            : c
        )
      );
      updateSchedulesAndSync((prev) =>
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
    updateDepartmentsAndSync((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) deletedCode = target.code;
      return prev.filter((d) => d.id !== id);
    });

    if (deletedCode) {
      const upper = deletedCode.toUpperCase();
      updateClassesAndSync((prev) =>
        prev.map((c) =>
          (c.department || '').toUpperCase() === upper
            ? { ...c, department: 'UMUM' }
            : c
        )
      );
      updateSchedulesAndSync((prev) =>
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

    updateDepartmentsAndSync((prev) => prev.filter((d) => !idSet.has(d.id)));

    if (deletedCodes.length > 0) {
      const codeSet = new Set(deletedCodes);
      updateClassesAndSync((prev) =>
        prev.map((c) =>
          codeSet.has((c.department || '').toUpperCase())
            ? { ...c, department: 'UMUM' }
            : c
        )
      );
      updateSchedulesAndSync((prev) =>
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
    updateDepartmentsAndSync((prev) =>
      prev.map((d) => (idSet.has(d.id) ? { ...d, ...updates } : d))
    );
    if (updates.code) {
      const newCode = updates.code.toUpperCase();
      const oldCodes = departments
        .filter((d) => idSet.has(d.id))
        .map((d) => d.code.toUpperCase());
      const oldSet = new Set(oldCodes);
      updateClassesAndSync((prev) =>
        prev.map((c) =>
          oldSet.has((c.department || '').toUpperCase())
            ? { ...c, department: newCode }
            : c
        )
      );
      updateSchedulesAndSync((prev) =>
        prev.map((s) =>
          oldSet.has((s.department || '').toUpperCase())
            ? { ...s, department: newCode }
            : s
        )
      );
    }
  };

  const addClass = (cls: SchoolClass) => updateClassesAndSync((prev) => [...prev, cls]);
  const updateClass = (cls: SchoolClass) => {
    updateClassesAndSync((prev) => prev.map((c) => (c.id === cls.id ? cls : c)));
    // Sinkronkan nama kelas dan jurusan ke jadwal pelajaran secara real-time
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.classId === cls.id || s.className === cls.name
          ? { ...s, className: cls.name, department: cls.department }
          : s
      )
    );
  };
  const deleteClass = (id: string) => {
    const targetClass = classes.find((c) => c.id === id);
    updateClassesAndSync((prev) => prev.filter((c) => c.id !== id));
    updateSchedulesAndSync((prev) =>
      prev.filter((s) => s.classId !== id && (!targetClass || s.className !== targetClass.name))
    );
  };

  const bulkDeleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    const targetClasses = classes.filter((c) => idSet.has(c.id));
    const targetClassNames = new Set(targetClasses.map((c) => c.name));
    updateClassesAndSync((prev) => prev.filter((c) => !idSet.has(c.id)));
    updateSchedulesAndSync((prev) =>
      prev.filter((s) => !idSet.has(s.classId) && !targetClassNames.has(s.className))
    );
  };

  const bulkUpdateClasses = (ids: string[], updates: Partial<SchoolClass>) => {
    const idSet = new Set(ids);
    const targetClasses = classes.filter((c) => idSet.has(c.id));
    const targetClassNames = new Set(targetClasses.map((c) => c.name));
    updateClassesAndSync((prev) =>
      prev.map((c) => (idSet.has(c.id) ? { ...c, ...updates } : c))
    );
    if (updates.department) {
      updateSchedulesAndSync((prev) =>
        prev.map((s) =>
          idSet.has(s.classId) || targetClassNames.has(s.className)
            ? { ...s, department: updates.department! }
            : s
        )
      );
    }
  };

  const importClasses = (newClasses: SchoolClass[]) => updateClassesAndSync((prev) => [...prev, ...newClasses]);

  const addRoom = (room: Room) => updateRoomsAndSync((prev) => [...prev, room]);
  const updateRoom = (room: Room) => {
    updateRoomsAndSync((prev) => prev.map((r) => (r.id === room.id ? room : r)));
    // Sinkronkan ke jadwal pelajaran
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.roomName === room.name || s.roomName.includes(room.code)
          ? { ...s, roomName: room.name, roomType: room.type }
          : s
      )
    );
  };
  const deleteRoom = (id: string) => updateRoomsAndSync((prev) => prev.filter((r) => r.id !== id));

  const bulkDeleteRooms = (ids: string[]) => {
    const idSet = new Set(ids);
    updateRoomsAndSync((prev) => prev.filter((r) => !idSet.has(r.id)));
  };

  const bulkUpdateRooms = (ids: string[], updates: Partial<Room>) => {
    const idSet = new Set(ids);
    updateRoomsAndSync((prev) =>
      prev.map((r) => (idSet.has(r.id) ? { ...r, ...updates } : r))
    );
  };

  const importRooms = (newRooms: Room[]) => updateRoomsAndSync((prev) => [...prev, ...newRooms]);

  const addAcademicYear = (ay: AcademicYear) => updateAcademicYearsAndSync((prev) => [...prev, ay]);
  const updateAcademicYear = (ay: AcademicYear) =>
    updateAcademicYearsAndSync((prev) => prev.map((item) => (item.id === ay.id ? ay : item)));
  const deleteAcademicYear = (id: string) => updateAcademicYearsAndSync((prev) => prev.filter((item) => item.id !== id));

  const bulkDeleteAcademicYears = (ids: string[]) => {
    const idSet = new Set(ids);
    updateAcademicYearsAndSync((prev) => prev.filter((item) => !idSet.has(item.id) || item.status === 'aktif'));
  };

  const bulkUpdateAcademicYears = (ids: string[], updates: Partial<AcademicYear>) => {
    const idSet = new Set(ids);
    updateAcademicYearsAndSync((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, ...updates } : item))
    );
  };

  const setActiveAcademicYear = (id: string) => {
    updateAcademicYearsAndSync((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === id ? 'aktif' : 'non_aktif',
      }))
    );
  };

  const addSchedule = (item: ScheduleItem) => updateSchedulesAndSync((prev) => [...prev, item]);
  const updateSchedule = (item: ScheduleItem) =>
    updateSchedulesAndSync((prev) => prev.map((s) => (s.id === item.id ? item : s)));
  const deleteSchedule = (id: string) => {
    updateSchedulesAndSync((prev) => prev.filter((s) => s.id !== id));
    updateAttendanceRecordsAndSync((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const bulkDeleteSchedules = (ids: string[]) => {
    const idSet = new Set(ids);
    updateSchedulesAndSync((prev) => prev.filter((s) => !idSet.has(s.id)));
    updateAttendanceRecordsAndSync((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  };

  const bulkUpdateSchedules = (ids: string[], updates: Partial<ScheduleItem>) => {
    const idSet = new Set(ids);
    updateSchedulesAndSync((prev) =>
      prev.map((s) => (idSet.has(s.id) ? { ...s, ...updates } : s))
    );
  };
  const clearAllSchedules = () => {
    updateSchedulesAndSync([]);
    updateAttendanceRecordsAndSync({});
  };
  const clearTableData = (tableKey: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal' | 'semua') => {
    if (tableKey === 'guru') {
      updateTeachersAndSync([]);
      updateUserAccountsAndSync((prev) =>
        prev.filter((a) => a.role === 'admin' || a.role === 'pimpinan' || !a.teacherId)
      );
      updateSchedulesAndSync((prev) =>
        prev.map((s) => ({ ...s, teacherId: 't-none', teacherName: 'Belum Ditentukan', teacherCode: undefined }))
      );
    } else if (tableKey === 'mapel') {
      updateSubjectsAndSync([]);
    } else if (tableKey === 'jurusan') {
      updateDepartmentsAndSync([]);
    } else if (tableKey === 'kelas') {
      updateClassesAndSync([]);
      updateSchedulesAndSync([]);
    } else if (tableKey === 'ruang') {
      updateRoomsAndSync([]);
    } else if (tableKey === 'tahun_pelajaran') {
      updateAcademicYearsAndSync((prev) => prev.filter((ay) => ay.status === 'aktif'));
    } else if (tableKey === 'jadwal') {
      updateSchedulesAndSync([]);
      updateAttendanceRecordsAndSync({});
    } else if (tableKey === 'semua') {
      updateTeachersAndSync([]);
      updateSubjectsAndSync([]);
      updateClassesAndSync([]);
      updateRoomsAndSync([]);
      updateDepartmentsAndSync([]);
      updateAcademicYearsAndSync((prev) => prev.filter((ay) => ay.status === 'aktif'));
      updateSchedulesAndSync([]);
      updateAttendanceRecordsAndSync({});
      updateJournalsAndSync([]);
      updateUserAccountsAndSync((prev) =>
        prev.filter((a) => a.role === 'admin' || a.role === 'pimpinan' || !a.teacherId)
      );
    }
  };
  const importSchedules = (items: ScheduleItem[]) => updateSchedulesAndSync((prev) => [...prev, ...items]);
  const importClassSchedules = (classId: string, items: ScheduleItem[]) => {
    updateSchedulesAndSync((prev) => {
      // Hapus jadwal kelas yang diimpor, gantikan dengan jadwal baru, pertahankan jadwal kelas lainnya
      const otherClassesSchedules = prev.filter((s) => s.classId !== classId);
      return [...otherClassesSchedules, ...items];
    });
  };

  // Jurnal Mengajar Handlers
  const addJournal = (journal: TeachingJournal) => {
    updateJournalsAndSync((prev) => [journal, ...prev]);
  };

  const updateJournal = (journal: TeachingJournal) => {
    updateJournalsAndSync((prev) => prev.map((j) => (j.id === journal.id ? journal : j)));
  };

  const deleteJournal = (id: string) => {
    updateJournalsAndSync((prev) => prev.filter((j) => j.id !== id));
  };

  const resetAllData = async () => {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'seed', clientId, updatedBy: currentUser.name || 'Admin' }),
      });
    } catch (e) {}
    updateTeachersAndSync(INITIAL_TEACHERS);
    updateSubjectsAndSync(INITIAL_SUBJECTS);
    updateClassesAndSync(INITIAL_CLASSES);
    updateRoomsAndSync(INITIAL_ROOMS);
    updateDepartmentsAndSync(INITIAL_DEPARTMENTS);
    updateAcademicYearsAndSync(INITIAL_ACADEMIC_YEARS);
    updateSchedulesAndSync(INITIAL_SCHEDULE);
    updateAttendanceRecordsAndSync({});
    updateJournalsAndSync(INITIAL_JOURNALS);
    updateUserAccountsAndSync(INITIAL_USER_ACCOUNTS);
    setCurrentPeriod(1);
    setIsSimulatedTime(false);
  };

  // Helper status jadwal di dalam provider
  const getScheduleStatus = (schedule: ScheduleItem): ScheduleLessonStatus => {
    return getScheduleLessonStatus(schedule, currentDayIndex, currentPeriod, currentDayName);
  };

  // Hitung statistik secara dinamis & real-time dari array schedules yang aktif
  // Stats Calculation: 3 Status (Berlangsung, Selesai, Terjadwal)
  const activeSchedulesForStats = schedules.filter((s) => isScheduleMatchingCurrentWeek(s));
  const totalJadwal = activeSchedulesForStats.length;

  const uniqueTeachersSet = new Set<string>();
  let berlangsungCount = 0;
  let selesaiCount = 0;
  let terjadwalCount = 0;

  activeSchedulesForStats.forEach((schedule) => {
    if (schedule.teacherName) uniqueTeachersSet.add(schedule.teacherName);
    const st = getScheduleStatus(schedule);
    if (st === 'Berlangsung') {
      berlangsungCount += 1;
    } else if (st === 'Selesai') {
      selesaiCount += 1;
    } else {
      terjadwalCount += 1;
    }
  });

  const stats: StatsSummary = {
    totalJadwal,
    guruMengajar: uniqueTeachersSet.size,
    sedangBerlangsung: berlangsungCount,
    terlaksana: selesaiCount,
    terjadwal: terjadwalCount,
    berlangsungCount,
    selesaiCount,
    terjadwalCount,
    belumKonfirmasi: 0,
    tidakHadir: 0,
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
        isAuthenticated,
        isServerConnected,
        isCloudConnected,
        logout,
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
        getScheduleStatus,
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
        clearTableData,
        importSchedules,
        importClassSchedules,
        resetAllData,
        journals,
        addJournal,
        updateJournal,
        deleteJournal,
        refreshFromServer,
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

