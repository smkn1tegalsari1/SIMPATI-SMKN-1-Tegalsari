import { ScheduleItem, ScheduleWeekType, Teacher } from '../types';
import { getWeekTypeLabel, getWeekTypeShortLabel } from './scheduleWeeks';

export type ConflictType =
  | 'other_teacher_class'
  | 'own_same_class'
  | 'own_other_class'
  | 'room_conflict';

export interface ScheduleConflictEntry {
  period: number;
  type: ConflictType;
  title: string;
  message: string;
  conflictingItem: ScheduleItem;
  weekLabel: string;
}

export interface ClassPeriodSlotInfo {
  period: number;
  schedule: ScheduleItem | null;
  isOwn: boolean;
}

export interface AlternateWeekAvailability {
  weekType: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD';
  label: string;
  shortLabel: string;
  totalTargetPeriods: number;
  classFreeCount: number;
  isClassCompletelyFree: boolean;
  hasOtherTeacherClassConflict: boolean;
  hasTeacherOrRoomConflict: boolean;
  occupiedDetails: string[];
}

export interface ScheduleConflictAnalysis {
  conflicts: ScheduleConflictEntry[];
  hasOtherTeacherClassConflict: boolean;
  hasOwnSameClassConflict: boolean;
  hasOwnOtherClassConflict: boolean;
  hasRoomConflict: boolean;
  ownSameClassScheduleIds: string[];
  otherWeekAvailability: AlternateWeekAvailability | null;
  classPeriodMap: ClassPeriodSlotInfo[];
  weekFillCounts: {
    P10_PROD_P11_NORM: number;
    P10_NORM_P11_PROD: number;
  };
}

const DAY_NUM_TO_NAME: Record<number, string> = {
  1: 'SENIN',
  2: 'SELASA',
  3: 'RABU',
  4: 'KAMIS',
  5: 'JUMAT',
  6: 'SABTU',
  7: 'MINGGU',
};

export function normalizeScheduleDayName(item: Pick<ScheduleItem, 'dayName' | 'dayOfWeek'>): string {
  const raw = (item.dayName || '').trim().toUpperCase();
  if (raw) return raw;
  if (typeof item.dayOfWeek === 'number' && DAY_NUM_TO_NAME[item.dayOfWeek]) {
    return DAY_NUM_TO_NAME[item.dayOfWeek];
  }
  return 'SENIN';
}

export function normalizeSchedulePeriod(item: Pick<ScheduleItem, 'periodIndex'>): number {
  if (typeof item.periodIndex === 'number' && !isNaN(item.periodIndex)) {
    return item.periodIndex;
  }
  const parsed = parseInt(String(item.periodIndex), 10);
  return isNaN(parsed) ? 1 : parsed;
}

export function isSameTeacherSchedule(
  item: Pick<ScheduleItem, 'teacherId' | 'teacherCode' | 'teacherName'>,
  teacher: Pick<Teacher, 'id' | 'code' | 'name'>
): boolean {
  if (teacher.id && item.teacherId && item.teacherId === teacher.id) {
    return true;
  }
  const tCode = (teacher.code || '').trim().toUpperCase();
  const sCode = (item.teacherCode || '').trim().toUpperCase();
  if (tCode && sCode && tCode === sCode) {
    return true;
  }
  const tName = (teacher.name || '').trim().toLowerCase();
  const sName = (item.teacherName || '').trim().toLowerCase();
  if (tName && sName && tName === sName) {
    return true;
  }
  return false;
}

export function isSameClassSchedule(
  item: Pick<ScheduleItem, 'classId' | 'className'>,
  targetClassId: string,
  targetClassName: string
): boolean {
  if (targetClassId && item.classId && item.classId === targetClassId) {
    return true;
  }
  const targetNorm = (targetClassName || '').trim().toUpperCase();
  const itemNorm = (item.className || '').trim().toUpperCase();
  return Boolean(targetNorm && itemNorm && targetNorm === itemNorm);
}

export function isSameRoomSchedule(
  item: Pick<ScheduleItem, 'roomName'>,
  targetRoomName: string
): boolean {
  const targetNorm = (targetRoomName || '').trim().toUpperCase();
  const itemNorm = (item.roomName || '').trim().toUpperCase();
  return Boolean(targetNorm && itemNorm && targetNorm === itemNorm);
}

export function doScheduleWeeksOverlap(
  w1: ScheduleWeekType | string | undefined,
  w2: ScheduleWeekType | string | undefined
): boolean {
  const norm1 = w1 || 'ALL';
  const norm2 = w2 || 'ALL';
  return norm1 === 'ALL' || norm2 === 'ALL' || norm1 === norm2;
}

export function analyzeScheduleConflicts(params: {
  allSchedules: ScheduleItem[];
  editingSchedule?: ScheduleItem | null;
  dayName: string;
  targetPeriods: number[];
  weekType: ScheduleWeekType;
  classId: string;
  className: string;
  targetRoomName: string;
  teacher: Pick<Teacher, 'id' | 'code' | 'name'>;
}): ScheduleConflictAnalysis {
  const {
    allSchedules,
    editingSchedule,
    dayName,
    targetPeriods,
    weekType,
    classId,
    className,
    targetRoomName,
    teacher,
  } = params;

  const dayUpper = (dayName || 'SENIN').trim().toUpperCase();
  const conflicts: ScheduleConflictEntry[] = [];
  const ownSameClassIdSet = new Set<string>();

  for (const periodNum of targetPeriods) {
    for (const s of allSchedules) {
      if (editingSchedule && s.id === editingSchedule.id) continue;
      if (normalizeScheduleDayName(s) !== dayUpper) continue;
      if (normalizeSchedulePeriod(s) !== periodNum) continue;
      if (!doScheduleWeeksOverlap(weekType, s.weekType)) continue;

      const sameClass = Boolean(classId || className) && isSameClassSchedule(s, classId, className);
      const sameRoom = isSameRoomSchedule(s, targetRoomName);
      const ownTeacher = isSameTeacherSchedule(s, teacher);
      const weekLabel = getWeekTypeShortLabel(s.weekType);

      if (sameClass) {
        if (ownTeacher) {
          if (s.id) ownSameClassIdSet.add(s.id);
          conflicts.push({
            period: periodNum,
            type: 'own_same_class',
            title: `Jam Ke-${periodNum} · Sudah Terjadwal oleh Anda (${s.className})`,
            message: `Anda sendiri sudah menjadwalkan "${s.subjectName}" di kelas ${s.className} (Ruang ${s.roomName || '-'}) pada ${weekLabel}.`,
            conflictingItem: s,
            weekLabel,
          });
        } else {
          conflicts.push({
            period: periodNum,
            type: 'other_teacher_class',
            title: `Bentrok Jam Ke-${periodNum} · Kelas ${s.className}`,
            message: `Kelas ini sudah terjadwal "${s.subjectName}" bersama ${s.teacherName} pada ${weekLabel}.`,
            conflictingItem: s,
            weekLabel,
          });
        }
        // Jangan gandakan laporan ruang/guru untuk entri kelas yang sama persis
        continue;
      }

      if (ownTeacher) {
        conflicts.push({
          period: periodNum,
          type: 'own_other_class',
          title: `Bentrok Jam Ke-${periodNum} · Jadwal Anda di Kelas Lain`,
          message: `Pada jam ini Anda sudah terjadwal mengajar kelas ${s.className} (${s.subjectName} · Ruang ${s.roomName || '-'}) pada ${weekLabel}.`,
          conflictingItem: s,
          weekLabel,
        });
      }

      if (sameRoom) {
        conflicts.push({
          period: periodNum,
          type: 'room_conflict',
          title: `Bentrok Jam Ke-${periodNum} · Ruang ${s.roomName}`,
          message: `Ruangan ini sedang digunakan kelas ${s.className} (${s.subjectName} - ${s.teacherName}) pada ${weekLabel}.`,
          conflictingItem: s,
          weekLabel,
        });
      }
    }
  }

  // Hitung peta jam 1..11 untuk kelas & hari & pekan yang sedang dipilih
  const classPeriodMap: ClassPeriodSlotInfo[] = [];
  for (let p = 1; p <= 11; p++) {
    const matched =
      allSchedules.find((s) => {
        if (editingSchedule && s.id === editingSchedule.id) return false;
        if (normalizeScheduleDayName(s) !== dayUpper) return false;
        if (normalizeSchedulePeriod(s) !== p) return false;
        if (!doScheduleWeeksOverlap(weekType, s.weekType)) return false;
        return Boolean(classId || className) && isSameClassSchedule(s, classId, className);
      }) || null;

    classPeriodMap.push({
      period: p,
      schedule: matched,
      isOwn: matched ? isSameTeacherSchedule(matched, teacher) : false,
    });
  }

  // Hitung jumlah jam terisi di kedua pekan rotasi untuk kelas & hari terpilih
  let p10ProdCount = 0;
  let p10NormCount = 0;
  for (let p = 1; p <= 11; p++) {
    const hasP10Prod = allSchedules.some(
      (s) =>
        (!editingSchedule || s.id !== editingSchedule.id) &&
        normalizeScheduleDayName(s) === dayUpper &&
        normalizeSchedulePeriod(s) === p &&
        doScheduleWeeksOverlap('P10_PROD_P11_NORM', s.weekType) &&
        Boolean(classId || className) &&
        isSameClassSchedule(s, classId, className)
    );
    const hasP10Norm = allSchedules.some(
      (s) =>
        (!editingSchedule || s.id !== editingSchedule.id) &&
        normalizeScheduleDayName(s) === dayUpper &&
        normalizeSchedulePeriod(s) === p &&
        doScheduleWeeksOverlap('P10_NORM_P11_PROD', s.weekType) &&
        Boolean(classId || className) &&
        isSameClassSchedule(s, classId, className)
    );
    if (hasP10Prod) p10ProdCount++;
    if (hasP10Norm) p10NormCount++;
  }

  // Cek ketersediaan rotasi pekan pasangannya untuk rentang jam yang sama
  let otherWeekAvailability: AlternateWeekAvailability | null = null;
  if (weekType === 'P10_PROD_P11_NORM' || weekType === 'P10_NORM_P11_PROD') {
    const altWeek: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' =
      weekType === 'P10_PROD_P11_NORM' ? 'P10_NORM_P11_PROD' : 'P10_PROD_P11_NORM';

    let classFreeCount = 0;
    let altOtherTeacherClassConflict = false;
    let altTeacherOrRoomConflict = false;
    const occupiedDetails: string[] = [];

    for (const periodNum of targetPeriods) {
      const matchingAlt = allSchedules.filter(
        (s) =>
          (!editingSchedule || s.id !== editingSchedule.id) &&
          normalizeScheduleDayName(s) === dayUpper &&
          normalizeSchedulePeriod(s) === periodNum &&
          doScheduleWeeksOverlap(altWeek, s.weekType)
      );

      const classMatch = matchingAlt.find(
        (s) => Boolean(classId || className) && isSameClassSchedule(s, classId, className)
      );

      if (!classMatch) {
        classFreeCount++;
      } else {
        if (!isSameTeacherSchedule(classMatch, teacher)) {
          altOtherTeacherClassConflict = true;
        }
        occupiedDetails.push(
          `Jam ${periodNum}: ${classMatch.subjectName} (${classMatch.teacherName})`
        );
      }

      const teacherOrRoomConflict = matchingAlt.some(
        (s) =>
          (!isSameClassSchedule(s, classId, className) &&
            (isSameTeacherSchedule(s, teacher) || isSameRoomSchedule(s, targetRoomName)))
      );
      if (teacherOrRoomConflict) {
        altTeacherOrRoomConflict = true;
      }
    }

    otherWeekAvailability = {
      weekType: altWeek,
      label: getWeekTypeLabel(altWeek),
      shortLabel: getWeekTypeShortLabel(altWeek),
      totalTargetPeriods: targetPeriods.length,
      classFreeCount,
      isClassCompletelyFree:
        classFreeCount === targetPeriods.length && !altTeacherOrRoomConflict,
      hasOtherTeacherClassConflict: altOtherTeacherClassConflict,
      hasTeacherOrRoomConflict: altTeacherOrRoomConflict,
      occupiedDetails,
    };
  }

  return {
    conflicts,
    hasOtherTeacherClassConflict: conflicts.some((c) => c.type === 'other_teacher_class'),
    hasOwnSameClassConflict: conflicts.some((c) => c.type === 'own_same_class'),
    hasOwnOtherClassConflict: conflicts.some((c) => c.type === 'own_other_class'),
    hasRoomConflict: conflicts.some((c) => c.type === 'room_conflict'),
    ownSameClassScheduleIds: Array.from(ownSameClassIdSet),
    otherWeekAvailability,
    classPeriodMap,
    weekFillCounts: {
      P10_PROD_P11_NORM: p10ProdCount,
      P10_NORM_P11_PROD: p10NormCount,
    },
  };
}
