import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScheduleItem, TeachingJournal } from '../types';
import {
  formatIndonesianShortDate,
  JournalReportGranularity,
  TeacherComplianceStatus,
  TeacherJournalComplianceRow,
} from './journalCompliance';

export interface GeneratedPdfResult {
  doc: jsPDF;
  filename: string;
  title: string;
  rowCount: number;
}

const getLastTableFinalY = (doc: jsPDF, fallbackY: number): number => {
  const withLast = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return typeof withLast.lastAutoTable?.finalY === 'number'
    ? withLast.lastAutoTable.finalY
    : fallbackY;
};

const drawSchoolLetterhead = (doc: jsPDF): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PEMERINTAH PROVINSI JAWA TIMUR - DINAS PENDIDIKAN', centerX, 13, {
    align: 'center',
  });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SMK NEGERI 1 TEGALSARI BANYUWANGI', centerX, 19.5, {
    align: 'center',
  });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Jl. KH. Abdul Majid No.09, Krajan 2, Tegalsari, Kec. Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68491',
    centerX,
    24.5,
    { align: 'center' }
  );

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text(
    'NPSN: 20540177  |  Website: smkn1tegalsari.sch.id  |  Email: info@smkn1tegalsari.sch.id',
    centerX,
    28.8,
    { align: 'center' }
  );

  // Double border line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(14, 31.5, pageWidth - 14, 31.5);
  doc.setLineWidth(0.25);
  doc.line(14, 32.5, pageWidth - 14, 32.5);

  return 38;
};

const drawSignatureBlock = (doc: jsPDF, startY: number, currentDateOnlyString: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let sigY = startY + 10;
  if (sigY + 34 > pageHeight - 10) {
    doc.addPage();
    sigY = 20;
  }

  const leftX = pageWidth * 0.25;
  const rightX = pageWidth * 0.75;

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mengetahui,', leftX, sigY, { align: 'center' });
  doc.text(`Tegalsari, ${currentDateOnlyString}`, rightX, sigY, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala SMKN 1 Tegalsari', leftX, sigY + 4.5, { align: 'center' });
  doc.text('Waka Bidang Kurikulum', rightX, sigY + 4.5, { align: 'center' });

  const nameY = sigY + 23;
  doc.setFont('helvetica', 'bold');
  doc.text('CANDRA SURO LAKSONO, S.Pi', leftX, nameY, { align: 'center' });
  doc.text('EKO PRAMESTI SUMARTO, S.Mat', rightX, nameY, { align: 'center' });

  // Underline names
  const leftNameW = doc.getTextWidth('CANDRA SURO LAKSONO, S.Pi');
  const rightNameW = doc.getTextWidth('EKO PRAMESTI SUMARTO, S.Mat');
  doc.setLineWidth(0.3);
  doc.line(leftX - leftNameW / 2, nameY + 0.8, leftX + leftNameW / 2, nameY + 0.8);
  doc.line(rightX - rightNameW / 2, nameY + 0.8, rightX + rightNameW / 2, nameY + 0.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('NIP. 19840925 201101 1 011', leftX, nameY + 4.5, { align: 'center' });
  doc.text('NIP. 19870618 202421 1 002', rightX, nameY + 4.5, { align: 'center' });
};

const addPageFooters = (doc: jsPDF, printedAtLabel: string) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SIMPATI SMKN 1 Tegalsari  |  Dicetak pada ${printedAtLabel}`,
      14,
      pageHeight - 6
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 6, {
      align: 'right',
    });
  }
};

export interface CompliancePdfParams {
  rows: TeacherJournalComplianceRow[];
  granularity: JournalReportGranularity;
  periodLabel: string;
  evaluatedDatesCount: number;
  semesterString: string;
  rotationLabel: string;
  currentDateOnlyString: string;
  currentDateTimeLabel: string;
  todayISO: string;
  needActionCount: number;
  totalMissingSessions: number;
  statusFilterLabel: string;
}

const STATUS_LABEL_MAP: Record<TeacherComplianceStatus, string> = {
  belum_mengisi: 'Belum Mengisi',
  sebagian: 'Sebagian Terisi',
  lengkap: 'Sudah Lengkap',
  non_jadwal: 'Mengisi (Non-Jadwal)',
  tidak_ada_jadwal: 'Tidak Ada Jadwal',
};

export const buildComplianceBeritaAcaraPdf = (
  params: CompliancePdfParams
): GeneratedPdfResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawSchoolLetterhead(doc);

  const granularityLabel =
    params.granularity === 'daily'
      ? 'HARIAN'
      : params.granularity === 'weekly'
      ? 'MINGGUAN'
      : 'BULANAN';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    `BERITA ACARA & LAPORAN KEPATUHAN PENGISIAN JURNAL MENGAJAR GURU (${granularityLabel})`,
    14,
    y
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Periode: ${params.periodLabel}  |  Hari Sekolah Dievaluasi: ${params.evaluatedDatesCount} hari  |  Filter Status: ${params.statusFilterLabel}`,
    14,
    y + 4.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.semesterString, pageWidth - 14, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Rotasi: ${params.rotationLabel}  |  ${params.needActionCount} guru belum lengkap (${params.totalMissingSessions} sesi tertunda)`,
    pageWidth - 14,
    y + 4.8,
    { align: 'right' }
  );

  y += 9;

  if (params.rows.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      'Tidak ada guru dengan tanggungan jurnal mengajar pada filter dan periode yang dipilih.',
      pageWidth / 2,
      y + 10,
      { align: 'center' }
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Seluruh sesi terjadwal pada periode ${params.periodLabel} berstatus aman / sesuai filter "${params.statusFilterLabel}".`,
      pageWidth / 2,
      y + 16,
      { align: 'center' }
    );
    y += 26;
  } else {
    const bodyRows = params.rows.map((row, idx) => {
      const missingText =
        row.missingDetails.length > 0
          ? row.missingDetails
              .map(
                (m) =>
                  `- ${m.dayName}, ${formatIndonesianShortDate(m.date)} | ${m.className} | ${
                    m.subjectName
                  } (Jam ${m.startPeriod}${m.endPeriod !== m.startPeriod ? `-${m.endPeriod}` : ''})`
              )
              .join('\n')
          : row.journalsSubmitted > 0
          ? `Seluruh sesi terisi (${row.journalsSubmitted} jurnal tersimpan)`
          : 'Tidak ada tanggungan sesi';

      const teacherCell =
        row.nip && row.nip !== '-'
          ? `${row.teacherName}\n${row.teacherCode} | NIP. ${row.nip}`
          : `${row.teacherName}\n${row.teacherCode}`;

      return [
        String(idx + 1),
        teacherCell,
        row.departments.join(', ') || '-',
        `${row.expectedSessions} sesi`,
        `${row.filledSessions} sesi`,
        `${row.missingSessions} sesi`,
        missingText,
        STATUS_LABEL_MAP[row.status],
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [
        [
          'NO',
          'NAMA GURU & KODE',
          'JURUSAN',
          'TERJADWAL',
          'TERISI',
          'BELUM DIISI',
          'RINCIAN SESI BELUM DIISI',
          'STATUS',
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      margin: { left: 14, right: 14, bottom: 14 },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 46 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = String(data.cell.raw || '');
          if (val === 'Belum Mengisi') {
            data.cell.styles.textColor = [190, 18, 60];
          } else if (val === 'Sebagian Terisi') {
            data.cell.styles.textColor = [180, 83, 9];
          } else if (val === 'Sudah Lengkap') {
            data.cell.styles.textColor = [4, 120, 87];
          }
        }
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw || '');
          if (!val.startsWith('0 ')) {
            data.cell.styles.textColor = [190, 18, 60];
          }
        }
      },
    });

    y = getLastTableFinalY(doc, y + 20);
  }

  drawSignatureBlock(doc, y, params.currentDateOnlyString);
  addPageFooters(doc, params.currentDateTimeLabel);

  return {
    doc,
    filename: `berita_acara_kepatuhan_jurnal_${params.granularity}_${params.todayISO}.pdf`,
    title: `Berita Acara Pengisian Jurnal Guru (${granularityLabel})`,
    rowCount: params.rows.length,
  };
};

export interface SchedulePdfParams {
  schedules: ScheduleItem[];
  getScheduleStatus: (s: ScheduleItem) => string;
  currentDateString: string;
  currentTimeString: string;
  currentDateOnlyString: string;
  semesterString: string;
  rotationLabel: string;
  todayISO: string;
}

export const buildScheduleBeritaAcaraPdf = (
  params: SchedulePdfParams
): GeneratedPdfResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawSchoolLetterhead(doc);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BERITA ACARA & REKAPITULASI JADWAL PEMBELAJARAN', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Periode Waktu: ${params.currentDateString} (${params.currentTimeString})`,
    14,
    y + 4.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.semesterString, pageWidth - 14, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Rotasi: ${params.rotationLabel}`, pageWidth - 14, y + 4.8, {
    align: 'right',
  });

  y += 9;

  if (params.schedules.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Belum ada data jadwal pembelajaran yang cocok dengan filter yang dipilih.',
      pageWidth / 2,
      y + 11.5,
      { align: 'center' }
    );
    y += 24;
  } else {
    const bodyRows = params.schedules.map((item) => {
      const weekText =
        item.weekType === 'P10_PROD_P11_NORM'
          ? 'K10 Prod - K11 Norm'
          : item.weekType === 'P10_NORM_P11_PROD'
          ? 'K10 Norm - K11 Prod'
          : 'Semua Pekan';

      return [
        String(item.periodIndex),
        item.timeRange || `${item.startTime} - ${item.endTime}`,
        weekText,
        item.teacherName,
        item.subjectName,
        item.className,
        item.roomName,
        params.getScheduleStatus(item),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [
        [
          'JAM',
          'WAKTU',
          'ROTASI PEKAN',
          'GURU PENGAJAR',
          'MATA PELAJARAN',
          'KELAS',
          'RUANG',
          'STATUS',
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      margin: { left: 14, right: 14, bottom: 14 },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 34, halign: 'center' },
        3: { cellWidth: 48, fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 26, fontStyle: 'bold' },
        6: { cellWidth: 30 },
        7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      },
    });

    y = getLastTableFinalY(doc, y + 20);
  }

  drawSignatureBlock(doc, y, params.currentDateOnlyString);
  addPageFooters(doc, `${params.currentDateString} ${params.currentTimeString}`);

  return {
    doc,
    filename: `berita_acara_jadwal_kbm_${params.todayISO}.pdf`,
    title: 'Berita Acara Rekapitulasi Jadwal KBM',
    rowCount: params.schedules.length,
  };
};

export interface TeachingJournalPdfParams {
  journals: TeachingJournal[];
  teacherTitleLabel: string;
  semesterString: string;
  currentDateOnlyString: string;
  currentDateTimeLabel: string;
  todayISO: string;
}

export const buildTeachingJournalPdf = (
  params: TeachingJournalPdfParams
): GeneratedPdfResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawSchoolLetterhead(doc);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REKAPITULASI JURNAL MENGAJAR GURU', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Cakupan: ${params.teacherTitleLabel}  |  Total Entri: ${params.journals.length} jurnal`,
    14,
    y + 4.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.semesterString, pageWidth - 14, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Cetak: ${params.currentDateOnlyString}`, pageWidth - 14, y + 4.8, {
    align: 'right',
  });

  y += 9;

  if (params.journals.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Belum ada catatan jurnal mengajar yang sesuai dengan filter yang dipilih.',
      pageWidth / 2,
      y + 11.5,
      { align: 'center' }
    );
    y += 24;
  } else {
    const bodyRows = params.journals.map((j, idx) => [
      String(idx + 1),
      `${j.date}\nJam ${j.startPeriod}${j.endPeriod !== j.startPeriod ? `-${j.endPeriod}` : ''}${
        j.timeRange ? `\n(${j.timeRange})` : ''
      }`,
      j.teacherCode ? `${j.teacherName}\n[${j.teacherCode}]` : j.teacherName,
      `${j.className}\nRuang: ${j.roomName}`,
      `${j.subjectName}\n(${j.subjectCode})`,
      j.topic || '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          'NO',
          'TANGGAL & JAM',
          'GURU PENGAJAR',
          'KELAS & RUANG',
          'MATA PELAJARAN',
          'MATERI PEMBELAJARAN',
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      margin: { left: 14, right: 14, bottom: 14 },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 46, fontStyle: 'bold' },
        3: { cellWidth: 34 },
        4: { cellWidth: 48 },
        5: { cellWidth: 'auto' },
      },
    });

    y = getLastTableFinalY(doc, y + 20);
  }

  drawSignatureBlock(doc, y, params.currentDateOnlyString);
  addPageFooters(doc, params.currentDateTimeLabel);

  return {
    doc,
    filename: `jurnal_mengajar_${params.todayISO}.pdf`,
    title: 'Rekapitulasi Jurnal Mengajar Guru',
    rowCount: params.journals.length,
  };
};

export const downloadGeneratedPdf = (doc: jsPDF, filename: string): void => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
};
