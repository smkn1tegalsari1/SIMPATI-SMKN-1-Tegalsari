import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Shield,
  ShieldCheck,
  Key,
  Check,
  Plus,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Edit3,
  Trash2,
  Calendar,
  Search,
  Filter,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Crown,
  BookOpen,
  Clock,
  AlertTriangle,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { UserAccount, AccountRole, DayNameIndo } from '../../types';

const DAYS_OF_WEEK: DayNameIndo[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const ManajemenAkunView: React.FC = () => {
  const {
    teachers,
    userAccounts,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    syncAccountsFromTeachers,
    updatePiketDays,
    currentUser,
    currentDayName,
    currentDateString,
    currentTimeString,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'accounts' | 'piket_matrix'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AccountRole | 'has_piket'>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetAccount, setResetAccount] = useState<UserAccount | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('guru123');
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<UserAccount | null>(null);

  // Form State for Add / Edit
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('guru123');
  const [formRole, setFormRole] = useState<AccountRole>('guru');
  const [formPiketDays, setFormPiketDays] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [formAdditionalDuty, setFormAdditionalDuty] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPassword = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Password untuk ${text} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSyncAll = () => {
    const res = syncAccountsFromTeachers();
    showToast(res.message);
  };

  // Open Modal to Add
  const openAddModal = () => {
    setEditingAccount(null);
    setFormTeacherId('');
    setFormName('');
    setFormUsername('');
    setFormPassword('guru123');
    setFormRole('guru');
    setFormPiketDays([]);
    setFormStatus('aktif');
    setFormAdditionalDuty('');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Open Modal to Edit
  const openEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFormTeacherId(acc.teacherId || '');
    setFormName(acc.name);
    setFormUsername(acc.username);
    setFormPassword(acc.password);
    setFormRole(acc.role);
    setFormPiketDays(acc.piketDays || []);
    setFormStatus(acc.status);
    setFormAdditionalDuty(acc.additionalDuty || '');
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Teacher dropdown selection auto-fill
  const handleTeacherSelect = (teacherId: string) => {
    setFormTeacherId(teacherId);
    if (!teacherId) return;

    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      setFormName(teacher.name);
      // Generate clean suggested username from teacher code or NIP
      const suggestedUser = teacher.code ? teacher.code.toUpperCase() : teacher.nip.replace(/\s+/g, '');
      setFormUsername(suggestedUser);
      if (teacher.piketDays && teacher.piketDays.length > 0) {
        setFormPiketDays(teacher.piketDays);
      }
    }
  };

  // Toggle day for Add/Edit Form
  const toggleFormPiketDay = (day: string) => {
    setFormPiketDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Save Add/Edit
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUser = formUsername.trim();
    if (!trimmedUser) {
      setFormError('Username tidak boleh kosong!');
      return;
    }
    if (!formPassword) {
      setFormError('Password tidak boleh kosong!');
      return;
    }
    if (!formName.trim()) {
      setFormError('Nama lengkap pengguna tidak boleh kosong!');
      return;
    }

    // Check duplicate username
    const duplicate = userAccounts.find(
      (a) => a.username.toLowerCase() === trimmedUser.toLowerCase() && a.id !== editingAccount?.id
    );
    if (duplicate) {
      setFormError(`Username "${trimmedUser}" sudah digunakan oleh akun lain!`);
      return;
    }

    const teacher = formTeacherId ? teachers.find((t) => t.id === formTeacherId) : undefined;

    if (editingAccount) {
      // Update
      const updated: UserAccount = {
        ...editingAccount,
        name: formName.trim(),
        username: trimmedUser,
        password: formPassword,
        role: formRole,
        teacherId: formTeacherId || undefined,
        teacherCode: teacher ? teacher.code : editingAccount.teacherCode,
        nip: teacher ? teacher.nip : editingAccount.nip,
        email: teacher ? teacher.email : editingAccount.email,
        piketDays: formPiketDays,
        status: formStatus,
        additionalDuty:
          formAdditionalDuty.trim() ||
          (formPiketDays.length > 0 ? `Guru Piket (${formPiketDays.join(', ')})` : undefined),
      };
      updateUserAccount(updated);
      showToast(`Akun "${updated.username}" (${updated.name}) berhasil diperbarui!`);
    } else {
      // Create new
      const newAcc: UserAccount = {
        id: `usr-${Date.now().toString(36)}`,
        name: formName.trim(),
        username: trimmedUser,
        password: formPassword,
        role: formRole,
        teacherId: formTeacherId || undefined,
        teacherCode: teacher?.code,
        nip: teacher?.nip,
        email: teacher?.email,
        piketDays: formPiketDays,
        status: formStatus,
        additionalDuty:
          formAdditionalDuty.trim() ||
          (formPiketDays.length > 0 ? `Guru Piket (${formPiketDays.join(', ')})` : undefined),
      };
      addUserAccount(newAcc);
      showToast(`Akun baru "${newAcc.username}" berhasil ditambahkan!`);
    }

    setIsAddEditModalOpen(false);
  };

  // Reset Password Save
  const handleSaveResetPassword = () => {
    if (!resetAccount || !newResetPassword) return;
    updateUserAccount({
      ...resetAccount,
      password: newResetPassword,
    });
    showToast(`Password untuk akun "${resetAccount.username}" berhasil direset!`);
    setIsResetPasswordModalOpen(false);
    setResetAccount(null);
  };

  // Quick Inline Piket Day Toggle on Table
  const handleQuickTogglePiketDay = (account: UserAccount, day: string) => {
    const currentDays = account.piketDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    updatePiketDays(account.id, newDays);
    showToast(
      newDays.includes(day)
        ? `${account.name} ditugaskan piket pada hari ${day}.`
        : `Tugas piket hari ${day} untuk ${account.name} dinonaktifkan.`
    );
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return userAccounts.filter((acc) => {
      // Role filter
      if (roleFilter === 'has_piket') {
        if (!acc.piketDays || acc.piketDays.length === 0) return false;
      } else if (roleFilter !== 'all' && acc.role !== roleFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = acc.name.toLowerCase().includes(q);
        const matchUsername = acc.username.toLowerCase().includes(q);
        const matchNip = acc.nip ? acc.nip.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) : false;
        const matchCode = acc.teacherCode ? acc.teacherCode.toLowerCase().includes(q) : false;
        return matchName || matchUsername || matchNip || matchCode;
      }

      return true;
    });
  }, [userAccounts, roleFilter, searchQuery]);

  // Statistics
  const totalAccounts = userAccounts.length;
  const adminCount = userAccounts.filter((a) => a.role === 'admin').length;
  const guruCount = userAccounts.filter((a) => a.role === 'guru').length;
  const pimpinanCount = userAccounts.filter((a) => a.role === 'pimpinan').length;
  const todayPiketCount = userAccounts.filter((a) => a.piketDays?.includes(currentDayName)).length;
  const totalTeachersSynced = userAccounts.filter((a) => a.teacherId).length;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0B1E2E] text-white px-5 py-3 rounded-xl shadow-2xl border border-teal-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Manajemen Akses & Sinkronisasi Guru</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Manajemen Akun Login & Penugasan Piket
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Kelola username dan password login yang tersinkronisasi langsung dengan Data Master Guru. Peran dapat diatur sebagai <b>Admin</b>, <b>Guru</b>, atau <b>Pimpinan</b>, serta penugasan tugas tambahan sebagai <b>Guru Piket</b> sesuai hari bertugas.
          </p>

          {/* Real-time Laptop Clock Display */}
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentDateString} · {currentTimeString}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition shadow-2xs"
            title="Sinkronkan data akun secara otomatis dengan seluruh daftar guru di Data Master"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
            <span>Sinkronkan Data Guru</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#0B1E2E] bg-[#E59819] hover:bg-[#d68c14] rounded-xl transition shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Akun</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">{totalAccounts}</p>
            <p className="text-[10px] text-slate-400 truncate">{guruCount} Guru · {adminCount} Admin · {pimpinanCount} Pimp</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tersinkron Guru</p>
            <p className="text-xl font-extrabold text-teal-700 leading-tight">{totalTeachersSynced} / {teachers.length}</p>
            <p className="text-[10px] text-teal-600 font-medium">100% Terkoneksi Data Master</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Piket Hari Ini ({currentDayName})</p>
            <p className="text-xl font-extrabold text-emerald-700 leading-tight">{todayPiketCount} Guru</p>
            <p className="text-[10px] text-emerald-600 font-medium">Aktif Bertugas Hari Ini</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Guru Piket</p>
            <p className="text-xl font-extrabold text-amber-700 leading-tight">
              {userAccounts.filter((a) => a.piketDays && a.piketDays.length > 0).length} Guru
            </p>
            <p className="text-[10px] text-slate-400">Terjadwal Senin–Jumat</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'accounts'
              ? 'border-cyan-600 text-cyan-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Akun & Kredensial Login ({filteredAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('piket_matrix')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'piket_matrix'
              ? 'border-cyan-600 text-cyan-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Matriks Jadwal Guru Piket Mingguan (Senin–Jumat)</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNTS LIST & CREDENTIALS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama guru, username, NIP, atau kode guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition"
              />
            </div>

            {/* Role Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {(
                [
                  { id: 'all', label: 'Semua Akun' },
                  { id: 'admin', label: 'Admin' },
                  { id: 'guru', label: 'Guru' },
                  { id: 'pimpinan', label: 'Pimpinan' },
                  { id: 'has_piket', label: 'Ada Tugas Piket' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRoleFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    roleFilter === f.id
                      ? 'bg-[#0B1E2E] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">PENGGUNA / GURU</th>
                    <th className="py-3 px-4">USERNAME LOGIN</th>
                    <th className="py-3 px-4">PASSWORD</th>
                    <th className="py-3 px-4 text-center">ROLE</th>
                    <th className="py-3 px-4">TUGAS TAMBAHAN PIKET (HARI)</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm text-slate-600">Tidak ada akun yang sesuai dengan filter.</p>
                        <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isRevealed = visiblePasswords[acc.id] || false;
                      const isCurrentLoggedIn =
                        currentUser.id === acc.id ||
                        currentUser.username === acc.username ||
                        (acc.teacherId && currentUser.teacherId === acc.teacherId);
                      const isPiketToday = acc.piketDays?.includes(currentDayName);

                      return (
                        <tr
                          key={acc.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrentLoggedIn ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Guru / Pengguna */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  acc.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : acc.role === 'pimpinan'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-cyan-100 text-cyan-800'
                                }`}
                              >
                                {acc.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-900 truncate">{acc.name}</p>
                                  {isCurrentLoggedIn && (
                                    <span className="text-[10px] font-extrabold bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-md">
                                      Sedang Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                  {acc.nip && <span>NIP: {acc.nip}</span>}
                                  {acc.teacherCode && (
                                    <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-600">
                                      Kode: {acc.teacherCode}
                                    </span>
                                  )}
                                  {acc.teacherId ? (
                                    <span className="text-[10px] text-teal-600 font-sans font-semibold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Sinkron Data Guru
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-sans">Akun Sistem</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                              {acc.username}
                            </span>
                          </td>

                          {/* Password */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 min-w-[70px] text-center font-medium text-slate-700">
                                {isRevealed ? acc.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                                title={isRevealed ? 'Sembunyikan password' : 'Lihat password'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(acc.password, acc.id)}
                                className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded transition"
                                title="Salin password ke clipboard"
                              >
                                {copiedId === acc.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${
                                acc.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : acc.role === 'pimpinan'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                              }`}
                            >
                              {acc.role === 'admin' ? (
                                <Shield className="w-3 h-3 text-purple-700" />
                              ) : acc.role === 'pimpinan' ? (
                                <Crown className="w-3 h-3 text-amber-700" />
                              ) : (
                                <BookOpen className="w-3 h-3 text-cyan-700" />
                              )}
                              <span>{acc.role.toUpperCase()}</span>
                            </span>
                          </td>

                          {/* Tugas Tambahan Piket (Day Badges) */}
                          <td className="py-3 px-4">
                            <div className="space-y-1.5">
                              {/* Interactive day chips */}
                              <div className="flex flex-wrap gap-1 items-center">
                                {DAYS_OF_WEEK.map((day) => {
                                  const isAssigned = acc.piketDays?.includes(day);
                                  const isToday = day === currentDayName;
                                  return (
                                    <button
                                      key={day}
                                      onClick={() => handleQuickTogglePiketDay(acc, day)}
                                      title={`Klik untuk mengaktifkan/menonaktifkan tugas piket hari ${day}`}
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition ${
                                        isAssigned
                                          ? isToday
                                            ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400'
                                            : 'bg-teal-600 text-white'
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                                      }`}
                                    >
                                      {day.slice(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Today Piket Tag */}
                              {isPiketToday && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Petugas Hari Ini ({currentDayName})</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                acc.status === 'aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {acc.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(acc)}
                                className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition"
                                title="Edit akun & penugasan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setResetAccount(acc);
                                  setNewResetPassword('guru123');
                                  setIsResetPasswordModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Reset password login"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmAccount(acc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer summary table */}
            <div className="bg-slate-50/80 p-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span>Menampilkan {filteredAccounts.length} dari {totalAccounts} akun pengguna</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Guru Piket Aktif
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Bukan Hari Piket
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PIKET MATRIX (Senin s/d Jumat) */}
      {activeTab === 'piket_matrix' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-teal-900 to-emerald-950 rounded-3xl p-6 text-white shadow-md space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Jadwal Tugas Tambahan Guru Piket Mingguan</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Matriks Penugasan Petugas Piket (Senin – Jumat)
            </h2>
            <p className="text-xs text-emerald-100 max-w-3xl leading-relaxed">
              Guru piket bertugas memantau kehadiran fisik, mengonfirmasi jurnal KBM kelas, serta menugaskan guru pengganti (inval). Penugasan ini saling tersinkronisasi otomatis dengan akun login guru terkait.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const assignedTeachers = userAccounts.filter((a) => a.piketDays?.includes(day));
              const isToday = day === currentDayName;

              return (
                <div
                  key={day}
                  className={`bg-white rounded-2xl border transition-all duration-150 p-5 space-y-4 ${
                    isToday
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Day Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">{day}</span>
                      {isToday && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          HARI INI
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {assignedTeachers.length} Guru Ditugaskan
                    </span>
                  </div>

                  {/* List of Teachers Assigned to this day */}
                  <div className="space-y-2 min-h-[140px]">
                    {assignedTeachers.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                        <p className="text-xs font-medium">Belum ada guru piket terjadwal di hari {day}.</p>
                      </div>
                    ) : (
                      assignedTeachers.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              Kode: {t.teacherCode || t.username} {t.nip && `· NIP: ${t.nip}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleQuickTogglePiketDay(t, day)}
                            className="text-rose-400 hover:text-rose-600 p-1 text-xs hover:bg-rose-50 rounded transition shrink-0"
                            title={`Hapus tugas piket hari ${day}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Assign Dropdown for this day */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      + Tambah Guru Piket Hari {day}:
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) return;
                        const targetAcc = userAccounts.find((a) => a.id === targetId);
                        if (targetAcc) {
                          handleQuickTogglePiketDay(targetAcc, day);
                        }
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:border-cyan-500 focus:bg-white cursor-pointer"
                    >
                      <option value="">Pilih guru untuk ditugaskan...</option>
                      {userAccounts
                        .filter((a) => a.role === 'guru' && !a.piketDays?.includes(day))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.teacherCode || a.username})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ACCOUNT */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingAccount ? 'Edit Akun & Hak Akses' : 'Tambah Akun Login Baru'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingAccount
                      ? `Memperbarui akun ${editingAccount.username}`
                      : 'Sinkronkan akun dengan Data Guru atau buat akun kustom'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Teacher selector (Sinkronkan dengan Data Master Guru) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sinkronkan dengan Data Guru (Opsional)
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => handleTeacherSelect(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none"
                >
                  <option value="">-- Pilih Guru dari Data Master (Otomatis Terhubung) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Kode: {t.code} · NIP: {t.nip})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Memilih guru akan otomatis menghubungkan akun ini dengan jadwal KBM dan pembelajaran guru tersebut.
                </p>
              </div>

              {/* Nama Pengguna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pengguna *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: BAYU PANDU WIBISONO, S.Kom"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: BPW atau NIP"
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Contoh: guru123"
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Role selection (Admin, Guru, Pimpinan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran / Hak Akses (Role) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'admin' as AccountRole, label: 'Admin', desc: 'Akses Penuh', icon: Shield },
                      { id: 'guru' as AccountRole, label: 'Guru', desc: 'Mapel & Piket', icon: BookOpen },
                      { id: 'pimpinan' as AccountRole, label: 'Pimpinan', desc: 'Kepsek & Waka', icon: Crown },
                    ] as const
                  ).map((r) => {
                    const isSelected = formRole === r.id;
                    const Icon = r.icon;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setFormRole(r.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-700' : 'text-slate-400'}`} />
                          <span className="font-bold text-xs text-slate-900">{r.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tugas Tambahan Guru Piket (Senin - Jumat) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tugas Tambahan Guru Piket (Pilih Hari Bertugas):</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formPiketDays.length} Hari Dipilih
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pilih hari dimana guru ini bertugas sebagai Guru Piket. Pada hari tersebut, guru otomatis memiliki hak akses verifikasi piket dan monitoring kehadiran fisik sekolah.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const checked = formPiketDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleFormPiketDay(day)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-center ${
                          checked
                            ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Akun & Catatan Tambahan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'aktif' | 'nonaktif')}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                  >
                    <option value="aktif">Aktif (Dapat Login)</option>
                    <option value="nonaktif">Nonaktif (Blokir Akses)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jabatan / Tugas Tambahan Khusus
                  </label>
                  <input
                    type="text"
                    value={formAdditionalDuty}
                    onChange={(e) => setFormAdditionalDuty(e.target.value)}
                    placeholder="Contoh: Kepala Sekolah / Waka Kurikulum"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl transition shadow-md"
                >
                  {editingAccount ? 'Simpan Perubahan' : 'Buat Akun Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {isResetPasswordModalOpen && resetAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Reset Password Akun</h3>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan mengubah password login untuk pengguna <b>{resetAccount.name}</b> (Username: <code className="font-bold text-cyan-800">{resetAccount.username}</code>).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru *</label>
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full text-sm font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewResetPassword('guru123')}
                  className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  Set ke Default "guru123"
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewResetPassword(`smk${Math.floor(1000 + Math.random() * 9000)}`)
                  }
                  className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition"
                >
                  Generate Acak
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveResetPassword}
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl shadow-md"
                >
                  Simpan Password Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun login <b>{deleteConfirmAccount.username}</b> ({deleteConfirmAccount.name})? Guru ini tidak akan dapat login lagi menggunakan username tersebut.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeleteConfirmAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteUserAccount(deleteConfirmAccount.id);
                  showToast(`Akun ${deleteConfirmAccount.username} telah dihapus.`);
                  setDeleteConfirmAccount(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
