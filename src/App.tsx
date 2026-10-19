import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { MonitoringView } from './components/monitoring/MonitoringView';
import { PembelajaranSayaView } from './components/guru/PembelajaranSayaView';
import { PapanGuruPiketView } from './components/piket/PapanGuruPiketView';
import { DashboardPimpinanView } from './components/pimpinan/DashboardPimpinanView';
import { DataMasterView } from './components/master/DataMasterView';
import { LaporanView } from './components/laporan/LaporanView';
import { ManajemenAkunView } from './components/manajemen/ManajemenAkunView';
import { ModeTVSekolahView } from './components/tv/ModeTVSekolahView';
import { LoginDemoModal } from './components/modals/LoginDemoModal';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeMenu, setActiveMenu, currentUser } = useApp();
  const [isDemoLoginOpen, setIsDemoLoginOpen] = useState(false);

  // TV mode takes over the entire viewport for digital signage
  if (activeMenu === 'mode_tv') {
    return <ModeTVSekolahView />;
  }

  // Verifikasi otorisasi hak akses menu sesuai peran akun yang login
  const isMenuAllowed = (): boolean => {
    if (currentUser.role === 'admin') return true;
    if (activeMenu === 'dashboard' || activeMenu === 'monitoring') return true;
    if (activeMenu === 'pembelajaran_saya') return currentUser.role === 'guru';
    if (activeMenu === 'guru_piket') {
      return currentUser.role === 'piket' || (currentUser.role === 'guru' && currentUser.isPiketToday === true);
    }
    if (activeMenu === 'dashboard_pimpinan') return currentUser.role === 'pimpinan';
    if (activeMenu === 'laporan') {
      return currentUser.role === 'piket' || currentUser.role === 'pimpinan';
    }
    // Data Master & Manajemen Akun hanya boleh dibuka oleh Admin
    return false;
  };

  const defaultUserMenu =
    currentUser.role === 'guru'
      ? 'pembelajaran_saya'
      : currentUser.role === 'piket'
      ? 'guru_piket'
      : currentUser.role === 'pimpinan'
      ? 'dashboard_pimpinan'
      : 'dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar onOpenDemoLogin={() => setIsDemoLoginOpen(true)} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenDemoLogin={() => setIsDemoLoginOpen(true)} />

        <main className="flex-1 pb-16">
          {!isMenuAllowed() ? (
            <div className="p-6 md:p-12 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Akses Terbatas (Di Luar Hak Akses)
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Menu ini diproteksi dan tidak dapat diakses oleh akun Anda. Anda saat ini login sebagai{' '}
                  <strong className="text-slate-900">{currentUser.name}</strong> dengan peran{' '}
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                    {currentUser.role}
                  </span>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveMenu(defaultUserMenu)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-[#0B1E2E] hover:bg-slate-800 text-white rounded-xl shadow-xs transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Menu Utama Anda</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeMenu === 'dashboard' && <DashboardView />}
              {activeMenu === 'monitoring' && <MonitoringView />}
              {activeMenu === 'pembelajaran_saya' && <PembelajaranSayaView />}
              {activeMenu === 'guru_piket' && <PapanGuruPiketView />}
              {activeMenu === 'dashboard_pimpinan' && <DashboardPimpinanView />}
              {activeMenu === 'data_master' && <DataMasterView />}
              {activeMenu === 'laporan' && <LaporanView />}
              {activeMenu === 'manajemen_akun' && <ManajemenAkunView />}
            </>
          )}
        </main>
      </div>

      {/* Login Demo Modal */}
      <LoginDemoModal
        isOpen={isDemoLoginOpen}
        onClose={() => setIsDemoLoginOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
