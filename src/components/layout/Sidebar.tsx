import React from 'react';
import {
  LayoutGrid,
  Tv,
  BookOpen,
  ShieldCheck,
  BarChart3,
  Database,
  FileText,
  Users,
  Tv2,
  LogOut,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveMenu, UserRole } from '../../types';

interface SidebarProps {
  onOpenDemoLogin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDemoLogin }) => {
  const { activeMenu, setActiveMenu, currentUser } = useApp();

  const allMenuItems: {
    id: ActiveMenu;
    label: string;
    icon: React.FC<{ className?: string }>;
    allowedRoles: UserRole[];
    allowIfPiketToday?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, allowedRoles: ['admin', 'guru', 'piket', 'pimpinan'] },
    { id: 'pembelajaran_saya', label: 'Pembelajaran Saya', icon: BookOpen, allowedRoles: ['admin', 'guru'] },
    { id: 'guru_piket', label: 'Guru Piket', icon: ShieldCheck, allowedRoles: ['admin', 'piket'], allowIfPiketToday: true },
    { id: 'monitoring', label: 'Monitoring Pembelajaran', icon: Tv, allowedRoles: ['admin', 'guru', 'piket', 'pimpinan'] },
    { id: 'dashboard_pimpinan', label: 'Dashboard Pimpinan', icon: BarChart3, allowedRoles: ['admin', 'pimpinan'] },
    { id: 'data_master', label: 'Data Master', icon: Database, allowedRoles: ['admin'] },
    { id: 'laporan', label: 'Laporan', icon: FileText, allowedRoles: ['admin', 'piket', 'pimpinan'] },
    { id: 'manajemen_akun', label: 'Manajemen Akun', icon: Users, allowedRoles: ['admin'] },
    { id: 'mode_tv', label: 'Dashboard TV', icon: Tv2, allowedRoles: ['admin', 'guru', 'piket', 'pimpinan'] },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (currentUser.role === 'admin') return true;
    if (item.allowedRoles.includes(currentUser.role)) return true;
    if (item.allowIfPiketToday && currentUser.role === 'guru' && currentUser.isPiketToday) return true;
    return false;
  });

  return (
    <aside className="w-64 bg-[#0B1E2E] text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-slate-800/60 select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center gap-3.5 border-b border-slate-800/40">
          <div className="w-10 h-10 rounded-full bg-cyan-600/90 flex items-center justify-center text-white shadow-sm ring-2 ring-cyan-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-tight">
              SIMPATI
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              SMKN 1 Tegalsari
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#E59819] text-[#0A1622] font-semibold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0A1622]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800/60 bg-[#091724]">
        <div className="flex items-center justify-between mb-3">
          <div className="truncate mr-2">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {currentUser.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 truncate">
              {currentUser.username && (
                <span className="font-mono text-[10px] bg-slate-800 text-amber-300 px-1 rounded">
                  @{currentUser.username}
                </span>
              )}
              <span className="text-[11px] text-slate-400 truncate">
                {currentUser.role.toUpperCase()}
              </span>
              {currentUser.isPiketToday && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded">
                  Piket
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenDemoLogin}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 rounded-lg transition"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Ganti Akun / Keluar</span>
        </button>
      </div>
    </aside>
  );
};
