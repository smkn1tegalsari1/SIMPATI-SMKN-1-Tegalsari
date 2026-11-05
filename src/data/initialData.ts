import { Teacher, Subject, SchoolClass, Room, ScheduleItem, AttendanceRecord, Department, AcademicYear, UserAccount } from '../types';

// Data Master Awal Bersih (Clean Slate)
export const INITIAL_DEPARTMENTS: Department[] = [];

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'ay-1', name: '2026/2027 Ganjil', startDate: '2026-07-13', endDate: '2026-12-19', status: 'aktif' },
];

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_ROOMS: Room[] = [];

export const PERIOD_TIMES = [
  { period: 1, range: '06:45–07:20', start: '06:45', end: '07:20' },
  { period: 2, range: '07:20–07:55', start: '07:20', end: '07:55' },
  { period: 3, range: '07:55–08:30', start: '07:55', end: '08:30' },
  { period: 4, range: '08:45–09:20', start: '08:45', end: '09:20' },
  { period: 5, range: '09:20–09:55', start: '09:20', end: '09:55' },
  { period: 6, range: '10:10–10:45', start: '10:10', end: '10:45' },
  { period: 7, range: '10:45–11:20', start: '10:45', end: '11:20' },
  { period: 8, range: '12:30–13:05', start: '12:30', end: '13:05' },
  { period: 9, range: '13:05–13:40', start: '13:05', end: '13:40' },
  { period: 10, range: '13:40–14:15', start: '13:40', end: '14:15' },
  { period: 11, range: '14:15–14:50', start: '14:15', end: '14:50' },
];

export const INITIAL_SCHEDULE: ScheduleItem[] = [];

export const INITIAL_SCHEDULES = INITIAL_SCHEDULE;

export const INITIAL_ATTENDANCE_RECORDS: Record<string, AttendanceRecord> = {};

// Akun otentikasi utama sistem
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator SIMPATI',
    role: 'admin',
    status: 'aktif',
    piketDays: [],
    additionalDuty: 'Super Administrator',
  },
  {
    id: 'usr-kepsek',
    username: 'kepsek',
    password: 'pimpinan123',
    name: 'Kepala SMKN 1 Tegalsari',
    role: 'pimpinan',
    status: 'aktif',
    piketDays: [],
    additionalDuty: 'Kepala Sekolah',
  },
];
