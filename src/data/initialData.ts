import { Teacher, Subject, SchoolClass, Room, ScheduleItem, AttendanceRecord, Department, AcademicYear, UserAccount, TeachingJournal } from '../types';
import {
  SEED_DEPARTMENTS,
  SEED_CLASSES,
  SEED_TEACHERS,
  SEED_SUBJECTS,
  SEED_ROOMS,
  SEED_SCHEDULES,
} from './masterSeedData';

// Data Master Awal Tersinkronisasi Penuh dengan Menu Monitoring SMKN 1 Tegalsari
export const INITIAL_DEPARTMENTS: Department[] = SEED_DEPARTMENTS;

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'ay-1', name: '2026/2027 Ganjil', startDate: '2026-07-13', endDate: '2026-12-19', status: 'aktif' },
];

export const INITIAL_TEACHERS: Teacher[] = SEED_TEACHERS;

export const INITIAL_SUBJECTS: Subject[] = SEED_SUBJECTS;

export const INITIAL_CLASSES: SchoolClass[] = SEED_CLASSES;

export const INITIAL_ROOMS: Room[] = SEED_ROOMS;

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

export const INITIAL_SCHEDULE: ScheduleItem[] = SEED_SCHEDULES;

export const INITIAL_SCHEDULES = INITIAL_SCHEDULE;

export const INITIAL_ATTENDANCE_RECORDS: Record<string, AttendanceRecord> = {};

export const INITIAL_JOURNALS: TeachingJournal[] = [];

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
    name: 'CANDRA SURO LAKSONO, S.Pi',
    nip: '19840925 201101 1 011',
    role: 'pimpinan',
    status: 'aktif',
    piketDays: [],
    additionalDuty: 'Kepala Sekolah',
  },
  {
    id: 'usr-waka-kurikulum',
    username: 'kurikulum',
    password: 'waka123',
    name: 'EKO PRAMESTI SUMARTO, S.Mat',
    nip: '19870618 202421 1 002',
    role: 'pimpinan',
    status: 'aktif',
    piketDays: [],
    additionalDuty: 'Waka Bidang Kurikulum',
  },
];

// Helper penjamin bahwa akun admin dan pimpinan selalu ada, sinkron, dan mempertahankan seluruh perubahan pengguna
export function ensureDefaultAccounts(accounts: any[]): UserAccount[] {
  const currentList = Array.isArray(accounts) ? [...accounts] : [];

  // 1. Pastikan akun Admin utama selalu tersedia & pertahankan data yang telah diedit pengguna
  let adminAcc = currentList.find(
    (a) => a.id === 'usr-admin' || (a.username && a.username.toLowerCase() === 'admin')
  );
  if (adminAcc) {
    adminAcc = {
      ...adminAcc,
      id: adminAcc.id || 'usr-admin',
      username: adminAcc.username || 'admin',
      password: adminAcc.password || 'admin123',
      name: adminAcc.name || 'Administrator SIMPATI',
      role: adminAcc.role || 'admin',
      status: adminAcc.status || 'aktif',
      additionalDuty: adminAcc.additionalDuty !== undefined ? adminAcc.additionalDuty : 'Super Administrator',
      piketDays: adminAcc.piketDays || [],
    };
  } else {
    adminAcc = { ...INITIAL_USER_ACCOUNTS[0] };
  }

  // 2. Pastikan akun Kepala Sekolah selalu tersedia & pertahankan data yang telah diedit pengguna
  let kepsekAcc = currentList.find(
    (a) => a.id === 'usr-kepsek' || (a.username && a.username.toLowerCase() === 'kepsek')
  );
  if (kepsekAcc) {
    kepsekAcc = {
      ...kepsekAcc,
      id: kepsekAcc.id || 'usr-kepsek',
      username: kepsekAcc.username || 'kepsek',
      password: kepsekAcc.password || 'pimpinan123',
      name: kepsekAcc.name || 'CANDRA SURO LAKSONO, S.Pi',
      nip: kepsekAcc.nip !== undefined ? kepsekAcc.nip : '19840925 201101 1 011',
      role: kepsekAcc.role || 'pimpinan',
      status: kepsekAcc.status || 'aktif',
      additionalDuty: kepsekAcc.additionalDuty !== undefined ? kepsekAcc.additionalDuty : 'Kepala Sekolah',
      piketDays: kepsekAcc.piketDays || [],
    };
  } else {
    kepsekAcc = { ...INITIAL_USER_ACCOUNTS[1] };
  }

  // 3. Pastikan akun Waka Kurikulum selalu tersedia & pertahankan data yang telah diedit pengguna
  let wakaAcc = currentList.find(
    (a) => a.id === 'usr-waka-kurikulum' || (a.username && a.username.toLowerCase() === 'kurikulum')
  );
  if (wakaAcc) {
    wakaAcc = {
      ...wakaAcc,
      id: wakaAcc.id || 'usr-waka-kurikulum',
      username: wakaAcc.username || 'kurikulum',
      password: wakaAcc.password || 'waka123',
      name: wakaAcc.name || 'EKO PRAMESTI SUMARTO, S.Mat',
      nip: wakaAcc.nip !== undefined ? wakaAcc.nip : '19870618 202421 1 002',
      role: wakaAcc.role || 'pimpinan',
      status: wakaAcc.status || 'aktif',
      additionalDuty: wakaAcc.additionalDuty !== undefined ? wakaAcc.additionalDuty : 'Waka Bidang Kurikulum',
      piketDays: wakaAcc.piketDays || [],
    };
  } else {
    wakaAcc = { ...INITIAL_USER_ACCOUNTS[2] };
  }

  // 4. Bersihkan duplikasi & rangkai ulang: Akun inti di urutan teratas
  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const result: UserAccount[] = [];

  for (const core of [adminAcc, kepsekAcc, wakaAcc]) {
    seenIds.add(core.id);
    seenUsernames.add(core.username.toLowerCase());
    result.push(core);
  }

  for (const acc of currentList) {
    if (!acc) continue;
    const accId = acc.id || '';
    const accUser = (acc.username || '').toLowerCase();
    if (seenIds.has(accId) || (accUser && seenUsernames.has(accUser))) {
      continue;
    }
    if (accId) seenIds.add(accId);
    if (accUser) seenUsernames.add(accUser);

    result.push({
      ...acc,
      id: acc.id || `usr-${Date.now().toString(36)}`,
      username: acc.username || `user_${acc.id}`,
      password: acc.password || 'guru123',
      name: acc.name || 'Pengguna SIMPATI',
      role: acc.role || 'guru',
      status: acc.status || 'aktif',
      piketDays: acc.piketDays || [],
    });
  }

  return result;
}

// Cek apakah akun merupakan akun sistem yang dilindungi dari penghapusan
export function isProtectedAccount(account: any): boolean {
  if (!account) return false;
  const id = account.id || '';
  const username = (account.username || '').toLowerCase();
  const role = account.role || '';
  return (
    id === 'usr-admin' ||
    id === 'usr-kepsek' ||
    id === 'usr-waka-kurikulum' ||
    username === 'admin' ||
    role === 'admin'
  );
}

