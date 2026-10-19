import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Shield,
  User,
  UserCheck,
  Crown,
  Check,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Key,
  BookOpen,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types';

interface LoginDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginDemoModal: React.FC<LoginDemoModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userAccounts, loginWithCredentials, switchRole, currentDayName } = useApp();

  const [activeTab, setActiveTab] = useState<'form' | 'quick'>('form');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!usernameInput.trim()) {
      setErrorMessage('Harap masukkan Username atau NIP!');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Harap masukkan Password login!');
      return;
    }

    const res = loginWithCredentials(usernameInput, passwordInput);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 700);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSelectQuickAccount = (acc: typeof userAccounts[0]) => {
    setUsernameInput(acc.username);
    setPasswordInput(acc.password);
    setErrorMessage(null);

    const res = loginWithCredentials(acc.username, acc.password);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 600);
    }
  };

  const handleFillFormOnly = (acc: typeof userAccounts[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setUsernameInput(acc.username);
    setPasswordInput(acc.password);
    setActiveTab('form');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Autentikasi Akun SIMPATI</h3>
              <p className="text-xs text-slate-300">
                Masuk menggunakan Username & Password tersinkron dengan Data Guru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'form'
                ? 'border-cyan-600 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Form Login Username & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'quick'
                ? 'border-cyan-600 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Daftar Cepat Akun Terkoneksi ({userAccounts.length})</span>
          </button>
        </div>

        {/* Tab 1: Form Login */}
        {activeTab === 'form' && (
          <div className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleFormLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / Kode Guru / NIP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Contoh: admin, BPW, G10, atau NIP"
                    className="w-full text-xs font-medium pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Dapat menggunakan username akun (e.g. <code>BPW</code>, <code>G10</code>, <code>admin</code>), kode guru, atau NIP.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password akun..."
                    className="w-full text-xs font-medium pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Default password guru: <code>guru123</code> · Admin: <code>admin123</code> · Pimpinan: <code>pimpinan123</code>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Pill Helper */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 mb-2">
                Uji Coba Cepat (Klik untuk Mengisi Form):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Admin (admin/admin123)', u: 'admin', p: 'admin123' },
                  { label: 'Guru BPW (BPW/guru123)', u: 'BPW', p: 'guru123' },
                  { label: 'Piket Hari Ini (G10/guru123)', u: 'G10', p: 'guru123' },
                  { label: 'Kepsek (kepsek/pimpinan123)', u: 'kepsek', p: 'pimpinan123' },
                ].map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUsernameInput(demo.u);
                      setPasswordInput(demo.p);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 transition"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quick List of All Connected Accounts */}
        {activeTab === 'quick' && (
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-500 mb-2">
              Daftar seluruh akun yang tersinkronisasi langsung dengan Data Master Guru. Klik baris akun untuk langsung login:
            </p>

            <div className="space-y-2">
              {userAccounts.map((acc) => {
                const isSelected =
                  currentUser.id === acc.id ||
                  currentUser.username === acc.username ||
                  (acc.teacherId && currentUser.teacherId === acc.teacherId);
                const isPiketToday = acc.piketDays?.includes(currentDayName);

                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectQuickAccount(acc)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          acc.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.role === 'pimpinan'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {acc.role === 'admin' ? (
                          <Shield className="w-4 h-4" />
                        ) : acc.role === 'pimpinan' ? (
                          <Crown className="w-4 h-4" />
                        ) : isPiketToday ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 truncate">{acc.name}</p>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                              acc.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : acc.role === 'pimpinan'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-cyan-100 text-cyan-800'
                            }`}
                          >
                            {acc.role}
                          </span>
                          {isPiketToday && (
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              Piket Hari Ini
                            </span>
                          )}
                          {isSelected && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded">
                              <Check className="w-2.5 h-2.5" /> Aktif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>User: <b className="text-slate-800">{acc.username}</b></span>
                          <span>Pass: <b className="text-slate-800">{acc.password}</b></span>
                          {acc.piketDays && acc.piketDays.length > 0 && (
                            <span className="font-sans text-teal-700">
                              (Piket: {acc.piketDays.join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleFillFormOnly(acc, e)}
                        className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        title="Isi ke form login"
                      >
                        Isi Form
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectQuickAccount(acc)}
                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg transition"
                      >
                        Masuk
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="truncate mr-2">
            <span>Saat ini: <b>{currentUser.name}</b> ({currentUser.role.toUpperCase()})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                switchRole('admin');
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
              title="Reset ke akun Administrator"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar ke Admin</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
