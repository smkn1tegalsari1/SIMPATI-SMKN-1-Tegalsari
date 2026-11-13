import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  Building,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  XCircle,
  X,
  CalendarX2,
  GraduationCap,
} from 'lucide-react';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';
import { areDepartmentsEquivalent, resolveDepartmentCode } from '../../data/departmentUtils';
import { toLocalDateISO } from '../../data/scheduleWeeks';
import {
  computeTeacherJournalCompliance,
  formatIndonesianShortDate,
  getPeriodDateRange,
  JournalReportGranularity,
  parseLocalISO,
  TeacherComplianceStatus,
} from '../../data/journalCompliance';
import {
  computeEmptyScheduleAudit,
  EmptySlotStatus,
} from '../../data/emptyScheduleAudit';
import {
  buildComplianceBeritaAcaraPdf,
  buildEmptyScheduleBeritaAcaraPdf,
  buildScheduleBeritaAcaraPdf,
  downloadGeneratedPdf,
  GeneratedPdfResult,
} from '../../data/beritaAcaraPdf';

type ReportTab = 'jadwal' | 'kepatuhan_jurnal' | 'jadwal_kosong';
type ComplianceStatusFilter = 'NEED_ACTION' | 'BELUM' | 'SEBAGIAN' | 'LENGKAP' | 'ALL';
type EmptyStatusFilter = 'HAS_EMPTY' | 'KOSONG_SEMUA' | 'LENGKAP' | 'ALL';

const shiftDateISO = (iso: string, deltaDays: number): string => {
  const d = parseLocalISO(iso);
  return toLocalDateISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays));
};

const shiftMonthKey = (monthKey: string, deltaMonths: number): string => {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || new Date().getMonth() + 1;
  const shifted = new Date(y, m - 1 + deltaMonths, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

export const LaporanView: React.FC = () => {
  const {
    schedules,
    journals,
    currentDateString,
    currentTimeString,
    currentDateOnlyString,
    semesterString,
    effectiveWeekType,
    activeWeekFilter,
    monthlyWeekSchedules,
    teachers,
    departments,
    classes,
    getScheduleStatus,
  } = useApp();

  const todayISO = useMemo(() => toLocalDateISO(new Date()), []);

  // Sub-menu utama laporan
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('jadwal');

  // State Tab 1: Rekapitulasi Jadwal KBM
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');

  // State Tab 2: Audit Guru Belum Mengisi Jurnal (Per Hari / Per Minggu / Per Bulan)
  const [granularity, setGranularity] = useState<JournalReportGranularity>('daily');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);
  const [selectedWeekAnchorISO, setSelectedWeekAnchorISO] = useState<string>(todayISO);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(todayISO.slice(0, 7));
  const [upToTodayOnly, setUpToTodayOnly] = useState<boolean>(true);
  const [complianceDeptFilter, setComplianceDeptFilter] = useState<string>('all');
  const [complianceStatusFilter, setComplianceStatusFilter] = useState<ComplianceStatusFilter>('NEED_ACTION');
  const [complianceSearch, setComplianceSearch] = useState<string>('');
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Record<string, boolean>>({});

  // State Tab 3: Audit Jadwal Kosong / Belum Diisi Guru (Per Hari / Per Minggu / Per Bulan)
  const [emptyUpToTodayOnly, setEmptyUpToTodayOnly] = useState<boolean>(false);
  const [emptyDeptFilter, setEmptyDeptFilter] = useState<string>('all');
  const [emptyGradeFilter, setEmptyGradeFilter] = useState<'ALL' | 10 | 11 | 12>('ALL');
  const [emptyStatusFilter, setEmptyStatusFilter] = useState<EmptyStatusFilter>('HAS_EMPTY');
  const [emptySearch, setEmptySearch] = useState<string>('');
  const [expandedEmptyClassIds, setExpandedEmptyClassIds] = useState<Record<string, boolean>>({});

  const [generatedPdfModal, setGeneratedPdfModal] = useState<GeneratedPdfResult | null>(null);
  const [pdfFeedbackMessage, setPdfFeedbackMessage] = useState<string | null>(null);
  const [printFallbackHint, setPrintFallbackHint] = useState<string | null>(null);

  // Data Tab 1: Jadwal KBM
  const filteredSchedules = schedules.filter((s) => {
    if (filterWeek === 'ACTIVE') {
      const itemWeek = s.weekType || 'ALL';
      if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
    } else if (filterWeek !== 'ALL') {
      const itemWeek = s.weekType || 'ALL';
      if (itemWeek !== 'ALL' && itemWeek !== filterWeek) return false;
    }

    const cls = classes.find(
      (c) => c.id === s.classId || c.name?.trim().toUpperCase() === s.className?.trim().toUpperCase()
    );
    const itemDept = resolveDepartmentCode(
      cls?.department || s.department,
      cls?.name || s.className,
      departments
    );
    const matchDept = filterDept === 'all' || areDepartmentsEquivalent(itemDept, filterDept);

    const status = getScheduleStatus(s);
    const matchStatus = filterStatus === 'all' || status === filterStatus;

    return matchDept && matchStatus;
  });

  // Data Tab 2: Rentang tanggal & kalkulasi kepatuhan jurnal guru
  const periodRange = useMemo(
    () =>
      getPeriodDateRange({
        granularity,
        selectedDateISO,
        selectedWeekAnchorISO,
        selectedMonthKey,
        upToTodayOnly,
        todayISO,
      }),
    [granularity, selectedDateISO, selectedWeekAnchorISO, selectedMonthKey, upToTodayOnly, todayISO]
  );

  const complianceRows = useMemo(
    () =>
      computeTeacherJournalCompliance({
        evaluatedDates: periodRange.evaluatedDates,
        todayISO,
        teachers,
        schedules,
        journals,
        classes,
        departments,
        activeWeekFilter,
        monthlyWeekSchedules,
        filterDept: complianceDeptFilter,
      }),
    [
      periodRange.evaluatedDates,
      todayISO,
      teachers,
      schedules,
      journals,
      classes,
      departments,
      activeWeekFilter,
      monthlyWeekSchedules,
      complianceDeptFilter,
    ]
  );

  const complianceSummary = useMemo(() => {
    let scheduledTeachers = 0;
    let belumCount = 0;
    let sebagianCount = 0;
    let lengkapCount = 0;
    let totalMissingSessions = 0;

    complianceRows.forEach((r) => {
      if (r.expectedSessions > 0) scheduledTeachers++;
      if (r.status === 'belum_mengisi') belumCount++;
      else if (r.status === 'sebagian') sebagianCount++;
      else if (r.status === 'lengkap') lengkapCount++;
      totalMissingSessions += r.missingSessions;
    });

    return {
      totalTeachers: complianceRows.length,
      scheduledTeachers,
      belumCount,
      sebagianCount,
      needActionCount: belumCount + sebagianCount,
      lengkapCount,
      totalMissingSessions,
    };
  }, [complianceRows]);

  const filteredComplianceRows = useMemo(() => {
    return complianceRows.filter((row) => {
      if (complianceStatusFilter === 'NEED_ACTION') {
        if (row.status !== 'belum_mengisi' && row.status !== 'sebagian') return false;
      } else if (complianceStatusFilter === 'BELUM') {
        if (row.status !== 'belum_mengisi') return false;
      } else if (complianceStatusFilter === 'SEBAGIAN') {
        if (row.status !== 'sebagian') return false;
      } else if (complianceStatusFilter === 'LENGKAP') {
        if (row.status !== 'lengkap') return false;
      }

      if (complianceSearch.trim()) {
        const q = complianceSearch.toLowerCase().trim();
        const matchTeacher =
          row.teacherName.toLowerCase().includes(q) ||
          row.teacherCode.toLowerCase().includes(q) ||
          row.nip.toLowerCase().includes(q);
        const matchMissing = row.missingDetails.some(
          (m) =>
            m.className.toLowerCase().includes(q) ||
            m.subjectName.toLowerCase().includes(q) ||
            m.date.includes(q)
        );
        if (!matchTeacher && !matchMissing) return false;
      }
      return true;
    });
  }, [complianceRows, complianceStatusFilter, complianceSearch]);

  const toggleExpandTeacher = (teacherId: string) => {
    setExpandedTeacherIds((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };

  // Data Tab 3: Rentang & Kalkulasi Jadwal Kosong / Belum Diisi Guru
  const emptyPeriodRange = useMemo(
    () =>
      getPeriodDateRange({
        granularity,
        selectedDateISO,
        selectedWeekAnchorISO,
        selectedMonthKey,
        upToTodayOnly: emptyUpToTodayOnly,
        todayISO,
      }),
    [
      granularity,
      selectedDateISO,
      selectedWeekAnchorISO,
      selectedMonthKey,
      emptyUpToTodayOnly,
      todayISO,
    ]
  );

  const emptyAudit = useMemo(
    () =>
      computeEmptyScheduleAudit({
        evaluatedDates: emptyPeriodRange.evaluatedDates,
        todayISO,
        classes,
        departments,
        schedules,
        activeWeekFilter,
        monthlyWeekSchedules,
        filterDept: emptyDeptFilter,
        filterGrade: emptyGradeFilter,
      }),
    [
      emptyPeriodRange.evaluatedDates,
      todayISO,
      classes,
      departments,
      schedules,
      activeWeekFilter,
      monthlyWeekSchedules,
      emptyDeptFilter,
      emptyGradeFilter,
    ]
  );

  const emptySummary = useMemo(() => {
    let totalClasses = emptyAudit.rows.length;
    let kosongSemuaCount = 0;
    let adaKosongCount = 0;
    let lengkapCount = 0;
    let totalSlots = 0;
    let filledSlots = 0;
    let totalEmptySlots = 0;

    emptyAudit.rows.forEach((r) => {
      totalSlots += r.totalSlots;
      filledSlots += r.filledSlots;
      totalEmptySlots += r.emptySlots;
      if (r.status === 'kosong_semua') kosongSemuaCount++;
      else if (r.status === 'ada_kosong') adaKosongCount++;
      else if (r.status === 'lengkap') lengkapCount++;
    });

    const overallOccupancy =
      totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return {
      totalClasses,
      kosongSemuaCount,
      adaKosongCount,
      classesWithEmptyCount: kosongSemuaCount + adaKosongCount,
      lengkapCount,
      totalSlots,
      filledSlots,
      totalEmptySlots,
      overallOccupancy,
    };
  }, [emptyAudit.rows]);

  const filteredEmptyRows = useMemo(() => {
    return emptyAudit.rows.filter((row) => {
      if (emptyStatusFilter === 'HAS_EMPTY') {
        if (row.status !== 'kosong_semua' && row.status !== 'ada_kosong') return false;
      } else if (emptyStatusFilter === 'KOSONG_SEMUA') {
        if (row.status !== 'kosong_semua') return false;
      } else if (emptyStatusFilter === 'LENGKAP') {
        if (row.status !== 'lengkap') return false;
      }

      if (emptySearch.trim()) {
        const q = emptySearch.toLowerCase().trim();
        const matchClass =
          row.className.toLowerCase().includes(q) ||
          row.programCode.toLowerCase().includes(q) ||
          row.programName.toLowerCase().includes(q);
        const matchBlock = row.emptyBlocks.some(
          (b) =>
            b.dayName.toLowerCase().includes(q) ||
            b.date.includes(q) ||
            b.timeRange.toLowerCase().includes(q)
        );
        if (!matchClass && !matchBlock) return false;
      }
      return true;
    });
  }, [emptyAudit.rows, emptyStatusFilter, emptySearch]);

  const toggleExpandEmptyClass = (classId: string) => {
    setExpandedEmptyClassIds((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const handlePrint = () => {
    setPrintFallbackHint(null);
    let result: GeneratedPdfResult;

    if (activeReportTab === 'kepatuhan_jurnal') {
      const rotationText =
        activeWeekFilter === 'AUTO'
          ? 'Sesuai Jadwal Bulanan / Kalender'
          : effectiveWeekType === 'P10_PROD_P11_NORM'
          ? 'P10 Prod - P11 Norm (Dipaksa Admin)'
          : effectiveWeekType === 'P10_NORM_P11_PROD'
          ? 'P10 Norm - P11 Prod (Dipaksa Admin)'
          : 'Semua Pekan';

      const statusFilterMap: Record<ComplianceStatusFilter, string> = {
        NEED_ACTION: 'Belum / Sebagian Mengisi',
        BELUM: 'Belum Mengisi',
        SEBAGIAN: 'Sebagian Terisi',
        LENGKAP: 'Sudah Lengkap',
        ALL: 'Semua Guru',
      };

      result = buildComplianceBeritaAcaraPdf({
        rows: filteredComplianceRows,
        granularity,
        periodLabel: periodRange.periodLabel,
        evaluatedDatesCount: periodRange.evaluatedDates.length,
        semesterString,
        rotationLabel: rotationText,
        currentDateOnlyString,
        currentDateTimeLabel: `${currentDateOnlyString} ${currentTimeString}`,
        todayISO,
        needActionCount: complianceSummary.needActionCount,
        totalMissingSessions: complianceSummary.totalMissingSessions,
        statusFilterLabel: statusFilterMap[complianceStatusFilter],
      });
    } else if (activeReportTab === 'jadwal_kosong') {
      const rotationText =
        activeWeekFilter === 'AUTO'
          ? 'Sesuai Jadwal Bulanan / Kalender'
          : effectiveWeekType === 'P10_PROD_P11_NORM'
          ? 'P10 Prod - P11 Norm (Dipaksa Admin)'
          : effectiveWeekType === 'P10_NORM_P11_PROD'
          ? 'P10 Norm - P11 Prod (Dipaksa Admin)'
          : 'Semua Pekan';

      const emptyStatusFilterMap: Record<EmptyStatusFilter, string> = {
        HAS_EMPTY: 'Ada Jam Kosong',
        KOSONG_SEMUA: 'Kosong Semua',
        LENGKAP: 'Terisi Penuh',
        ALL: 'Semua Kelas',
      };

      result = buildEmptyScheduleBeritaAcaraPdf({
        rows: filteredEmptyRows,
        granularity,
        periodLabel: emptyPeriodRange.periodLabel,
        evaluatedSchoolDaysCount: emptyAudit.evaluatedSchoolDates.length,
        semesterString,
        rotationLabel: rotationText,
        currentDateOnlyString,
        currentDateTimeLabel: `${currentDateOnlyString} ${currentTimeString}`,
        todayISO,
        classesWithEmptyCount: emptySummary.classesWithEmptyCount,
        totalEmptySlots: emptySummary.totalEmptySlots,
        statusFilterLabel: emptyStatusFilterMap[emptyStatusFilter],
      });
    } else {
      const rotationText =
        filterWeek === 'P10_PROD_P11_NORM'
          ? 'K10 Prod - K11 Norm'
          : filterWeek === 'P10_NORM_P11_PROD'
          ? 'K10 Norm - K11 Prod'
          : filterWeek === 'ACTIVE'
          ? effectiveWeekType === 'P10_PROD_P11_NORM'
            ? 'Pekan Aktif (K10 Prod - K11 Norm)'
            : 'Pekan Aktif (K10 Norm - K11 Prod)'
          : 'Semua Pekan';

      result = buildScheduleBeritaAcaraPdf({
        schedules: filteredSchedules,
        getScheduleStatus,
        currentDateString,
        currentTimeString,
        currentDateOnlyString,
        semesterString,
        rotationLabel: rotationText,
        todayISO,
      });
    }

    downloadGeneratedPdf(result.doc, result.filename);
    setGeneratedPdfModal(result);
    setPdfFeedbackMessage(`Berita Acara PDF "${result.filename}" berhasil dibuat dan diunduh.`);
  };

  const handleBrowserPrint = () => {
    // Close modal first so modal overlay doesn't cover print view if browser allows print
    setGeneratedPdfModal(null);
    window.setTimeout(() => {
      try {
        window.print();
        setPrintFallbackHint(
          'Jika dialog printer browser tidak muncul (diblokir mode pratinjau/iframe), silakan buka & cetak file PDF yang sudah terunduh.'
        );
      } catch {
        setPrintFallbackHint(
          'Printer browser diblokir oleh mode pratinjau. Silakan cetak dari file PDF yang baru saja diunduh.'
        );
      }
    }, 150);
  };

  const handleExportCSV = () => {
    if (activeReportTab === 'kepatuhan_jurnal') {
      const headers = [
        'Periode',
        'Rentang',
        'Kode Guru',
        'NIP',
        'Nama Guru',
        'Jurusan',
        'Sesi Terjadwal',
        'Sesi Terisi',
        'Sesi Belum Diisi',
        'Total Jurnal Masuk',
        'Status Kepatuhan',
        'Rincian Belum Diisi',
      ];

      const granularityLabel =
        granularity === 'daily' ? 'Per Hari' : granularity === 'weekly' ? 'Per Minggu' : 'Per Bulan';

      const statusTextMap: Record<TeacherComplianceStatus, string> = {
        belum_mengisi: 'Belum Mengisi',
        sebagian: 'Sebagian Terisi',
        lengkap: 'Sudah Lengkap',
        non_jadwal: 'Mengisi (Non-Jadwal)',
        tidak_ada_jadwal: 'Tidak Ada Jadwal',
      };

      const rows = filteredComplianceRows.map((r) => {
        const missingSummary = r.missingDetails
          .map(
            (m) =>
              `${m.dayName} ${m.date} (${m.className} - ${m.subjectName} Jam ${m.startPeriod}${
                m.endPeriod !== m.startPeriod ? `-${m.endPeriod}` : ''
              })`
          )
          .join('; ');
        return [
          `"${granularityLabel}"`,
          `"${periodRange.periodLabel}"`,
          `"${r.teacherCode}"`,
          `"${r.nip}"`,
          `"${r.teacherName}"`,
          `"${r.departments.join(', ') || '-'}"`,
          r.expectedSessions,
          r.filledSessions,
          r.missingSessions,
          r.journalsSubmitted,
          `"${statusTextMap[r.status]}"`,
          `"${missingSummary || '-'}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `rekap_kepatuhan_jurnal_guru_${granularity}_${todayISO}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (activeReportTab === 'jadwal_kosong') {
      const headers = [
        'Periode',
        'Rentang',
        'Kelas',
        'Tingkat',
        'Jurusan',
        'Total Slot Jam',
        'Slot Terisi',
        'Slot Kosong',
        'Persentase Terisi',
        'Status',
        'Rincian Jam Kosong / Belum Diisi Guru',
      ];

      const granularityLabel =
        granularity === 'daily' ? 'Per Hari' : granularity === 'weekly' ? 'Per Minggu' : 'Per Bulan';

      const emptyStatusMap: Record<EmptySlotStatus, string> = {
        kosong_semua: 'Kosong Semua',
        ada_kosong: 'Ada Jam Kosong',
        lengkap: 'Terisi Penuh',
      };

      const rows = filteredEmptyRows.map((r) => {
        const detailStr = r.emptyBlocks
          .map(
            (b) =>
              `${b.dayName} ${b.date} (Jam ${b.startPeriod}${
                b.endPeriod !== b.startPeriod ? `-${b.endPeriod}` : ''
              } / ${b.timeRange} - ${
                b.reason === 'tanpa_guru' ? 'Jadwal tanpa guru' : 'Belum terjadwal'
              })`
          )
          .join('; ');
        return [
          `"${granularityLabel}"`,
          `"${emptyPeriodRange.periodLabel}"`,
          `"${r.className}"`,
          `"Kelas ${r.grade}"`,
          `"${r.programCode}"`,
          r.totalSlots,
          r.filledSlots,
          r.emptySlots,
          `"${r.occupancyPercent}%"`,
          `"${emptyStatusMap[r.status]}"`,
          `"${detailStr || '-'}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `rekap_jadwal_kosong_${granularity}_${todayISO}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'Jam Ke',
      'Waktu',
      'Rotasi Pekan',
      'Guru',
      'NIP',
      'Mata Pelajaran',
      'Kelas',
      'Ruang',
      'Status Jadwal',
    ];
    const rows = filteredSchedules.map((s) => {
      const t = teachers.find((tc) => tc.id === s.teacherId);
      const status = getScheduleStatus(s);
      const weekLabel =
        s.weekType === 'P10_PROD_P11_NORM'
          ? 'Pekan K10 Prod & K11 Norm'
          : s.weekType === 'P10_NORM_P11_PROD'
          ? 'Pekan K10 Norm & K11 Prod'
          : 'Semua Pekan';

      return [
        s.periodIndex,
        `"${s.timeRange}"`,
        `"${weekLabel}"`,
        `"${s.teacherName}"`,
        `"${t?.nip || '-'}"`,
        `"${s.subjectName}"`,
        `"${s.className}"`,
        `"${s.roomName}"`,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_jadwal_kbm_smkn1tegalsari_${todayISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderComplianceStatus = (status: TeacherComplianceStatus) => {
    if (status === 'belum_mengisi') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Belum Mengisi</span>
        </span>
      );
    }
    if (status === 'sebagian') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Sebagian Terisi</span>
        </span>
      );
    }
    if (status === 'lengkap') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Sudah Lengkap</span>
        </span>
      );
    }
    if (status === 'non_jadwal') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Mengisi (Non-Jadwal)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Tidak Ada Jadwal</span>
      </span>
    );
  };

  const renderEmptySlotStatus = (status: EmptySlotStatus) => {
    if (status === 'kosong_semua') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Kosong Semua</span>
        </span>
      );
    }
    if (status === 'ada_kosong') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Ada Jam Kosong</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Terisi Penuh</span>
      </span>
    );
  };

  const granularityTitle =
    granularity === 'daily'
      ? 'Harian'
      : granularity === 'weekly'
      ? 'Mingguan'
      : 'Bulanan';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Feedback Banner (PDF & Print) */}
      {(pdfFeedbackMessage || printFallbackHint) && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pdfFeedbackMessage || printFallbackHint}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPdfFeedbackMessage(null);
              setPrintFallbackHint(null);
            }}
            className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Dokumentasi & Administrasi Sekolah</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {activeReportTab === 'jadwal'
              ? 'Laporan Rekapitulasi Jadwal Pembelajaran'
              : activeReportTab === 'kepatuhan_jurnal'
              ? 'Monitoring Guru Belum Mengisi Jurnal Mengajar'
              : 'Laporan Jadwal Pelajaran Kosong / Belum Diisi Guru'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeReportTab === 'jadwal'
              ? 'Unduh format digital atau cetak berita acara resmi status pelaksanaan jadwal KBM (Berlangsung, Selesai, Terjadwal).'
              : activeReportTab === 'kepatuhan_jurnal'
              ? 'Pantau kepatuhan pengisian jurnal mengajar guru secara harian, mingguan, maupun bulanan sesuai jadwal KBM aktif.'
              : 'Deteksi slot jam pelajaran yang masih kosong atau belum terisi guru pengajar per kelas secara harian, mingguan, maupun bulanan.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Berita Acara (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sub-Menu Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveReportTab('jadwal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'jadwal'
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rekapitulasi Jadwal KBM</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('kepatuhan_jurnal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'kepatuhan_jurnal'
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Guru Belum Mengisi Jurnal</span>
            {complianceSummary.needActionCount > 0 && (
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  activeReportTab === 'kepatuhan_jurnal'
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {complianceSummary.needActionCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('jadwal_kosong')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeReportTab === 'jadwal_kosong'
                ? 'bg-[#082032] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <CalendarX2 className="w-3.5 h-3.5" />
            <span>Jadwal Kosong (Belum Diisi Guru)</span>
            {emptySummary.classesWithEmptyCount > 0 && (
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                  activeReportTab === 'jadwal_kosong'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {emptySummary.classesWithEmptyCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <span>Tanggal Sistem:</span>
          <span className="font-semibold text-slate-700">{currentDateOnlyString}</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: REKAPITULASI JADWAL KBM                                      */}
      {/* =================================================================== */}
      {activeReportTab === 'jadwal' && (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs no-print">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-700 shrink-0" />
              <span className="font-semibold text-slate-600">Rotasi Pekan:</span>
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ACTIVE">
                  Pekan Aktif Real-Time (
                  {effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? 'K10 Prod · K11 Norm'
                    : 'K10 Norm · K11 Prod'}
                  )
                </option>
                <option value="P10_PROD_P11_NORM">Pekan K10 Prod & K11 Norm</option>
                <option value="P10_NORM_P11_PROD">Pekan K10 Norm & K11 Prod</option>
                <option value="ALL">Semua Pekan (Gabungan)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-600">Jurusan:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Semua Program Keahlian</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Status Jadwal:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="Berlangsung">Berlangsung</option>
                <option value="Selesai">Selesai</option>
                <option value="Terjadwal">Terjadwal</option>
              </select>
            </div>
          </div>

          {/* Printable Sheet View */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
            {/* Kop Surat Sekolah */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
                Pemerintah Provinsi Jawa Timur · Dinas Pendidikan
              </p>
              <h2 className="text-lg md:text-xl font-black text-slate-950 uppercase tracking-tight">
                SMK Negeri 1 Tegalsari Banyuwangi
              </h2>
              <p className="text-[11px] text-slate-500">
                Jl. KH. Abdul Majid No.09, Krajan 2, Tegalsari, Kec. Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68491
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                NPSN: 20540177 · Website: smkn1tegalsari.sch.id · Email: info@smkn1tegalsari.sch.id
              </p>
            </div>

            {/* Header Dokumen Berita Acara */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-3">
              <div>
                <span className="font-extrabold text-slate-900 block uppercase">
                  BERITA ACARA & REKAPITULASI JADWAL PEMBELAJARAN
                </span>
                <span className="text-slate-500">
                  Periode Waktu: {currentDateString} ({currentTimeString})
                </span>
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-700 block">{semesterString}</span>
                <span className="text-slate-500 text-[11px]">
                  Rotasi:{' '}
                  {filterWeek === 'P10_PROD_P11_NORM'
                    ? 'K10 Prod & K11 Norm'
                    : filterWeek === 'P10_NORM_P11_PROD'
                    ? 'K10 Norm & K11 Prod'
                    : 'Semua Pekan'}
                </span>
              </div>
            </div>

            {/* Tabel Data Rekapitulasi */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                    <th className="py-2.5 px-2 border-r border-slate-300 text-center">JAM</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">WAKTU</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">ROTASI PEKAN</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">GURU PENGAJAR</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">MATA PELAJARAN</th>
                    <th className="py-2.5 px-2 border-r border-slate-300">KELAS</th>
                    <th className="py-2.5 px-2 border-r border-slate-300">RUANG</th>
                    <th className="py-2.5 px-3 text-center">STATUS JADWAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                        Belum ada data jadwal pembelajaran yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((item) => {
                      const status = getScheduleStatus(item);
                      return (
                        <tr key={item.id} className="text-slate-800">
                          <td className="py-2 px-2 text-center font-bold border-r border-slate-300 tabular-nums">
                            {item.periodIndex}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] tabular-nums whitespace-nowrap">
                            {item.timeRange || `${item.startTime} - ${item.endTime}`}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 text-[11px] whitespace-nowrap">
                            {item.weekType === 'P10_PROD_P11_NORM' ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                K10 Prod · K11 Norm
                              </span>
                            ) : item.weekType === 'P10_NORM_P11_PROD' ? (
                              <span className="font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-300">
                                K10 Norm · K11 Prod
                              </span>
                            ) : (
                              <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                Semua
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-bold whitespace-nowrap">
                            {item.teacherName}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-medium">
                            {item.subjectName}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-300 font-semibold whitespace-nowrap">
                            {item.className}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-300 text-[11px] whitespace-nowrap">
                            {item.roomName}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <ScheduleStatusBadge status={status} size="sm" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Pejabat Sekolah */}
            <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">Kepala SMKN 1 Tegalsari</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">CANDRA SURO LAKSONO, S.Pi</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19840925 201101 1 011</p>
              </div>

              <div>
                <p className="text-slate-600">Tegalsari, {currentDateOnlyString}</p>
                <p className="font-bold text-slate-900 mt-0.5">Waka Bidang Kurikulum</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">EKO PRAMESTI SUMARTO, S.Mat</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19870618 202421 1 002</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* TAB 2: AUDIT GURU BELUM MENGISI JURNAL MENGAJAR                     */}
      {/* =================================================================== */}
      {activeReportTab === 'kepatuhan_jurnal' && (
        <>
          {/* Toolbar Kontrol Periode (Harian / Mingguan / Bulanan) & Filter */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs no-print">
            {/* Baris 1: Granularity & Date/Week/Month Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Segmented Periode */}
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGranularity('daily')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'daily'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('weekly')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'weekly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('monthly')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Bulan
                  </button>
                </div>

                {/* Picker Per Hari */}
                {granularity === 'daily' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO((d) => shiftDateISO(d, -1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Hari Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={selectedDateISO}
                      onChange={(e) => e.target.value && setSelectedDateISO(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO((d) => shiftDateISO(d, 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Hari Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO(todayISO)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Hari Ini
                    </button>
                  </div>
                )}

                {/* Picker Per Minggu */}
                {granularity === 'weekly' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO((d) => shiftDateISO(d, -7))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Minggu Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={selectedWeekAnchorISO}
                      onChange={(e) => e.target.value && setSelectedWeekAnchorISO(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                      title="Pilih tanggal mana saja dalam minggu yang ingin dicek"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO((d) => shiftDateISO(d, 7))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Minggu Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO(todayISO)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Minggu Ini
                    </button>
                  </div>
                )}

                {/* Picker Per Bulan */}
                {granularity === 'monthly' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey((m) => shiftMonthKey(m, -1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="month"
                      value={selectedMonthKey}
                      onChange={(e) => e.target.value && setSelectedMonthKey(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey((m) => shiftMonthKey(m, 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey(todayISO.slice(0, 7))}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Bulan Ini
                    </button>
                  </div>
                )}
              </div>

              {/* Opsi batas s/d hari ini untuk mode mingguan & bulanan */}
              {granularity !== 'daily' && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={upToTodayOnly}
                    onChange={(e) => setUpToTodayOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span>Batasi evaluasi s/d hari ini ({formatIndonesianShortDate(todayISO)})</span>
                </label>
              )}
            </div>

            {/* Baris 2: Filter Status, Jurusan, & Pencarian */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setComplianceStatusFilter('NEED_ACTION')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    complianceStatusFilter === 'NEED_ACTION'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Belum / Sebagian ({complianceSummary.needActionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceStatusFilter('BELUM')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    complianceStatusFilter === 'BELUM'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Belum Mengisi ({complianceSummary.belumCount})
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceStatusFilter('LENGKAP')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    complianceStatusFilter === 'LENGKAP'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sudah Lengkap ({complianceSummary.lengkapCount})
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    complianceStatusFilter === 'ALL'
                      ? 'bg-[#082032] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Guru ({complianceSummary.totalTeachers})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={complianceDeptFilter}
                    onChange={(e) => setComplianceDeptFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Program Keahlian</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={complianceSearch}
                    onChange={(e) => setComplianceSearch(e.target.value)}
                    placeholder="Cari guru, NIP, kelas, mapel..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 w-56 outline-none focus:border-cyan-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Metadata Periode Aktif (unboxed typographic text) */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span>Periode Evaluasi:</span>
              <span className="font-bold text-slate-800">{periodRange.periodLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {periodRange.evaluatedDates.length} hari sekolah dievaluasi
                {granularity !== 'daily' &&
                  periodRange.allWorkDates.length > periodRange.evaluatedDates.length &&
                  ` (dari ${periodRange.allWorkDates.length} hari kerja)`}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Rotasi Pekan:{' '}
                <strong className="text-slate-700">
                  {activeWeekFilter === 'AUTO'
                    ? 'Sesuai Jadwal Bulanan / Kalender'
                    : effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? 'P10 Prod · P11 Norm (Dipaksa Admin)'
                    : effectiveWeekType === 'P10_NORM_P11_PROD'
                    ? 'P10 Norm · P11 Prod (Dipaksa Admin)'
                    : 'Semua Pekan'}
                </strong>
              </span>
            </div>
          </div>

          {/* 4 KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Guru Terjadwal</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
                  {complianceSummary.scheduledTeachers}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  Dari {complianceSummary.totalTeachers} guru terdata
                </p>
              </div>
              <Users className="w-5 h-5 text-slate-400 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Belum / Sebagian Mengisi</p>
                <p className="text-2xl font-black text-rose-700 tabular-nums mt-1">
                  {complianceSummary.needActionCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {complianceSummary.belumCount} belum · {complianceSummary.sebagianCount} sebagian
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Sudah Lengkap</p>
                <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
                  {complianceSummary.lengkapCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semua sesi terjadwal terisi
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Sesi Jurnal Tertunda</p>
                <p className="text-2xl font-black text-amber-700 tabular-nums mt-1">
                  {complianceSummary.totalMissingSessions}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Blok mengajar belum dilaporkan
                </p>
              </div>
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            </div>
          </div>

          {/* Printable Audit Report Sheet */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
            {/* Kop Surat Sekolah */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
                Pemerintah Provinsi Jawa Timur · Dinas Pendidikan
              </p>
              <h2 className="text-lg md:text-xl font-black text-slate-950 uppercase tracking-tight">
                SMK Negeri 1 Tegalsari Banyuwangi
              </h2>
              <p className="text-[11px] text-slate-500">
                Jl. KH. Abdul Majid No.09, Krajan 2, Tegalsari, Kec. Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68491
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                NPSN: 20540177 · Website: smkn1tegalsari.sch.id · Email: info@smkn1tegalsari.sch.id
              </p>
            </div>

            {/* Header Dokumen Audit Jurnal */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-3">
              <div>
                <span className="font-extrabold text-slate-900 block uppercase">
                  LAPORAN KEPATUHAN PENGISIAN JURNAL MENGAJAR GURU ({granularityTitle.toUpperCase()})
                </span>
                <span className="text-slate-500">
                  Periode: {periodRange.periodLabel} · Dievaluasi: {periodRange.evaluatedDates.length} hari sekolah
                </span>
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-700 block">{semesterString}</span>
                <span className="text-slate-500 text-[11px] tabular-nums">
                  {complianceSummary.needActionCount} guru belum lengkap · {complianceSummary.totalMissingSessions} sesi belum diisi
                </span>
              </div>
            </div>

            {/* Peringatan informatif bila belum ada jadwal atau tanggal belum berjalan */}
            {periodRange.evaluatedDates.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Periode yang dipilih berada di tanggal mendatang
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Belum ada hari pembelajaran yang berjalan pada rentang ini. Nonaktifkan batas evaluasi s/d hari ini untuk meninjau proyeksi pekan/bulan penuh.
                </p>
                <button
                  type="button"
                  onClick={() => setUpToTodayOnly(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl cursor-pointer"
                >
                  Tampilkan Seluruh Hari dalam Periode
                </button>
              </div>
            ) : filteredComplianceRows.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {schedules.length === 0
                    ? 'Belum ada data Jadwal Pelajaran untuk dievaluasi'
                    : complianceStatusFilter === 'NEED_ACTION' || complianceStatusFilter === 'BELUM'
                    ? 'Semua guru terjadwal telah mengisi jurnal mengajar pada periode ini'
                    : 'Tidak ada data guru yang cocok dengan filter'}
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  {schedules.length === 0
                    ? 'Silakan tambahkan atau impor jadwal pelajaran di Data Master agar sistem dapat membandingkan sesi mengajar guru dengan jurnal yang masuk.'
                    : 'Anda dapat melihat seluruh daftar guru beserta total jurnal yang dikirim melalui tombol di bawah.'}
                </p>
                {complianceStatusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setComplianceStatusFilter('ALL')}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Tampilkan Semua Guru ({complianceSummary.totalTeachers})
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                      <th className="py-2.5 px-2 border-r border-slate-300 text-center w-10">NO</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">NAMA GURU & KODE</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-center">JURUSAN</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">TERJADWAL</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">TERISI</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">BELUM DIISI</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">RINCIAN SESI BELUM DIISI</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredComplianceRows.map((row, idx) => {
                      const isExpanded = Boolean(expandedTeacherIds[row.teacherId]);
                      const hasMoreMissing = row.missingDetails.length > 2;
                      const previewMissing = row.missingDetails.slice(0, 2);

                      return (
                        <React.Fragment key={row.teacherId}>
                          <tr className="text-slate-800 hover:bg-slate-50/70 align-top">
                            <td className="py-2.5 px-2 text-center font-semibold border-r border-slate-300 tabular-nums text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-300">
                              <div className="font-bold text-slate-900">{row.teacherName}</div>
                              <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                                {row.teacherCode}
                                {row.nip && row.nip !== '-' ? ` · NIP. ${row.nip}` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-semibold text-slate-700">
                              {row.departments.length > 0 ? row.departments.join(', ') : '-'}
                            </td>
                            <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-semibold">
                              {row.expectedSessions} sesi
                            </td>
                            <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-bold text-emerald-700">
                              {row.filledSessions} sesi
                            </td>
                            <td
                              className={`py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-black ${
                                row.missingSessions > 0 ? 'text-rose-700' : 'text-slate-400'
                              }`}
                            >
                              {row.missingSessions} sesi
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-300 text-[11px] max-w-md">
                              {row.missingDetails.length === 0 ? (
                                row.journalsSubmitted > 0 ? (
                                  <span className="text-emerald-700 font-medium">
                                    Seluruh sesi terisi ({row.journalsSubmitted} jurnal tersimpan)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Tidak ada tanggungan sesi</span>
                                )
                              ) : (
                                <div className="space-y-1">
                                  {(isExpanded ? row.missingDetails : previewMissing).map((m, mIdx) => (
                                    <div key={`${m.date}-${m.className}-${m.startPeriod}-${mIdx}`} className="text-slate-700 leading-snug">
                                      <span className="font-semibold text-slate-900">
                                        {m.dayName}, {formatIndonesianShortDate(m.date)}
                                      </span>{' '}
                                      · <span className="font-bold text-rose-800">{m.className}</span> ·{' '}
                                      <span>{m.subjectName}</span>{' '}
                                      <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                                        (Jam {m.startPeriod}
                                        {m.endPeriod !== m.startPeriod ? `-${m.endPeriod}` : ''})
                                      </span>
                                    </div>
                                  ))}
                                  {hasMoreMissing && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandTeacher(row.teacherId)}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 pt-0.5 cursor-pointer no-print"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-3.5 h-3.5" />
                                          <span>Tutup rincian</span>
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3.5 h-3.5" />
                                          <span>Lihat semua {row.missingDetails.length} sesi</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {/* Saat cetak PDF, selalu tampilkan sisa sesi yang belum tampil di preview */}
                                  {!isExpanded && hasMoreMissing && (
                                    <div className="hidden print:block space-y-1">
                                      {row.missingDetails.slice(2).map((m, mIdx) => (
                                        <div key={`print-${m.date}-${m.className}-${m.startPeriod}-${mIdx}`} className="text-slate-700 leading-snug">
                                          <span className="font-semibold text-slate-900">
                                            {m.dayName}, {formatIndonesianShortDate(m.date)}
                                          </span>{' '}
                                          · <span className="font-bold text-rose-800">{m.className}</span> ·{' '}
                                          <span>{m.subjectName}</span>{' '}
                                          <span className="font-mono text-[10px] text-slate-500">
                                            (Jam {m.startPeriod}
                                            {m.endPeriod !== m.startPeriod ? `-${m.endPeriod}` : ''})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {renderComplianceStatus(row.status)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tanda Tangan Pejabat Sekolah */}
            <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">Kepala SMKN 1 Tegalsari</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">CANDRA SURO LAKSONO, S.Pi</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19840925 201101 1 011</p>
              </div>

              <div>
                <p className="text-slate-600">Tegalsari, {currentDateOnlyString}</p>
                <p className="font-bold text-slate-900 mt-0.5">Waka Bidang Kurikulum</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">EKO PRAMESTI SUMARTO, S.Mat</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19870618 202421 1 002</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* TAB 3: AUDIT JADWAL PELAJARAN KOSONG / BELUM DIISI GURU             */}
      {/* =================================================================== */}
      {activeReportTab === 'jadwal_kosong' && (
        <>
          {/* Toolbar Kontrol Periode (Harian / Mingguan / Bulanan) & Filter */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs no-print">
            {/* Baris 1: Granularity & Date/Week/Month Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Segmented Periode */}
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGranularity('daily')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'daily'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('weekly')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'weekly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('monthly')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      granularity === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Bulan
                  </button>
                </div>

                {/* Picker Per Hari */}
                {granularity === 'daily' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO((d) => shiftDateISO(d, -1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Hari Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={selectedDateISO}
                      onChange={(e) => e.target.value && setSelectedDateISO(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO((d) => shiftDateISO(d, 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Hari Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDateISO(todayISO)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Hari Ini
                    </button>
                  </div>
                )}

                {/* Picker Per Minggu */}
                {granularity === 'weekly' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO((d) => shiftDateISO(d, -7))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Minggu Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={selectedWeekAnchorISO}
                      onChange={(e) => e.target.value && setSelectedWeekAnchorISO(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                      title="Pilih tanggal mana saja dalam minggu yang ingin dicek"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO((d) => shiftDateISO(d, 7))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Minggu Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWeekAnchorISO(todayISO)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Minggu Ini
                    </button>
                  </div>
                )}

                {/* Picker Per Bulan */}
                {granularity === 'monthly' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey((m) => shiftMonthKey(m, -1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="month"
                      value={selectedMonthKey}
                      onChange={(e) => e.target.value && setSelectedMonthKey(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 outline-none focus:border-cyan-600"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey((m) => shiftMonthKey(m, 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonthKey(todayISO.slice(0, 7))}
                      className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Bulan Ini
                    </button>
                  </div>
                )}
              </div>

              {/* Opsi batas s/d hari ini untuk mingguan & bulanan */}
              {granularity !== 'daily' && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emptyUpToTodayOnly}
                    onChange={(e) => setEmptyUpToTodayOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span>Batasi evaluasi s/d hari ini ({formatIndonesianShortDate(todayISO)})</span>
                </label>
              )}
            </div>

            {/* Baris 2: Filter Status, Tingkat Kelas, Jurusan, & Pencarian */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEmptyStatusFilter('HAS_EMPTY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    emptyStatusFilter === 'HAS_EMPTY'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Ada Jam Kosong ({emptySummary.classesWithEmptyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEmptyStatusFilter('KOSONG_SEMUA')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    emptyStatusFilter === 'KOSONG_SEMUA'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Kosong Semua ({emptySummary.kosongSemuaCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEmptyStatusFilter('LENGKAP')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    emptyStatusFilter === 'LENGKAP'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Terisi Penuh ({emptySummary.lengkapCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEmptyStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    emptyStatusFilter === 'ALL'
                      ? 'bg-[#082032] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Kelas ({emptySummary.totalClasses})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={emptyGradeFilter}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmptyGradeFilter(v === 'ALL' ? 'ALL' : (Number(v) as 10 | 11 | 12));
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tingkat</option>
                    <option value="10">Kelas X (10)</option>
                    <option value="11">Kelas XI (11)</option>
                    <option value="12">Kelas XII (12)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={emptyDeptFilter}
                    onChange={(e) => setEmptyDeptFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Program Keahlian</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={emptySearch}
                    onChange={(e) => setEmptySearch(e.target.value)}
                    placeholder="Cari kelas, jurusan, hari..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 w-52 outline-none focus:border-cyan-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Metadata Periode Aktif */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span>Periode Audit:</span>
              <span className="font-bold text-slate-800">{emptyPeriodRange.periodLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {emptyAudit.evaluatedSchoolDates.length} hari belajar KBM (11 jam/hari)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Rotasi Pekan:{' '}
                <strong className="text-slate-700">
                  {activeWeekFilter === 'AUTO'
                    ? 'Sesuai Jadwal Bulanan / Kalender'
                    : effectiveWeekType === 'P10_PROD_P11_NORM'
                    ? 'P10 Prod · P11 Norm (Dipaksa Admin)'
                    : effectiveWeekType === 'P10_NORM_P11_PROD'
                    ? 'P10 Norm · P11 Prod (Dipaksa Admin)'
                    : 'Semua Pekan'}
                </strong>
              </span>
            </div>
          </div>

          {/* 4 KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Kelas Dievaluasi</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
                  {emptySummary.totalClasses}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {emptySummary.totalSlots} total slot jam KBM
                </p>
              </div>
              <GraduationCap className="w-5 h-5 text-slate-400 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Kelas Ada Jam Kosong</p>
                <p className="text-2xl font-black text-amber-700 tabular-nums mt-1">
                  {emptySummary.classesWithEmptyCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {emptySummary.kosongSemuaCount} kosong semua · {emptySummary.adaKosongCount} sebagian
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Kelas Terisi Penuh</p>
                <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
                  {emptySummary.lengkapCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Keterisian rata-rata {emptySummary.overallOccupancy}%
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Jam Pelajaran Kosong</p>
                <p className="text-2xl font-black text-rose-700 tabular-nums mt-1">
                  {emptySummary.totalEmptySlots}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Slot belum terjadwal / tanpa guru
                </p>
              </div>
              <CalendarX2 className="w-5 h-5 text-rose-600 shrink-0" />
            </div>
          </div>

          {/* Printable Audit Jadwal Kosong Sheet */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
            {/* Kop Surat Sekolah */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
                Pemerintah Provinsi Jawa Timur · Dinas Pendidikan
              </p>
              <h2 className="text-lg md:text-xl font-black text-slate-950 uppercase tracking-tight">
                SMK Negeri 1 Tegalsari Banyuwangi
              </h2>
              <p className="text-[11px] text-slate-500">
                Jl. KH. Abdul Majid No.09, Krajan 2, Tegalsari, Kec. Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68491
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                NPSN: 20540177 · Website: smkn1tegalsari.sch.id · Email: info@smkn1tegalsari.sch.id
              </p>
            </div>

            {/* Header Dokumen Jadwal Kosong */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-3">
              <div>
                <span className="font-extrabold text-slate-900 block uppercase">
                  LAPORAN JADWAL PELAJARAN KOSONG / BELUM DIISI GURU ({granularityTitle.toUpperCase()})
                </span>
                <span className="text-slate-500">
                  Periode: {emptyPeriodRange.periodLabel} · Dievaluasi: {emptyAudit.evaluatedSchoolDates.length} hari belajar KBM
                </span>
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-700 block">{semesterString}</span>
                <span className="text-slate-500 text-[11px] tabular-nums">
                  {emptySummary.classesWithEmptyCount} kelas ada jam kosong · {emptySummary.totalEmptySlots} slot jam kosong
                </span>
              </div>
            </div>

            {emptyAudit.evaluatedSchoolDates.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {granularity === 'daily'
                    ? 'Tanggal yang dipilih merupakan hari libur akhir pekan (Sabtu / Minggu)'
                    : 'Tidak ada hari belajar KBM yang dievaluasi pada rentang ini'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {granularity === 'daily'
                    ? 'Jadwal KBM reguler berjalan pada hari Senin sampai Jumat. Silakan pilih tanggal hari kerja.'
                    : 'Nonaktifkan batas evaluasi s/d hari ini untuk melihat audit seluruh slot pada minggu/bulan terpilih.'}
                </p>
                {granularity !== 'daily' && emptyUpToTodayOnly && (
                  <button
                    type="button"
                    onClick={() => setEmptyUpToTodayOnly(false)}
                    className="px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl cursor-pointer"
                  >
                    Tampilkan Seluruh Hari dalam Periode
                  </button>
                )}
              </div>
            ) : filteredEmptyRows.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {emptyStatusFilter === 'HAS_EMPTY' || emptyStatusFilter === 'KOSONG_SEMUA'
                    ? 'Seluruh kelas sudah memiliki guru pengajar di setiap jam KBM'
                    : 'Tidak ada data kelas yang cocok dengan filter'}
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Anda dapat meninjau seluruh kelas beserta rekap keterisian jadwal melalui tombol di bawah.
                </p>
                {emptyStatusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setEmptyStatusFilter('ALL')}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Tampilkan Semua Kelas ({emptySummary.totalClasses})
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                      <th className="py-2.5 px-2 border-r border-slate-300 text-center w-10">NO</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">KELAS & TINGKAT</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-center">JURUSAN</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">TOTAL SLOT</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">TERISI</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">KOSONG</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">RINCIAN JAM KOSONG / BELUM DIISI GURU</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredEmptyRows.map((row, idx) => {
                      const isExpanded = Boolean(expandedEmptyClassIds[row.classId]);
                      const hasMoreBlocks = row.emptyBlocks.length > 2;
                      const previewBlocks = row.emptyBlocks.slice(0, 2);

                      return (
                        <tr key={row.classId} className="text-slate-800 hover:bg-slate-50/70 align-top">
                          <td className="py-2.5 px-2 text-center font-semibold border-r border-slate-300 tabular-nums text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <div className="font-bold text-slate-900">{row.className}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Kelas {row.grade === 10 ? 'X' : row.grade === 11 ? 'XI' : 'XII'} ({row.occupancyPercent}% terisi)
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-semibold text-slate-700">
                            {row.programCode}
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-semibold">
                            {row.totalSlots} jam
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-bold text-emerald-700">
                            {row.filledSlots} jam
                          </td>
                          <td
                            className={`py-2.5 px-2.5 border-r border-slate-300 text-right font-mono tabular-nums font-black ${
                              row.emptySlots > 0 ? 'text-rose-700' : 'text-slate-400'
                            }`}
                          >
                            {row.emptySlots} jam
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 text-[11px] max-w-md">
                            {row.emptyBlocks.length === 0 ? (
                              <span className="text-emerald-700 font-medium">
                                Seluruh jam pelajaran sudah terisi guru pengajar
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {(isExpanded ? row.emptyBlocks : previewBlocks).map((b, bIdx) => (
                                  <div
                                    key={`${b.date}-${b.startPeriod}-${bIdx}`}
                                    className="text-slate-700 leading-snug"
                                  >
                                    <span className="font-semibold text-slate-900">
                                      {b.dayName}, {formatIndonesianShortDate(b.date)}
                                    </span>{' '}
                                    ·{' '}
                                    <span className="font-bold text-rose-800 font-mono tabular-nums">
                                      Jam {b.startPeriod}
                                      {b.endPeriod !== b.startPeriod ? `-${b.endPeriod}` : ''}
                                    </span>{' '}
                                    <span className="text-slate-500 font-mono text-[10px]">
                                      ({b.timeRange})
                                    </span>{' '}
                                    ·{' '}
                                    <span className="text-slate-600">
                                      {b.reason === 'tanpa_guru'
                                        ? 'Jadwal tanpa guru'
                                        : 'Belum terjadwal / kosong'}
                                    </span>
                                  </div>
                                ))}
                                {hasMoreBlocks && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandEmptyClass(row.classId)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 pt-0.5 cursor-pointer no-print"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        <span>Tutup rincian</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        <span>Lihat semua {row.emptyBlocks.length} blok jam kosong</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                {!isExpanded && hasMoreBlocks && (
                                  <div className="hidden print:block space-y-1">
                                    {row.emptyBlocks.slice(2).map((b, bIdx) => (
                                      <div
                                        key={`print-${b.date}-${b.startPeriod}-${bIdx}`}
                                        className="text-slate-700 leading-snug"
                                      >
                                        <span className="font-semibold text-slate-900">
                                          {b.dayName}, {formatIndonesianShortDate(b.date)}
                                        </span>{' '}
                                        ·{' '}
                                        <span className="font-bold text-rose-800 font-mono tabular-nums">
                                          Jam {b.startPeriod}
                                          {b.endPeriod !== b.startPeriod ? `-${b.endPeriod}` : ''}
                                        </span>{' '}
                                        <span className="text-slate-500 font-mono text-[10px]">
                                          ({b.timeRange})
                                        </span>{' '}
                                        ·{' '}
                                        <span className="text-slate-600">
                                          {b.reason === 'tanpa_guru'
                                            ? 'Jadwal tanpa guru'
                                            : 'Belum terjadwal / kosong'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {renderEmptySlotStatus(row.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tanda Tangan Pejabat Sekolah */}
            <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">Kepala SMKN 1 Tegalsari</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">CANDRA SURO LAKSONO, S.Pi</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19840925 201101 1 011</p>
              </div>

              <div>
                <p className="text-slate-600">Tegalsari, {currentDateOnlyString}</p>
                <p className="font-bold text-slate-900 mt-0.5">Waka Bidang Kurikulum</p>
                <div className="h-16"></div>
                <p className="font-extrabold underline text-slate-900">EKO PRAMESTI SUMARTO, S.Mat</p>
                <p className="text-slate-500 font-mono text-[11px]">NIP. 19870618 202421 1 002</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Konfirmasi & Cetak Berita Acara (PDF) */}
      {generatedPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Berita Acara PDF Siap
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {generatedPdfModal.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedPdfModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Nama File PDF</span>
                <span className="font-mono font-bold text-slate-900 truncate max-w-[230px]">
                  {generatedPdfModal.filename}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Total Data Tercantum</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {generatedPdfModal.rowCount} baris data
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Status Unduhan</span>
                <span className="font-bold text-emerald-700">Otomatis Terunduh</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              File PDF resmi lengkap dengan Kop Surat SMKN 1 Tegalsari dan blok tanda tangan Kepala Sekolah serta Waka Kurikulum telah diunduh ke perangkat Anda.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGeneratedPdfModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Printer</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadGeneratedPdf(generatedPdfModal.doc, generatedPdfModal.filename)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Ulang PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
