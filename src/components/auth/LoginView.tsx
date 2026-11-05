import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithCredentials, currentDateString, currentTimeString } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const userTrimmed = username.trim();
    if (!userTrimmed) {
      setErrorMessage('Harap masukkan Username, Kode Guru, atau NIP!');
      return;
    }
    if (!password) {
      setErrorMessage('Harap masukkan Password akun Anda!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(userTrimmed, password);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk ke sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07131D] via-[#0B1E2E] to-[#132A3E] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-slate-100 font-sans relative overflow-hidden">
      {/* Decorative Background Lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Clock & Live Sync Indicator */}
      <header className="flex flex-wrap items-center justify-between gap-3 max-w-6xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-600/90 flex items-center justify-center text-white shadow-lg ring-2 ring-cyan-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
              SIMPATI
            </h1>
            <p className="text-[11px] text-cyan-300/80 font-medium tracking-wide">
              SMKN 1 Tegalsari · Banyuwangi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Radio className="w-3.5 h-3.5" />
            <span>Server Pusat Terhubung (Sinkron Real-Time)</span>
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentDateString} · {currentTimeString}</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center py-8 z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Title Banner */}
          <div className="p-6 sm:p-7 bg-gradient-to-r from-[#0B1E2E] to-[#122A3F] text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight leading-tight">
                  Masuk ke Aplikasi
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  Sistem Informasi Presensi & Jadwal KBM Terpadu
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-300/90 leading-relaxed mt-2 pt-2 border-t border-white/10">
              Silakan masukkan Username, Kode Guru, atau NIP beserta Password resmi yang telah didaftarkan oleh Administrator.
            </p>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-7 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username / Kode Guru / NIP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: admin, BPW, G10, atau NIP..."
                    className="w-full text-xs font-semibold pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 outline-none transition text-slate-800"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda..."
                    className="w-full text-xs font-semibold pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 outline-none transition text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                <span>
                  Akun pengguna dibuat dan dikelola secara terpusat oleh <strong>Administrator</strong>. Hak akses menu (*Guru, Piket, Pimpinan, Admin*) akan aktif otomatis sesuai kredensial login.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi Akun...' : 'Masuk ke Sistem SIMPATI'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-2 max-w-6xl w-full mx-auto z-10">
        <p>
          Sistem Informasi Manajemen Presensi & Aktivitas Terpadu Instansi (SIMPATI) · Hak Cipta © {new Date().getFullYear()} SMKN 1 Tegalsari
        </p>
      </footer>
    </div>
  );
};
