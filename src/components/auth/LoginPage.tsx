import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Check,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
} from 'lucide-react';

interface LoginPageProps {
  onBackToMonitoring?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToMonitoring }) => {
  const { loginWithCredentials, isServerConnected, currentDateString, currentTimeString } = useApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const userClean = usernameInput.trim();
    if (!userClean) {
      setErrorMessage('Harap masukkan Username, Kode Guru, atau NIP Anda!');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Harap masukkan Password akun Anda!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(userClean, passwordInput);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat verifikasi login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-600/20 via-blue-700/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-gradient-to-t from-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>SIMPATI</span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                SMKN 1 TEGALSARI
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sistem Informasi Manajemen Pembelajaran Terintegrasi
            </p>
          </div>
        </div>

        {/* Live Clock & Connection Badge */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-200">{currentDateString}</span>
            <span>·</span>
            <span className="font-mono text-cyan-300 font-bold">{currentTimeString}</span>
          </div>

          {onBackToMonitoring && (
            <button
              onClick={onBackToMonitoring}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
              title="Kembali ke tampilan Monitoring Pembelajaran"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Monitoring</span>
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isServerConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isServerConnected ? 'Server Terhubung (Real-Time)' : 'Menghubungkan Server...'}</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-[#0C1D2D]/90 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Masuk ke Aplikasi
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Silakan masukkan Username, Kode Guru, atau NIP beserta Password yang terdaftar resmi.
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Username / Kode Guru / NIP
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Contoh: admin, G01, BPW, kepsek, atau NIP..."
                  className="w-full text-xs font-semibold pl-4 pr-10 py-3 bg-slate-900/90 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 outline-none transition"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full text-xs font-semibold pl-4 pr-10 py-3 bg-slate-900/90 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 outline-none transition font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-900/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Memverifikasi Akun...' : 'Masuk ke Sistem'}</span>
              </button>

              {onBackToMonitoring && (
                <button
                  type="button"
                  onClick={onBackToMonitoring}
                  className="w-full py-2.5 px-4 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kembali ke Monitoring Pembelajaran</span>
                </button>
              )}
            </div>
          </form>

          {/* Official Security Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Akun pengguna (Guru, Piket, Pimpinan) didaftarkan dan dikelola oleh <strong>Administrator</strong>. Hubungi admin sekolah jika belum memiliki akses atau ingin mereset password.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center border-t border-slate-800/80 text-xs text-slate-500">
        <p>
          SIMPATI © {new Date().getFullYear()} · SMKN 1 Tegalsari · Manajemen KBM Guru & Validasi Piket Terpadu
        </p>
      </footer>
    </div>
  );
};
