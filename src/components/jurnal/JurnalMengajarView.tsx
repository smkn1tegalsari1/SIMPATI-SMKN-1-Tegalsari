import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  GraduationCap,
  DoorOpen,
  FileText,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  BookCheck,
} from 'lucide-react';
import { useApp, formatIndonesianDateOnly } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { TambahJurnalModal } from './TambahJurnalModal';

export const JurnalMengajarView: React.FC = () => {
  const {
    journals,
    deleteJournal,
    teachers,
    classes,
    subjects,
    currentUser,
    currentDateOnlyString,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJournal, setEditingJournal] = useState<TeachingJournal | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTeacherId, setFilterTeacherId] = useState<string>(
    currentUser.role === 'guru' && currentUser.teacherId ? currentUser.teacherId : 'ALL'
  );
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterDateOption, setFilterDateOption] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  // Helper tanggal hari ini YYYY-MM-DD
  const todayISO = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Filter journals
  const filteredJournals = useMemo(() => {
    return journals.filter((item) => {
      // Filter guru
      if (filterTeacherId !== 'ALL' && item.teacherId !== filterTeacherId) {
        return false;
      }
      // Filter kelas
      if (filterClassId !== 'ALL' && item.classId !== filterClassId && item.className !== filterClassId) {
        return false;
      }
      // Filter tanggal
      if (filterDateOption === 'TODAY') {
        if (item.date !== todayISO) return false;
      } else if (filterDateOption === 'CUSTOM' && customDate) {
        if (item.date !== customDate) return false;
      }

      // Pencarian kata kunci materi / guru / mapel / kelas
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTopic = item.topic.toLowerCase().includes(q);
        const matchTeacher = item.teacherName.toLowerCase().includes(q) || (item.teacherCode && item.teacherCode.toLowerCase().includes(q));
        const matchSubject = item.subjectName.toLowerCase().includes(q) || item.subjectCode.toLowerCase().includes(q);
        const matchClass = item.className.toLowerCase().includes(q);
        const matchRoom = item.roomName.toLowerCase().includes(q);
        if (!matchTopic && !matchTeacher && !matchSubject && !matchClass && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [journals, filterTeacherId, filterClassId, filterDateOption, customDate, searchTerm, todayISO]);

  // Statistik Jurnal
  const totalCount = journals.length;
  const todayCount = journals.filter((j) => j.date === todayISO).length;
  const activeTeachersCount = new Set(journals.map((j) => j.teacherId)).size;
  const classesServedCount = new Set(journals.map((j) => j.className)).size;

  const handleOpenAdd = () => {
    setEditingJournal(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (journal: TeachingJournal) => {
    setEditingJournal(journal);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, topic: string) => {
    if (window.confirm(`Yakin ingin menghapus jurnal pembelajaran "${topic.substring(0, 30)}..."?`)) {
      deleteJournal(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredJournals.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor!');
      return;
    }
    const headers = ['Tanggal', 'Guru', 'Kode Guru', 'Kelas', 'Ruang', 'Kode Mapel', 'Mata Pelajaran', 'Jam Mulai', 'Jam Selesai', 'Materi Pembelajaran'];
    const rows = filteredJournals.map((j) => [
      `"${j.date}"`,
      `"${j.teacherName.replace(/"/g, '""')}"`,
      `"${j.teacherCode || ''}"`,
      `"${j.className.replace(/"/g, '""')}"`,
      `"${j.roomName.replace(/"/g, '""')}"`,
      `"${j.subjectCode}"`,
      `"${j.subjectName.replace(/"/g, '""')}"`,
      `"Jam ke-${j.startPeriod}"`,
      `"Jam ke-${j.endPeriod}"`,
      `"${j.topic.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jurnal_mengajar_${todayISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#6B9A95]/15 text-[#4E7D78] flex items-center justify-center font-bold">
              <BookCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Jurnal Mengajar Guru
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Pencatatan materi pembelajaran harian terhubung data master SMK
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
            title="Ekspor CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200"
            title="Cetak Jurnal"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6B9A95] hover:bg-[#5A8782] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurnal</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Jurnal
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500">entri dicatat</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 bg-emerald-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Jurnal Hari Ini
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{todayCount}</span>
            <span className="text-xs text-emerald-600">kegiatan</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-cyan-200/90 bg-cyan-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">
            Guru Mengisi
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-cyan-700">{activeTeachersCount}</span>
            <span className="text-xs text-cyan-600">dari {teachers.length} guru</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/90 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Kelas Terdata
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-700">{classesServedCount}</span>
            <span className="text-xs text-amber-600">dari {classes.length} rombel</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari materi pembelajaran, guru, mapel, kelas, atau ruang..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95] focus:bg-white transition"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterDateOption('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Tanggal
            </button>
            <button
              onClick={() => setFilterDateOption('TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'TODAY'
                  ? 'bg-[#6B9A95] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterDateOption('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filterDateOption === 'CUSTOM'
                  ? 'bg-[#6B9A95] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pilih Tanggal
            </button>
            {filterDateOption === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
              />
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
          {/* Filter Guru */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
            >
              <option value="ALL">Semua Guru ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#6B9A95]"
            >
              <option value="ALL">Semua Kelas ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset filter shortcut */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {filteredJournals.length} dari {journals.length} entri
            </span>
            {(filterTeacherId !== 'ALL' || filterClassId !== 'ALL' || filterDateOption !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterTeacherId('ALL');
                  setFilterClassId('ALL');
                  setFilterDateOption('ALL');
                  setCustomDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content List / Table */}
      {filteredJournals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#6B9A95]/10 text-[#6B9A95] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Belum Ada Catatan Jurnal Mengajar
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {journals.length === 0
                ? 'Mulai mencatat jurnal materi pembelajaran untuk mendokumentasikan kegiatan belajar mengajar di kelas.'
                : 'Tidak ada jurnal yang sesuai dengan kriteria filter atau pencarian Anda.'}
            </p>
          </div>
          <div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6B9A95] hover:bg-[#5A8782] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jurnal Sekarang</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 w-36">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Guru</th>
                  <th className="py-3.5 px-4">Kelas & Ruang</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Materi Pembelajaran</th>
                  <th className="py-3.5 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJournals.map((j) => (
                  <tr
                    key={j.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Tanggal & Jam */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{j.date}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-[#4E7D78] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>
                          Jam ke-{j.startPeriod} s/d {j.endPeriod}
                        </span>
                      </div>
                      {j.timeRange && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {j.timeRange}
                        </div>
                      )}
                    </td>

                    {/* Guru */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900">
                        {j.teacherName}
                      </div>
                      {j.teacherCode && (
                        <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          {j.teacherCode}
                        </span>
                      )}
                    </td>

                    {/* Kelas & Ruang */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>{j.className}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                        <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {j.roomName}
                        </span>
                      </div>
                    </td>

                    {/* Mata Pelajaran */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-semibold text-slate-800">
                        {j.subjectName}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                        Kode: {j.subjectCode}
                      </div>
                    </td>

                    {/* Materi */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="p-2.5 bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                        {j.topic}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(j)}
                          className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                          title="Edit Jurnal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(j.id, j.topic)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Jurnal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Jurnal */}
      <TambahJurnalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingJournal(null);
        }}
        journalToEdit={editingJournal}
      />
    </div>
  );
};
