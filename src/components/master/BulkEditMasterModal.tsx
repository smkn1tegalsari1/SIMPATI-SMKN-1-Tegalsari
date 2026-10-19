import React, { useState } from 'react';
import { Pencil, X, Check, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { Teacher, Subject, SchoolClass, Room, Department, AcademicYear, ScheduleItem, ScheduleWeekType } from '../../types';

interface BulkEditMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal';
  selectedCount: number;
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  departments: Department[];
  academicYears: AcademicYear[];
  onApplyGuru: (updates: Partial<Teacher>) => void;
  onApplyMapel: (updates: Partial<Subject>) => void;
  onApplyJurusan: (updates: Partial<Department>) => void;
  onApplyKelas: (updates: Partial<SchoolClass>) => void;
  onApplyRuang: (updates: Partial<Room>) => void;
  onApplyTahunPelajaran: (updates: Partial<AcademicYear>) => void;
  onApplyJadwal: (updates: Partial<ScheduleItem>) => void;
}

export const BulkEditMasterModal: React.FC<BulkEditMasterModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  selectedCount,
  teachers,
  subjects,
  classes,
  rooms,
  departments,
  academicYears,
  onApplyGuru,
  onApplyMapel,
  onApplyJurusan,
  onApplyKelas,
  onApplyRuang,
  onApplyTahunPelajaran,
  onApplyJadwal,
}) => {
  // Tab: Guru
  const [enableGuruTitle, setEnableGuruTitle] = useState(false);
  const [guruTitle, setGuruTitle] = useState(subjects[0]?.name || '');
  const [enableGuruPiket, setEnableGuruPiket] = useState(false);
  const [guruPiketDays, setGuruPiketDays] = useState<string[]>(['Selasa']);

  // Tab: Mapel
  const [enableMapelCat, setEnableMapelCat] = useState(false);
  const [mapelCat, setMapelCat] = useState<'Umum' | 'Produktif' | 'Muatan Lokal'>('Umum');
  const [enableMapelJp, setEnableMapelJp] = useState(false);
  const [mapelJp, setMapelJp] = useState<number>(4);

  // Tab: Jurusan
  const [enableDeptDesc, setEnableDeptDesc] = useState(false);
  const [deptDesc, setDeptDesc] = useState('');

  // Tab: Kelas
  const [enableClassGrade, setEnableClassGrade] = useState(false);
  const [classGrade, setClassGrade] = useState<10 | 11 | 12>(11);
  const [enableClassDept, setEnableClassDept] = useState(false);
  const [classDept, setClassDept] = useState(departments[0]?.code || 'TKJ');
  const [enableClassHomeroom, setEnableClassHomeroom] = useState(false);
  const [classHomeroomId, setClassHomeroomId] = useState('');

  // Tab: Ruang
  const [enableRoomType, setEnableRoomType] = useState(false);
  const [roomType, setRoomType] = useState<'Teori' | 'Lab Komputer' | 'Bengkel Praktik'>('Teori');
  const [enableRoomBuilding, setEnableRoomBuilding] = useState(false);
  const [roomBuilding, setRoomBuilding] = useState('');

  // Tab: Tahun Pelajaran
  const [enableAyStatus, setEnableAyStatus] = useState(false);
  const [ayStatus, setAyStatus] = useState<'aktif' | 'non_aktif'>('non_aktif');

  // Tab: Jadwal
  const [enableSchDay, setEnableSchDay] = useState(false);
  const [schDay, setSchDay] = useState<'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT'>('SENIN');
  const [enableSchTeacher, setEnableSchTeacher] = useState(false);
  const [schTeacherId, setSchTeacherId] = useState('');
  const [enableSchRoom, setEnableSchRoom] = useState(false);
  const [schRoomId, setSchRoomId] = useState('');
  const [enableSchClass, setEnableSchClass] = useState(false);
  const [schClassId, setSchClassId] = useState('');
  const [enableSchWeek, setEnableSchWeek] = useState(false);
  const [schWeek, setSchWeek] = useState<ScheduleWeekType>('P10_PROD_P11_NORM');

  if (!isOpen || selectedCount === 0) return null;

  const tabTitles: Record<string, string> = {
    guru: 'Data Guru',
    mapel: 'Mata Pelajaran',
    jurusan: 'Program Keahlian / Jurusan',
    kelas: 'Kelas & Rombel',
    ruang: 'Ruang & Bengkel',
    tahun_pelajaran: 'Tahun Pelajaran',
    jadwal: 'Jadwal Pelajaran',
  };

  const handleTogglePiketDay = (day: string) => {
    setGuruPiketDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    switch (activeTab) {
      case 'guru': {
        const updates: Partial<Teacher> = {};
        if (enableGuruTitle) updates.title = guruTitle;
        if (enableGuruPiket) {
          updates.piketDays = guruPiketDays;
          updates.isPiketToday = guruPiketDays.includes('Selasa');
        }
        onApplyGuru(updates);
        break;
      }
      case 'mapel': {
        const updates: Partial<Subject> = {};
        if (enableMapelCat) updates.category = mapelCat;
        if (enableMapelJp) updates.jp = Number(mapelJp);
        onApplyMapel(updates);
        break;
      }
      case 'jurusan': {
        const updates: Partial<Department> = {};
        if (enableDeptDesc) updates.description = deptDesc;
        onApplyJurusan(updates);
        break;
      }
      case 'kelas': {
        const updates: Partial<SchoolClass> = {};
        if (enableClassGrade) updates.grade = classGrade;
        if (enableClassDept) updates.department = classDept;
        if (enableClassHomeroom) {
          const selectedTeacher = teachers.find((t) => t.id === classHomeroomId);
          updates.homeroomTeacherId = classHomeroomId || undefined;
          updates.homeroomTeacherName = selectedTeacher?.name || undefined;
        }
        onApplyKelas(updates);
        break;
      }
      case 'ruang': {
        const updates: Partial<Room> = {};
        if (enableRoomType) updates.type = roomType;
        if (enableRoomBuilding) updates.building = roomBuilding;
        onApplyRuang(updates);
        break;
      }
      case 'tahun_pelajaran': {
        const updates: Partial<AcademicYear> = {};
        if (enableAyStatus) updates.status = ayStatus;
        onApplyTahunPelajaran(updates);
        break;
      }
      case 'jadwal': {
        const updates: Partial<ScheduleItem> = {};
        if (enableSchDay) {
          const dayMap: Record<string, number> = {
            SENIN: 1,
            SELASA: 2,
            RABU: 3,
            KAMIS: 4,
            JUMAT: 5,
          };
          updates.dayName = schDay;
          updates.dayOfWeek = dayMap[schDay] || 2;
        }
        if (enableSchTeacher) {
          const t = teachers.find((x) => x.id === schTeacherId);
          if (t) {
            updates.teacherId = t.id;
            updates.teacherName = t.name;
            updates.teacherCode = t.code;
          }
        }
        if (enableSchRoom) {
          const r = rooms.find((x) => x.id === schRoomId);
          if (r) {
            updates.roomName = r.name;
            updates.roomType = r.type;
          }
        }
        if (enableSchClass) {
          const c = classes.find((x) => x.id === schClassId);
          if (c) {
            updates.classId = c.id;
            updates.className = c.name;
            updates.department = c.department;
          }
        }
        if (enableSchWeek) {
          updates.weekType = schWeek;
        }
        onApplyJadwal(updates);
        break;
      }
    }

    onClose();
  };

  const hasAnyFieldSelected = () => {
    switch (activeTab) {
      case 'guru':
        return enableGuruTitle || enableGuruPiket;
      case 'mapel':
        return enableMapelCat || enableMapelJp;
      case 'jurusan':
        return enableDeptDesc;
      case 'kelas':
        return enableClassGrade || enableClassDept || enableClassHomeroom;
      case 'ruang':
        return enableRoomType || enableRoomBuilding;
      case 'tahun_pelajaran':
        return enableAyStatus;
      case 'jadwal':
        return enableSchDay || enableSchTeacher || enableSchRoom || enableSchClass || enableSchWeek;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-900 to-[#0B1E2E] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shadow-xs">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Edit Masal {tabTitles[activeTab]}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                  {selectedCount} Terpilih
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Centang bidang yang ingin diperbarui serentak pada semua item terpilih.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-3 text-xs text-cyan-900 flex items-start gap-2.5">
              <Sliders className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <span>
                <strong>Petunjuk:</strong> Hanya bidang yang dicentang di bawah ini yang akan diubah nilainya. Bidang yang tidak dicentang akan tetap mempertahankan nilai aslinya.
              </span>
            </div>

            {/* TAB: GURU */}
            {activeTab === 'guru' && (
              <div className="space-y-4">

                {/* Mapel / Title */}
                <div className={`p-3.5 rounded-xl border transition ${enableGuruTitle ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableGuruTitle}
                      onChange={(e) => setEnableGuruTitle(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Mata Pelajaran Utama yang Diampu</span>
                  </label>
                  {enableGuruTitle && (
                    <select
                      value={guruTitle}
                      onChange={(e) => setGuruTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Hari Piket */}
                <div className={`p-3.5 rounded-xl border transition ${enableGuruPiket ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableGuruPiket}
                      onChange={(e) => setEnableGuruPiket(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Hari Tugas Guru Piket</span>
                  </label>
                  {enableGuruPiket && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                        const checked = guruPiketDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => handleTogglePiketDay(day)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              checked
                                ? 'bg-cyan-700 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${checked ? 'border-white bg-cyan-800' : 'border-slate-400'}`}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </span>
                            <span>{day}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: MAPEL */}
            {activeTab === 'mapel' && (
              <div className="space-y-4">
                {/* Kategori */}
                <div className={`p-3.5 rounded-xl border transition ${enableMapelCat ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableMapelCat}
                      onChange={(e) => setEnableMapelCat(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Kategori Mata Pelajaran</span>
                  </label>
                  {enableMapelCat && (
                    <div className="grid grid-cols-3 gap-2">
                      {(['Umum', 'Produktif', 'Muatan Lokal'] as const).map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setMapelCat(cat)}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            mapelCat === cat
                              ? 'bg-cyan-700 text-white border-cyan-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Beban JP */}
                <div className={`p-3.5 rounded-xl border transition ${enableMapelJp ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableMapelJp}
                      onChange={(e) => setEnableMapelJp(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Jumlah Jam Pelajaran (JP) / Minggu</span>
                  </label>
                  {enableMapelJp && (
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={mapelJp}
                      onChange={(e) => setMapelJp(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB: JURUSAN */}
            {activeTab === 'jurusan' && (
              <div className="space-y-4">
                <div className={`p-3.5 rounded-xl border transition ${enableDeptDesc ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableDeptDesc}
                      onChange={(e) => setEnableDeptDesc(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Deskripsi Program Keahlian</span>
                  </label>
                  {enableDeptDesc && (
                    <input
                      type="text"
                      placeholder="Contoh: Bidang Keahlian Teknologi Informasi dan Komunikasi"
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB: KELAS */}
            {activeTab === 'kelas' && (
              <div className="space-y-4">
                {/* Tingkat */}
                <div className={`p-3.5 rounded-xl border transition ${enableClassGrade ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableClassGrade}
                      onChange={(e) => setEnableClassGrade(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Tingkat Kelas</span>
                  </label>
                  {enableClassGrade && (
                    <div className="grid grid-cols-3 gap-2">
                      {([10, 11, 12] as const).map((g) => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setClassGrade(g)}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            classGrade === g
                              ? 'bg-cyan-700 text-white border-cyan-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kelas {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jurusan */}
                <div className={`p-3.5 rounded-xl border transition ${enableClassDept ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableClassDept}
                      onChange={(e) => setEnableClassDept(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Jurusan Kelas</span>
                  </label>
                  {enableClassDept && (
                    <select
                      value={classDept}
                      onChange={(e) => setClassDept(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Wali Kelas */}
                <div className={`p-3.5 rounded-xl border transition ${enableClassHomeroom ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableClassHomeroom}
                      onChange={(e) => setEnableClassHomeroom(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Tetapkan Wali Kelas</span>
                  </label>
                  {enableClassHomeroom && (
                    <select
                      value={classHomeroomId}
                      onChange={(e) => setClassHomeroomId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      <option value="">-- Kosongkan / Belum Ditentukan --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* TAB: RUANG */}
            {activeTab === 'ruang' && (
              <div className="space-y-4">
                {/* Tipe */}
                <div className={`p-3.5 rounded-xl border transition ${enableRoomType ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableRoomType}
                      onChange={(e) => setEnableRoomType(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Tipe Fasilitas Ruangan</span>
                  </label>
                  {enableRoomType && (
                    <div className="grid grid-cols-3 gap-2">
                      {(['Teori', 'Lab Komputer', 'Bengkel Praktik'] as const).map((rt) => (
                        <button
                          type="button"
                          key={rt}
                          onClick={() => setRoomType(rt)}
                          className={`p-2 rounded-lg text-xs font-bold border transition ${
                            roomType === rt
                              ? 'bg-cyan-700 text-white border-cyan-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gedung */}
                <div className={`p-3.5 rounded-xl border transition ${enableRoomBuilding ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableRoomBuilding}
                      onChange={(e) => setEnableRoomBuilding(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Nama Gedung / Lokasi</span>
                  </label>
                  {enableRoomBuilding && (
                    <input
                      type="text"
                      placeholder="Contoh: Gedung A Lantai 2"
                      value={roomBuilding}
                      onChange={(e) => setRoomBuilding(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB: TAHUN PELAJARAN */}
            {activeTab === 'tahun_pelajaran' && (
              <div className="space-y-4">
                <div className={`p-3.5 rounded-xl border transition ${enableAyStatus ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableAyStatus}
                      onChange={(e) => setEnableAyStatus(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Perbarui Status Aktif</span>
                  </label>
                  {enableAyStatus && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAyStatus('aktif')}
                        className={`p-2 rounded-lg text-xs font-bold border transition ${
                          ayStatus === 'aktif'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Aktif
                      </button>
                      <button
                        type="button"
                        onClick={() => setAyStatus('non_aktif')}
                        className={`p-2 rounded-lg text-xs font-bold border transition ${
                          ayStatus === 'non_aktif'
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Non-Aktif
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: JADWAL */}
            {activeTab === 'jadwal' && (
              <div className="space-y-4">
                {/* Ganti Hari */}
                <div className={`p-3.5 rounded-xl border transition ${enableSchDay ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableSchDay}
                      onChange={(e) => setEnableSchDay(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Pindahkan Hari Pelaksanaan</span>
                  </label>
                  {enableSchDay && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] as const).map((d) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setSchDay(d)}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition ${
                            schDay === d
                              ? 'bg-cyan-700 text-white border-cyan-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ganti Guru */}
                <div className={`p-3.5 rounded-xl border transition ${enableSchTeacher ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableSchTeacher}
                      onChange={(e) => setEnableSchTeacher(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Ganti Guru Pengajar Serentak</span>
                  </label>
                  {enableSchTeacher && (
                    <select
                      value={schTeacherId}
                      onChange={(e) => setSchTeacherId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      <option value="">-- Pilih Guru Baru --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} [{t.code}] - {t.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Ganti Ruang */}
                <div className={`p-3.5 rounded-xl border transition ${enableSchRoom ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableSchRoom}
                      onChange={(e) => setEnableSchRoom(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Ganti Ruang / Bengkel Praktik</span>
                  </label>
                  {enableSchRoom && (
                    <select
                      value={schRoomId}
                      onChange={(e) => setSchRoomId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      <option value="">-- Pilih Ruangan Baru --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code} - {r.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Ganti Kelas */}
                <div className={`p-3.5 rounded-xl border transition ${enableSchClass ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableSchClass}
                      onChange={(e) => setEnableSchClass(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Pindahkan Rombel / Kelas</span>
                  </label>
                  {enableSchClass && (
                    <select
                      value={schClassId}
                      onChange={(e) => setSchClassId(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      <option value="">-- Pilih Kelas Baru --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.department})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Ganti Rotasi Pekan (Sistem Blok Mingguan SMK) */}
                <div className={`p-3.5 rounded-xl border transition ${enableSchWeek ? 'bg-cyan-50/40 border-cyan-400 ring-1 ring-cyan-400/30' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-900 mb-2">
                    <input
                      type="checkbox"
                      checked={enableSchWeek}
                      onChange={(e) => setEnableSchWeek(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span>Ubah Rotasi Pekan (Sistem Blok Mingguan SMK)</span>
                  </label>
                  {enableSchWeek && (
                    <select
                      value={schWeek}
                      onChange={(e) => setSchWeek(e.target.value as ScheduleWeekType)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                    >
                      <option value="P10_PROD_P11_NORM">
                        Pekan Kelas 10 Produktif & Kelas 11 Normatif Adaptif
                      </option>
                      <option value="P10_NORM_P11_PROD">
                        Pekan Kelas 10 Normatif Adaptif & Kelas 11 Produktif
                      </option>
                      <option value="ALL">
                        Berlaku Kedua Pekan (Rutin Tiap Minggu)
                      </option>
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {hasAnyFieldSelected() ? 'Siap menerapkan perubahan.' : 'Pilih minimal satu bidang di atas.'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                disabled={!hasAnyFieldSelected()}
                className="px-4 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan Perubahan Masal</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
