import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Shield, User, UserCheck, Crown, CalendarDays, Sparkles } from 'lucide-react';
import { PERIOD_TIMES } from '../../data/initialData';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenDemoLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDemoLogin }) => {
  const {
    currentUser,
    switchRole,
    currentPeriod,
    setPeriodSimulated,
    currentTimeString,
    currentDateString,
    semesterString,
    realtimeWeekType,
    activeWeekFilter,
    effectiveWeekType,
    setActiveWeekFilter,
    getWeekTypeShortLabel,
  } = useApp();

  const roleLabels: Record<UserRole, { label: string; icon: React.FC<{ className?: string }> }> = {
    admin: { label: 'Administrator', icon: Shield },
    guru: { label: 'Guru Mapel', icon: User },
    piket: { label: 'Guru Piket', icon: UserCheck },
    pimpinan: { label: 'Pimpinan', icon: Crown },
  };

  const RoleIcon = roleLabels[currentUser.role]?.icon || User;

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight leading-tight">
            SIMPATI SMKN 1 Tegalsari
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Real-Time
          </span>
        </div>
        <p className="text-xs text-slate-500 font-normal">
          Sistem Informasi Manajemen Pembelajaran Terintegrasi
        </p>
      </div>

      {/* Middle & Right Section: Controls, Week Rotation, & Clock */}
      <div className="flex flex-wrap items-center gap-2.5 md:gap-4">
        {/* Selector Rotasi Pekan (K10 Produktif & K11 NormAdaptif vs K10 NormAdaptif & K11 Produktif) */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-cyan-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
          <CalendarDays className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span className="font-bold text-slate-700 hidden lg:inline">Rotasi:</span>
          <select
            value={activeWeekFilter}
            onChange={(e) => setActiveWeekFilter(e.target.value as any)}
            className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer max-w-[220px] md:max-w-[260px] truncate"
            title="Pilih rotasi pekan: Otomatis sesuai kalender laptop, atau pilih manual"
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

        {/* Time Simulator Picker */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-medium text-slate-700">Jam:</span>
          <select
            value={currentPeriod}
            onChange={(e) => setPeriodSimulated(Number(e.target.value))}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
          >
            {PERIOD_TIMES.map((p) => (
              <option key={p.period} value={p.period}>
                Ke-{p.period} ({p.range})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Role Switcher Pill */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['admin', 'guru', 'piket', 'pimpinan'] as UserRole[]).map((r) => {
            const isCurrent = currentUser.role === r;
            return (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[11px] md:text-xs font-semibold rounded-md transition-all ${
                  isCurrent
                    ? 'bg-[#E59819] text-[#0B1E2E] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {r === 'admin' ? 'Admin' : r === 'guru' ? 'Guru' : r === 'piket' ? 'Piket' : 'Pimpinan'}
              </button>
            );
          })}
        </div>

        {/* Date & Time Widget (Real-Time sesuai Waktu Laptop) */}
        <div className="text-right pl-2 border-l border-slate-200">
          <div className="text-xs font-bold text-slate-800 tracking-tight flex items-center justify-end gap-1.5">
            <span>{currentDateString}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium tabular-nums flex items-center justify-end gap-1">
            <span className="font-bold text-cyan-800">{currentTimeString}</span>
            <span>·</span>
            <span>{semesterString}</span>
          </div>
        </div>

        {/* Current Active User Button */}
        <button
          onClick={onOpenDemoLogin}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition"
          title={`Masuk sebagai ${currentUser.name} (${currentUser.username || currentUser.role}) · Klik untuk Login / Ganti Akun`}
        >
          <RoleIcon className="w-3.5 h-3.5 text-cyan-600" />
          <span className="hidden sm:inline font-bold">{currentUser.name}</span>
          {currentUser.username && (
            <span className="hidden md:inline font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
              {currentUser.username}
            </span>
          )}
          {currentUser.isPiketToday && (
            <span className="hidden xl:inline text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
              Piket Hari Ini
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
