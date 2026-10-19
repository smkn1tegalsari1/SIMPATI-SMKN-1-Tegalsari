import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Building,
  CalendarDays,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LaporanView: React.FC = () => {
  const {
    schedules,
    attendanceRecords,
    currentDateString,
    currentTimeString,
    currentDateOnlyString,
    semesterString,
    effectiveWeekType,
    realtimeWeekType,
    teachers,
    departments,
    classes,
  } = useApp();

  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<'ACTIVE' | 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'>('ACTIVE');

  const filtered = schedules.filter((s) => {
    // Filter Week
    if (filterWeek === 'ACTIVE') {
      const itemWeek = s.weekType || 'ALL';
      if (itemWeek !== 'ALL' && itemWeek !== effectiveWeekType) return false;
    } else if (filterWeek !== 'ALL') {
      const itemWeek = s.weekType || 'ALL';
      if (itemWeek !== 'ALL' && itemWeek !== filterWeek) return false;
    }

    const rec = attendanceRecords[s.id];
    const itemDept = s.department || classes.find((c) => c.id === s.classId)?.department || 'UMUM';
    const matchDept = filterDept === 'all' || itemDept.toUpperCase() === filterDept.toUpperCase();

    let matchStatus = true;
    if (filterStatus === 'hadir') {
      matchStatus = rec?.piketConfirmation?.status === 'terverifikasi_hadir';
    } else if (filterStatus === 'izin') {
      matchStatus = rec?.teacherConfirmation?.status === 'izin' || rec?.teacherConfirmation?.status === 'sakit';
    } else if (filterStatus === 'inval') {
      matchStatus = !!rec?.piketConfirmation?.substituteTeacherName;
    }

    return matchDept && matchStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Jam Ke',
      'Waktu',
      'Rotasi Pekan',
      'Guru',
      'NIP',
      'Mata Pelajaran',
      'Kelas',
      'Ruang',
      'Status Guru',
      'Validasi Piket',
      'Materi Jurnal',
      'Guru Pengganti',
    ];
    const rows = filtered.map((s) => {
      const rec = attendanceRecords[s.id];
      const t = teachers.find((tc) => tc.id === s.teacherId);
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
        `"${rec?.teacherConfirmation?.status || 'Belum'}"`,
        `"${rec?.piketConfirmation?.status || 'Belum'}"`,
        `"${rec?.teacherConfirmation?.journalTopic || '-'}"`,
        `"${rec?.piketConfirmation?.substituteTeacherName || '-'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_kbm_smkn1tegalsari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Dokumentasi & Administrasi Sekolah</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Laporan Rekapitulasi KBM Terintegrasi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unduh format digital atau cetak berita acara resmi kehadiran guru dan pemantauan piket.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Berita Acara (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (no-print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Jurusan:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">Semua Program Keahlian ({schedules.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Rotasi Pekan:</span>
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="ACTIVE">
                ⚡ Pekan Aktif ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})
              </option>
              <option value="P10_PROD_P11_NORM">🟢 Pekan K10 Prod & K11 Norm</option>
              <option value="P10_NORM_P11_PROD">🟣 Pekan K10 Norm & K11 Prod</option>
              <option value="ALL">🌐 Semua Pekan (Gabungan)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Terverifikasi Hadir</option>
              <option value="izin">Izin / Sakit</option>
              <option value="inval">Didampingi Inval</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Ditemukan <span className="font-bold text-slate-800">{filtered.length}</span> baris catatan
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs space-y-6">
        {/* Kop Surat Sekolah */}
        <div className="text-center border-b-2 border-slate-800 pb-5 space-y-1">
          <h2 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
            PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN
          </h2>
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
            SEKOLAH MENENGAH KEJURUAN NEGERI 1 TEGALSARI
          </h3>
          <p className="text-xs text-slate-600">
            Jl. KH. Syafa'at No. 1, Blokagung, Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68485
          </p>
          <p className="text-[11px] font-bold text-cyan-800 uppercase tracking-widest pt-1">
            BERITA ACARA & REKAPITULASI PELAKSANAAN PEMBELAJARAN (SIMPATI)
          </p>
          <p className="text-xs text-slate-600 flex flex-wrap items-center justify-center gap-2 pt-1">
            <span>Tanggal & Waktu Cetak: <strong>{currentDateString} · {currentTimeString}</strong></span>
            <span>·</span>
            <span>{semesterString}</span>
            <span>·</span>
            <span className="font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              Rotasi:{' '}
              {filterWeek === 'ACTIVE'
                ? `Pekan Aktif Real-Time (${effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})`
                : filterWeek === 'P10_PROD_P11_NORM'
                ? 'Pekan K10 Produktif & K11 Normatif Adaptif'
                : filterWeek === 'P10_NORM_P11_PROD'
                ? 'Pekan K10 Normatif Adaptif & K11 Produktif'
                : 'Semua Pekan'}
            </span>
          </p>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-2 border-r border-slate-300 text-center">JAM</th>
                <th className="py-2.5 px-3 border-r border-slate-300">WAKTU</th>
                <th className="py-2.5 px-3 border-r border-slate-300">ROTASI PEKAN</th>
                <th className="py-2.5 px-3 border-r border-slate-300">GURU PENGAJAR</th>
                <th className="py-2.5 px-3 border-r border-slate-300">MATA PELAJARAN</th>
                <th className="py-2.5 px-2 border-r border-slate-300">KELAS</th>
                <th className="py-2.5 px-2 border-r border-slate-300">RUANG</th>
                <th className="py-2.5 px-3 border-r border-slate-300">TOPIK MATERI JURNAL</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center">GURU</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center">PIKET</th>
                <th className="py-2.5 px-3">INVAL / KET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((item) => {
                const rec = attendanceRecords[item.id];
                return (
                  <tr key={item.id} className="text-slate-800">
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-300 tabular-nums">
                      {item.periodIndex}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {item.timeRange}
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
                    <td className="py-2 px-3 border-r border-slate-300 text-[11px] text-slate-600">
                      {rec?.teacherConfirmation?.journalTopic || 'Pokok bahasan KBM'}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-semibold text-[11px]">
                      {rec?.teacherConfirmation?.status === 'hadir' ? 'Hadir' : rec?.teacherConfirmation?.status === 'izin' ? 'Izin' : '-'}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-semibold text-[11px]">
                      {rec?.piketConfirmation?.status === 'terverifikasi_hadir' ? 'Valid' : '-'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-600">
                      {rec?.piketConfirmation?.substituteTeacherName ? `Inval: ${rec.piketConfirmation.substituteTeacherName}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Pejabat Sekolah */}
        <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
          <div>
            <p className="text-slate-600">Mengetahui,</p>
            <p className="font-bold text-slate-900 mt-0.5">Kepala SMKN 1 Tegalsari</p>
            <div className="h-16"></div>
            <p className="font-extrabold underline text-slate-900">SUHARTONO, S.Pd., M.T.</p>
            <p className="text-slate-500 font-mono text-[11px]">NIP. 19720101 199802 1 004</p>
          </div>

          <div>
            <p className="text-slate-600">Tegalsari, {currentDateOnlyString}</p>
            <p className="font-bold text-slate-900 mt-0.5">Waka Bidang Kurikulum</p>
            <div className="h-16"></div>
            <p className="font-extrabold underline text-slate-900">SITI NURJANAH, S.Pd</p>
            <p className="text-slate-500 font-mono text-[11px]">NIP. 19800512 200604 2 015</p>
          </div>
        </div>
      </div>
    </div>
  );
};
