import {
  ActiveWeekRotationType,
  Department,
  MonthlyWeekSchedulesMap,
  ScheduleItem,
  ScheduleWeekType,
  SchoolClass,
} from '../types';
import { areDepartmentsEquivalent, getDepartmentInfo, resolveDepartmentCode } from './departmentUtils';
import { getWeekBoundsFromISO, parseLocalISO } from './journalCompliance';
import {
  MATRIX_PERIODS,
  PRESET_KELAS_X,
  PRESET_KELAS_XI,
  PRESET_KELAS_XII,
  VOCATIONAL_PROGRAMS,
} from './monitoringMatrixPreset';
import {
  isScheduleMatchingWeek,
  resolveWeekRotationForDate,
  toLocalDateISO,
} from './scheduleWeeks';

export type EmptySlotStatus = 'kosong_semua' | 'ada_kosong' | 'lengkap';

export interface EmptySlotBlock {
  date: string; // YYYY-MM-DD
  dayName: string;
  startPeriod: number;
  endPeriod: number;
  periodCount: number;
  timeRange: string;
  reason: 'belum_terjadwal' | 'tanpa_guru';
}

export interface ClassEmptyScheduleRow {
  classId: string;
  className: string;
  grade: 10 | 11 | 12;
  programCode: string;
  programName: string;
  evaluatedDays: number;
  totalSlots: number;
  filledSlots: number;
  emptySlots: number;
  occupancyPercent: number;
  emptyBlocks: EmptySlotBlock[];
  status: EmptySlotStatus;
}

export interface EmptyScheduleAuditResult {
  evaluatedSchoolDates: string[];
  rows: ClassEmptyScheduleRow[];
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
};

function getScheduleDayNum(s: ScheduleItem): number {
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

function hasAssignedTeacher(s: ScheduleItem): boolean {
  const name = (s.teacherName || '').trim().toLowerCase();
  const code = (s.teacherCode || '').trim().toLowerCase();
  const id = (s.teacherId || '').trim().toLowerCase();
  if (!name && !code && !id) return false;
  if (name === '-' || name === 'kosong' || name === 'belum ada guru' || name === 'tba') {
    return false;
  }
  return true;
}

export function computeEmptyScheduleAudit(params: {
  evaluatedDates: string[];
  todayISO: string;
  classes: SchoolClass[];
  departments: Department[];
  schedules: ScheduleItem[];
  activeWeekFilter: ScheduleWeekType | 'AUTO' | 'ALL';
  monthlyWeekSchedules?: MonthlyWeekSchedulesMap;
  filterDept?: string;
  filterGrade?: 'ALL' | 10 | 11 | 12;
}): EmptyScheduleAuditResult {
  const {
    evaluatedDates,
    todayISO,
    classes,
    departments,
    schedules,
    activeWeekFilter,
    monthlyWeekSchedules,
    filterDept = 'all',
    filterGrade = 'ALL',
  } = params;

  // Hanya hari Senin-Jumat yang merupakan hari belajar KBM
  const evaluatedSchoolDates = evaluatedDates.filter((iso) => {
    const d = parseLocalISO(iso);
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    return dow >= 1 && dow <= 5;
  });

  // Rentang minggu berjalan (untuk sinkronisasi activeWeekFilter override dari Admin)
  const currentWeekDates = new Set(getWeekBoundsFromISO(todayISO).dates);
  const todayObj = parseLocalISO(todayISO);
  const todayDow = todayObj.getDay() === 0 ? 7 : todayObj.getDay();
  const monday = new Date(
    todayObj.getFullYear(),
    todayObj.getMonth(),
    todayObj.getDate() - (todayDow - 1)
  );
  for (let i = 5; i < 7; i++) {
    currentWeekDates.add(
      toLocalDateISO(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
    );
  }

  // Daftar kelas target: prioritaskan Data Master Kelas, fallback ke preset jika Data Master kosong
  const fallbackCodes = VOCATIONAL_PROGRAMS.map((p) => p.code);
  const rawClassList: Array<{
    id: string;
    name: string;
    grade: 10 | 11 | 12;
    programCode: string;
    programName: string;
  }> =
    classes.length > 0
      ? classes.map((c) => {
          const gradeNum: 10 | 11 | 12 =
            c.grade === 11 ? 11 : c.grade === 12 ? 12 : 10;
          const progCode = resolveDepartmentCode(
            c.department,
            c.name,
            departments,
            fallbackCodes
          );
          const deptInfo = getDepartmentInfo(progCode, departments);
          const presetProg = VOCATIONAL_PROGRAMS.find((p) =>
            areDepartmentsEquivalent(p.code, progCode)
          );
          return {
            id: c.id,
            name: c.name,
            grade: gradeNum,
            programCode: progCode,
            programName: deptInfo?.name || presetProg?.name || `Program ${progCode}`,
          };
        })
      : [...PRESET_KELAS_X, ...PRESET_KELAS_XI, ...PRESET_KELAS_XII].map((b) => {
          const progCode = resolveDepartmentCode(
            b.programCode,
            b.className,
            departments,
            fallbackCodes
          );
          const deptInfo = getDepartmentInfo(progCode, departments);
          return {
            id: b.id,
            name: b.className,
            grade: b.grade,
            programCode: progCode,
            programName: deptInfo?.name || b.programName,
          };
        });

  const targetClasses = rawClassList.filter((cls) => {
    if (filterGrade !== 'ALL' && cls.grade !== filterGrade) return false;
    if (
      filterDept &&
      filterDept !== 'all' &&
      !areDepartmentsEquivalent(cls.programCode, filterDept)
    ) {
      return false;
    }
    return true;
  });

  const rows: ClassEmptyScheduleRow[] = [];

  for (const cls of targetClasses) {
    const classSchedules = schedules.filter(
      (s) =>
        s.classId === cls.id ||
        (s.className || '').trim().toUpperCase() === cls.name.trim().toUpperCase()
    );

    let totalSlots = 0;
    let filledSlots = 0;
    let emptySlots = 0;
    const emptyBlocks: EmptySlotBlock[] = [];

    for (const dateISO of evaluatedSchoolDates) {
      const dateObj = parseLocalISO(dateISO);
      const dow = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
      if (dow < 1 || dow > 5) continue;

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

      const daySchedules = classSchedules.filter((s) => {
        if (getScheduleDayNum(s) !== dow) return false;
        if (activeWeekFilter === 'ALL' && currentWeekDates.has(dateISO)) return true;
        return isScheduleMatchingWeek(s.weekType, targetWeek, targetWeek);
      });

      const dayEmptyPeriods: Array<{
        period: number;
        reason: 'belum_terjadwal' | 'tanpa_guru';
      }> = [];

      for (const p of MATRIX_PERIODS) {
        totalSlots++;
        const matching = daySchedules.filter(
          (s) => getSchedulePeriodNum(s) === p.index
        );

        if (matching.length === 0) {
          emptySlots++;
          dayEmptyPeriods.push({ period: p.index, reason: 'belum_terjadwal' });
        } else if (!matching.some((m) => hasAssignedTeacher(m))) {
          emptySlots++;
          dayEmptyPeriods.push({ period: p.index, reason: 'tanpa_guru' });
        } else {
          filledSlots++;
        }
      }

      // Gabungkan jam kosong yang berurutan pada tanggal dan alasan yang sama
      for (const ep of dayEmptyPeriods) {
        const last = emptyBlocks[emptyBlocks.length - 1];
        const canMerge =
          last &&
          last.date === dateISO &&
          last.reason === ep.reason &&
          ep.period === last.endPeriod + 1;

        if (canMerge) {
          last.endPeriod = ep.period;
          last.periodCount += 1;
          const startRange =
            MATRIX_PERIODS.find((mp) => mp.index === last.startPeriod)?.range.split(' - ')[0] ||
            '06:45';
          const endRange =
            MATRIX_PERIODS.find((mp) => mp.index === last.endPeriod)?.range.split(' - ')[1] ||
            '14:45';
          last.timeRange = `${startRange} - ${endRange}`;
        } else {
          const rangeStr =
            MATRIX_PERIODS.find((mp) => mp.index === ep.period)?.range || '06:45 - 07:20';
          emptyBlocks.push({
            date: dateISO,
            dayName: NUM_TO_DAY_NAME[dow] || 'Senin',
            startPeriod: ep.period,
            endPeriod: ep.period,
            periodCount: 1,
            timeRange: rangeStr,
            reason: ep.reason,
          });
        }
      }
    }

    const occupancyPercent =
      totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    let status: EmptySlotStatus;
    if (emptySlots === 0 && totalSlots > 0) {
      status = 'lengkap';
    } else if (filledSlots === 0 && totalSlots > 0) {
      status = 'kosong_semua';
    } else {
      status = 'ada_kosong';
    }

    rows.push({
      classId: cls.id,
      className: cls.name,
      grade: cls.grade,
      programCode: cls.programCode,
      programName: cls.programName,
      evaluatedDays: evaluatedSchoolDates.length,
      totalSlots,
      filledSlots,
      emptySlots,
      occupancyPercent,
      emptyBlocks,
      status,
    });
  }

  // Urutkan: jumlah jam kosong terbanyak di atas, lalu tingkat & nama kelas
  rows.sort((a, b) => {
    if (b.emptySlots !== a.emptySlots) return b.emptySlots - a.emptySlots;
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.className.localeCompare(b.className);
  });

  return {
    evaluatedSchoolDates,
    rows,
  };
}
