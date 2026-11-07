import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount, CurrentUser, UserRole } from '../../types';

interface EditAkunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditAkunModal: React.FC<EditAkunModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    userAccounts,
    updateUserAccount,
    currentDayName,
  } = useApp();

  // Cari akun yang sedang login dari database userAccounts
  const matchedAccount: UserAccount | undefined = useMemo(() => {
    return userAccounts.find(
      (a) =>
        a.id === currentUser.id ||
        (currentUser.teacherId && a.teacherId === currentUser.teacherId) ||
        a.username.toLowerCase() === (currentUser.username || '').toLowerCase()
    );
  }, [userAccounts, currentUser]);

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      return;
    }

    if (matchedAccount) {
      setUsername(matchedAccount.username);
      setPassword(matchedAccount.password);
      setConfirmPassword(matchedAccount.password);
    } else {
      setUsername(currentUser.username || '');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, matchedAccount, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Username login tidak boleh kosong!');
      return;
    }

    if (cleanUsername.includes(' ')) {
      setErrorMsg('Username tidak boleh mengandung spasi (gunakan huruf, angka, atau tanda titik/strip)!');
      return;
    }

    // Cek apakah username sudah dipakai oleh akun lain
    const isTaken = userAccounts.some(
      (a) =>
        a.username.toLowerCase() === cleanUsername.toLowerCase() &&
        a.id !== matchedAccount?.id
    );
    if (isTaken) {
      setErrorMsg(`Username "${cleanUsername}" sudah digunakan oleh akun lain. Silakan pilih username lain.`);
      return;
    }

    if (!password) {
      setErrorMsg('Password baru wajib diisi!');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password minimal terdiri dari 4 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password baru!');
      return;
    }

    if (!matchedAccount) {
      setErrorMsg('Data akun tidak ditemukan dalam sistem database.');
      return;
    }

    const updatedAccount: UserAccount = {
      ...matchedAccount,
      username: cleanUsername,
      password: password,
      teacherCode: matchedAccount.teacherId ? cleanUsername : matchedAccount.teacherCode,
    };

    updateUserAccount(updatedAccount);

    setSuccessMsg('Akun login Anda berhasil diperbarui dan tersinkronisasi ke server!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-[#0B1E2E] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Edit Akun & Password Saya
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Perbarui username dan password login akun guru Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs md:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profil Singkat Guru */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-slate-900 truncate">{currentUser.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 uppercase shrink-0">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                {currentUser.nip && <span>NIP: {currentUser.nip}</span>}
                {currentUser.teacherCode && (
                  <span className="font-mono bg-slate-200/80 px-1.5 rounded text-slate-700 font-bold">
                    Kode: {currentUser.teacherCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Input Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Username Login Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username login..."
                required
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Username digunakan untuk masuk (login) ke aplikasi SIMPATI.
            </p>
          </div>

          {/* Input Password Baru */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password baru..."
                required
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password Baru */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru..."
                required
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Kotak Informasi Backup Admin */}
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-start gap-2.5 text-xs text-cyan-950">
            <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Keterangan Bantuan:</strong> Perubahan username dan password ini akan langsung tersinkron secara real-time. Jika sewaktu-waktu Anda lupa password, Administrator sekolah tetap dapat melihat atau membantu mereset password akun Anda melalui menu <strong>Manajemen Akun</strong>.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-[#E59819] hover:bg-[#d68c14] rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Sinkronkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
