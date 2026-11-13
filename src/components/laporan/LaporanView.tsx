import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building,
  CalendarDays,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ScheduleLessonStatus } from '../../types';
import { ScheduleStatusBadge } from '../common/ScheduleStatusBadge';
import { areDepartmentsEquivalent, resolveDepartmentCode } from '../../data/departmentUtils';

export const LaporanView: React.FC = () => {
  const {
    schedules,
    currentDateString,
    currentTimeString,
    currentDateOnlyString,
    semesterString,
    effectiveWeekType,
    teachers,
    departments,
    classes,
    getScheduleStatus,
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
      'Status Jadwal',
    ];
    const rows = filtered.map((s) => {
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
    link.setAttribute('download', `rekap_jadwal_kbm_smkn1tegalsari_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Laporan Rekapitulasi Jadwal Pembelajaran
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unduh format digital atau cetak berita acara resmi status pelaksanaan jadwal KBM (Berlangsung, Selesai, Terjadwal).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Berita Acara (PDF)</span>
          </button>
        </div>
      </div>

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
            <option value="ACTIVE">Pekan Aktif Real-Time ({effectiveWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})</option>
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
            <option value="Berlangsung">🟢 Berlangsung</option>
            <option value="Selesai">⚪ Selesai</option>
            <option value="Terjadwal">🔵 Terjadwal</option>
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
            Jl. KH. Syafa'at No. 1, Dusun Krajan, Blokagung, Kec. Tegalsari, Kabupaten Banyuwangi, Jawa Timur 68485
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            NPSN: 20566371 · Website: smkn1tegalsari.sch.id · Email: info@smkn1tegalsari.sch.id
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
            <span className="font-bold text-slate-700 block">
              {semesterString}
            </span>
            <span className="text-slate-500 text-[11px]">
              Rotasi: {filterWeek === 'P10_PROD_P11_NORM' ? 'K10 Prod & K11 Norm' : filterWeek === 'P10_NORM_P11_PROD' ? 'K10 Norm & K11 Prod' : 'Semua Pekan'}
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
              {filtered.map((item) => {
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
    </div>
  );
};
