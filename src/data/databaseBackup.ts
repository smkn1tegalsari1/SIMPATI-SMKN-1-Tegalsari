import * as XLSX from 'xlsx';
import {
  AcademicYear,
  AttendanceRecord,
  Department,
  MonthlyWeekSchedulesMap,
  Room,
  RoomType,
  ScheduleItem,
  ScheduleWeekType,
  SchoolClass,
  Subject,
  Teacher,
  TeachingJournal,
  UserAccount,
} from '../types';
import { PERIOD_TIMES } from './initialData';

export interface SimpatiDatabaseSnapshot {
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  departments: Department[];
  rooms: Room[];
  academicYears: AcademicYear[];
  schedules: ScheduleItem[];
  attendanceRecords: Record<string, AttendanceRecord>;
  userAccounts: UserAccount[];
  journals: TeachingJournal[];
  activeWeekFilter: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL';
  monthlyWeekSchedules: MonthlyWeekSchedulesMap;
}

export type SimpatiBackupFormat =
  | 'simpati_full_backup_v1'
  | 'simpati_schedules_backup_v1'
  | 'raw_schedule_array'
  | 'excel_schedule_sheet';

export interface SimpatiDatabaseBackupFile {
  format: 'simpati_full_backup_v1' | 'simpati_schedules_backup_v1';
  version: 1;
  school: string;
  npsn: string;
  exportedAt: string;
  exportedTimestamp: number;
  exportedBy: string;
  filterSummary?: string;
  summary: {
    teachersCount: number;
    subjectsCount: number;
    classesCount: number;
    departmentsCount: number;
    roomsCount: number;
    schedulesCount: number;
    journalsCount: number;
    attendanceCount: number;
    userAccountsCount: number;
  };
  data: Partial<SimpatiDatabaseSnapshot>;
}

export interface TeacherScheduleSummary {
  teacherKey: string;
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  totalSlots: number;
  p10ProdCount: number;
  p10NormCount: number;
  allWeekCount: number;
  classes: string[];
  subjects: string[];
  days: number[];
}

export interface ParsedImportPayload {
  format: SimpatiBackupFormat;
  fileName: string;
  exportedAt?: string;
  exportedBy?: string;
  schedules: ScheduleItem[];
  teachers?: Teacher[];
  subjects?: Subject[];
  classes?: SchoolClass[];
  departments?: Department[];
  rooms?: Room[];
  academicYears?: AcademicYear[];
  attendanceRecords?: Record<string, AttendanceRecord>;
  userAccounts?: UserAccount[];
  journals?: TeachingJournal[];
  activeWeekFilter?: 'AUTO' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL';
  monthlyWeekSchedules?: MonthlyWeekSchedulesMap;
  warnings: string[];
}

export interface SmartScheduleMergeResult {
  mergedSchedules: ScheduleItem[];
  addedItems: ScheduleItem[];
  updatedItems: ScheduleItem[];
  duplicateSkippedCount: number;
  totalIncoming: number;
  totalResult: number;
}

const DAY_NAME_MAP: Record<string, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  'JUM\'AT': 5,
  SABTU: 6,
  MINGGU: 7,
};

const DAY_NUMBER_TO_NAME: Record<number, string> = {
  1: 'SENIN',
  2: 'SELASA',
  3: 'RABU',
  4: 'KAMIS',
  5: 'JUMAT',
  6: 'SABTU',
  7: 'MINGGU',
};

export function normalizeDayInfo(rawDayOfWeek?: any, rawDayName?: any): { dayOfWeek: number; dayName: string } {
  const num = Number(rawDayOfWeek);
  if (!Number.isNaN(num) && num >= 1 && num <= 7) {
    return {
      dayOfWeek: num,
      dayName: DAY_NUMBER_TO_NAME[num] || 'SENIN',
    };
  }
  const str = String(rawDayName || rawDayOfWeek || '').trim().toUpperCase();
  if (str && DAY_NAME_MAP[str]) {
    const mapped = DAY_NAME_MAP[str];
    return {
      dayOfWeek: mapped,
      dayName: DAY_NUMBER_TO_NAME[mapped] || 'SENIN',
    };
  }
  return { dayOfWeek: 1, dayName: 'SENIN' };
}

export function normalizeWeekTypeValue(raw: any): ScheduleWeekType {
  const val = String(raw || '').trim().toUpperCase();
  if (!val || val === 'ALL' || val.includes('SEMUA') || val.includes('RUTIN')) {
    return 'ALL';
  }
  if (
    val === 'P10_PROD_P11_NORM' ||
    val.includes('10 PROD') ||
    val.includes('10_PROD') ||
    val.includes('K10 PROD') ||
    (val.includes('10') && val.includes('PRODUKTIF') && val.includes('11') && val.includes('NORM'))
  ) {
    return 'P10_PROD_P11_NORM';
  }
  if (
    val === 'P10_NORM_P11_PROD' ||
    val.includes('10 NORM') ||
    val.includes('10_NORM') ||
    val.includes('K10 NORM') ||
    (val.includes('10') && val.includes('NORM') && val.includes('11') && val.includes('PRODUKTIF'))
  ) {
    return 'P10_NORM_P11_PROD';
  }
  return 'ALL';
}

export function formatWeekTypeDisplay(weekType?: string): string {
  if (weekType === 'P10_PROD_P11_NORM') return 'P10_PROD_P11_NORM';
  if (weekType === 'P10_NORM_P11_PROD') return 'P10_NORM_P11_PROD';
  return 'ALL';
}

export const FIRESTORE_FREE_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GiB (1.073.741.824 byte)
export const FIRESTORE_FREE_QUOTA_LABEL = '1 GiB';

export function estimateFirestorePayloadBytes(payload: Record<string, any>): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return 0;
  }
}

export function formatStorageBytes(bytes: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1))} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb >= 100 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
  }
  const gb = mb / 1024;
  return `${gb >= 10 ? gb.toFixed(1) : gb.toFixed(2)} GB`;
}

export function formatQuotaPercentage(
  usedBytes: number,
  quotaBytes: number = FIRESTORE_FREE_STORAGE_QUOTA_BYTES
): {
  percent: number;
  formatted: string;
  barWidthPct: number;
} {
  if (
    typeof usedBytes !== 'number' ||
    !Number.isFinite(usedBytes) ||
    usedBytes <= 0 ||
    !Number.isFinite(quotaBytes) ||
    quotaBytes <= 0
  ) {
    return { percent: 0, formatted: '0%', barWidthPct: 0 };
  }
  const percent = (usedBytes / quotaBytes) * 100;
  let formatted: string;
  if (percent < 0.01) {
    formatted = '< 0,01%';
  } else if (percent < 1) {
    formatted = `${percent.toFixed(2).replace('.', ',')}%`;
  } else if (percent < 10) {
    formatted = `${percent.toFixed(1).replace('.', ',')}%`;
  } else {
    formatted = `${Math.round(percent)}%`;
  }
  const barWidthPct = Math.min(100, Math.max(2, percent));
  return { percent, formatted, barWidthPct };
}

export function computePerTeacherScheduleBreakdown(
  schedules: ScheduleItem[],
  teachers: Teacher[] = []
): TeacherScheduleSummary[] {
  const teacherById = new Map<string, Teacher>();
  const teacherByCode = new Map<string, Teacher>();
  teachers.forEach((t) => {
    if (t.id) teacherById.set(t.id, t);
    if (t.code) teacherByCode.set(t.code.trim().toUpperCase(), t);
  });

  const groups = new Map<
    string,
    {
      teacherId: string;
      teacherCode: string;
      teacherName: string;
      totalSlots: number;
      p10ProdCount: number;
      p10NormCount: number;
      allWeekCount: number;
      classes: Set<string>;
      subjects: Set<string>;
      days: Set<number>;
    }
  >();

  schedules.forEach((s) => {
    if (!s) return;
    const matchedTeacher: Teacher | undefined =
      (s.teacherId ? teacherById.get(s.teacherId) : undefined) ||
      (s.teacherCode ? teacherByCode.get(s.teacherCode.trim().toUpperCase()) : undefined);

    const teacherId = s.teacherId || matchedTeacher?.id || '';
    const teacherCode = (s.teacherCode || matchedTeacher?.code || '-').trim();
    const teacherName = (s.teacherName || matchedTeacher?.name || 'Guru Tanpa Nama').trim();
    const key =
      teacherId && teacherId !== 't-none'
        ? `id:${teacherId}`
        : teacherCode && teacherCode !== '-'
        ? `code:${teacherCode.toUpperCase()}`
        : `name:${teacherName.toLowerCase()}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        teacherId,
        teacherCode,
        teacherName,
        totalSlots: 0,
        p10ProdCount: 0,
        p10NormCount: 0,
        allWeekCount: 0,
        classes: new Set<string>(),
        subjects: new Set<string>(),
        days: new Set<number>(),
      };
      groups.set(key, group);
    }

    group.totalSlots += 1;
    if (s.weekType === 'P10_PROD_P11_NORM') group.p10ProdCount += 1;
    else if (s.weekType === 'P10_NORM_P11_PROD') group.p10NormCount += 1;
    else group.allWeekCount += 1;

    if (s.className) group.classes.add(s.className);
    if (s.subjectName) group.subjects.add(s.subjectName);
    const { dayOfWeek } = normalizeDayInfo(s.dayOfWeek, s.dayName);
    group.days.add(dayOfWeek);
  });

  return Array.from(groups.entries())
    .map(([teacherKey, g]) => ({
      teacherKey,
      teacherId: g.teacherId,
      teacherCode: g.teacherCode,
      teacherName: g.teacherName,
      totalSlots: g.totalSlots,
      p10ProdCount: g.p10ProdCount,
      p10NormCount: g.p10NormCount,
      allWeekCount: g.allWeekCount,
      classes: Array.from(g.classes).sort(),
      subjects: Array.from(g.subjects).sort(),
      days: Array.from(g.days).sort((a, b) => a - b),
    }))
    .sort((a, b) => b.totalSlots - a.totalSlots || a.teacherName.localeCompare(b.teacherName));
}

export function createFullDatabaseBackupEnvelope(
  snapshot: SimpatiDatabaseSnapshot,
  exportedBy = 'Administrator SIMPATI'
): SimpatiDatabaseBackupFile {
  const now = Date.now();
  return {
    format: 'simpati_full_backup_v1',
    version: 1,
    school: 'SMK Negeri 1 Tegalsari',
    npsn: '20540177',
    exportedAt: new Date(now).toISOString(),
    exportedTimestamp: now,
    exportedBy,
    summary: {
      teachersCount: snapshot.teachers.length,
      subjectsCount: snapshot.subjects.length,
      classesCount: snapshot.classes.length,
      departmentsCount: snapshot.departments.length,
      roomsCount: snapshot.rooms.length,
      schedulesCount: snapshot.schedules.length,
      journalsCount: snapshot.journals.length,
      attendanceCount: Object.keys(snapshot.attendanceRecords || {}).length,
      userAccountsCount: snapshot.userAccounts.length,
    },
    data: snapshot,
  };
}

export function createSchedulesBackupEnvelope(
  schedules: ScheduleItem[],
  exportedBy = 'Administrator SIMPATI',
  filterSummary?: string
): SimpatiDatabaseBackupFile {
  const now = Date.now();
  return {
    format: 'simpati_schedules_backup_v1',
    version: 1,
    school: 'SMK Negeri 1 Tegalsari',
    npsn: '20540177',
    exportedAt: new Date(now).toISOString(),
    exportedTimestamp: now,
    exportedBy,
    filterSummary: filterSummary || 'Seluruh Jadwal Pelajaran Hasil Input Guru',
    summary: {
      teachersCount: 0,
      subjectsCount: 0,
      classesCount: 0,
      departmentsCount: 0,
      roomsCount: 0,
      schedulesCount: schedules.length,
      journalsCount: 0,
      attendanceCount: 0,
      userAccountsCount: 0,
    },
    data: {
      schedules,
    },
  };
}

export function buildSchedulesExcelWorkbook(schedules: ScheduleItem[]): XLSX.WorkBook {
  const headers = [
    'ID Jadwal',
    'Hari',
    'Jam Ke',
    'Waktu',
    'Rotasi Pekan',
    'Kode Guru',
    'Nama Guru',
    'Kode Mapel',
    'Mata Pelajaran',
    'Kelas',
    'Jurusan',
    'Ruang',
    'Tipe Ruang',
    'Teacher ID',
    'Class ID',
  ];

  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = normalizeDayInfo(a.dayOfWeek, a.dayName).dayOfWeek - normalizeDayInfo(b.dayOfWeek, b.dayName).dayOfWeek;
    if (dayDiff !== 0) return dayDiff;
    const pA = Number(a.periodIndex) || 0;
    const pB = Number(b.periodIndex) || 0;
    if (pA !== pB) return pA - pB;
    return (a.className || '').localeCompare(b.className || '');
  });

  const rows = sorted.map((s) => {
    const { dayName } = normalizeDayInfo(s.dayOfWeek, s.dayName);
    return [
      s.id || '',
      s.dayName || dayName,
      s.periodIndex ?? '',
      s.timeRange || (s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : ''),
      formatWeekTypeDisplay(s.weekType),
      s.teacherCode || '',
      s.teacherName || '',
      s.subjectCode || '',
      s.subjectName || '',
      s.className || '',
      s.department || '',
      s.roomName || '',
      s.roomType || 'Teori',
      s.teacherId || '',
      s.classId || '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 11 },
    { wch: 8 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
    { wch: 14 },
    { wch: 30 },
    { wch: 16 },
    { wch: 12 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Backup_Jadwal_SIMPATI');
  return wb;
}

export function triggerDownloadJson(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSchedulesExcel(schedules: ScheduleItem[], filename: string): void {
  const wb = buildSchedulesExcelWorkbook(schedules);
  XLSX.writeFile(wb, filename);
}

function normalizePeriodAndTime(rawPeriod: any, rawTimeRange?: any): {
  periodIndex: number | string;
  timeRange: string;
  startTime: string;
  endTime: string;
} {
  const num = Number(rawPeriod);
  const periodNum = !Number.isNaN(num) && num > 0 ? num : null;
  const pt = periodNum ? PERIOD_TIMES.find((p) => p.period === periodNum) : undefined;

  let timeRange = String(rawTimeRange || '').trim();
  let startTime = '';
  let endTime = '';

  if (timeRange) {
    const cleaned = timeRange.replace(/\./g, ':').replace(/[–—]/g, '-');
    const parts = cleaned.split('-').map((p) => p.trim());
    if (parts[0]) startTime = parts[0];
    if (parts[1]) endTime = parts[1];
    timeRange = startTime && endTime ? `${startTime} - ${endTime}` : timeRange;
  }

  if (!timeRange && pt) {
    timeRange = pt.range.replace(/\./g, ':');
    startTime = pt.start;
    endTime = pt.end;
  }

  return {
    periodIndex: periodNum ?? String(rawPeriod || 1).trim(),
    timeRange: timeRange || '06:45 - 07:20',
    startTime: startTime || '06:45',
    endTime: endTime || '07:20',
  };
}

function normalizeIncomingScheduleItem(
  raw: Record<string, any>,
  index: number,
  refs?: {
    teachers?: Teacher[];
    classes?: SchoolClass[];
    subjects?: Subject[];
    rooms?: Room[];
  }
): ScheduleItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const { dayOfWeek, dayName } = normalizeDayInfo(
    raw.dayOfWeek ?? raw['day_of_week'],
    raw.dayName ?? raw['Hari'] ?? raw['hari']
  );

  const periodRaw = raw.periodIndex ?? raw['Jam Ke'] ?? raw['jam_ke'] ?? raw['Jam'] ?? 1;
  const timeRaw = raw.timeRange ?? raw['Waktu'] ?? raw['waktu'];
  const { periodIndex, timeRange, startTime, endTime } = normalizePeriodAndTime(periodRaw, timeRaw);

  const rawTeacherId = String(raw.teacherId ?? raw['Teacher ID'] ?? '').trim();
  const rawTeacherCode = String(raw.teacherCode ?? raw['Kode Guru'] ?? raw['kode_guru'] ?? '').trim();
  const rawTeacherName = String(raw.teacherName ?? raw['Nama Guru'] ?? raw['Guru'] ?? '').trim();

  const matchedTeacher = refs?.teachers?.find(
    (t) =>
      (rawTeacherId && t.id === rawTeacherId) ||
      (rawTeacherCode && t.code.trim().toLowerCase() === rawTeacherCode.toLowerCase()) ||
      (rawTeacherName && t.name.trim().toLowerCase() === rawTeacherName.toLowerCase())
  );

  const rawClassId = String(raw.classId ?? raw['Class ID'] ?? '').trim();
  const rawClassName = String(raw.className ?? raw['Kelas'] ?? raw['kelas'] ?? '').trim();
  const matchedClass = refs?.classes?.find(
    (c) =>
      (rawClassId && c.id === rawClassId) ||
      (rawClassName && c.name.trim().toLowerCase() === rawClassName.toLowerCase())
  );

  const rawSubjectCode = String(raw.subjectCode ?? raw['Kode Mapel'] ?? '').trim();
  const rawSubjectName = String(raw.subjectName ?? raw['Mata Pelajaran'] ?? raw['Mapel'] ?? '').trim();
  const matchedSubject = refs?.subjects?.find(
    (s) =>
      (rawSubjectCode && s.code.trim().toLowerCase() === rawSubjectCode.toLowerCase()) ||
      (rawSubjectName && s.name.trim().toLowerCase() === rawSubjectName.toLowerCase())
  );

  const rawRoomName = String(raw.roomName ?? raw['Ruang'] ?? raw['Ruangan'] ?? '').trim();
  const matchedRoom = refs?.rooms?.find(
    (r) => rawRoomName && r.name.trim().toLowerCase() === rawRoomName.toLowerCase()
  );

  const className = rawClassName || matchedClass?.name || '';
  const subjectName = rawSubjectName || matchedSubject?.name || '';
  const teacherName = rawTeacherName || matchedTeacher?.name || 'Belum Ditentukan';

  if (!className && !subjectName && teacherName === 'Belum Ditentukan') {
    return null;
  }

  const weekType = normalizeWeekTypeValue(
    raw.weekType ?? raw['Rotasi Pekan'] ?? raw['Pekan'] ?? 'ALL'
  );

  const stableSlug = `${dayOfWeek}-${periodIndex}-${(className || 'kelas').replace(/\s+/g, '')}-${(
    rawTeacherCode ||
    matchedTeacher?.code ||
    teacherName
  )
    .replace(/\s+/g, '')
    .slice(0, 10)}-${weekType}`;

  const id = String(raw.id ?? raw['ID Jadwal'] ?? '').trim() || `sc-imp-${stableSlug}-${index}`;

  return {
    id,
    dayOfWeek,
    dayName,
    periodIndex,
    timeRange,
    startTime: String(raw.startTime || startTime),
    endTime: String(raw.endTime || endTime),
    teacherId: rawTeacherId || matchedTeacher?.id || 't-none',
    teacherName,
    teacherCode: rawTeacherCode || matchedTeacher?.code || undefined,
    subjectCode: rawSubjectCode || matchedSubject?.code || 'MAPEL',
    subjectName: subjectName || 'Mata Pelajaran',
    classId: rawClassId || matchedClass?.id || `cls-${className.toLowerCase().replace(/\s+/g, '-')}`,
    className: className || 'Umum',
    department: String(raw.department ?? raw['Jurusan'] ?? matchedClass?.department ?? 'UMUM').trim() || 'UMUM',
    roomName: rawRoomName || matchedRoom?.name || 'Ruang Kelas',
    roomType: (String(raw.roomType ?? raw['Tipe Ruang'] ?? matchedRoom?.type ?? 'Teori').trim() || 'Teori') as RoomType,
    weekType,
  };
}

export function parseBackupJsonText(
  text: string,
  fileName: string,
  refs?: {
    teachers?: Teacher[];
    classes?: SchoolClass[];
    subjects?: Subject[];
    rooms?: Room[];
  }
): ParsedImportPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File JSON tidak valid atau rusak. Pastikan memilih file backup SIMPATI .json yang benar.');
  }

  const warnings: string[] = [];

  if (Array.isArray(parsed)) {
    const schedules = parsed
      .map((item, idx) => normalizeIncomingScheduleItem(item, idx, refs))
      .filter((x): x is ScheduleItem => x !== null);
    if (schedules.length === 0) {
      throw new Error('Array JSON tidak berisi item jadwal pelajaran yang valid.');
    }
    return {
      format: 'raw_schedule_array',
      fileName,
      schedules,
      warnings,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Struktur file backup JSON tidak dikenali.');
  }

  const isEnvelope = Boolean(parsed.data && typeof parsed.data === 'object');
  const root = isEnvelope ? parsed.data : parsed;

  const rawSchedules = Array.isArray(root.schedules) ? root.schedules : [];
  const mergedRefs = {
    teachers: Array.isArray(root.teachers) && root.teachers.length > 0 ? root.teachers : refs?.teachers,
    classes: Array.isArray(root.classes) && root.classes.length > 0 ? root.classes : refs?.classes,
    subjects: Array.isArray(root.subjects) && root.subjects.length > 0 ? root.subjects : refs?.subjects,
    rooms: Array.isArray(root.rooms) && root.rooms.length > 0 ? root.rooms : refs?.rooms,
  };

  const schedules: ScheduleItem[] = (rawSchedules as any[])
    .map((item: any, idx: number): ScheduleItem | null => normalizeIncomingScheduleItem(item, idx, mergedRefs))
    .filter((x: ScheduleItem | null): x is ScheduleItem => x !== null);

  if (rawSchedules.length > 0 && schedules.length < rawSchedules.length) {
    warnings.push(`${rawSchedules.length - schedules.length} baris jadwal dilewati karena kolom wajib kosong.`);
  }

  const hasMasterArrays =
    Array.isArray(root.teachers) ||
    Array.isArray(root.subjects) ||
    Array.isArray(root.classes) ||
    Array.isArray(root.departments) ||
    Array.isArray(root.rooms) ||
    Array.isArray(root.journals) ||
    Array.isArray(root.userAccounts);

  if (schedules.length === 0 && !hasMasterArrays) {
    throw new Error('File JSON tidak mengandung data jadwal pelajaran maupun data master SIMPATI.');
  }

  const detectedFormat: SimpatiBackupFormat =
    parsed.format === 'simpati_schedules_backup_v1'
      ? 'simpati_schedules_backup_v1'
      : parsed.format === 'simpati_full_backup_v1' || hasMasterArrays
      ? 'simpati_full_backup_v1'
      : 'simpati_schedules_backup_v1';

  return {
    format: detectedFormat,
    fileName,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    exportedBy: typeof parsed.exportedBy === 'string' ? parsed.exportedBy : undefined,
    schedules,
    teachers: Array.isArray(root.teachers) ? root.teachers : undefined,
    subjects: Array.isArray(root.subjects) ? root.subjects : undefined,
    classes: Array.isArray(root.classes) ? root.classes : undefined,
    departments: Array.isArray(root.departments) ? root.departments : undefined,
    rooms: Array.isArray(root.rooms) ? root.rooms : undefined,
    academicYears: Array.isArray(root.academicYears) ? root.academicYears : undefined,
    attendanceRecords:
      root.attendanceRecords && typeof root.attendanceRecords === 'object' && !Array.isArray(root.attendanceRecords)
        ? root.attendanceRecords
        : undefined,
    userAccounts: Array.isArray(root.userAccounts) ? root.userAccounts : undefined,
    journals: Array.isArray(root.journals) ? root.journals : undefined,
    activeWeekFilter: typeof root.activeWeekFilter === 'string' ? (root.activeWeekFilter as any) : undefined,
    monthlyWeekSchedules:
      root.monthlyWeekSchedules && typeof root.monthlyWeekSchedules === 'object' && !Array.isArray(root.monthlyWeekSchedules)
        ? root.monthlyWeekSchedules
        : undefined,
    warnings,
  };
}

export function parseScheduleExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  refs?: {
    teachers?: Teacher[];
    classes?: SchoolClass[];
    subjects?: Subject[];
    rooms?: Room[];
  }
): ParsedImportPayload {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Workbook Excel tidak memiliki sheet yang dapat dibaca.');
  }
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error('Sheet Excel kosong. Gunakan file Excel hasil Ekspor Backup Jadwal SIMPATI.');
  }

  const warnings: string[] = [];
  const schedules = rows
    .map((row, idx) => normalizeIncomingScheduleItem(row, idx, refs))
    .filter((x): x is ScheduleItem => x !== null);

  if (schedules.length === 0) {
    throw new Error('Tidak ditemukan baris jadwal valid pada file Excel. Pastikan header kolom sesuai template ekspor.');
  }
  if (schedules.length < rows.length) {
    warnings.push(`${rows.length - schedules.length} baris Excel kosong/tidak lengkap dilewati.`);
  }

  return {
    format: 'excel_schedule_sheet',
    fileName,
    schedules,
    warnings,
  };
}

export function getScheduleNaturalKey(item: ScheduleItem): string {
  const { dayOfWeek } = normalizeDayInfo(item.dayOfWeek, item.dayName);
  const period = String(item.periodIndex ?? '').trim().toUpperCase();
  const classKey = (item.className || item.classId || '').trim().toUpperCase();
  const weekKey = normalizeWeekTypeValue(item.weekType);
  const teacherKey = (
    item.teacherCode ||
    (item.teacherId && item.teacherId !== 't-none' ? item.teacherId : '') ||
    item.teacherName ||
    ''
  )
    .trim()
    .toUpperCase();
  return `${dayOfWeek}|${period}|${classKey}|${weekKey}|${teacherKey}`;
}

export function computeSmartScheduleMerge(
  existingSchedules: ScheduleItem[],
  incomingSchedules: ScheduleItem[]
): SmartScheduleMergeResult {
  const merged = [...existingSchedules];
  const indexById = new Map<string, number>();
  const indexByNaturalKey = new Map<string, number>();

  merged.forEach((item, idx) => {
    if (!item) return;
    if (item.id) indexById.set(item.id, idx);
    indexByNaturalKey.set(getScheduleNaturalKey(item), idx);
  });

  const addedItems: ScheduleItem[] = [];
  const updatedItems: ScheduleItem[] = [];
  let duplicateSkippedCount = 0;

  incomingSchedules.forEach((inc) => {
    if (!inc) return;
    const natKey = getScheduleNaturalKey(inc);
    const existingIdxById = inc.id ? indexById.get(inc.id) : undefined;
    const existingIdxByNat = indexByNaturalKey.get(natKey);
    const targetIdx = existingIdxById !== undefined ? existingIdxById : existingIdxByNat;

    if (targetIdx !== undefined) {
      const current = merged[targetIdx];
      // Pertahankan ID existing agar attendanceRecords yang terhubung tidak putus
      const nextItem: ScheduleItem = {
        ...inc,
        id: current.id || inc.id,
      };
      if (JSON.stringify(current) === JSON.stringify(nextItem)) {
        duplicateSkippedCount += 1;
      } else {
        merged[targetIdx] = nextItem;
        updatedItems.push(nextItem);
      }
      indexByNaturalKey.set(getScheduleNaturalKey(nextItem), targetIdx);
      if (nextItem.id) indexById.set(nextItem.id, targetIdx);
    } else {
      const insertIdx = merged.length;
      merged.push(inc);
      addedItems.push(inc);
      if (inc.id) indexById.set(inc.id, insertIdx);
      indexByNaturalKey.set(natKey, insertIdx);
    }
  });

  return {
    mergedSchedules: merged,
    addedItems,
    updatedItems,
    duplicateSkippedCount,
    totalIncoming: incomingSchedules.length,
    totalResult: merged.length,
  };
}

export function mergeMissingRecordsByKey<T extends Record<string, any>>(
  existing: T[],
  incoming: T[] | undefined,
  getKey: (item: T) => string
): { merged: T[]; addedCount: number } {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return { merged: existing, addedCount: 0 };
  }

  const seenIds = new Set<string>(existing.map((x) => String(x?.id || '')).filter(Boolean));
  const seenKeys = new Set<string>(existing.map((x) => getKey(x)).filter(Boolean));
  const merged = [...existing];
  let addedCount = 0;

  incoming.forEach((item) => {
    if (!item) return;
    const id = String(item.id || '');
    const key = getKey(item);
    if ((id && seenIds.has(id)) || (key && seenKeys.has(key))) {
      return;
    }
    merged.push(item);
    if (id) seenIds.add(id);
    if (key) seenKeys.add(key);
    addedCount += 1;
  });

  return { merged, addedCount };
}
