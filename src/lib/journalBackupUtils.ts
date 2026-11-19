import * as XLSX from 'xlsx';
import { TeachingJournal } from '../types';

export type JournalBackupPeriodType = 'harian' | 'mingguan' | 'bulanan';

export interface JournalBackupPeriodRange {
  periodType: JournalBackupPeriodType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  shortLabel: string;
  fileSlug: string;
}

export interface JournalBackupBuildMeta {
  periodRange: JournalBackupPeriodRange;
  backedUpBy: string;
  backedUpAt: number;
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const INDO_MONTHS = [
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
] as const;

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeJournalDateISO(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const check = new Date(y, m - 1, day);
    if (check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === day) {
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  // DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    const check = new Date(y, m - 1, day);
    if (check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === day) {
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

export function parseISODateLocal(iso: string): Date | null {
  const norm = normalizeJournalDateISO(iso);
  if (!norm) return null;
  const [y, m, d] = norm.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatIndoDateLong(iso: string): string {
  const d = parseISODateLocal(iso);
  if (!d) return iso;
  return `${INDO_DAYS[d.getDay()]}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatIndoDateMedium(iso: string): string {
  const d = parseISODateLocal(iso);
  if (!d) return iso;
  return `${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getPeriodDateRange(
  periodType: JournalBackupPeriodType,
  anchorValue: string
): JournalBackupPeriodRange {
  const fallbackToday = toLocalISODate(new Date());

  if (periodType === 'harian') {
    const iso = normalizeJournalDateISO(anchorValue) || fallbackToday;
    return {
      periodType: 'harian',
      startDate: iso,
      endDate: iso,
      label: `Harian (${formatIndoDateLong(iso)})`,
      shortLabel: formatIndoDateMedium(iso),
      fileSlug: `Harian_${iso}`,
    };
  }

  if (periodType === 'mingguan') {
    const anchorIso = normalizeJournalDateISO(anchorValue) || fallbackToday;
    const d = parseISODateLocal(anchorIso) || new Date();
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // 1 = Senin .. 7 = Minggu
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const startDate = toLocalISODate(monday);
    const endDate = toLocalISODate(sunday);
    return {
      periodType: 'mingguan',
      startDate,
      endDate,
      label: `Mingguan (${formatIndoDateMedium(startDate)} s/d ${formatIndoDateMedium(endDate)})`,
      shortLabel: `${formatIndoDateMedium(startDate)} – ${formatIndoDateMedium(endDate)}`,
      fileSlug: `Mingguan_${startDate}_sd_${endDate}`,
    };
  }

  // Bulanan: anchorValue berbentuk YYYY-MM (atau YYYY-MM-DD)
  const monthMatch = /^(\d{4})-(\d{1,2})/.exec((anchorValue || '').trim());
  const now = new Date();
  const year = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
  const month =
    monthMatch && Number(monthMatch[2]) >= 1 && Number(monthMatch[2]) <= 12
      ? Number(monthMatch[2])
      : now.getMonth() + 1;

  const paddedMonth = String(month).padStart(2, '0');
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${paddedMonth}-01`;
  const endDate = `${year}-${paddedMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const monthName = INDO_MONTHS[month - 1] || paddedMonth;

  return {
    periodType: 'bulanan',
    startDate,
    endDate,
    label: `Bulanan (${monthName} ${year})`,
    shortLabel: `${monthName} ${year}`,
    fileSlug: `Bulanan_${year}-${paddedMonth}`,
  };
}

export function filterJournalsByPeriod(
  journals: TeachingJournal[],
  periodType: JournalBackupPeriodType,
  anchorValue: string
): { range: JournalBackupPeriodRange; matched: TeachingJournal[] } {
  const range = getPeriodDateRange(periodType, anchorValue);
  const matched = journals
    .filter((j) => {
      const iso = normalizeJournalDateISO(j.date);
      if (!iso) return false;
      return iso >= range.startDate && iso <= range.endDate;
    })
    .sort((a, b) => {
      const da = normalizeJournalDateISO(a.date) || a.date || '';
      const db = normalizeJournalDateISO(b.date) || b.date || '';
      if (da !== db) return da.localeCompare(db);
      const pa = Number(a.startPeriod) || 0;
      const pb = Number(b.startPeriod) || 0;
      if (pa !== pb) return pa - pb;
      return (a.teacherName || '').localeCompare(b.teacherName || '');
    });

  return { range, matched };
}

export function buildJournalBackupWorkbookArrayBuffer(
  journals: TeachingJournal[],
  meta: JournalBackupBuildMeta
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const rows = journals.map((j, idx) => {
    const iso = normalizeJournalDateISO(j.date) || j.date;
    const dObj = parseISODateLocal(iso);
    const dayLabel = dObj ? INDO_DAYS[dObj.getDay()] : '-';
    return {
      No: idx + 1,
      Tanggal: iso,
      Hari: dayLabel,
      'Jam Ke':
        j.endPeriod && j.endPeriod !== j.startPeriod
          ? `${j.startPeriod} s/d ${j.endPeriod}`
          : `${j.startPeriod}`,
      Waktu: j.timeRange || '-',
      'Kode Guru': j.teacherCode || '-',
      'Nama Guru': j.teacherName,
      Kelas: j.className,
      Ruang: j.roomName,
      'Kode Mapel': j.subjectCode,
      'Mata Pelajaran': j.subjectName,
      'Materi Pembelajaran': j.topic,
      Catatan: j.notes || '-',
      'ID Jurnal': j.id,
    };
  });

  const journalSheet = XLSX.utils.json_to_sheet(rows);
  journalSheet['!cols'] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
    { wch: 45 },
    { wch: 28 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, journalSheet, 'Jurnal Mengajar');

  const summaryRows = [
    { Keterangan: 'Aplikasi', Nilai: 'SIMPATI SMKN 1 Tegalsari' },
    { Keterangan: 'Jenis Backup', Nilai: 'Arsip Jurnal Mengajar ke Google Drive' },
    { Keterangan: 'Periode', Nilai: meta.periodRange.label },
    { Keterangan: 'Rentang Tanggal', Nilai: `${meta.periodRange.startDate} s/d ${meta.periodRange.endDate}` },
    { Keterangan: 'Total Jurnal Terarsip', Nilai: String(journals.length) },
    {
      Keterangan: 'Jumlah Guru Tercatat',
      Nilai: String(new Set(journals.map((j) => j.teacherId || j.teacherName)).size),
    },
    {
      Keterangan: 'Jumlah Kelas Tercatat',
      Nilai: String(new Set(journals.map((j) => j.className)).size),
    },
    { Keterangan: 'Diarsipkan Oleh', Nilai: meta.backedUpBy },
    {
      Keterangan: 'Waktu Backup',
      Nilai: new Date(meta.backedUpAt).toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }),
    },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Info Backup');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function buildJournalBackupJsonString(
  journals: TeachingJournal[],
  meta: JournalBackupBuildMeta
): string {
  return JSON.stringify(
    {
      app: 'SIMPATI SMKN 1 Tegalsari',
      exportType: 'jurnal_mengajar_backup',
      version: 1,
      periodType: meta.periodRange.periodType,
      periodLabel: meta.periodRange.label,
      startDate: meta.periodRange.startDate,
      endDate: meta.periodRange.endDate,
      backedUpAt: meta.backedUpAt,
      backedUpAtIso: new Date(meta.backedUpAt).toISOString(),
      backedUpBy: meta.backedUpBy,
      count: journals.length,
      journals,
    },
    null,
    2
  );
}
