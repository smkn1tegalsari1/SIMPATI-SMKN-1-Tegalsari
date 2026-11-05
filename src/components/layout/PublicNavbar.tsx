import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Clock,
  CalendarDays,
  Tv2,
  LogIn,
  Radio,
  Sparkles,
} from 'lucide-react';

interface PublicNavbarProps {
  onOpenLogin: () => void;
  onOpenTVMode: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onOpenLogin, onOpenTVMode }) => {
  const {
    currentDateString,
    currentTimeString,
    semesterString,
    realtimeWeekType,
    activeWeekFilter,
    setActiveWeekFilter,
    isServerConnected,
  } = useApp();

  return (
    <header className="bg-white border-b border-slate-200/90 px-4 md:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center text-white shadow-md shadow-cyan-950/20 ring-2 ring-cyan-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                SIMPATI
              </h1>
              <span className="text-[10px] font-extrabold bg-[#0B1E2E] text-amber-300 px-2 py-0.5 rounded-md tracking-wider">
                SMKN 1 TEGALSARI
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Sistem Informasi Manajemen Pembelajaran & Monitoring KBM Terintegrasi
            </p>
          </div>
        </div>

        {/* Right Section: Controls & Login Button */}
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
          {/* Week Rotation Selector */}
          <div className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-cyan-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
            <span className="font-bold text-slate-700">Rotasi:</span>
            <select
              value={activeWeekFilter}
              onChange={(e) => setActiveWeekFilter(e.target.value as any)}
              className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="AUTO">
                ⚡ Otomatis Real-Time ({realtimeWeekType === 'P10_PROD_P11_NORM' ? 'K10 Prod · K11 Norm' : 'K10 Norm · K11 Prod'})
              </option>
              <option value="P10_PROD_P11_NORM">
                🟢 Pekan K10 Produktif & K11 NormAdaptif
              </option>
              <option value="P10_NORM_P11_PROD">
                🟣 Pekan K10 NormAdaptif & K11 Produktif
              </option>
              <option value="ALL">
                🌐 Semua Pekan (Tampilkan Semua)
              </option>
            </select>
          </div>

          {/* Live Clock Widget */}
          <div className="hidden md:flex flex-col text-right pl-3 pr-2 border-l border-slate-200">
            <div className="text-xs font-bold text-slate-800 tracking-tight flex items-center justify-end gap-1.5">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>{currentDateString}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium tabular-nums flex items-center justify-end gap-1">
              <span className="font-bold text-cyan-800">{currentTimeString}</span>
              <span>·</span>
              <span>{semesterString}</span>
            </div>
          </div>

          {/* Server Sync Indicator */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
              isServerConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title="Status koneksi sinkronisasi data real-time dengan server"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isServerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isServerConnected ? 'Real-Time' : 'Lokal'}</span>
          </div>

          {/* Mode TV Digital Signage Button */}
          <button
            onClick={onOpenTVMode}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Buka Layar Penuh Mode TV Sekolah"
          >
            <Tv2 className="w-3.5 h-3.5 text-cyan-700" />
            <span className="hidden sm:inline">Mode TV</span>
          </button>

          {/* Login Button (Menu Masuk Aplikasi) */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-[#0B1E2E] font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 hover:shadow-lg transition cursor-pointer active:scale-95 ring-1 ring-amber-600/30"
            title="Masuk ke aplikasi sebagai Admin, Guru, Guru Piket, atau Pimpinan"
          >
            <LogIn className="w-4 h-4 text-[#0B1E2E]" />
            <span>Masuk ke Aplikasi</span>
          </button>
        </div>
      </div>
    </header>
  );
};
