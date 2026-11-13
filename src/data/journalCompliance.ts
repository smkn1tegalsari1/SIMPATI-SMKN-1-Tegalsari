import {
  ActiveWeekRotationType,
  Department,
  MonthlyWeekSchedulesMap,
  ScheduleItem,
  ScheduleWeekType,
  SchoolClass,
  Teacher,
  TeachingJournal,
} from '../types';
import { PERIOD_TIMES } from './initialData';
import { areDepartmentsEquivalent, resolveDepartmentCode } from './departmentUtils';
import {
  isScheduleMatchingWeek,
  resolveWeekRotationForDate,
  toLocalDateISO,
} from './scheduleWeeks';

export type JournalReportGranularity = 'daily' | 'weekly' | 'monthly';

export type TeacherComplianceStatus =
  | 'belum_mengisi'
  | 'sebagian'
  | 'lengkap'
  | 'non_jadwal'
  | 'tidak_ada_jadwal';

export interface MissingJournalSession {
  date: string; // YYYY-MM-DD
  dayName: string;
  className: string;
  department: string;
  subjectCode: string;
  subjectName: string;
  startPeriod: number;
  endPeriod: number;
  timeRange: string;
  roomName: string;
  weekType: ScheduleWeekType;
}

export interface SubmittedJournalSummary {
  id: string;
  date: string;
  className: string;
  subjectName: string;
  startPeriod: number;
  endPeriod: number;
  topic: string;
}

export interface TeacherJournalComplianceRow {
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  nip: string;
  title: string;
  departments: string[];
  expectedSessions: number;
  filledSessions: number;
  missingSessions: number;
  journalsSubmitted: number;
  missingDetails: MissingJournalSession[];
  submittedDetails: SubmittedJournalSummary[];
  status: TeacherComplianceStatus;
}

export interface PeriodDateRangeResult {
  startISO: string;
  endISO: string;
  allWorkDates: string[];
  evaluatedDates: string[];
  periodLabel: string;
}

const DAY_NAME_TO_NUM: Record<string, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
  MINGGU: 7,
};

const NUM_TO_DAY_NAME: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

const BULAN_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function formatIndonesianShortDate(iso: string): string {
  const d = parseLocalISO(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_INDO[d.getMonth()]?.slice(0, 3) || ''} ${d.getFullYear()}`;
}

export function formatIndonesianFullDate(iso: string): string {
  const d = parseLocalISO(iso);
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  return `${NUM_TO_DAY_NAME[dow] || ''}, ${d.getDate()} ${BULAN_INDO[d.getMonth()] || ''} ${d.getFullYear()}`;
}

export function normalizeDateToISO(dateStr?: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, dd, mm, yyyy] = dashMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Mengembalikan daftar tanggal Senin-Jumat untuk minggu kalender yang memuat anchorISO.
 */
export function getWeekBoundsFromISO(anchorISO: string): {
  startISO: string;
  endISO: string;
  dates: string[];
} {
  const d = parseLocalISO(anchorISO);
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // 1=Senin..7=Minggu
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow - 1));
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    dates.push(toLocalDateISO(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
  }
  return {
    startISO: dates[0],
    endISO: dates[dates.length - 1],
    dates,
  };
}

/**
 * Mengembalikan seluruh tanggal Senin-Jumat dalam satu bulan (YYYY-MM).
 */
export function getMonthWorkDates(monthKey: string): string[] {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!y || !m) return [];
  const daysInMonth = new Date(y, m, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(y, m - 1, day);
    const dow = dt.getDay();
    if (dow >= 1 && dow <= 5) {
      dates.push(toLocalDateISO(dt));
    }
  }
  return dates;
}

export function getPeriodDateRange(params: {
  granularity: JournalReportGranularity;
  selectedDateISO: string;
  selectedWeekAnchorISO: string;
  selectedMonthKey: string;
  upToTodayOnly: boolean;
  todayISO: string;
}): PeriodDateRangeResult {
  const {
    granularity,
    selectedDateISO,
    selectedWeekAnchorISO,
    selectedMonthKey,
    upToTodayOnly,
    todayISO,
  } = params;

  if (granularity === 'daily') {
    const safeDate = normalizeDateToISO(selectedDateISO) || todayISO;
    return {
      startISO: safeDate,
      endISO: safeDate,
      allWorkDates: [safeDate],
      evaluatedDates: [safeDate],
      periodLabel: formatIndonesianFullDate(safeDate),
    };
  }

  if (granularity === 'weekly') {
    const safeAnchor = normalizeDateToISO(selectedWeekAnchorISO) || todayISO;
    const { startISO, endISO, dates } = getWeekBoundsFromISO(safeAnchor);
    const evaluatedDates = upToTodayOnly ? dates.filter((d) => d <= todayISO) : dates;
    return {
      startISO,
      endISO,
      allWorkDates: dates,
      evaluatedDates,
      periodLabel: `${formatIndonesianShortDate(startISO)} – ${formatIndonesianShortDate(endISO)}`,
    };
  }

  // Monthly
  const safeMonthKey = /^\d{4}-\d{2}$/.test(selectedMonthKey)
    ? selectedMonthKey
    : todayISO.slice(0, 7);
  const [yStr, mStr] = safeMonthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const dates = getMonthWorkDates(safeMonthKey);
  const startISO = `${safeMonthKey}-01`;
  const daysInMonth = new Date(y, m, 0).getDate();
  const endISO = `${safeMonthKey}-${String(daysInMonth).padStart(2, '0')}`;
  const evaluatedDates = upToTodayOnly ? dates.filter((d) => d <= todayISO) : dates;

  return {
    startISO,
    endISO,
    allWorkDates: dates,
    evaluatedDates,
    periodLabel: `${BULAN_INDO[(m || 1) - 1] || ''} ${y}`,
  };
}

function getScheduleDayOfWeek(s: ScheduleItem): number {
  if (typeof s.dayOfWeek === 'number' && s.dayOfWeek >= 1 && s.dayOfWeek <= 7) {
    return s.dayOfWeek;
  }
  if (s.dayName) {
    const mapped = DAY_NAME_TO_NUM[s.dayName.trim().toUpperCase()];
    if (mapped) return mapped;
  }
  return 1;
}

function getSchedulePeriodNum(s: ScheduleItem): number {
  if (typeof s.periodIndex === 'number' && !isNaN(s.periodIndex)) return s.periodIndex;
  const parsed = parseInt(String(s.periodIndex), 10);
  return isNaN(parsed) ? 1 : parsed;
}

function isJournalMatchingTeacher(
  journal: TeachingJournal,
  teacher: { id: string; code?: string; name: string }
): boolean {
  if (journal.teacherId && teacher.id && journal.teacherId === teacher.id) return true;
  if (
    journal.teacherCode &&
    teacher.code &&
    journal.teacherCode.trim().toUpperCase() === teacher.code.trim().toUpperCase()
  ) {
    return true;
  }
  if (
    journal.teacherName &&
    teacher.name &&
    journal.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

function isScheduleMatchingTeacher(
  s: ScheduleItem,
  teacher: { id: string; code?: string; name: string }
): boolean {
  if (s.teacherId && teacher.id && s.teacherId === teacher.id) return true;
  if (
    s.teacherCode &&
    teacher.code &&
    s.teacherCode.trim().toUpperCase() === teacher.code.trim().toUpperCase()
  ) {
    return true;
  }
  if (
    s.teacherName &&
    teacher.name &&
    s.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

function doesJournalCoverSession(
  journal: TeachingJournal,
  session: MissingJournalSession
): boolean {
  const jClass = (journal.className || '').trim().toUpperCase();
  const sClass = (session.className || '').trim().toUpperCase();
  const sameClass = jClass !== '' && jClass === sClass;

  const jStart = Number(journal.startPeriod) || 1;
  const jEnd = Number(journal.endPeriod) || jStart;
  const periodsOverlap = jStart <= session.endPeriod && jEnd >= session.startPeriod;

  const jSub = (journal.subjectName || '').trim().toUpperCase();
  const sSub = (session.subjectName || '').trim().toUpperCase();
  const jSubCode = (journal.subjectCode || '').trim().toUpperCase();
  const sSubCode = (session.subjectCode || '').trim().toUpperCase();
  const sameSubject =
    (jSub !== '' && jSub === sSub) || (jSubCode !== '' && sSubCode !== '' && jSubCode === sSubCode);

  if (sameClass && (sameSubject || periodsOverlap)) return true;
  if (periodsOverlap && sameSubject) return true;
  return false;
}

export function computeTeacherJournalCompliance(params: {
  evaluatedDates: string[];
  todayISO: string;
  teachers: Teacher[];
  schedules: ScheduleItem[];
  journals: TeachingJournal[];
  classes: SchoolClass[];
  departments: Department[];
  activeWeekFilter: ScheduleWeekType | 'AUTO' | 'ALL';
  monthlyWeekSchedules?: MonthlyWeekSchedulesMap;
  filterDept?: string;
}): TeacherJournalComplianceRow[] {
  const {
    evaluatedDates,
    todayISO,
    teachers,
    schedules,
    journals,
    classes,
    departments,
    activeWeekFilter,
    monthlyWeekSchedules,
    filterDept = 'all',
  } = params;

  const currentWeekDates = new Set(getWeekBoundsFromISO(todayISO).dates);
  // Sertakan juga Sabtu & Minggu minggu ini jika activeWeekFilter dipaksa admin
  const todayDateObj = parseLocalISO(todayISO);
  const todayDow = todayDateObj.getDay() === 0 ? 7 : todayDateObj.getDay();
  const mondayDate = new Date(
    todayDateObj.getFullYear(),
    todayDateObj.getMonth(),
    todayDateObj.getDate() - (todayDow - 1)
  );
  for (let i = 5; i < 7; i++) {
    currentWeekDates.add(
      toLocalDateISO(new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i))
    );
  }

  // Normalisasi daftar guru (gabungkan Master Guru + guru yang muncul di jadwal namun belum di Master Guru)
  const teacherList: Array<{
    id: string;
    code: string;
    name: string;
    nip: string;
    title: string;
    department?: string;
  }> = teachers.map((t) => ({
    id: t.id,
    code: t.code || '-',
    name: t.name,
    nip: t.nip || '-',
    title: t.title || 'Guru Mapel',
    department: t.department,
  }));

  schedules.forEach((s) => {
    const exists = teacherList.some((t) => isScheduleMatchingTeacher(s, t));
    if (!exists && s.teacherName) {
      teacherList.push({
        id: s.teacherId || `sched-teacher-${s.teacherName}`,
        code: s.teacherCode || '-',
        name: s.teacherName,
        nip: '-',
        title: 'Guru Pengajar',
        department: s.department,
      });
    }
  });

  // Pre-index jurnal berdasarkan tanggal ISO ter-normalisasi
  const journalsByDate = new Map<string, TeachingJournal[]>();
  journals.forEach((j) => {
    const iso = normalizeDateToISO(j.date);
    if (!iso) return;
    const arr = journalsByDate.get(iso) || [];
    arr.push(j);
    journalsByDate.set(iso, arr);
  });

  const rows: TeacherJournalComplianceRow[] = [];

  for (const teacher of teacherList) {
    const deptSet = new Set<string>();
    if (teacher.department && teacher.department.trim()) {
      deptSet.add(resolveDepartmentCode(teacher.department, '', departments));
    }

    const teacherSchedules = schedules.filter((s) => isScheduleMatchingTeacher(s, teacher));
    teacherSchedules.forEach((s) => {
      const cls = classes.find(
        (c) => c.id === s.classId || c.name?.trim().toUpperCase() === s.className?.trim().toUpperCase()
      );
      const resolved = resolveDepartmentCode(
        cls?.department || s.department,
        cls?.name || s.className,
        departments
      );
      if (resolved) deptSet.add(resolved);
    });

    const teacherDepts = Array.from(deptSet);

    if (
      filterDept &&
      filterDept !== 'all' &&
      !teacherDepts.some((d) => areDepartmentsEquivalent(d, filterDept))
    ) {
      continue;
    }

    let expectedSessions = 0;
    let filledSessions = 0;
    const missingDetails: MissingJournalSession[] = [];
    const submittedDetails: SubmittedJournalSummary[] = [];
    const countedJournalIds = new Set<string>();

    for (const dateISO of evaluatedDates) {
      const dateObj = parseLocalISO(dateISO);
      const dow = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
      if (dow < 1 || dow > 5) continue;

      const dayJournals = (journalsByDate.get(dateISO) || []).filter((j) =>
        isJournalMatchingTeacher(j, teacher)
      );
      dayJournals.forEach((j) => {
        if (!countedJournalIds.has(j.id)) {
          countedJournalIds.add(j.id);
          submittedDetails.push({
            id: j.id,
            date: dateISO,
            className: j.className,
            subjectName: j.subjectName,
            startPeriod: j.startPeriod,
            endPeriod: j.endPeriod,
            topic: j.topic,
          });
        }
      });

      // Tentukan rotasi pekan pada tanggal dateISO
      let targetWeek: ActiveWeekRotationType = resolveWeekRotationForDate(
        dateObj,
        monthlyWeekSchedules
      );
      if (
        currentWeekDates.has(dateISO) &&
        activeWeekFilter !== 'AUTO' &&
        activeWeekFilter !== 'ALL'
      ) {
        targetWeek = activeWeekFilter;
      }

      const daySchedules = teacherSchedules
        .filter((s) => {
          if (getScheduleDayOfWeek(s) !== dow) return false;
          if (activeWeekFilter === 'ALL' && currentWeekDates.has(dateISO)) return true;
          return isScheduleMatchingWeek(s.weekType, targetWeek, targetWeek);
        })
        .sort((a, b) => getSchedulePeriodNum(a) - getSchedulePeriodNum(b));

      // Gabungkan jam pelajaran berurutan menjadi blok sesi mengajar
      const sessionBlocks: Array<{
        className: string;
        department: string;
        subjectCode: string;
        subjectName: string;
        roomName: string;
        weekType: ScheduleWeekType;
        periods: number[];
      }> = [];

      daySchedules.forEach((s) => {
        const pNum = getSchedulePeriodNum(s);
        const itemWeek: ScheduleWeekType = s.weekType || 'ALL';
        const cls = classes.find(
          (c) => c.id === s.classId || c.name?.trim().toUpperCase() === s.className?.trim().toUpperCase()
        );
        const itemDept = resolveDepartmentCode(
          cls?.department || s.department,
          cls?.name || s.className,
          departments
        );
        const last = sessionBlocks[sessionBlocks.length - 1];
        const canMerge =
          last &&
          last.className.trim().toUpperCase() === (s.className || '').trim().toUpperCase() &&
          last.subjectName.trim().toUpperCase() === (s.subjectName || '').trim().toUpperCase() &&
          last.weekType === itemWeek &&
          pNum <= last.periods[last.periods.length - 1] + 1;

        if (canMerge) {
          if (!last.periods.includes(pNum)) last.periods.push(pNum);
        } else {
          sessionBlocks.push({
            className: s.className || '-',
            department: itemDept,
            subjectCode: s.subjectCode || 'MPL',
            subjectName: s.subjectName || 'Mata Pelajaran',
            roomName: s.roomName || 'Kelas',
            weekType: itemWeek,
            periods: [pNum],
          });
        }
      });

      for (const block of sessionBlocks) {
        if (
          filterDept &&
          filterDept !== 'all' &&
          !areDepartmentsEquivalent(block.department, filterDept)
        ) {
          continue;
        }

        const startP = block.periods[0] || 1;
        const endP = block.periods[block.periods.length - 1] || startP;
        const startT = PERIOD_TIMES.find((p) => p.period === startP)?.start || '06:45';
        const endT = PERIOD_TIMES.find((p) => p.period === endP)?.end || '13:00';

        const sessionObj: MissingJournalSession = {
          date: dateISO,
          dayName: NUM_TO_DAY_NAME[dow] || 'Senin',
          className: block.className,
          department: block.department,
          subjectCode: block.subjectCode,
          subjectName: block.subjectName,
          startPeriod: startP,
          endPeriod: endP,
          timeRange: `${startT} - ${endT} WIB`,
          roomName: block.roomName,
          weekType: block.weekType,
        };

        expectedSessions++;
        const isCovered = dayJournals.some((j) => doesJournalCoverSession(j, sessionObj));
        if (isCovered) {
          filledSessions++;
        } else {
          missingDetails.push(sessionObj);
        }
      }
    }

    const missingSessions = Math.max(0, expectedSessions - filledSessions);
    const journalsSubmitted = submittedDetails.length;

    let status: TeacherComplianceStatus;
    if (expectedSessions > 0) {
      if (missingSessions === 0) status = 'lengkap';
      else if (filledSessions > 0) status = 'sebagian';
      else status = 'belum_mengisi';
    } else if (journalsSubmitted > 0) {
      status = 'non_jadwal';
    } else {
      status = 'tidak_ada_jadwal';
    }

    rows.push({
      teacherId: teacher.id,
      teacherCode: teacher.code,
      teacherName: teacher.name,
      nip: teacher.nip,
      title: teacher.title,
      departments: teacherDepts,
      expectedSessions,
      filledSessions,
      missingSessions,
      journalsSubmitted,
      missingDetails,
      submittedDetails,
      status,
    });
  }

  // Urutkan: belum mengisi terbanyak di atas, lalu sebagian, lalu tidak ada jadwal/lengkap
  const statusWeight: Record<TeacherComplianceStatus, number> = {
    belum_mengisi: 0,
    sebagian: 1,
    lengkap: 2,
    non_jadwal: 3,
    tidak_ada_jadwal: 4,
  };

  return rows.sort((a, b) => {
    const wa = statusWeight[a.status];
    const wb = statusWeight[b.status];
    if (wa !== wb) return wa - wb;
    if (b.missingSessions !== a.missingSessions) return b.missingSessions - a.missingSessions;
    return a.teacherName.localeCompare(b.teacherName);
  });
}
