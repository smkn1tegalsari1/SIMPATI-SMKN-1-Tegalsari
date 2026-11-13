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
  MonthlyWeekEntry,
  MonthlyWeekSchedulesMap,
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
  resolveWeekRotationForDate,
  getWeekTypeLabel,
  getWeekTypeShortLabel,
  isScheduleMatchingWeek,
} from '../data/scheduleWeeks';
import {
  SEED_DEPARTMENTS,
  SEED_CLASSES,
  SEED_TEACHERS,
  SEED_SUBJECTS,
  SEED_ROOMS,
  SEED_SCHEDULES,
} from '../data/masterSeedData';
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
  monthlyWeekSchedules: MonthlyWeekSchedulesMap;
  setActiveWeekFilter: (w: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL') => void;
  setMonthlyWeekPlan: (monthKey: string, entries: MonthlyWeekEntry[]) => void;
  clearMonthlyWeekPlan: (monthKey: string) => void;
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
  resetAllTeacherPasswordsToDefault: () => { count: number; message: string };
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
  seedDatabaseFromPreset: () => Promise<boolean>;
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

// Rekursif hapus properti undefined agar Firestore setDoc tidak pernah gagal
function stripUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return val;
}

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
    return [];
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
    return [];
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
    return [];
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
    return [];
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
    return [];
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
    return [];
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
    return [];
  });

  const [monthlyWeekSchedules, setMonthlyWeekSchedules] = useState<MonthlyWeekSchedulesMap>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_monthly_weeks`);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (e) {
        return {};
      }
    }
    return {};
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

  const teachersRef = React.useRef<Teacher[]>(teachers);
  const subjectsRef = React.useRef<Subject[]>(subjects);
  const classesRef = React.useRef<SchoolClass[]>(classes);
  const roomsRef = React.useRef<Room[]>(rooms);
  const departmentsRef = React.useRef<Department[]>(departments);
  const academicYearsRef = React.useRef<AcademicYear[]>(academicYears);
  const schedulesRef = React.useRef<ScheduleItem[]>(schedules);
  const attendanceRecordsRef = React.useRef<Record<string, AttendanceRecord>>(attendanceRecords);
  const userAccountsRef = React.useRef<UserAccount[]>(userAccounts);
  const journalsRef = React.useRef<TeachingJournal[]>(journals);
  const monthlyWeekSchedulesRef = React.useRef<MonthlyWeekSchedulesMap>(monthlyWeekSchedules);
  const localMutationVersionRef = React.useRef<number>(0);

  const pendingServerPatchRef = React.useRef<Record<string, any>>({});
  const pendingCloudPatchRef = React.useRef<Record<string, any>>({});
  const flushScheduledRef = React.useRef<boolean>(false);
  const lastLocalMutationAtRef = React.useRef<number>(0);

  const scheduleSyncFlush = () => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    queueMicrotask(() => {
      flushScheduledRef.current = false;
      const serverPatch = pendingServerPatchRef.current;
      const cloudPatch = pendingCloudPatchRef.current;
      pendingServerPatchRef.current = {};
      pendingCloudPatchRef.current = {};

      const mutationTs = lastLocalMutationAtRef.current || Date.now();
      const updatedByName = currentUser.name || 'Pengguna SIMPATI';

      const serverKeys = Object.keys(serverPatch);
      if (serverKeys.length > 0) {
        const bodyPayload =
          serverKeys.length === 1
            ? {
                key: serverKeys[0],
                data: serverPatch[serverKeys[0]],
                updatedBy: updatedByName,
                clientId,
              }
            : {
                fullState: serverPatch,
                updatedBy: updatedByName,
                clientId,
              };

        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        }).catch((err) => {
          console.warn('[SIMPATI Sync] Gagal sinkronisasi data ke server:', err);
        });
      }

      if (Object.keys(cloudPatch).length > 0) {
        const sanitizedPatch = stripUndefined({
          ...cloudPatch,
          lastUpdated: mutationTs,
          lastUpdatedBy: updatedByName,
          lastUpdatedByClientId: clientId,
        });
        setDoc(
          doc(db, 'simpati_data', 'main_store'),
          sanitizedPatch,
          { merge: true }
        )
          .then(() => {
            setIsCloudConnected(true);
          })
          .catch((err) => {
            console.warn('[SIMPATI Cloud] Gagal sinkronisasi data ke Firestore:', err);
          });
      }
    });
  };

  const syncToServer = async (key: string, data: any) => {
    if (key === 'fullState' && data && typeof data === 'object') {
      pendingServerPatchRef.current = {
        ...pendingServerPatchRef.current,
        ...stripUndefined(data),
      };
    } else {
      pendingServerPatchRef.current[key] = stripUndefined(data);
    }
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  // Helper sinkronisasi global Firestore ke dokumen database cloud bersama
  const syncToCloud = async (patch: Record<string, any>) => {
    pendingCloudPatchRef.current = {
      ...pendingCloudPatchRef.current,
      ...stripUndefined(patch),
    };
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
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

  // Rotasi Pekan Mingguan SMK (Mengikuti Jadwal Pekan Bulanan dari Admin atau Kalender Laptop)
  const [realtimeWeekType, setRealtimeWeekType] = useState<'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD'>(() =>
    resolveWeekRotationForDate(new Date(), monthlyWeekSchedules)
  );

  const [activeWeekFilter, setActiveWeekFilterState] = useState<'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_week_filter`);
    return (saved as any) || 'AUTO';
  });

  const setActiveWeekFilter = (w: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL') => {
    localMutationVersionRef.current += 1;
    setActiveWeekFilterState(w);
    try {
      localStorage.setItem(`${STORAGE_KEY}_week_filter`, w);
    } catch (e) {}
    syncToServer('activeWeekFilter', w);
    syncToCloud({ activeWeekFilter: w });
  };

  const setMonthlyWeekPlan = (monthKey: string, entries: MonthlyWeekEntry[]) => {
    const nextMap: MonthlyWeekSchedulesMap = stripUndefined({
      ...monthlyWeekSchedulesRef.current,
      [monthKey]: entries,
    });
    monthlyWeekSchedulesRef.current = nextMap;
    localMutationVersionRef.current += 1;
    setMonthlyWeekSchedules(nextMap);
    setRealtimeWeekType(resolveWeekRotationForDate(new Date(), nextMap));
    try {
      localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify(nextMap));
    } catch (e) {}
    syncToServer('monthlyWeekSchedules', nextMap);
    syncToCloud({ monthlyWeekSchedules: nextMap });
  };

  const clearMonthlyWeekPlan = (monthKey: string) => {
    const nextMap: MonthlyWeekSchedulesMap = { ...monthlyWeekSchedulesRef.current };
    delete nextMap[monthKey];
    monthlyWeekSchedulesRef.current = nextMap;
    localMutationVersionRef.current += 1;
    setMonthlyWeekSchedules(nextMap);
    setRealtimeWeekType(resolveWeekRotationForDate(new Date(), nextMap));
    try {
      localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify(nextMap));
    } catch (e) {}
    syncToServer('monthlyWeekSchedules', nextMap);
    syncToCloud({ monthlyWeekSchedules: nextMap });
  };

  const effectiveWeekType = activeWeekFilter === 'AUTO' ? realtimeWeekType : activeWeekFilter;

  const isScheduleMatchingCurrentWeek = (item: ScheduleItem): boolean => {
    return isScheduleMatchingWeek(item.weekType, activeWeekFilter, realtimeWeekType);
  };

  // Compute active academic year
  const activeAy = academicYears.find((ay) => ay.status === 'aktif') || academicYears[0];
  const semesterString = activeAy ? `${activeAy.name}` : 'Semester Ganjil · 2026/2027';

  // Helper fungsi mutasi data: menyimpan langsung ke ref, state, localStorage, server lokal, dan Cloud Firestore terpusat
  const updateTeachersAndSync = (updater: Teacher[] | ((prev: Teacher[]) => Teacher[])) => {
    const rawNext = typeof updater === 'function' ? updater(teachersRef.current) : updater;
    const next = stripUndefined(rawNext);
    teachersRef.current = next;
    localMutationVersionRef.current += 1;
    setTeachers(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('teachers', next);
    syncToCloud({ teachers: next });
  };

  const updateSubjectsAndSync = (updater: Subject[] | ((prev: Subject[]) => Subject[])) => {
    const rawNext = typeof updater === 'function' ? updater(subjectsRef.current) : updater;
    const next = stripUndefined(rawNext);
    subjectsRef.current = next;
    localMutationVersionRef.current += 1;
    setSubjects(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('subjects', next);
    syncToCloud({ subjects: next });
  };

  const updateClassesAndSync = (updater: SchoolClass[] | ((prev: SchoolClass[]) => SchoolClass[])) => {
    const rawNext = typeof updater === 'function' ? updater(classesRef.current) : updater;
    const next = stripUndefined(rawNext);
    classesRef.current = next;
    localMutationVersionRef.current += 1;
    setClasses(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('classes', next);
    syncToCloud({ classes: next });
  };

  const updateDepartmentsAndSync = (updater: Department[] | ((prev: Department[]) => Department[])) => {
    const rawNext = typeof updater === 'function' ? updater(departmentsRef.current) : updater;
    const next = stripUndefined(rawNext);
    departmentsRef.current = next;
    localMutationVersionRef.current += 1;
    setDepartments(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('departments', next);
    syncToCloud({ departments: next });
  };

  const updateRoomsAndSync = (updater: Room[] | ((prev: Room[]) => Room[])) => {
    const rawNext = typeof updater === 'function' ? updater(roomsRef.current) : updater;
    const next = stripUndefined(rawNext);
    roomsRef.current = next;
    localMutationVersionRef.current += 1;
    setRooms(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('rooms', next);
    syncToCloud({ rooms: next });
  };

  const updateAcademicYearsAndSync = (updater: AcademicYear[] | ((prev: AcademicYear[]) => AcademicYear[])) => {
    const rawNext = typeof updater === 'function' ? updater(academicYearsRef.current) : updater;
    const next = stripUndefined(rawNext);
    academicYearsRef.current = next;
    localMutationVersionRef.current += 1;
    setAcademicYears(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('academicYears', next);
    syncToCloud({ academicYears: next });
  };

  const updateSchedulesAndSync = (updater: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[])) => {
    const rawNext = typeof updater === 'function' ? updater(schedulesRef.current) : updater;
    const next = stripUndefined(rawNext);
    schedulesRef.current = next;
    localMutationVersionRef.current += 1;
    setSchedules(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('schedules', next);
    syncToCloud({ schedules: next });
  };

  const updateAttendanceRecordsAndSync = (updater: Record<string, AttendanceRecord> | ((prev: Record<string, AttendanceRecord>) => Record<string, AttendanceRecord>)) => {
    const rawNext = typeof updater === 'function' ? updater(attendanceRecordsRef.current) : updater;
    const next = stripUndefined(rawNext);
    attendanceRecordsRef.current = next;
    localMutationVersionRef.current += 1;
    setAttendanceRecords(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('attendanceRecords', next);
    syncToCloud({ attendanceRecords: next });
  };

  const updateUserAccountsAndSync = (updater: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => {
    const rawNext = typeof updater === 'function' ? updater(userAccountsRef.current) : updater;
    const reconciled = stripUndefined(ensureDefaultAccounts(rawNext));
    userAccountsRef.current = reconciled;
    localMutationVersionRef.current += 1;
    setUserAccounts(reconciled);
    try {
      localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled));
    } catch (e) {}
    syncToServer('userAccounts', reconciled);
    syncToCloud({ userAccounts: reconciled });
  };

  const updateJournalsAndSync = (updater: TeachingJournal[] | ((prev: TeachingJournal[]) => TeachingJournal[])) => {
    const rawNext = typeof updater === 'function' ? updater(journalsRef.current) : updater;
    const next = stripUndefined(rawNext);
    journalsRef.current = next;
    localMutationVersionRef.current += 1;
    setJournals(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('journals', next);
    syncToCloud({ journals: next });
  };

  const applyRemoteStore = (s: Record<string, any>) => {
    if (Array.isArray(s.teachers)) {
      teachersRef.current = s.teachers;
      setTeachers(s.teachers);
      try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(s.teachers)); } catch (e) {}
    }
    if (Array.isArray(s.subjects)) {
      subjectsRef.current = s.subjects;
      setSubjects(s.subjects);
      try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(s.subjects)); } catch (e) {}
    }
    if (Array.isArray(s.classes)) {
      classesRef.current = s.classes;
      setClasses(s.classes);
      try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(s.classes)); } catch (e) {}
    }
    if (Array.isArray(s.departments)) {
      departmentsRef.current = s.departments;
      setDepartments(s.departments);
      try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(s.departments)); } catch (e) {}
    }
    if (Array.isArray(s.rooms)) {
      roomsRef.current = s.rooms;
      setRooms(s.rooms);
      try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(s.rooms)); } catch (e) {}
    }
    if (Array.isArray(s.academicYears)) {
      academicYearsRef.current = s.academicYears;
      setAcademicYears(s.academicYears);
      try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(s.academicYears)); } catch (e) {}
    }
    if (Array.isArray(s.schedules)) {
      schedulesRef.current = s.schedules;
      setSchedules(s.schedules);
      try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(s.schedules)); } catch (e) {}
    }
    if (s.attendanceRecords && typeof s.attendanceRecords === 'object') {
      attendanceRecordsRef.current = s.attendanceRecords;
      setAttendanceRecords(s.attendanceRecords);
      try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(s.attendanceRecords)); } catch (e) {}
    }
    if (Array.isArray(s.userAccounts)) {
      const reconciled = ensureDefaultAccounts(s.userAccounts);
      userAccountsRef.current = reconciled;
      setUserAccounts(reconciled);
      try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
    }
    if (Array.isArray(s.journals)) {
      journalsRef.current = s.journals;
      setJournals(s.journals);
      try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(s.journals)); } catch (e) {}
    }
    if (s.monthlyWeekSchedules && typeof s.monthlyWeekSchedules === 'object' && !Array.isArray(s.monthlyWeekSchedules)) {
      monthlyWeekSchedulesRef.current = s.monthlyWeekSchedules;
      setMonthlyWeekSchedules(s.monthlyWeekSchedules);
      setRealtimeWeekType(resolveWeekRotationForDate(new Date(), s.monthlyWeekSchedules));
      try { localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify(s.monthlyWeekSchedules)); } catch (e) {}
    }
    if (s.activeWeekFilter) {
      setActiveWeekFilterState(s.activeWeekFilter);
      try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, s.activeWeekFilter); } catch (e) {}
    }
  };

  // Fungsi sinkronisasi manual/otomatis langsung dari database cloud Firestore dan server terpusat
  const refreshFromServer = async () => {
    const startVersion = localMutationVersionRef.current;
    let cloudData: Record<string, any> | null = null;
    let serverData: Record<string, any> | null = null;

    const [cloudRes, serverRes] = await Promise.allSettled([
      getDoc(doc(db, 'simpati_data', 'main_store')),
      fetch('/api/state').then((r) => r.json()),
    ]);

    if (cloudRes.status === 'fulfilled' && cloudRes.value.exists()) {
      cloudData = cloudRes.value.data();
      setIsCloudConnected(true);
    }

    if (serverRes.status === 'fulfilled' && serverRes.value?.success && serverRes.value?.data) {
      serverData = serverRes.value.data;
      setIsServerConnected(true);
    }

    if (localMutationVersionRef.current !== startVersion) {
      return;
    }

    const cloudTs = typeof cloudData?.lastUpdated === 'number' ? cloudData.lastUpdated : 0;
    const serverTs = typeof serverData?.lastUpdated === 'number' ? serverData.lastUpdated : 0;

    if (serverData && serverTs > cloudTs) {
      applyRemoteStore(serverData);
      if (cloudData !== null || serverTs > 0) {
        syncToCloud(stripUndefined(serverData));
      }
    } else if (cloudData) {
      applyRemoteStore(cloudData);
    } else if (serverData) {
      applyRemoteStore(serverData);
    }
  };

  // Fungsi sinkronisasi eksplisit / seed data master monitoring ke Cloud Firestore terpusat
  const seedDatabaseFromPreset = async (): Promise<boolean> => {
    try {
      const payload = {
        teachers: SEED_TEACHERS,
        subjects: SEED_SUBJECTS,
        classes: SEED_CLASSES,
        departments: SEED_DEPARTMENTS,
        rooms: SEED_ROOMS,
        academicYears: INITIAL_ACADEMIC_YEARS,
        schedules: SEED_SCHEDULES,
        attendanceRecords: {},
        userAccounts: ensureDefaultAccounts(userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS),
        journals,
        activeWeekFilter: 'ACTIVE',
        lastUpdated: Date.now(),
        lastUpdatedBy: currentUser.name || 'Admin SIMPATI',
      };

      setTeachers(SEED_TEACHERS);
      setSubjects(SEED_SUBJECTS);
      setClasses(SEED_CLASSES);
      setDepartments(SEED_DEPARTMENTS);
      setRooms(SEED_ROOMS);
      setSchedules(SEED_SCHEDULES);

      try {
        localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(SEED_TEACHERS));
        localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(SEED_SUBJECTS));
        localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(SEED_CLASSES));
        localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(SEED_DEPARTMENTS));
        localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(SEED_ROOMS));
        localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(SEED_SCHEDULES));
      } catch (e) {}

      syncToServer('fullState', payload);
      await setDoc(doc(db, 'simpati_data', 'main_store'), payload);
      setIsCloudConnected(true);
      return true;
    } catch (err) {
      console.error('[SIMPATI Cloud] Gagal seed database dari preset:', err);
      return false;
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
          
          // Abaikan echo lokal atau ack in-flight yang lebih lama daripada mutasi lokal terbaru
          if (s.lastUpdatedByClientId === clientId && snapshot.metadata.hasPendingWrites) {
            return;
          }
          if (
            typeof s.lastUpdated === 'number' &&
            lastLocalMutationAtRef.current > 0 &&
            s.lastUpdated < lastLocalMutationAtRef.current
          ) {
            return;
          }

          // Inisialisasi awal ke Cloud Firestore dengan struktur bersih jika dokumen belum pernah diinisialisasi
          const isStoreBrandNew = !s.lastUpdated && !Array.isArray(s.classes) && !Array.isArray(s.teachers);
          if (isStoreBrandNew) {
            console.log('[SIMPATI Cloud] Inisialisasi struktur bersih awal ke Cloud Firestore...');
            const cleanInit = {
              teachers: [],
              subjects: [],
              classes: [],
              departments: [],
              rooms: [],
              academicYears: INITIAL_ACADEMIC_YEARS,
              schedules: [],
              attendanceRecords: {},
              userAccounts: ensureDefaultAccounts(INITIAL_USER_ACCOUNTS),
              journals: [],
              activeWeekFilter: 'AUTO',
              monthlyWeekSchedules: {},
              lastUpdated: Date.now(),
              lastUpdatedBy: 'System Fresh Init',
            };
            setDoc(doc(db, 'simpati_data', 'main_store'), cleanInit).catch(() => {});
          }

          applyRemoteStore(s);
          setIsCloudConnected(true);
          setIsServerConnected(true);
        } else {
          // Inisialisasi awal database cloud bersih jika belum ada
          try {
            const initialStore = {
              teachers: [],
              subjects: [],
              classes: [],
              departments: [],
              rooms: [],
              academicYears: INITIAL_ACADEMIC_YEARS,
              schedules: [],
              attendanceRecords: {},
              userAccounts: ensureDefaultAccounts(INITIAL_USER_ACCOUNTS),
              journals: [],
              activeWeekFilter: 'AUTO',
              monthlyWeekSchedules: {},
              lastUpdated: Date.now(),
              lastUpdatedBy: 'System Fresh Init',
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

            if (!key && data && typeof data === 'object') {
              applyRemoteStore(data);
            } else if (key === 'teachers' && Array.isArray(data)) { teachersRef.current = data; setTeachers(data); try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'subjects' && Array.isArray(data)) { subjectsRef.current = data; setSubjects(data); try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'classes' && Array.isArray(data)) { classesRef.current = data; setClasses(data); try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'departments' && Array.isArray(data)) { departmentsRef.current = data; setDepartments(data); try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'rooms' && Array.isArray(data)) { roomsRef.current = data; setRooms(data); try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'academicYears' && Array.isArray(data)) { academicYearsRef.current = data; setAcademicYears(data); try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'schedules' && Array.isArray(data)) { schedulesRef.current = data; setSchedules(data); try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'attendanceRecords' && typeof data === 'object' && data !== null) { attendanceRecordsRef.current = data; setAttendanceRecords(data); try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'userAccounts' && Array.isArray(data)) {
              const reconciled = ensureDefaultAccounts(data);
              userAccountsRef.current = reconciled;
              setUserAccounts(reconciled);
              try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
            }
            else if (key === 'journals' && Array.isArray(data)) { journalsRef.current = data; setJournals(data); try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(data)); } catch (e) {} }
            else if (key === 'activeWeekFilter' && typeof data === 'string') { setActiveWeekFilterState(data as any); try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, data); } catch (e) {} }
            else if (key === 'monthlyWeekSchedules' && typeof data === 'object' && data !== null) {
              monthlyWeekSchedulesRef.current = data;
              setMonthlyWeekSchedules(data);
              setRealtimeWeekType(resolveWeekRotationForDate(new Date(), data));
              try { localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify(data)); } catch (e) {}
            }
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

      const currentWeekRot = resolveWeekRotationForDate(now, monthlyWeekSchedulesRef.current);
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
            const isOldDefault = !old.password || old.password === 'guru123';
            if (
              old.name !== t.name ||
              old.nip !== t.nip ||
              old.teacherCode !== t.code ||
              old.email !== t.email ||
              isOldDefault
            ) {
              accounts[idx] = {
                ...old,
                name: t.name,
                nip: t.nip,
                teacherCode: t.code,
                email: t.email,
                password: isOldDefault ? 'semakasari123!' : old.password,
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
            password: 'semakasari123!',
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
      message: `Sinkronisasi berhasil: ${created} akun baru ditambahkan, ${updated} akun diperbarui. Password default akun guru diatur ke: semakasari123!`,
    };
  };

  const resetAllTeacherPasswordsToDefault = () => {
    let count = 0;
    updateUserAccountsAndSync((prev) =>
      prev.map((acc) => {
        if (acc.role === 'guru') {
          count++;
          return { ...acc, password: 'semakasari123!' };
        }
        return acc;
      })
    );
    return {
      count,
      message: `Berhasil mereset password ${count} akun guru ke default "semakasari123!" dan disinkronkan ke database cloud!`,
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
        password: 'semakasari123!',
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
    const oldSub = subjectsRef.current.find((s) => s.id === subject.id);
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
    const oldSub = subjectsRef.current.find((s) => s.id === id);
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
    const removedSubjects = subjectsRef.current.filter((s) => idSet.has(s.id));
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
    const existing = departmentsRef.current.find((d) => d.id === dept.id);
    const oldCode = existing?.code || '';
    updateDepartmentsAndSync((prev) => prev.map((d) => (d.id === dept.id ? dept : d)));

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
    const target = departmentsRef.current.find((d) => d.id === id);
    const deletedCode = target?.code || '';
    updateDepartmentsAndSync((prev) => prev.filter((d) => d.id !== id));

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
    const deletedCodes = departmentsRef.current
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
    const oldCodes = departmentsRef.current
      .filter((d) => idSet.has(d.id))
      .map((d) => d.code.toUpperCase());
    updateDepartmentsAndSync((prev) =>
      prev.map((d) => (idSet.has(d.id) ? { ...d, ...updates } : d))
    );
    if (updates.code) {
      const newCode = updates.code.toUpperCase();
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
    const targetClass = classesRef.current.find((c) => c.id === id);
    updateClassesAndSync((prev) => prev.filter((c) => c.id !== id));
    updateSchedulesAndSync((prev) =>
      prev.filter((s) => s.classId !== id && (!targetClass || s.className !== targetClass.name))
    );
  };

  const bulkDeleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    const targetClasses = classesRef.current.filter((c) => idSet.has(c.id));
    const targetClassNames = new Set(targetClasses.map((c) => c.name));
    updateClassesAndSync((prev) => prev.filter((c) => !idSet.has(c.id)));
    updateSchedulesAndSync((prev) =>
      prev.filter((s) => !idSet.has(s.classId) && !targetClassNames.has(s.className))
    );
  };

  const bulkUpdateClasses = (ids: string[], updates: Partial<SchoolClass>) => {
    const idSet = new Set(ids);
    const targetClasses = classesRef.current.filter((c) => idSet.has(c.id));
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
      const preservedAccounts = stripUndefined(
        ensureDefaultAccounts(
          userAccountsRef.current.filter((a) => a.role === 'admin' || a.role === 'pimpinan' || !a.teacherId)
        )
      );
      const cleanPayload = {
        teachers: [],
        subjects: [],
        classes: [],
        departments: [],
        rooms: [],
        academicYears: INITIAL_ACADEMIC_YEARS,
        schedules: [],
        attendanceRecords: {},
        journals: [],
        userAccounts: preservedAccounts,
        activeWeekFilter: 'AUTO',
        monthlyWeekSchedules: {},
        lastUpdated: Date.now(),
        lastUpdatedBy: currentUser.name || 'Admin SIMPATI',
      };

      teachersRef.current = [];
      subjectsRef.current = [];
      classesRef.current = [];
      roomsRef.current = [];
      departmentsRef.current = [];
      academicYearsRef.current = INITIAL_ACADEMIC_YEARS;
      schedulesRef.current = [];
      attendanceRecordsRef.current = {};
      journalsRef.current = [];
      userAccountsRef.current = preservedAccounts;
      monthlyWeekSchedulesRef.current = {};
      localMutationVersionRef.current += 1;

      setTeachers([]);
      setSubjects([]);
      setClasses([]);
      setRooms([]);
      setDepartments([]);
      setAcademicYears(INITIAL_ACADEMIC_YEARS);
      setSchedules([]);
      setAttendanceRecords({});
      setJournals([]);
      setUserAccounts(preservedAccounts);
      setActiveWeekFilterState('AUTO');
      setMonthlyWeekSchedules({});

      try {
        localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(INITIAL_ACADEMIC_YEARS));
        localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify({}));
        localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify([]));
        localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(preservedAccounts));
        localStorage.setItem(`${STORAGE_KEY}_week_filter`, 'AUTO');
        localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify({}));
      } catch (e) {}

      fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'empty', clientId, updatedBy: currentUser.name || 'Admin' }),
      }).catch(() => {});

      setDoc(doc(db, 'simpati_data', 'main_store'), cleanPayload).catch((err) => {
        console.warn('[SIMPATI Cloud] Gagal membersihkan database cloud:', err);
      });
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
    const freshAccounts = stripUndefined(ensureDefaultAccounts(INITIAL_USER_ACCOUNTS));
    const freshPayload = {
      teachers: [],
      subjects: [],
      classes: [],
      departments: [],
      rooms: [],
      academicYears: INITIAL_ACADEMIC_YEARS,
      schedules: [],
      attendanceRecords: {},
      journals: [],
      userAccounts: freshAccounts,
      activeWeekFilter: 'AUTO',
      monthlyWeekSchedules: {},
      lastUpdated: Date.now(),
      lastUpdatedBy: currentUser.name || 'Admin',
    };

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fresh', clientId, updatedBy: currentUser.name || 'Admin' }),
      });
    } catch (e) {}

    teachersRef.current = [];
    subjectsRef.current = [];
    classesRef.current = [];
    roomsRef.current = [];
    departmentsRef.current = [];
    academicYearsRef.current = INITIAL_ACADEMIC_YEARS;
    schedulesRef.current = [];
    attendanceRecordsRef.current = {};
    journalsRef.current = [];
    userAccountsRef.current = freshAccounts;
    monthlyWeekSchedulesRef.current = {};
    localMutationVersionRef.current += 1;

    setTeachers([]);
    setSubjects([]);
    setClasses([]);
    setRooms([]);
    setDepartments([]);
    setAcademicYears(INITIAL_ACADEMIC_YEARS);
    setSchedules([]);
    setAttendanceRecords({});
    setJournals([]);
    setUserAccounts(freshAccounts);
    setActiveWeekFilterState('AUTO');
    setMonthlyWeekSchedules({});
    setCurrentPeriod(1);
    setIsSimulatedTime(false);

    try {
      localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(INITIAL_ACADEMIC_YEARS));
      localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify({}));
      localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(freshAccounts));
      localStorage.setItem(`${STORAGE_KEY}_week_filter`, 'AUTO');
      localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify({}));
    } catch (e) {}

    try {
      await setDoc(doc(db, 'simpati_data', 'main_store'), freshPayload);
    } catch (e) {}
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
        monthlyWeekSchedules,
        setActiveWeekFilter,
        setMonthlyWeekPlan,
        clearMonthlyWeekPlan,
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
        resetAllTeacherPasswordsToDefault,
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
        seedDatabaseFromPreset,
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

