import { ActiveWeekRotationType, MonthlyWeekEntry, MonthlyWeekSchedulesMap, ScheduleWeekType } from '../types';

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
    name: 'Pekan 10 Produktif 11 Normada',
    shortName: '10 Prod · 11 Normada',
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
    name: 'Pekan 10 Normada 11 Produktif',
    shortName: '10 Normada · 11 Prod',
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
    return 'Pekan 10 Produktif 11 Normada';
  }
  if (weekType === 'P10_NORM_P11_PROD') {
    return 'Pekan 10 Normada 11 Produktif';
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
    return '10 Prod · 11 Normada';
  }
  if (weekType === 'P10_NORM_P11_PROD') {
    return '10 Normada · 11 Prod';
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

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toLocalDateISO = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Menghasilkan daftar pekan (Pekan Pertama s/d Pekan Terakhir) pada bulan kalender tertentu (YYYY-MM).
 */
export const getMonthWeeks = (
  year: number,
  monthIndex0: number,
  existingEntries?: MonthlyWeekEntry[]
): MonthlyWeekEntry[] => {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const rawChunks: Array<{ startDay: number; endDay: number }> = [];

  let day = 1;
  while (day <= daysInMonth) {
    const startDay = day;
    let endDay = day;
    while (endDay < daysInMonth && new Date(year, monthIndex0, endDay).getDay() !== 0) {
      endDay++;
    }
    rawChunks.push({ startDay, endDay });
    day = endDay + 1;
  }

  // Jika hari ke-1 adalah hari Minggu saja, gabungkan dengan pekan sekolah pertama agar setiap pekan memiliki hari sekolah efektif
  if (
    rawChunks.length > 1 &&
    rawChunks[0].startDay === 1 &&
    rawChunks[0].endDay === 1 &&
    new Date(year, monthIndex0, 1).getDay() === 0
  ) {
    rawChunks[1].startDay = 1;
    rawChunks.shift();
  }

  return rawChunks.map((chunk, idx) => {
    const weekNumber = idx + 1;
    const startDate = `${year}-${pad2(monthIndex0 + 1)}-${pad2(chunk.startDay)}`;
    const endDate = `${year}-${pad2(monthIndex0 + 1)}-${pad2(chunk.endDay)}`;
    const existing = existingEntries?.find((e) => e.weekNumber === weekNumber);
    const midDate = new Date(year, monthIndex0, Math.min(chunk.startDay + 1, chunk.endDay));
    const defaultType: ActiveWeekRotationType = getWeekRotationFromDate(midDate);

    let label = `Pekan ${weekNumber}`;
    if (idx === 0) label = `Pekan 1 (Minggu Pertama)`;
    else if (idx === rawChunks.length - 1) label = `Pekan ${weekNumber} (Pekan Terakhir)`;

    return {
      weekNumber,
      label,
      startDate,
      endDate,
      weekType: existing?.weekType || defaultType,
    };
  });
};

/**
 * Menentukan jenis pekan aktif untuk tanggal tertentu dengan memprioritaskan Jadwal Pekan Bulanan dari Admin,
 * lalu fallback ke rotasi kalender otomatis.
 */
export const resolveWeekRotationForDate = (
  d: Date = new Date(),
  monthlyWeekSchedules?: MonthlyWeekSchedulesMap
): ActiveWeekRotationType => {
  if (monthlyWeekSchedules) {
    const iso = toLocalDateISO(d);
    const monthKey = iso.slice(0, 7);
    const monthPlan = monthlyWeekSchedules[monthKey];
    if (Array.isArray(monthPlan) && monthPlan.length > 0) {
      const matched = monthPlan.find((w) => w.startDate <= iso && iso <= w.endDate);
      if (matched && (matched.weekType === 'P10_PROD_P11_NORM' || matched.weekType === 'P10_NORM_P11_PROD')) {
        return matched.weekType;
      }
    }
  }
  return getWeekRotationFromDate(d);
};

