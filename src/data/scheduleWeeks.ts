import { ScheduleWeekType } from '../types';

export interface WeekRotationInfo {
  id: ScheduleWeekType;
  code: string;
  name: string;
  shortName: string;
  k10Role: string;
  k11Role: string;
  description: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeIconBg: string;
  accentColor: string;
}

export const WEEK_ROTATION_DEFINITIONS: Record<ScheduleWeekType, WeekRotationInfo> = {
  P10_PROD_P11_NORM: {
    id: 'P10_PROD_P11_NORM',
    code: 'Pekan A',
    name: 'Pekan Kelas 10 Produktif dan Kelas 11 Normatif Adaptif',
    shortName: 'K10 Produktif · K11 NormAdaptif',
    k10Role: 'Produktif / Kejuruan (Bengkel & Lab)',
    k11Role: 'Normatif & Adaptif (Teori / Umum)',
    description: 'Rotasi mingguan di mana Kelas 10 belajar praktik kejuruan (Produktif) dan Kelas 11 belajar mata pelajaran umum (Normatif Adaptif).',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    badgeIconBg: 'bg-emerald-500',
    accentColor: 'emerald',
  },
  P10_NORM_P11_PROD: {
    id: 'P10_NORM_P11_PROD',
    code: 'Pekan B',
    name: 'Pekan Kelas 10 Normatif Adaptif dan Kelas 11 Produktif',
    shortName: 'K10 NormAdaptif · K11 Produktif',
    k10Role: 'Normatif & Adaptif (Teori / Umum)',
    k11Role: 'Produktif / Kejuruan (Bengkel & Lab)',
    description: 'Rotasi mingguan di mana Kelas 10 belajar mata pelajaran umum (Normatif Adaptif) dan Kelas 11 belajar praktik kejuruan (Produktif).',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-800',
    badgeIconBg: 'bg-indigo-500',
    accentColor: 'indigo',
  },
  ALL: {
    id: 'ALL',
    code: 'Semua Pekan',
    name: 'Berlaku Kedua Pekan (Rutin Tiap Minggu)',
    shortName: 'Semua Pekan (Rutin)',
    k10Role: 'Aktif Setiap Pekan',
    k11Role: 'Aktif Setiap Pekan',
    description: 'Jadwal yang selalu aktif di kedua pekan rotasi (misal upacara bendera, senam, istigosah, ekskul, dll).',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-700',
    badgeIconBg: 'bg-slate-400',
    accentColor: 'slate',
  },
};

/**
 * Mendapatkan jenis pekan rotasi berjalan secara real-time berdasarkan tanggal kalender laptop user
 */
export const getWeekRotationFromDate = (d: Date = new Date()): 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' => {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return weekNumber % 2 === 1 ? 'P10_PROD_P11_NORM' : 'P10_NORM_P11_PROD';
};

/**
 * Label lengkap pekan
 */
export const getWeekTypeLabel = (weekType?: ScheduleWeekType | string): string => {
  if (weekType === 'P10_PROD_P11_NORM') {
    return 'Pekan Kelas 10 Produktif dan Kelas 11 Normatif Adaptif';
  }
  if (weekType === 'P10_NORM_P11_PROD') {
    return 'Pekan Kelas 10 Normatif Adaptif dan Kelas 11 Produktif';
  }
  if (weekType === 'ALL') {
    return 'Berlaku Kedua Pekan (Rutin Tiap Minggu)';
  }
  return 'Semua Pekan';
};

/**
 * Label ringkas pekan untuk badge tabel & kartu
 */
export const getWeekTypeShortLabel = (weekType?: ScheduleWeekType | string): string => {
  if (weekType === 'P10_PROD_P11_NORM') {
    return 'K10 Produktif · K11 NormAdaptif';
  }
  if (weekType === 'P10_NORM_P11_PROD') {
    return 'K10 NormAdaptif · K11 Produktif';
  }
  if (weekType === 'ALL') {
    return 'Semua Pekan';
  }
  return 'Semua Pekan';
};

/**
 * Cek apakah jadwal cocok dengan pekan yang sedang aktif/difilter
 */
export const isScheduleMatchingWeek = (
  scheduleWeek: ScheduleWeekType | undefined,
  activeFilter: ScheduleWeekType | 'AUTO' | 'ALL',
  realtimeWeek: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD'
): boolean => {
  const target = activeFilter === 'AUTO' ? realtimeWeek : activeFilter;
  if (target === 'ALL') return true;

  // Jadwal yang diset 'ALL' atau belum diset berlaku di kedua pekan
  if (!scheduleWeek || scheduleWeek === 'ALL') return true;

  return scheduleWeek === target;
};
