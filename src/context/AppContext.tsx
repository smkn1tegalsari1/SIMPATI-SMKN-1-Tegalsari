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
import { doc, getDoc, getDocFromServer, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, testFirestoreConnection, OperationType, handleFirestoreError } from '../lib/firebase';
import {
  hasMeaningfulSchoolData,
  pickAuthoritativeStore,
  ScheduleDelta,
  createEmptyScheduleDelta,
  hasScheduleDeltaChanges,
  mergeSchedulesWithDelta,
  combineScheduleDeltas,
  JournalDelta,
  createEmptyJournalDelta,
  hasJournalDeltaChanges,
  mergeJournalsWithDelta,
  combineJournalDeltas,
  AttendanceDelta,
  createEmptyAttendanceDelta,
  hasAttendanceDeltaChanges,
  mergeAttendanceWithDelta,
  combineAttendanceDeltas,
  EntityDelta,
  createEmptyEntityDelta,
  hasEntityDeltaChanges,
  recordEntityDeltaPatch,
  combineEntityDeltas,
  mergeEntitiesWithDelta,
} from '../data/storeSync';
import {
  computeSmartScheduleMerge,
  mergeMissingRecordsByKey,
  ParsedImportPayload,
  SimpatiDatabaseSnapshot,
} from '../data/databaseBackup';

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
  cloudSyncError: string | null;
  hasCloudBackup: boolean;
  cloudBackupSummary: {
    backedUpAt?: number;
    backedUpBy?: string;
    teachersCount: number;
    classesCount: number;
    schedulesCount: number;
  } | null;
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
  addTeacher: (teacher: Teacher) => Promise<{ success: boolean; error?: string }>;
  updateTeacher: (teacher: Teacher) => Promise<{ success: boolean; error?: string }>;
  deleteTeacher: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteTeachers: (ids: string[]) => void;
  bulkUpdateTeachers: (ids: string[], updates: Partial<Teacher>) => void;
  importTeachers: (newTeachers: Teacher[]) => Promise<{ success: boolean; error?: string }>;

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
  saveSchedulesBatch: (
    items: ScheduleItem[],
    replaceId?: string | string[]
  ) => Promise<{ success: boolean; error?: string; savedCount: number }>;
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
  createCloudBackup: (reason?: string) => Promise<boolean>;
  restoreFromCloudBackup: () => Promise<{ success: boolean; message: string }>;
  mergeImportedSchedulesAndData: (
    payload: ParsedImportPayload,
    options?: { mergeMasterData?: boolean; mergeJournals?: boolean }
  ) => Promise<{
    success: boolean;
    addedSchedules: number;
    updatedSchedules: number;
    skippedSchedules: number;
    addedMasterCount: number;
    addedJournals: number;
    message: string;
  }>;
  restoreDatabaseSnapshot: (
    snapshot: Partial<SimpatiDatabaseSnapshot>,
    mode?: 'full_snapshot' | 'schedules_only'
  ) => Promise<{ success: boolean; message: string }>;
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
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = useState<boolean>(false);
  const [cloudBackupSummary, setCloudBackupSummary] = useState<{
    backedUpAt?: number;
    backedUpBy?: string;
    teachersCount: number;
    classesCount: number;
    schedulesCount: number;
  } | null>(null);
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
  const inFlightCloudPatchRef = React.useRef<Record<string, any>>({});
  const pendingScheduleDeltaRef = React.useRef<ScheduleDelta>(createEmptyScheduleDelta());
  const inFlightScheduleDeltaRef = React.useRef<ScheduleDelta | null>(null);
  const pendingJournalDeltaRef = React.useRef<JournalDelta>(createEmptyJournalDelta());
  const inFlightJournalDeltaRef = React.useRef<JournalDelta | null>(null);
  const pendingAttendanceDeltaRef = React.useRef<AttendanceDelta>(createEmptyAttendanceDelta());
  const inFlightAttendanceDeltaRef = React.useRef<AttendanceDelta | null>(null);
  const pendingTeacherDeltaRef = React.useRef<EntityDelta<Teacher>>(createEmptyEntityDelta());
  const inFlightTeacherDeltaRef = React.useRef<EntityDelta<Teacher> | null>(null);
  const pendingUserAccountDeltaRef = React.useRef<EntityDelta<UserAccount>>(createEmptyEntityDelta());
  const inFlightUserAccountDeltaRef = React.useRef<EntityDelta<UserAccount> | null>(null);
  const pendingSubjectDeltaRef = React.useRef<EntityDelta<Subject>>(createEmptyEntityDelta());
  const inFlightSubjectDeltaRef = React.useRef<EntityDelta<Subject> | null>(null);
  const pendingClassDeltaRef = React.useRef<EntityDelta<SchoolClass>>(createEmptyEntityDelta());
  const inFlightClassDeltaRef = React.useRef<EntityDelta<SchoolClass> | null>(null);
  const pendingDepartmentDeltaRef = React.useRef<EntityDelta<Department>>(createEmptyEntityDelta());
  const inFlightDepartmentDeltaRef = React.useRef<EntityDelta<Department> | null>(null);
  const pendingRoomDeltaRef = React.useRef<EntityDelta<Room>>(createEmptyEntityDelta());
  const inFlightRoomDeltaRef = React.useRef<EntityDelta<Room> | null>(null);
  const pendingAcademicYearDeltaRef = React.useRef<EntityDelta<AcademicYear>>(createEmptyEntityDelta());
  const inFlightAcademicYearDeltaRef = React.useRef<EntityDelta<AcademicYear> | null>(null);
  const inFlightCloudFlushCountRef = React.useRef<number>(0);
  const activeFlushPromiseRef = React.useRef<Promise<boolean> | null>(null);
  const flushScheduledRef = React.useRef<boolean>(false);
  const lastLocalMutationAtRef = React.useRef<number>(0);
  const lastAutoBackupAtRef = React.useRef<number>(0);
  const autoBackupTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWeekFilterRef = React.useRef<'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('AUTO');
  const lastCloudSyncErrorRef = React.useRef<string | null>(null);

  const resetAllPendingDeltas = () => {
    pendingServerPatchRef.current = {};
    pendingCloudPatchRef.current = {};
    inFlightCloudPatchRef.current = {};
    pendingScheduleDeltaRef.current = createEmptyScheduleDelta();
    inFlightScheduleDeltaRef.current = null;
    pendingJournalDeltaRef.current = createEmptyJournalDelta();
    inFlightJournalDeltaRef.current = null;
    pendingAttendanceDeltaRef.current = createEmptyAttendanceDelta();
    inFlightAttendanceDeltaRef.current = null;
    pendingTeacherDeltaRef.current = createEmptyEntityDelta();
    inFlightTeacherDeltaRef.current = null;
    pendingUserAccountDeltaRef.current = createEmptyEntityDelta();
    inFlightUserAccountDeltaRef.current = null;
    pendingSubjectDeltaRef.current = createEmptyEntityDelta();
    inFlightSubjectDeltaRef.current = null;
    pendingClassDeltaRef.current = createEmptyEntityDelta();
    inFlightClassDeltaRef.current = null;
    pendingDepartmentDeltaRef.current = createEmptyEntityDelta();
    inFlightDepartmentDeltaRef.current = null;
    pendingRoomDeltaRef.current = createEmptyEntityDelta();
    inFlightRoomDeltaRef.current = null;
    pendingAcademicYearDeltaRef.current = createEmptyEntityDelta();
    inFlightAcademicYearDeltaRef.current = null;
  };

  const computeEntityDeltaFromLists = <T extends { id?: string }>(
    prevList: T[],
    nextList: T[]
  ): Partial<EntityDelta<T>> | null => {
    const prevMap = new Map<string, T>();
    prevList.forEach((item) => {
      if (item?.id) prevMap.set(item.id, item);
    });
    const nextIds = new Set<string>();
    const upserts: T[] = [];
    nextList.forEach((item) => {
      if (item?.id) {
        nextIds.add(item.id);
        const old = prevMap.get(item.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
          upserts.push(item);
        }
      }
    });
    const deleteIds: string[] = [];
    prevMap.forEach((_, id) => {
      if (!nextIds.has(id)) deleteIds.push(id);
    });
    if (upserts.length === 0 && deleteIds.length === 0) return null;
    return { upserts, deleteIds };
  };

  const recordScheduleDelta = (patch: Partial<ScheduleDelta>) => {
    const cur = pendingScheduleDeltaRef.current;
    if (patch.replaceAll !== undefined) {
      pendingScheduleDeltaRef.current = {
        upserts: [],
        deleteIds: [],
        replaceAll: stripUndefined(patch.replaceAll),
      };
      return;
    }
    if (patch.replaceClassScope !== undefined) {
      cur.replaceClassScope = stripUndefined(patch.replaceClassScope);
    }
    if (patch.deleteIds && patch.deleteIds.length > 0) {
      const delSet = new Set([...cur.deleteIds, ...patch.deleteIds]);
      cur.deleteIds = Array.from(delSet);
      cur.upserts = cur.upserts.filter((u) => !u?.id || !delSet.has(u.id));
    }
    if (patch.upserts && patch.upserts.length > 0) {
      const upsertIds = new Set(patch.upserts.map((u) => u?.id).filter(Boolean));
      cur.deleteIds = cur.deleteIds.filter((id) => !upsertIds.has(id));
      const map = new Map<string, any>();
      cur.upserts.forEach((u) => {
        if (u?.id) map.set(u.id, u);
      });
      stripUndefined(patch.upserts).forEach((u: any) => {
        if (u?.id) map.set(u.id, u);
      });
      cur.upserts = Array.from(map.values());
    }
  };

  const recordJournalDelta = (patch: Partial<JournalDelta>) => {
    const cur = pendingJournalDeltaRef.current;
    if (patch.replaceAll !== undefined) {
      pendingJournalDeltaRef.current = {
        upserts: [],
        deleteIds: [],
        replaceAll: stripUndefined(patch.replaceAll),
      };
      return;
    }
    if (patch.deleteIds && patch.deleteIds.length > 0) {
      const delSet = new Set([...cur.deleteIds, ...patch.deleteIds]);
      cur.deleteIds = Array.from(delSet);
      cur.upserts = cur.upserts.filter((u) => !u?.id || !delSet.has(u.id));
    }
    if (patch.upserts && patch.upserts.length > 0) {
      const upsertIds = new Set(patch.upserts.map((u) => u?.id).filter(Boolean));
      cur.deleteIds = cur.deleteIds.filter((id) => !upsertIds.has(id));
      const map = new Map<string, any>();
      cur.upserts.forEach((u) => {
        if (u?.id) map.set(u.id, u);
      });
      stripUndefined(patch.upserts).forEach((u: any) => {
        if (u?.id) map.set(u.id, u);
      });
      cur.upserts = Array.from(map.values());
    }
  };

  const recordAttendanceDelta = (patch: Partial<AttendanceDelta>) => {
    const cur = pendingAttendanceDeltaRef.current;
    if (patch.replaceAll !== undefined) {
      pendingAttendanceDeltaRef.current = {
        upserts: {},
        deleteKeys: [],
        replaceAll: stripUndefined(patch.replaceAll),
      };
      return;
    }
    if (patch.deleteKeys && patch.deleteKeys.length > 0) {
      const delSet = new Set([...cur.deleteKeys, ...patch.deleteKeys]);
      cur.deleteKeys = Array.from(delSet);
      for (const k of delSet) {
        delete cur.upserts[k];
      }
    }
    if (patch.upserts && Object.keys(patch.upserts).length > 0) {
      const cleanUpserts = stripUndefined(patch.upserts);
      const keys = new Set(Object.keys(cleanUpserts));
      cur.deleteKeys = cur.deleteKeys.filter((k) => !keys.has(k));
      cur.upserts = {
        ...cur.upserts,
        ...cleanUpserts,
      };
    }
  };

  const scheduleAutoCloudBackup = (reason: string) => {
    if (autoBackupTimerRef.current) {
      clearTimeout(autoBackupTimerRef.current);
    }
    autoBackupTimerRef.current = setTimeout(() => {
      autoBackupTimerRef.current = null;
      const now = Date.now();
      if (now - lastAutoBackupAtRef.current < 25_000) {
        return;
      }
      lastAutoBackupAtRef.current = now;
      void createCloudBackup(reason);
    }, 2500);
  };

  const flushSyncQueue = async (): Promise<boolean> => {
    // Jika ada flush lain sedang berjalan, tunggu selesai lalu flush sisa pending baru
    if (activeFlushPromiseRef.current) {
      await activeFlushPromiseRef.current;
    }

    const serverPatch = pendingServerPatchRef.current;
    const cloudPatch = pendingCloudPatchRef.current;
    const scheduleDelta = pendingScheduleDeltaRef.current;
    const journalDelta = pendingJournalDeltaRef.current;
    const attendanceDelta = pendingAttendanceDeltaRef.current;
    const teacherDelta = pendingTeacherDeltaRef.current;
    const userAccountDelta = pendingUserAccountDeltaRef.current;
    const subjectDelta = pendingSubjectDeltaRef.current;
    const classDelta = pendingClassDeltaRef.current;
    const departmentDelta = pendingDepartmentDeltaRef.current;
    const roomDelta = pendingRoomDeltaRef.current;
    const academicYearDelta = pendingAcademicYearDeltaRef.current;

    pendingServerPatchRef.current = {};
    pendingCloudPatchRef.current = {};
    pendingScheduleDeltaRef.current = createEmptyScheduleDelta();
    pendingJournalDeltaRef.current = createEmptyJournalDelta();
    pendingAttendanceDeltaRef.current = createEmptyAttendanceDelta();
    pendingTeacherDeltaRef.current = createEmptyEntityDelta();
    pendingUserAccountDeltaRef.current = createEmptyEntityDelta();
    pendingSubjectDeltaRef.current = createEmptyEntityDelta();
    pendingClassDeltaRef.current = createEmptyEntityDelta();
    pendingDepartmentDeltaRef.current = createEmptyEntityDelta();
    pendingRoomDeltaRef.current = createEmptyEntityDelta();
    pendingAcademicYearDeltaRef.current = createEmptyEntityDelta();

    const hasScheduleDelta = hasScheduleDeltaChanges(scheduleDelta);
    const hasJournalDelta = hasJournalDeltaChanges(journalDelta);
    const hasAttendanceDelta = hasAttendanceDeltaChanges(attendanceDelta);
    const hasTeacherDelta = hasEntityDeltaChanges(teacherDelta);
    const hasUserAccountDelta = hasEntityDeltaChanges(userAccountDelta);
    const hasSubjectDelta = hasEntityDeltaChanges(subjectDelta);
    const hasClassDelta = hasEntityDeltaChanges(classDelta);
    const hasDepartmentDelta = hasEntityDeltaChanges(departmentDelta);
    const hasRoomDelta = hasEntityDeltaChanges(roomDelta);
    const hasAcademicYearDelta = hasEntityDeltaChanges(academicYearDelta);
    const hasTransactionalDelta =
      hasScheduleDelta ||
      hasJournalDelta ||
      hasAttendanceDelta ||
      hasTeacherDelta ||
      hasUserAccountDelta ||
      hasSubjectDelta ||
      hasClassDelta ||
      hasDepartmentDelta ||
      hasRoomDelta ||
      hasAcademicYearDelta;
    const hasCloudKeys = Object.keys(cloudPatch).length > 0;
    const hasServerKeys = Object.keys(serverPatch).length > 0;

    if (!hasTransactionalDelta && !hasCloudKeys && !hasServerKeys) {
      return true;
    }

    const mutationTs = lastLocalMutationAtRef.current || Date.now();
    const updatedByName = currentUser.name || 'Pengguna SIMPATI';

    const postServerSync = async (stateToSync: Record<string, any>, ts: number) => {
      const keys = Object.keys(stateToSync);
      if (keys.length === 0) return;
      const bodyPayload =
        keys.length === 1
          ? {
              key: keys[0],
              data: stateToSync[keys[0]],
              updatedBy: updatedByName,
              clientId,
              lastUpdated: ts,
            }
          : {
              fullState: stateToSync,
              updatedBy: updatedByName,
              clientId,
              lastUpdated: ts,
            };
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
      } catch (err) {
        console.warn('[SIMPATI Sync] Gagal sinkronisasi data ke server lokal:', err);
      }
    };

    const runFlush = (async (): Promise<boolean> => {
      if (hasTransactionalDelta || hasCloudKeys) {
        inFlightCloudFlushCountRef.current += 1;
        inFlightCloudPatchRef.current = cloudPatch;
        if (hasScheduleDelta) inFlightScheduleDeltaRef.current = scheduleDelta;
        if (hasJournalDelta) inFlightJournalDeltaRef.current = journalDelta;
        if (hasAttendanceDelta) inFlightAttendanceDeltaRef.current = attendanceDelta;
        if (hasTeacherDelta) inFlightTeacherDeltaRef.current = teacherDelta;
        if (hasUserAccountDelta) inFlightUserAccountDeltaRef.current = userAccountDelta;
        if (hasSubjectDelta) inFlightSubjectDeltaRef.current = subjectDelta;
        if (hasClassDelta) inFlightClassDeltaRef.current = classDelta;
        if (hasDepartmentDelta) inFlightDepartmentDeltaRef.current = departmentDelta;
        if (hasRoomDelta) inFlightRoomDeltaRef.current = roomDelta;
        if (hasAcademicYearDelta) inFlightAcademicYearDeltaRef.current = academicYearDelta;

        try {
          const mainStoreRef = doc(db, 'simpati_data', 'main_store');
          const committed = await runTransaction(db, async (tx) => {
            const snap = await tx.get(mainStoreRef);
            const remoteData = snap.exists() ? snap.data() : {};
            const remoteTs = typeof remoteData.lastUpdated === 'number' ? remoteData.lastUpdated : 0;
            const safeTs = Math.max(mutationTs, remoteTs + 1);

            const txPayload: Record<string, any> = {
              ...cloudPatch,
              lastUpdated: safeTs,
              lastUpdatedBy: updatedByName,
              lastUpdatedByClientId: clientId,
              isInitialEmpty: false,
            };

            let mergedTeachers: Teacher[] | undefined;
            if (hasTeacherDelta) {
              const remoteTeachers = Array.isArray(remoteData.teachers) ? remoteData.teachers : [];
              mergedTeachers = stripUndefined(mergeEntitiesWithDelta(remoteTeachers, teacherDelta));
              txPayload.teachers = mergedTeachers;
            }

            let mergedUserAccounts: UserAccount[] | undefined;
            if (hasUserAccountDelta) {
              const remoteAccounts = Array.isArray(remoteData.userAccounts) ? remoteData.userAccounts : [];
              mergedUserAccounts = stripUndefined(
                ensureDefaultAccounts(mergeEntitiesWithDelta(remoteAccounts, userAccountDelta))
              );
              txPayload.userAccounts = mergedUserAccounts;
            }

            let mergedSubjects: Subject[] | undefined;
            if (hasSubjectDelta) {
              const remoteSubjects = Array.isArray(remoteData.subjects) ? remoteData.subjects : [];
              mergedSubjects = stripUndefined(mergeEntitiesWithDelta(remoteSubjects, subjectDelta));
              txPayload.subjects = mergedSubjects;
            }

            let mergedClasses: SchoolClass[] | undefined;
            if (hasClassDelta) {
              const remoteClasses = Array.isArray(remoteData.classes) ? remoteData.classes : [];
              mergedClasses = stripUndefined(mergeEntitiesWithDelta(remoteClasses, classDelta));
              txPayload.classes = mergedClasses;
            }

            let mergedDepartments: Department[] | undefined;
            if (hasDepartmentDelta) {
              const remoteDepartments = Array.isArray(remoteData.departments) ? remoteData.departments : [];
              mergedDepartments = stripUndefined(mergeEntitiesWithDelta(remoteDepartments, departmentDelta));
              txPayload.departments = mergedDepartments;
            }

            let mergedRooms: Room[] | undefined;
            if (hasRoomDelta) {
              const remoteRooms = Array.isArray(remoteData.rooms) ? remoteData.rooms : [];
              mergedRooms = stripUndefined(mergeEntitiesWithDelta(remoteRooms, roomDelta));
              txPayload.rooms = mergedRooms;
            }

            let mergedAcademicYears: AcademicYear[] | undefined;
            if (hasAcademicYearDelta) {
              const remoteAcademicYears = Array.isArray(remoteData.academicYears) ? remoteData.academicYears : [];
              mergedAcademicYears = stripUndefined(mergeEntitiesWithDelta(remoteAcademicYears, academicYearDelta));
              txPayload.academicYears = mergedAcademicYears;
            }

            let mergedSchedules: ScheduleItem[] | undefined;
            if (hasScheduleDelta) {
              const remoteSchedules = Array.isArray(remoteData.schedules) ? remoteData.schedules : [];
              mergedSchedules = stripUndefined(mergeSchedulesWithDelta(remoteSchedules, scheduleDelta));
              txPayload.schedules = mergedSchedules;
            }

            let mergedJournals: TeachingJournal[] | undefined;
            if (hasJournalDelta) {
              const remoteJournals = Array.isArray(remoteData.journals) ? remoteData.journals : [];
              mergedJournals = stripUndefined(mergeJournalsWithDelta(remoteJournals, journalDelta));
              txPayload.journals = mergedJournals;
            }

            let mergedAttendance: Record<string, AttendanceRecord> | undefined;
            if (hasAttendanceDelta) {
              const remoteAtt =
                remoteData.attendanceRecords && typeof remoteData.attendanceRecords === 'object'
                  ? remoteData.attendanceRecords
                  : {};
              mergedAttendance = stripUndefined(mergeAttendanceWithDelta(remoteAtt, attendanceDelta));
              txPayload.attendanceRecords = mergedAttendance;
            }

            tx.set(mainStoreRef, stripUndefined(txPayload), { merge: true });
            return {
              mergedTeachers,
              mergedUserAccounts,
              mergedSubjects,
              mergedClasses,
              mergedDepartments,
              mergedRooms,
              mergedAcademicYears,
              mergedSchedules,
              mergedJournals,
              mergedAttendance,
              safeTs,
            };
          });

          const serverSyncFullState: Record<string, any> = { ...serverPatch, ...cloudPatch };

          if (committed.mergedTeachers !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingTeacherDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedTeachers, pendingTeacherDeltaRef.current)
              : committed.mergedTeachers;
            teachersRef.current = finalLocal;
            setTeachers(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.teachers = finalLocal;
          }

          if (committed.mergedUserAccounts !== undefined) {
            const finalLocal = ensureDefaultAccounts(
              hasEntityDeltaChanges(pendingUserAccountDeltaRef.current)
                ? mergeEntitiesWithDelta(committed.mergedUserAccounts, pendingUserAccountDeltaRef.current)
                : committed.mergedUserAccounts
            );
            userAccountsRef.current = finalLocal;
            setUserAccounts(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.userAccounts = finalLocal;
          }

          if (committed.mergedSubjects !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingSubjectDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedSubjects, pendingSubjectDeltaRef.current)
              : committed.mergedSubjects;
            subjectsRef.current = finalLocal;
            setSubjects(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.subjects = finalLocal;
          }

          if (committed.mergedClasses !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingClassDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedClasses, pendingClassDeltaRef.current)
              : committed.mergedClasses;
            classesRef.current = finalLocal;
            setClasses(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.classes = finalLocal;
          }

          if (committed.mergedDepartments !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingDepartmentDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedDepartments, pendingDepartmentDeltaRef.current)
              : committed.mergedDepartments;
            departmentsRef.current = finalLocal;
            setDepartments(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.departments = finalLocal;
          }

          if (committed.mergedRooms !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingRoomDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedRooms, pendingRoomDeltaRef.current)
              : committed.mergedRooms;
            roomsRef.current = finalLocal;
            setRooms(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.rooms = finalLocal;
          }

          if (committed.mergedAcademicYears !== undefined) {
            const finalLocal = hasEntityDeltaChanges(pendingAcademicYearDeltaRef.current)
              ? mergeEntitiesWithDelta(committed.mergedAcademicYears, pendingAcademicYearDeltaRef.current)
              : committed.mergedAcademicYears;
            academicYearsRef.current = finalLocal;
            setAcademicYears(finalLocal);
            try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(finalLocal)); } catch (e) {}
            serverSyncFullState.academicYears = finalLocal;
          }

          if (committed.mergedSchedules !== undefined) {
            const finalLocalSchedules = hasScheduleDeltaChanges(pendingScheduleDeltaRef.current)
              ? mergeSchedulesWithDelta(committed.mergedSchedules, pendingScheduleDeltaRef.current)
              : committed.mergedSchedules;
            schedulesRef.current = finalLocalSchedules;
            setSchedules(finalLocalSchedules);
            try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(finalLocalSchedules)); } catch (e) {}
            serverSyncFullState.schedules = finalLocalSchedules;
          }

          if (committed.mergedJournals !== undefined) {
            const finalLocalJournals = hasJournalDeltaChanges(pendingJournalDeltaRef.current)
              ? mergeJournalsWithDelta(committed.mergedJournals, pendingJournalDeltaRef.current)
              : committed.mergedJournals;
            journalsRef.current = finalLocalJournals;
            setJournals(finalLocalJournals);
            try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(finalLocalJournals)); } catch (e) {}
            serverSyncFullState.journals = finalLocalJournals;
          }

          if (committed.mergedAttendance !== undefined) {
            const finalLocalAttendance = hasAttendanceDeltaChanges(pendingAttendanceDeltaRef.current)
              ? mergeAttendanceWithDelta(committed.mergedAttendance, pendingAttendanceDeltaRef.current)
              : committed.mergedAttendance;
            attendanceRecordsRef.current = finalLocalAttendance;
            setAttendanceRecords(finalLocalAttendance);
            try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(finalLocalAttendance)); } catch (e) {}
            serverSyncFullState.attendanceRecords = finalLocalAttendance;
          }

          // Sinkronkan server lokal dengan hasil transaksi gabungan dan tunggu selesai agar konsisten saat refresh
          await postServerSync(stripUndefined(serverSyncFullState), committed.safeTs);

          lastCloudSyncErrorRef.current = null;
          setIsCloudConnected(true);
          setCloudSyncError(null);
          if (hasScheduleDelta || hasJournalDelta) {
            scheduleAutoCloudBackup(
              hasScheduleDelta ? 'Cadangan Otomatis Perubahan Jadwal' : 'Cadangan Otomatis Perubahan Jurnal'
            );
          }
          return true;
        } catch (err: any) {
          // Kembalikan delta yang gagal ke antrean agar tidak pernah hilang & tidak tertimpa onSnapshot
          if (hasCloudKeys) {
            pendingCloudPatchRef.current = { ...cloudPatch, ...pendingCloudPatchRef.current };
          }
          if (hasScheduleDelta) {
            pendingScheduleDeltaRef.current = combineScheduleDeltas(scheduleDelta, pendingScheduleDeltaRef.current);
          }
          if (hasJournalDelta) {
            pendingJournalDeltaRef.current = combineJournalDeltas(journalDelta, pendingJournalDeltaRef.current);
          }
          if (hasAttendanceDelta) {
            pendingAttendanceDeltaRef.current = combineAttendanceDeltas(attendanceDelta, pendingAttendanceDeltaRef.current);
          }
          if (hasTeacherDelta) {
            pendingTeacherDeltaRef.current = combineEntityDeltas(teacherDelta, pendingTeacherDeltaRef.current);
          }
          if (hasUserAccountDelta) {
            pendingUserAccountDeltaRef.current = combineEntityDeltas(userAccountDelta, pendingUserAccountDeltaRef.current);
          }
          if (hasSubjectDelta) {
            pendingSubjectDeltaRef.current = combineEntityDeltas(subjectDelta, pendingSubjectDeltaRef.current);
          }
          if (hasClassDelta) {
            pendingClassDeltaRef.current = combineEntityDeltas(classDelta, pendingClassDeltaRef.current);
          }
          if (hasDepartmentDelta) {
            pendingDepartmentDeltaRef.current = combineEntityDeltas(departmentDelta, pendingDepartmentDeltaRef.current);
          }
          if (hasRoomDelta) {
            pendingRoomDeltaRef.current = combineEntityDeltas(roomDelta, pendingRoomDeltaRef.current);
          }
          if (hasAcademicYearDelta) {
            pendingAcademicYearDeltaRef.current = combineEntityDeltas(academicYearDelta, pendingAcademicYearDeltaRef.current);
          }

          if (hasServerKeys) {
            await postServerSync(stripUndefined(serverPatch), mutationTs);
          }

          handleFirestoreError(err, OperationType.WRITE, 'simpati_data/main_store');
          const msg = err?.message || 'Gagal menyimpan ke Cloud Firestore';
          lastCloudSyncErrorRef.current = msg;
          setIsCloudConnected(false);
          setCloudSyncError(msg);
          return false;
        } finally {
          inFlightCloudFlushCountRef.current = Math.max(0, inFlightCloudFlushCountRef.current - 1);
          inFlightCloudPatchRef.current = {};
          inFlightScheduleDeltaRef.current = null;
          inFlightJournalDeltaRef.current = null;
          inFlightAttendanceDeltaRef.current = null;
          inFlightTeacherDeltaRef.current = null;
          inFlightUserAccountDeltaRef.current = null;
          inFlightSubjectDeltaRef.current = null;
          inFlightClassDeltaRef.current = null;
          inFlightDepartmentDeltaRef.current = null;
          inFlightRoomDeltaRef.current = null;
          inFlightAcademicYearDeltaRef.current = null;
        }
      }

      if (hasServerKeys) {
        await postServerSync(stripUndefined(serverPatch), mutationTs);
      }

      return true;
    })();

    activeFlushPromiseRef.current = runFlush;
    const result = await runFlush;
    if (activeFlushPromiseRef.current === runFlush) {
      activeFlushPromiseRef.current = null;
    }

    // Jika masih ada perubahan baru yang antre selama transaksi berjalan (dan flush tadi sukses), flush lagi
    if (
      result &&
      (hasScheduleDeltaChanges(pendingScheduleDeltaRef.current) ||
        hasJournalDeltaChanges(pendingJournalDeltaRef.current) ||
        hasAttendanceDeltaChanges(pendingAttendanceDeltaRef.current) ||
        hasEntityDeltaChanges(pendingTeacherDeltaRef.current) ||
        hasEntityDeltaChanges(pendingUserAccountDeltaRef.current) ||
        hasEntityDeltaChanges(pendingSubjectDeltaRef.current) ||
        hasEntityDeltaChanges(pendingClassDeltaRef.current) ||
        hasEntityDeltaChanges(pendingDepartmentDeltaRef.current) ||
        hasEntityDeltaChanges(pendingRoomDeltaRef.current) ||
        hasEntityDeltaChanges(pendingAcademicYearDeltaRef.current) ||
        Object.keys(pendingCloudPatchRef.current).length > 0 ||
        Object.keys(pendingServerPatchRef.current).length > 0)
    ) {
      return flushSyncQueue();
    }

    return result;
  };

  const scheduleSyncFlush = () => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    queueMicrotask(() => {
      flushScheduledRef.current = false;
      void flushSyncQueue();
    });
  };

  const syncToServer = async (key: string, data: any, options?: { lastUpdated?: number; skipBroadcast?: boolean }) => {
    if (key === 'fullState' && data && typeof data === 'object') {
      pendingServerPatchRef.current = {
        ...pendingServerPatchRef.current,
        ...stripUndefined(data),
      };
    } else {
      pendingServerPatchRef.current[key] = stripUndefined(data);
    }
    if (options?.lastUpdated !== undefined) {
      // Hidrasi dari Cloud ke server container tidak boleh menaikkan lastLocalMutationAtRef seolah-olah mutasi baru
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullState: stripUndefined(data),
          updatedBy: data?.lastUpdatedBy || 'Cloud Sync',
          clientId,
          lastUpdated: options.lastUpdated,
          skipBroadcast: options.skipBroadcast ?? true,
        }),
      }).catch(() => {});
      pendingServerPatchRef.current = {};
      return;
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

  // Helper backup otomatis ke simpati_data/main_store_backup jika state saat ini berisi data nyata
  const createCloudBackup = async (reason = 'Backup Otomatis'): Promise<boolean> => {
    try {
      const snapshotPayload = stripUndefined({
        teachers: teachersRef.current,
        subjects: subjectsRef.current,
        classes: classesRef.current,
        departments: departmentsRef.current,
        rooms: roomsRef.current,
        academicYears: academicYearsRef.current,
        schedules: schedulesRef.current,
        attendanceRecords: attendanceRecordsRef.current,
        userAccounts: ensureDefaultAccounts(userAccountsRef.current),
        journals: journalsRef.current,
        activeWeekFilter: activeWeekFilterRef.current,
        monthlyWeekSchedules: monthlyWeekSchedulesRef.current,
        backedUpAt: Date.now(),
        backedUpBy: currentUser.name || 'Sistem SIMPATI',
        backupReason: reason,
      });

      if (!hasMeaningfulSchoolData(snapshotPayload)) {
        return false;
      }

      const approxBytes = new TextEncoder().encode(JSON.stringify(snapshotPayload)).length;
      if (approxBytes > 950_000) {
        console.warn('[SIMPATI Cloud Backup] Ukuran snapshot mendekati batas dokumen Firestore:', approxBytes);
        return false;
      }

      await setDoc(doc(db, 'simpati_data', 'main_store_backup'), snapshotPayload);
      setHasCloudBackup(true);
      setCloudBackupSummary({
        backedUpAt: snapshotPayload.backedUpAt,
        backedUpBy: snapshotPayload.backedUpBy,
        teachersCount: snapshotPayload.teachers.length,
        classesCount: snapshotPayload.classes.length,
        schedulesCount: snapshotPayload.schedules.length,
      });
      return true;
    } catch (err) {
      console.warn('[SIMPATI Cloud Backup] Gagal membuat cadangan cloud:', err);
      return false;
    }
  };

  const restoreFromCloudBackup = async (): Promise<{ success: boolean; message: string }> => {
    try {
      let backupSnap;
      try {
        backupSnap = await getDocFromServer(doc(db, 'simpati_data', 'main_store_backup'));
      } catch {
        backupSnap = await getDoc(doc(db, 'simpati_data', 'main_store_backup'));
      }
      if (!backupSnap.exists()) {
        return {
          success: false,
          message: 'Tidak ada cadangan Cloud ditemukan pada dokumen main_store_backup.',
        };
      }
      const backupData = backupSnap.data();
      if (!hasMeaningfulSchoolData(backupData)) {
        return {
          success: false,
          message: 'Dokumen cadangan Cloud tidak berisi data master/jadwal yang dapat dipulihkan.',
        };
      }

      const now = Date.now();
      const restoredStore = stripUndefined({
        teachers: Array.isArray(backupData.teachers) ? backupData.teachers : [],
        subjects: Array.isArray(backupData.subjects) ? backupData.subjects : [],
        classes: Array.isArray(backupData.classes) ? backupData.classes : [],
        departments: Array.isArray(backupData.departments) ? backupData.departments : [],
        rooms: Array.isArray(backupData.rooms) ? backupData.rooms : [],
        academicYears: Array.isArray(backupData.academicYears) && backupData.academicYears.length > 0 ? backupData.academicYears : INITIAL_ACADEMIC_YEARS,
        schedules: Array.isArray(backupData.schedules) ? backupData.schedules : [],
        attendanceRecords: backupData.attendanceRecords && typeof backupData.attendanceRecords === 'object' ? backupData.attendanceRecords : {},
        userAccounts: ensureDefaultAccounts(backupData.userAccounts || INITIAL_USER_ACCOUNTS),
        journals: Array.isArray(backupData.journals) ? backupData.journals : [],
        activeWeekFilter: backupData.activeWeekFilter || 'AUTO',
        monthlyWeekSchedules: backupData.monthlyWeekSchedules || {},
        lastUpdated: now,
        lastUpdatedBy: `${currentUser.name || 'Admin'} (Pulih Cadangan)`,
        lastUpdatedByClientId: clientId,
        isInitialEmpty: false,
      });

      resetAllPendingDeltas();
      localMutationVersionRef.current += 1;
      lastLocalMutationAtRef.current = now;
      applyRemoteStore(restoredStore);
      await setDoc(doc(db, 'simpati_data', 'main_store'), restoredStore);
      await syncToServer('fullState', restoredStore, { lastUpdated: now, skipBroadcast: false });
      setIsCloudConnected(true);
      setCloudSyncError(null);

      return {
        success: true,
        message: `Berhasil memulihkan ${restoredStore.teachers.length} guru, ${restoredStore.classes.length} kelas, dan ${restoredStore.schedules.length} jadwal dari cadangan Cloud!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal memulihkan cadangan Cloud: ${err?.message || 'Kesalahan jaringan'}`,
      };
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

  // Rotasi Pekan Mingguan SMK (Mengikuti Jadwal Pekan Bulanan dari Admin atau Kalender Laptop)
  const [realtimeWeekType, setRealtimeWeekType] = useState<'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD'>(() =>
    resolveWeekRotationForDate(new Date(), monthlyWeekSchedules)
  );

  const [activeWeekFilter, setActiveWeekFilterState] = useState<'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_week_filter`);
    const initial = (saved as any) || 'AUTO';
    activeWeekFilterRef.current = initial;
    return initial;
  });

  const setActiveWeekFilter = (w: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL') => {
    activeWeekFilterRef.current = w;
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
  const updateTeachersAndSync = (
    updater: Teacher[] | ((prev: Teacher[]) => Teacher[]),
    explicitDelta?: Partial<EntityDelta<Teacher>>
  ) => {
    const prevList = teachersRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingTeacherDeltaRef.current = recordEntityDeltaPatch(pendingTeacherDeltaRef.current, stripUndefined(delta));
    }
    teachersRef.current = next;
    localMutationVersionRef.current += 1;
    setTeachers(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('teachers', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateSubjectsAndSync = (
    updater: Subject[] | ((prev: Subject[]) => Subject[]),
    explicitDelta?: Partial<EntityDelta<Subject>>
  ) => {
    const prevList = subjectsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingSubjectDeltaRef.current = recordEntityDeltaPatch(pendingSubjectDeltaRef.current, stripUndefined(delta));
    }
    subjectsRef.current = next;
    localMutationVersionRef.current += 1;
    setSubjects(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('subjects', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateClassesAndSync = (
    updater: SchoolClass[] | ((prev: SchoolClass[]) => SchoolClass[]),
    explicitDelta?: Partial<EntityDelta<SchoolClass>>
  ) => {
    const prevList = classesRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingClassDeltaRef.current = recordEntityDeltaPatch(pendingClassDeltaRef.current, stripUndefined(delta));
    }
    classesRef.current = next;
    localMutationVersionRef.current += 1;
    setClasses(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('classes', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateDepartmentsAndSync = (
    updater: Department[] | ((prev: Department[]) => Department[]),
    explicitDelta?: Partial<EntityDelta<Department>>
  ) => {
    const prevList = departmentsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingDepartmentDeltaRef.current = recordEntityDeltaPatch(pendingDepartmentDeltaRef.current, stripUndefined(delta));
    }
    departmentsRef.current = next;
    localMutationVersionRef.current += 1;
    setDepartments(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('departments', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateRoomsAndSync = (
    updater: Room[] | ((prev: Room[]) => Room[]),
    explicitDelta?: Partial<EntityDelta<Room>>
  ) => {
    const prevList = roomsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingRoomDeltaRef.current = recordEntityDeltaPatch(pendingRoomDeltaRef.current, stripUndefined(delta));
    }
    roomsRef.current = next;
    localMutationVersionRef.current += 1;
    setRooms(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('rooms', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateAcademicYearsAndSync = (
    updater: AcademicYear[] | ((prev: AcademicYear[]) => AcademicYear[]),
    explicitDelta?: Partial<EntityDelta<AcademicYear>>
  ) => {
    const prevList = academicYearsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, next);
    if (delta) {
      pendingAcademicYearDeltaRef.current = recordEntityDeltaPatch(pendingAcademicYearDeltaRef.current, stripUndefined(delta));
    }
    academicYearsRef.current = next;
    localMutationVersionRef.current += 1;
    setAcademicYears(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('academicYears', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateSchedulesAndSync = (
    updater: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[]),
    explicitDelta?: Partial<ScheduleDelta>
  ) => {
    const prevList = schedulesRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);

    if (explicitDelta) {
      recordScheduleDelta(explicitDelta);
    } else {
      // Hitung selisih (upserts & deleteIds) secara otomatis agar selalu aman digabung secara transaksional
      const prevMap = new Map<string, ScheduleItem>();
      prevList.forEach((item) => {
        if (item?.id) prevMap.set(item.id, item);
      });
      const nextIds = new Set<string>();
      const upserts: ScheduleItem[] = [];
      next.forEach((item) => {
        if (item?.id) {
          nextIds.add(item.id);
          const old = prevMap.get(item.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
            upserts.push(item);
          }
        }
      });
      const deleteIds: string[] = [];
      prevMap.forEach((_, id) => {
        if (!nextIds.has(id)) deleteIds.push(id);
      });
      if (upserts.length > 0 || deleteIds.length > 0) {
        recordScheduleDelta({ upserts, deleteIds });
      }
    }

    schedulesRef.current = next;
    localMutationVersionRef.current += 1;
    setSchedules(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('schedules', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateAttendanceRecordsAndSync = (
    updater: Record<string, AttendanceRecord> | ((prev: Record<string, AttendanceRecord>) => Record<string, AttendanceRecord>),
    explicitDelta?: Partial<AttendanceDelta>
  ) => {
    const prevMap = attendanceRecordsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevMap) : updater;
    const next = stripUndefined(rawNext);

    if (explicitDelta) {
      recordAttendanceDelta(explicitDelta);
    } else {
      const upserts: Record<string, any> = {};
      const deleteKeys: string[] = [];
      for (const [k, v] of Object.entries(next)) {
        if (!prevMap[k] || JSON.stringify(prevMap[k]) !== JSON.stringify(v)) {
          upserts[k] = v;
        }
      }
      for (const k of Object.keys(prevMap)) {
        if (!(k in next)) deleteKeys.push(k);
      }
      if (Object.keys(upserts).length > 0 || deleteKeys.length > 0) {
        recordAttendanceDelta({ upserts, deleteKeys });
      }
    }

    attendanceRecordsRef.current = next;
    localMutationVersionRef.current += 1;
    setAttendanceRecords(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('attendanceRecords', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateUserAccountsAndSync = (
    updater: UserAccount[] | ((prev: UserAccount[]) => UserAccount[]),
    explicitDelta?: Partial<EntityDelta<UserAccount>>
  ) => {
    const prevList = userAccountsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const reconciled = stripUndefined(ensureDefaultAccounts(rawNext));
    const delta = explicitDelta || computeEntityDeltaFromLists(prevList, reconciled);
    if (delta) {
      pendingUserAccountDeltaRef.current = recordEntityDeltaPatch(
        pendingUserAccountDeltaRef.current,
        stripUndefined(delta)
      );
    }
    userAccountsRef.current = reconciled;
    localMutationVersionRef.current += 1;
    setUserAccounts(reconciled);
    try {
      localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled));
    } catch (e) {}
    syncToServer('userAccounts', reconciled);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const updateJournalsAndSync = (
    updater: TeachingJournal[] | ((prev: TeachingJournal[]) => TeachingJournal[]),
    explicitDelta?: Partial<JournalDelta>
  ) => {
    const prevList = journalsRef.current;
    const rawNext = typeof updater === 'function' ? updater(prevList) : updater;
    const next = stripUndefined(rawNext);

    if (explicitDelta) {
      recordJournalDelta(explicitDelta);
    } else {
      const prevMap = new Map<string, TeachingJournal>();
      prevList.forEach((j) => {
        if (j?.id) prevMap.set(j.id, j);
      });
      const nextIds = new Set<string>();
      const upserts: TeachingJournal[] = [];
      next.forEach((j) => {
        if (j?.id) {
          nextIds.add(j.id);
          const old = prevMap.get(j.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(j)) {
            upserts.push(j);
          }
        }
      });
      const deleteIds: string[] = [];
      prevMap.forEach((_, id) => {
        if (!nextIds.has(id)) deleteIds.push(id);
      });
      if (upserts.length > 0 || deleteIds.length > 0) {
        recordJournalDelta({ upserts, deleteIds });
      }
    }

    journalsRef.current = next;
    localMutationVersionRef.current += 1;
    setJournals(next);
    try {
      localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(next));
    } catch (e) {}
    syncToServer('journals', next);
    lastLocalMutationAtRef.current = Date.now();
    scheduleSyncFlush();
  };

  const applyRemoteStore = (s: Record<string, any>) => {
    if (Array.isArray(s.teachers)) {
      let mergedTeachers = s.teachers;
      if (inFlightTeacherDeltaRef.current) {
        mergedTeachers = mergeEntitiesWithDelta(mergedTeachers, inFlightTeacherDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingTeacherDeltaRef.current)) {
        mergedTeachers = mergeEntitiesWithDelta(mergedTeachers, pendingTeacherDeltaRef.current);
      }
      teachersRef.current = mergedTeachers;
      setTeachers(mergedTeachers);
      try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(mergedTeachers)); } catch (e) {}
    }
    if (Array.isArray(s.subjects)) {
      let mergedSubjects = s.subjects;
      if (inFlightSubjectDeltaRef.current) {
        mergedSubjects = mergeEntitiesWithDelta(mergedSubjects, inFlightSubjectDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingSubjectDeltaRef.current)) {
        mergedSubjects = mergeEntitiesWithDelta(mergedSubjects, pendingSubjectDeltaRef.current);
      }
      subjectsRef.current = mergedSubjects;
      setSubjects(mergedSubjects);
      try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(mergedSubjects)); } catch (e) {}
    }
    if (Array.isArray(s.classes)) {
      let mergedClasses = s.classes;
      if (inFlightClassDeltaRef.current) {
        mergedClasses = mergeEntitiesWithDelta(mergedClasses, inFlightClassDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingClassDeltaRef.current)) {
        mergedClasses = mergeEntitiesWithDelta(mergedClasses, pendingClassDeltaRef.current);
      }
      classesRef.current = mergedClasses;
      setClasses(mergedClasses);
      try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(mergedClasses)); } catch (e) {}
    }
    if (Array.isArray(s.departments)) {
      let mergedDepartments = s.departments;
      if (inFlightDepartmentDeltaRef.current) {
        mergedDepartments = mergeEntitiesWithDelta(mergedDepartments, inFlightDepartmentDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingDepartmentDeltaRef.current)) {
        mergedDepartments = mergeEntitiesWithDelta(mergedDepartments, pendingDepartmentDeltaRef.current);
      }
      departmentsRef.current = mergedDepartments;
      setDepartments(mergedDepartments);
      try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(mergedDepartments)); } catch (e) {}
    }
    if (Array.isArray(s.rooms)) {
      let mergedRooms = s.rooms;
      if (inFlightRoomDeltaRef.current) {
        mergedRooms = mergeEntitiesWithDelta(mergedRooms, inFlightRoomDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingRoomDeltaRef.current)) {
        mergedRooms = mergeEntitiesWithDelta(mergedRooms, pendingRoomDeltaRef.current);
      }
      roomsRef.current = mergedRooms;
      setRooms(mergedRooms);
      try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(mergedRooms)); } catch (e) {}
    }
    if (Array.isArray(s.academicYears)) {
      let mergedAcademicYears = s.academicYears;
      if (inFlightAcademicYearDeltaRef.current) {
        mergedAcademicYears = mergeEntitiesWithDelta(mergedAcademicYears, inFlightAcademicYearDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingAcademicYearDeltaRef.current)) {
        mergedAcademicYears = mergeEntitiesWithDelta(mergedAcademicYears, pendingAcademicYearDeltaRef.current);
      }
      academicYearsRef.current = mergedAcademicYears;
      setAcademicYears(mergedAcademicYears);
      try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(mergedAcademicYears)); } catch (e) {}
    }
    if (Array.isArray(s.schedules)) {
      let mergedSchedules = s.schedules;
      if (inFlightScheduleDeltaRef.current) {
        mergedSchedules = mergeSchedulesWithDelta(mergedSchedules, inFlightScheduleDeltaRef.current);
      }
      if (hasScheduleDeltaChanges(pendingScheduleDeltaRef.current)) {
        mergedSchedules = mergeSchedulesWithDelta(mergedSchedules, pendingScheduleDeltaRef.current);
      }
      schedulesRef.current = mergedSchedules;
      setSchedules(mergedSchedules);
      try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(mergedSchedules)); } catch (e) {}
    }
    if (s.attendanceRecords && typeof s.attendanceRecords === 'object') {
      let mergedAttendance = s.attendanceRecords;
      if (inFlightAttendanceDeltaRef.current) {
        mergedAttendance = mergeAttendanceWithDelta(mergedAttendance, inFlightAttendanceDeltaRef.current);
      }
      if (hasAttendanceDeltaChanges(pendingAttendanceDeltaRef.current)) {
        mergedAttendance = mergeAttendanceWithDelta(mergedAttendance, pendingAttendanceDeltaRef.current);
      }
      attendanceRecordsRef.current = mergedAttendance;
      setAttendanceRecords(mergedAttendance);
      try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(mergedAttendance)); } catch (e) {}
    }
    if (Array.isArray(s.userAccounts)) {
      let mergedAccounts = s.userAccounts;
      if (inFlightUserAccountDeltaRef.current) {
        mergedAccounts = mergeEntitiesWithDelta(mergedAccounts, inFlightUserAccountDeltaRef.current);
      }
      if (hasEntityDeltaChanges(pendingUserAccountDeltaRef.current)) {
        mergedAccounts = mergeEntitiesWithDelta(mergedAccounts, pendingUserAccountDeltaRef.current);
      }
      const reconciled = ensureDefaultAccounts(mergedAccounts);
      userAccountsRef.current = reconciled;
      setUserAccounts(reconciled);
      try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
    }
    if (Array.isArray(s.journals)) {
      let mergedJournals = s.journals;
      if (inFlightJournalDeltaRef.current) {
        mergedJournals = mergeJournalsWithDelta(mergedJournals, inFlightJournalDeltaRef.current);
      }
      if (hasJournalDeltaChanges(pendingJournalDeltaRef.current)) {
        mergedJournals = mergeJournalsWithDelta(mergedJournals, pendingJournalDeltaRef.current);
      }
      journalsRef.current = mergedJournals;
      setJournals(mergedJournals);
      try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(mergedJournals)); } catch (e) {}
    }
    const pendingMonthlyWeeks =
      pendingCloudPatchRef.current.monthlyWeekSchedules ?? inFlightCloudPatchRef.current.monthlyWeekSchedules;
    const effectiveMonthlyWeeks = pendingMonthlyWeeks || s.monthlyWeekSchedules;
    if (effectiveMonthlyWeeks && typeof effectiveMonthlyWeeks === 'object' && !Array.isArray(effectiveMonthlyWeeks)) {
      monthlyWeekSchedulesRef.current = effectiveMonthlyWeeks;
      setMonthlyWeekSchedules(effectiveMonthlyWeeks);
      setRealtimeWeekType(resolveWeekRotationForDate(new Date(), effectiveMonthlyWeeks));
      try { localStorage.setItem(`${STORAGE_KEY}_monthly_weeks`, JSON.stringify(effectiveMonthlyWeeks)); } catch (e) {}
    }
    const pendingWeekFilter =
      pendingCloudPatchRef.current.activeWeekFilter ?? inFlightCloudPatchRef.current.activeWeekFilter;
    const effectiveFilter = pendingWeekFilter || s.activeWeekFilter;
    if (effectiveFilter) {
      activeWeekFilterRef.current = effectiveFilter;
      setActiveWeekFilterState(effectiveFilter);
      try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, effectiveFilter); } catch (e) {}
    }
  };

  // Fungsi sinkronisasi manual/otomatis langsung dari database cloud Firestore dan server terpusat
  const refreshFromServer = async () => {
    const startVersion = localMutationVersionRef.current;
    let cloudData: Record<string, any> | null = null;
    let serverData: Record<string, any> | null = null;

    const readMainCloudDoc = async () => {
      try {
        return await getDocFromServer(doc(db, 'simpati_data', 'main_store'));
      } catch {
        return await getDoc(doc(db, 'simpati_data', 'main_store'));
      }
    };

    const [cloudRes, serverRes, backupRes] = await Promise.allSettled([
      readMainCloudDoc(),
      fetch('/api/state').then((r) => r.json()),
      getDoc(doc(db, 'simpati_data', 'main_store_backup')),
    ]);

    if (cloudRes.status === 'fulfilled') {
      if (cloudRes.value.exists()) {
        cloudData = cloudRes.value.data();
      }
      lastCloudSyncErrorRef.current = null;
      setIsCloudConnected(true);
      setCloudSyncError(null);
    } else {
      setIsCloudConnected(false);
    }

    if (serverRes.status === 'fulfilled' && serverRes.value?.success && serverRes.value?.data) {
      serverData = serverRes.value.data;
      setIsServerConnected(true);
    }

    if (backupRes.status === 'fulfilled' && backupRes.value.exists()) {
      const b = backupRes.value.data();
      if (hasMeaningfulSchoolData(b)) {
        setHasCloudBackup(true);
        setCloudBackupSummary({
          backedUpAt: b.backedUpAt,
          backedUpBy: b.backedUpBy,
          teachersCount: Array.isArray(b.teachers) ? b.teachers.length : 0,
          classesCount: Array.isArray(b.classes) ? b.classes.length : 0,
          schedulesCount: Array.isArray(b.schedules) ? b.schedules.length : 0,
        });
      }
    }

    if (localMutationVersionRef.current !== startVersion) {
      return;
    }

    const decision = pickAuthoritativeStore({ cloudData, serverData });

    if (decision.chosen) {
      applyRemoteStore(decision.chosen);

      // Pastikan server lokal container (ephemeral) selalu terisi dari Cloud Firestore
      if (decision.hydrateServerFromCloud && cloudData) {
        syncToServer('fullState', cloudData, {
          lastUpdated: typeof cloudData.lastUpdated === 'number' ? cloudData.lastUpdated : Date.now(),
          skipBroadcast: true,
        });
      }

      // Hanya unggah server -> Cloud jika Cloud benar-benar kosong sedangkan server lokal punya data nyata
      if (decision.syncCloudFromServer && serverData && !hasMeaningfulSchoolData(cloudData)) {
        syncToCloud(stripUndefined(serverData));
      }
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
        activeWeekFilter: 'AUTO',
        lastUpdated: Date.now(),
        lastUpdatedBy: currentUser.name || 'Admin SIMPATI',
        isInitialEmpty: false,
      };

      teachersRef.current = SEED_TEACHERS;
      subjectsRef.current = SEED_SUBJECTS;
      classesRef.current = SEED_CLASSES;
      departmentsRef.current = SEED_DEPARTMENTS;
      roomsRef.current = SEED_ROOMS;
      schedulesRef.current = SEED_SCHEDULES;

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
      setCloudSyncError(null);
      return true;
    } catch (err: any) {
      console.error('[SIMPATI Cloud] Gagal seed database dari preset:', err);
      setCloudSyncError(err?.message || 'Gagal seed database ke Cloud Firestore');
      return false;
    }
  };

  // Hubungkan ke Cloud Firestore Terpusat & Server Lokal: Dengarkan pembaruan real-time di semua perangkat
  useEffect(() => {
    let isMounted = true;

    testFirestoreConnection().then((ok) => {
      if (isMounted) setIsCloudConnected(ok);
    });

    // 1. Dengarkan database Cloud Firestore secara real-time ke dokumen bersama
    const unsubscribeFirestore = onSnapshot(
      doc(db, 'simpati_data', 'main_store'),
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          const s = snapshot.data();

          // Abaikan hanya jika ini echo pending milik klien ini sendiri yang transaksinya masih berjalan
          if (
            s.lastUpdatedByClientId === clientId &&
            (snapshot.metadata.hasPendingWrites || inFlightCloudFlushCountRef.current > 0)
          ) {
            return;
          }

          applyRemoteStore(s);
          setIsCloudConnected(true);
          setCloudSyncError(null);
          setIsServerConnected(true);
        } else {
          // Jangan langsung menimpa jika snapshot berasal dari cache kosong! Verifikasi langsung ke server Firestore
          try {
            const serverSnap = await getDocFromServer(doc(db, 'simpati_data', 'main_store'));
            if (!isMounted) return;
            if (serverSnap.exists()) {
              applyRemoteStore(serverSnap.data());
              setIsCloudConnected(true);
              setCloudSyncError(null);
              return;
            }

            const alreadyHasLocalData = hasMeaningfulSchoolData({
              teachers: teachersRef.current,
              subjects: subjectsRef.current,
              classes: classesRef.current,
              departments: departmentsRef.current,
              rooms: roomsRef.current,
              schedules: schedulesRef.current,
              journals: journalsRef.current,
            });
            if (alreadyHasLocalData) {
              return;
            }

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
              lastUpdated: 0,
              lastUpdatedBy: 'System Fresh Init',
              isInitialEmpty: true,
            };
            await setDoc(doc(db, 'simpati_data', 'main_store'), initialStore, { merge: true });
            setIsCloudConnected(true);
          } catch (seedErr) {
            console.warn('[SIMPATI Cloud] Verifikasi/inisialisasi cloud store awal:', seedErr);
          }
        }
      },
      (err) => {
        console.warn('[SIMPATI Cloud] Firestore listener error, fallback aktif:', err);
        setIsCloudConnected(false);
        setCloudSyncError(err?.message || 'Koneksi real-time Firestore terputus');
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
            } else if (key === 'teachers' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingTeacherDeltaRef.current)) return;
              teachersRef.current = data;
              setTeachers(data);
              try { localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'subjects' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingSubjectDeltaRef.current)) return;
              subjectsRef.current = data;
              setSubjects(data);
              try { localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'classes' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingClassDeltaRef.current)) return;
              classesRef.current = data;
              setClasses(data);
              try { localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'departments' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingDepartmentDeltaRef.current)) return;
              departmentsRef.current = data;
              setDepartments(data);
              try { localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'rooms' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingRoomDeltaRef.current)) return;
              roomsRef.current = data;
              setRooms(data);
              try { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'academicYears' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingAcademicYearDeltaRef.current)) return;
              academicYearsRef.current = data;
              setAcademicYears(data);
              try { localStorage.setItem(`${STORAGE_KEY}_academic_years`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'schedules' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasScheduleDeltaChanges(pendingScheduleDeltaRef.current)) {
                return;
              }
              schedulesRef.current = data;
              setSchedules(data);
              try { localStorage.setItem(`${STORAGE_KEY}_schedules`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'attendanceRecords' && typeof data === 'object' && data !== null) {
              if (inFlightCloudFlushCountRef.current > 0 || hasAttendanceDeltaChanges(pendingAttendanceDeltaRef.current)) return;
              attendanceRecordsRef.current = data;
              setAttendanceRecords(data);
              try { localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'userAccounts' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasEntityDeltaChanges(pendingUserAccountDeltaRef.current)) return;
              const reconciled = ensureDefaultAccounts(data);
              userAccountsRef.current = reconciled;
              setUserAccounts(reconciled);
              try { localStorage.setItem(`${STORAGE_KEY}_user_accounts`, JSON.stringify(reconciled)); } catch (e) {}
            }
            else if (key === 'journals' && Array.isArray(data)) {
              if (inFlightCloudFlushCountRef.current > 0 || hasJournalDeltaChanges(pendingJournalDeltaRef.current)) return;
              journalsRef.current = data;
              setJournals(data);
              try { localStorage.setItem(`${STORAGE_KEY}_journals`, JSON.stringify(data)); } catch (e) {}
            }
            else if (key === 'activeWeekFilter' && typeof data === 'string') {
              if (inFlightCloudFlushCountRef.current > 0 || pendingCloudPatchRef.current.activeWeekFilter !== undefined) return;
              activeWeekFilterRef.current = data as any;
              setActiveWeekFilterState(data as any);
              try { localStorage.setItem(`${STORAGE_KEY}_week_filter`, data); } catch (e) {}
            }
            else if (key === 'monthlyWeekSchedules' && typeof data === 'object' && data !== null) {
              if (inFlightCloudFlushCountRef.current > 0 || pendingCloudPatchRef.current.monthlyWeekSchedules !== undefined) return;
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
      const updatedUser: CurrentUser = {
        ...currentUser,
        piketDays: days,
        isPiketToday,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(`${STORAGE_KEY}_session`, JSON.stringify({ user: updatedUser, token: 'session-token' }));
      } catch (e) {}
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
      } else if (resp.status === 403 && data.message) {
        return {
          success: false,
          message: data.message,
        };
      }
    } catch (err) {
      // Server offline / belum terhidrasi -> fallback ke verifikasi Cloud Firestore / userAccountsRef
    }

    // 2. Verifikasi lokal terhadap userAccountsRef (tersinkronisasi dari Cloud Firestore)
    const trimmedUser = usernameInput.trim().toLowerCase();
    const matched = userAccountsRef.current.find(
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

    // Hidrasi akun Cloud ke server lokal jika server sebelumnya kosong (cold start)
    if (userAccountsRef.current.length > 3) {
      syncToServer('userAccounts', userAccountsRef.current);
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
  const addTeacher = async (teacher: Teacher): Promise<{ success: boolean; error?: string }> => {
    const cleanTeacher = stripUndefined(teacher);
    updateTeachersAndSync((prev) => [...prev, cleanTeacher], { upserts: [cleanTeacher] });
    // Otomatis sinkronkan dan buatkan akun login untuk guru baru
    updateUserAccountsAndSync((prev) => {
      const exists = prev.some(
        (a) => a.teacherId === cleanTeacher.id || a.username.toLowerCase() === cleanTeacher.code.toLowerCase()
      );
      if (exists) return prev;
      const piketDays = cleanTeacher.piketDays || (cleanTeacher.isPiketToday ? ['Selasa'] : []);
      const newAcc: UserAccount = {
        id: `usr-${cleanTeacher.id}`,
        username: cleanTeacher.code,
        password: 'semakasari123!',
        name: cleanTeacher.name,
        role: 'guru',
        teacherId: cleanTeacher.id,
        teacherCode: cleanTeacher.code,
        nip: cleanTeacher.nip,
        email: cleanTeacher.email,
        piketDays,
        status: 'aktif',
        additionalDuty: piketDays.length > 0 ? `Guru Piket (${piketDays.join(', ')})` : undefined,
      };
      return [...prev, newAcc];
    });
    const ok = await flushSyncQueue();
    return {
      success: ok,
      error: ok ? undefined : (lastCloudSyncErrorRef.current || 'Gagal menyimpan data guru ke Cloud Firestore.'),
    };
  };

  const updateTeacher = async (teacher: Teacher): Promise<{ success: boolean; error?: string }> => {
    const cleanTeacher = stripUndefined(teacher);
    updateTeachersAndSync((prev) => prev.map((t) => (t.id === cleanTeacher.id ? cleanTeacher : t)), {
      upserts: [cleanTeacher],
    });
    // Sinkronkan ke akun login guru
    updateUserAccountsAndSync((prev) =>
      prev.map((a) =>
        a.teacherId === cleanTeacher.id
          ? {
              ...a,
              name: cleanTeacher.name,
              nip: cleanTeacher.nip,
              teacherCode: cleanTeacher.code,
              email: cleanTeacher.email,
              piketDays: cleanTeacher.piketDays || a.piketDays,
            }
          : a
      )
    );
    // Sinkronkan ke jadwal pelajaran
    updateSchedulesAndSync((prev) =>
      prev.map((s) =>
        s.teacherId === cleanTeacher.id
          ? { ...s, teacherName: cleanTeacher.name, teacherCode: cleanTeacher.code }
          : s
      )
    );
    // Sinkronkan ke wali kelas
    updateClassesAndSync((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === cleanTeacher.id
          ? { ...c, homeroomTeacherName: cleanTeacher.name }
          : c
      )
    );
    const ok = await flushSyncQueue();
    return {
      success: ok,
      error: ok ? undefined : (lastCloudSyncErrorRef.current || 'Gagal memperbarui data guru ke Cloud Firestore.'),
    };
  };

  const deleteTeacher = async (id: string): Promise<{ success: boolean; error?: string }> => {
    updateTeachersAndSync((prev) => prev.filter((t) => t.id !== id), { deleteIds: [id] });
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
    const ok = await flushSyncQueue();
    return {
      success: ok,
      error: ok ? undefined : (lastCloudSyncErrorRef.current || 'Gagal menghapus data guru dari Cloud Firestore.'),
    };
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

  const importTeachers = async (newTeachers: Teacher[]): Promise<{ success: boolean; error?: string }> => {
    const cleanNew = stripUndefined(newTeachers);
    updateTeachersAndSync((prev) => [...prev, ...cleanNew], { upserts: cleanNew });
    // Otomatis buat akun login guru untuk setiap guru yang baru diimpor agar langsung dapat login
    updateUserAccountsAndSync((prev) => {
      const existingByTeacherId = new Set(prev.map((a) => a.teacherId).filter(Boolean));
      const existingUsernames = new Set(prev.map((a) => a.username.toLowerCase()));
      const additions: UserAccount[] = [];
      cleanNew.forEach((t) => {
        if (existingByTeacherId.has(t.id)) return;
        let usernameCandidate = t.code ? t.code.toUpperCase() : `GURU_${t.id}`;
        if (existingUsernames.has(usernameCandidate.toLowerCase())) {
          usernameCandidate = t.nip && t.nip !== '-' ? t.nip.replace(/\s+/g, '') : `GURU_${t.id}`;
        }
        if (existingUsernames.has(usernameCandidate.toLowerCase())) {
          usernameCandidate = `${usernameCandidate}_${t.id.slice(-4)}`;
        }
        existingUsernames.add(usernameCandidate.toLowerCase());
        const piketDays = t.piketDays || (t.isPiketToday ? [currentDayName] : []);
        additions.push({
          id: `usr-${t.id}`,
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
        });
      });
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
    const ok = await flushSyncQueue();
    if (ok) {
      scheduleAutoCloudBackup('Setelah Impor Data Guru');
    }
    return {
      success: ok,
      error: ok ? undefined : (lastCloudSyncErrorRef.current || 'Gagal mengimpor data guru ke Cloud Firestore.'),
    };
  };

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

  const importSubjects = (newSubjects: Subject[]) => {
    updateSubjectsAndSync((prev) => [...prev, ...newSubjects]);
    scheduleAutoCloudBackup('Setelah Impor Mata Pelajaran');
  };

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

  const importClasses = (newClasses: SchoolClass[]) => {
    updateClassesAndSync((prev) => [...prev, ...newClasses]);
    scheduleAutoCloudBackup('Setelah Impor Data Kelas');
  };

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

  const importRooms = (newRooms: Room[]) => {
    updateRoomsAndSync((prev) => [...prev, ...newRooms]);
    scheduleAutoCloudBackup('Setelah Impor Data Ruang');
  };

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

  const addSchedule = (item: ScheduleItem) =>
    updateSchedulesAndSync(
      (prev) => [...prev.filter((s) => s.id !== item.id), item],
      { upserts: [item] }
    );
  const updateSchedule = (item: ScheduleItem) =>
    updateSchedulesAndSync(
      (prev) => prev.map((s) => (s.id === item.id ? item : s)),
      { upserts: [item] }
    );
  const deleteSchedule = (id: string) => {
    updateSchedulesAndSync((prev) => prev.filter((s) => s.id !== id), { deleteIds: [id] });
    updateAttendanceRecordsAndSync((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveSchedulesBatch = async (
    items: ScheduleItem[],
    replaceId?: string | string[]
  ): Promise<{ success: boolean; error?: string; savedCount: number }> => {
    const cleanItems = stripUndefined(items);
    const deleteIds = Array.isArray(replaceId)
      ? replaceId.filter(Boolean)
      : replaceId
      ? [replaceId]
      : [];
    const delta: Partial<ScheduleDelta> = {
      upserts: cleanItems,
      deleteIds,
    };

    updateSchedulesAndSync(
      (prev) => mergeSchedulesWithDelta(prev, { upserts: cleanItems, deleteIds }),
      delta
    );

    const ok = await flushSyncQueue();
    return {
      success: ok,
      savedCount: cleanItems.length,
      error: ok ? undefined : (lastCloudSyncErrorRef.current || cloudSyncError || 'Gagal menyimpan jadwal ke Cloud Firestore.'),
    };
  };

  const bulkDeleteSchedules = (ids: string[]) => {
    const idSet = new Set(ids);
    updateSchedulesAndSync((prev) => prev.filter((s) => !idSet.has(s.id)), { deleteIds: ids });
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
    updateSchedulesAndSync([], { replaceAll: [] });
    updateAttendanceRecordsAndSync({}, { replaceAll: {} });
  };
  const clearTableData = async (tableKey: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal' | 'semua') => {
    // Simpan cadangan otomatis di Cloud sebelum melakukan pengosongan massal
    await createCloudBackup(`Sebelum Kosongkan Tab (${tableKey})`);

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
      updateSchedulesAndSync([], { replaceAll: [] });
    } else if (tableKey === 'ruang') {
      updateRoomsAndSync([]);
    } else if (tableKey === 'tahun_pelajaran') {
      updateAcademicYearsAndSync((prev) => prev.filter((ay) => ay.status === 'aktif'));
    } else if (tableKey === 'jadwal') {
      updateSchedulesAndSync([], { replaceAll: [] });
      updateAttendanceRecordsAndSync({}, { replaceAll: {} });
    } else if (tableKey === 'semua') {
      const preservedAccounts = stripUndefined(
        ensureDefaultAccounts(
          userAccountsRef.current.filter((a) => a.role === 'admin' || a.role === 'pimpinan' || !a.teacherId)
        )
      );
      const now = Date.now();
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
        lastUpdated: now,
        lastUpdatedBy: currentUser.name || 'Admin SIMPATI',
        lastUpdatedByClientId: clientId,
        isInitialEmpty: true,
        explicitResetAt: now,
      };

      resetAllPendingDeltas();
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
      lastLocalMutationAtRef.current = now;

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
  const importSchedules = (items: ScheduleItem[]) => {
    updateSchedulesAndSync((prev) => [...prev, ...items], { upserts: items });
    scheduleAutoCloudBackup('Setelah Impor Jadwal Pelajaran');
  };
  const importClassSchedules = (classId: string, items: ScheduleItem[]) => {
    const distinctWeeks = Array.from(new Set(items.map((i) => i.weekType).filter(Boolean)));
    const scopeWeek = distinctWeeks.length === 1 && distinctWeeks[0] !== 'ALL' ? distinctWeeks[0] : undefined;
    const scopeDelta: ScheduleDelta = {
      upserts: [],
      deleteIds: [],
      replaceClassScope: {
        classId,
        weekType: scopeWeek,
        items,
      },
    };
    updateSchedulesAndSync(
      (prev) => mergeSchedulesWithDelta(prev, scopeDelta),
      scopeDelta
    );
    scheduleAutoCloudBackup('Setelah Impor Jadwal Kelas');
  };

  // Jurnal Mengajar Handlers (Transaksional Atomik via JournalDelta)
  const addJournal = (journal: TeachingJournal) => {
    updateJournalsAndSync((prev) => [journal, ...prev.filter((j) => j.id !== journal.id)], {
      upserts: [journal],
    });
  };

  const updateJournal = (journal: TeachingJournal) => {
    updateJournalsAndSync((prev) => prev.map((j) => (j.id === journal.id ? journal : j)), {
      upserts: [journal],
    });
  };

  const deleteJournal = (id: string) => {
    updateJournalsAndSync((prev) => prev.filter((j) => j.id !== id), {
      deleteIds: [id],
    });
  };

  // Impor & Gabung Cerdas Jadwal + Data Backup secara Transaksional Atomik ke Cloud Firestore
  const mergeImportedSchedulesAndData = async (
    payload: ParsedImportPayload,
    options?: { mergeMasterData?: boolean; mergeJournals?: boolean }
  ): Promise<{
    success: boolean;
    addedSchedules: number;
    updatedSchedules: number;
    skippedSchedules: number;
    addedMasterCount: number;
    addedJournals: number;
    message: string;
  }> => {
    try {
      // Pastikan cadangan keselamatan dibuat terlebih dahulu jika data existing ada
      if (hasMeaningfulSchoolData({ schedules: schedulesRef.current, teachers: teachersRef.current })) {
        await createCloudBackup('Sebelum Impor & Gabung Database Jadwal');
      }

      const mergeMaster = options?.mergeMasterData ?? true;
      const mergeJournals = options?.mergeJournals ?? true;
      const now = Date.now();
      const actorName = `${currentUser.name || 'Admin'} (Impor Gabung DB)`;
      const mainStoreRef = doc(db, 'simpati_data', 'main_store');

      const txResult = await runTransaction(db, async (tx) => {
        const snap = await tx.get(mainStoreRef);
        const remote = snap.exists() ? snap.data() : {};
        const remoteTs = typeof remote.lastUpdated === 'number' ? remote.lastUpdated : 0;
        const safeTs = Math.max(now, remoteTs + 1);

        const baseSchedules: ScheduleItem[] = Array.isArray(remote.schedules)
          ? remote.schedules
          : schedulesRef.current;

        const scheduleMerge = computeSmartScheduleMerge(baseSchedules, payload.schedules || []);
        const txPayload: Record<string, any> = {
          schedules: stripUndefined(scheduleMerge.mergedSchedules),
          lastUpdated: safeTs,
          lastUpdatedBy: actorName,
          lastUpdatedByClientId: clientId,
          isInitialEmpty: false,
        };

        let addedMasterCount = 0;
        let nextTeachers = Array.isArray(remote.teachers) ? remote.teachers : teachersRef.current;
        let nextSubjects = Array.isArray(remote.subjects) ? remote.subjects : subjectsRef.current;
        let nextClasses = Array.isArray(remote.classes) ? remote.classes : classesRef.current;
        let nextDepartments = Array.isArray(remote.departments) ? remote.departments : departmentsRef.current;
        let nextRooms = Array.isArray(remote.rooms) ? remote.rooms : roomsRef.current;
        let nextJournals = Array.isArray(remote.journals) ? remote.journals : journalsRef.current;

        if (mergeMaster) {
          if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
            const res = mergeMissingRecordsByKey(
              nextTeachers,
              payload.teachers,
              (t: Teacher) => `code:${(t.code || t.name || '').trim().toUpperCase()}`
            );
            nextTeachers = res.merged;
            addedMasterCount += res.addedCount;
            txPayload.teachers = stripUndefined(nextTeachers);
          }
          if (Array.isArray(payload.subjects) && payload.subjects.length > 0) {
            const res = mergeMissingRecordsByKey(
              nextSubjects,
              payload.subjects,
              (s: Subject) => `sub:${(s.code || s.name || '').trim().toUpperCase()}`
            );
            nextSubjects = res.merged;
            addedMasterCount += res.addedCount;
            txPayload.subjects = stripUndefined(nextSubjects);
          }
          if (Array.isArray(payload.classes) && payload.classes.length > 0) {
            const res = mergeMissingRecordsByKey(
              nextClasses,
              payload.classes,
              (c: SchoolClass) => `cls:${(c.name || c.code || '').trim().toUpperCase()}`
            );
            nextClasses = res.merged;
            addedMasterCount += res.addedCount;
            txPayload.classes = stripUndefined(nextClasses);
          }
          if (Array.isArray(payload.departments) && payload.departments.length > 0) {
            const res = mergeMissingRecordsByKey(
              nextDepartments,
              payload.departments,
              (d: Department) => `dept:${(d.code || '').trim().toUpperCase()}`
            );
            nextDepartments = res.merged;
            addedMasterCount += res.addedCount;
            txPayload.departments = stripUndefined(nextDepartments);
          }
          if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
            const res = mergeMissingRecordsByKey(
              nextRooms,
              payload.rooms,
              (r: Room) => `room:${(r.name || r.code || '').trim().toUpperCase()}`
            );
            nextRooms = res.merged;
            addedMasterCount += res.addedCount;
            txPayload.rooms = stripUndefined(nextRooms);
          }
        }

        let addedJournals = 0;
        if (mergeJournals && Array.isArray(payload.journals) && payload.journals.length > 0) {
          const res = mergeMissingRecordsByKey(
            nextJournals,
            payload.journals,
            (j: TeachingJournal) =>
              `j:${j.date}|${j.teacherId}|${j.className}|${j.startPeriod}-${j.endPeriod}`
          );
          nextJournals = res.merged;
          addedJournals = res.addedCount;
          txPayload.journals = stripUndefined(nextJournals);
        }

        tx.set(mainStoreRef, stripUndefined(txPayload), { merge: true });

        return {
          txPayload,
          safeTs,
          scheduleMerge,
          addedMasterCount,
          addedJournals,
        };
      });

      localMutationVersionRef.current += 1;
      lastLocalMutationAtRef.current = txResult.safeTs;
      applyRemoteStore(txResult.txPayload);
      await syncToServer('fullState', txResult.txPayload, {
        lastUpdated: txResult.safeTs,
        skipBroadcast: false,
      });
      setIsCloudConnected(true);
      setCloudSyncError(null);
      scheduleAutoCloudBackup('Setelah Impor Gabung Database');

      return {
        success: true,
        addedSchedules: txResult.scheduleMerge.addedItems.length,
        updatedSchedules: txResult.scheduleMerge.updatedItems.length,
        skippedSchedules: txResult.scheduleMerge.duplicateSkippedCount,
        addedMasterCount: txResult.addedMasterCount,
        addedJournals: txResult.addedJournals,
        message: `Impor gabung berhasil! +${txResult.scheduleMerge.addedItems.length} jadwal baru ditambahkan, ${txResult.scheduleMerge.updatedItems.length} diperbarui (${txResult.scheduleMerge.duplicateSkippedCount} sama/dilewati). Total jadwal sekarang: ${txResult.scheduleMerge.totalResult}.`,
      };
    } catch (err: any) {
      setCloudSyncError(err?.message || 'Gagal menggabungkan database ke Cloud Firestore');
      return {
        success: false,
        addedSchedules: 0,
        updatedSchedules: 0,
        skippedSchedules: 0,
        addedMasterCount: 0,
        addedJournals: 0,
        message: `Gagal mengimpor/menggabungkan database: ${err?.message || 'Kesalahan jaringan Cloud Firestore'}`,
      };
    }
  };

  // Pulihkan Penuh Snapshot Backup (.json) dengan Auto-Backup Pengaman Sebelumnya
  const restoreDatabaseSnapshot = async (
    snapshot: Partial<SimpatiDatabaseSnapshot>,
    mode: 'full_snapshot' | 'schedules_only' = 'full_snapshot'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await createCloudBackup('Cadangan Pengaman Sebelum Restore File');
      const now = Date.now();
      const actorName = `${currentUser.name || 'Admin'} (Restore Backup File)`;
      const mainStoreRef = doc(db, 'simpati_data', 'main_store');

      let committedStore: Record<string, any> = {};
      if (mode === 'schedules_only') {
        const nextSchedules = stripUndefined(Array.isArray(snapshot.schedules) ? snapshot.schedules : []);
        const safeTs = await runTransaction(db, async (tx) => {
          const snap = await tx.get(mainStoreRef);
          const remote = snap.exists() ? snap.data() : {};
          const remoteTs = typeof remote.lastUpdated === 'number' ? remote.lastUpdated : 0;
          const ts = Math.max(now, remoteTs + 1);
          tx.set(
            mainStoreRef,
            stripUndefined({
              schedules: nextSchedules,
              lastUpdated: ts,
              lastUpdatedBy: actorName,
              lastUpdatedByClientId: clientId,
              isInitialEmpty: false,
            }),
            { merge: true }
          );
          return ts;
        });
        committedStore = {
          schedules: nextSchedules,
          lastUpdated: safeTs,
          lastUpdatedBy: actorName,
        };
      } else {
        const fullPayload = stripUndefined({
          teachers: Array.isArray(snapshot.teachers) ? snapshot.teachers : teachersRef.current,
          subjects: Array.isArray(snapshot.subjects) ? snapshot.subjects : subjectsRef.current,
          classes: Array.isArray(snapshot.classes) ? snapshot.classes : classesRef.current,
          departments: Array.isArray(snapshot.departments) ? snapshot.departments : departmentsRef.current,
          rooms: Array.isArray(snapshot.rooms) ? snapshot.rooms : roomsRef.current,
          academicYears:
            Array.isArray(snapshot.academicYears) && snapshot.academicYears.length > 0
              ? snapshot.academicYears
              : academicYearsRef.current,
          schedules: Array.isArray(snapshot.schedules) ? snapshot.schedules : schedulesRef.current,
          attendanceRecords:
            snapshot.attendanceRecords && typeof snapshot.attendanceRecords === 'object'
              ? snapshot.attendanceRecords
              : attendanceRecordsRef.current,
          userAccounts: ensureDefaultAccounts(
            Array.isArray(snapshot.userAccounts) && snapshot.userAccounts.length > 0
              ? snapshot.userAccounts
              : userAccountsRef.current
          ),
          journals: Array.isArray(snapshot.journals) ? snapshot.journals : journalsRef.current,
          activeWeekFilter: snapshot.activeWeekFilter || activeWeekFilterRef.current || 'AUTO',
          monthlyWeekSchedules: snapshot.monthlyWeekSchedules || monthlyWeekSchedulesRef.current || {},
          lastUpdated: now,
          lastUpdatedBy: actorName,
          lastUpdatedByClientId: clientId,
          isInitialEmpty: false,
        });
        await setDoc(mainStoreRef, fullPayload);
        committedStore = fullPayload;
      }

      if (mode === 'full_snapshot') {
        resetAllPendingDeltas();
      } else {
        pendingScheduleDeltaRef.current = createEmptyScheduleDelta();
        inFlightScheduleDeltaRef.current = null;
      }
      localMutationVersionRef.current += 1;
      lastLocalMutationAtRef.current = committedStore.lastUpdated || now;
      applyRemoteStore(committedStore);
      await syncToServer('fullState', committedStore, {
        lastUpdated: committedStore.lastUpdated || now,
        skipBroadcast: false,
      });
      lastCloudSyncErrorRef.current = null;
      setIsCloudConnected(true);
      setCloudSyncError(null);

      return {
        success: true,
        message:
          mode === 'schedules_only'
            ? `Berhasil memulihkan ${committedStore.schedules?.length || 0} slot jadwal pelajaran dari file backup ke Cloud Firestore!`
            : `Berhasil memulihkan database lengkap (${committedStore.teachers?.length || 0} guru, ${committedStore.classes?.length || 0} kelas, ${committedStore.schedules?.length || 0} jadwal, ${committedStore.journals?.length || 0} jurnal) ke Cloud Firestore!`,
      };
    } catch (err: any) {
      setCloudSyncError(err?.message || 'Gagal memulihkan snapshot backup');
      return {
        success: false,
        message: `Gagal memulihkan backup ke Cloud: ${err?.message || 'Kesalahan jaringan'}`,
      };
    }
  };

  const resetAllData = async () => {
    await createCloudBackup('Sebelum Reset Total Database');
    const now = Date.now();
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
      lastUpdated: now,
      lastUpdatedBy: currentUser.name || 'Admin',
      lastUpdatedByClientId: clientId,
      isInitialEmpty: true,
      explicitResetAt: now,
    };

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fresh', clientId, updatedBy: currentUser.name || 'Admin' }),
      });
    } catch (e) {}

    resetAllPendingDeltas();
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
    lastLocalMutationAtRef.current = now;

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
        cloudSyncError,
        hasCloudBackup,
        cloudBackupSummary,
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
        saveSchedulesBatch,
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
        createCloudBackup,
        restoreFromCloudBackup,
        mergeImportedSchedulesAndData,
        restoreDatabaseSnapshot,
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

