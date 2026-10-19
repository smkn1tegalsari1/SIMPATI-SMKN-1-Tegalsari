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

const MainAppContent: React.FC = () => {
  const { activeMenu } = useApp();
  const [isDemoLoginOpen, setIsDemoLoginOpen] = useState(false);

  // TV mode takes over the entire viewport for digital signage
  if (activeMenu === 'mode_tv') {
    return <ModeTVSekolahView />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar onOpenDemoLogin={() => setIsDemoLoginOpen(true)} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenDemoLogin={() => setIsDemoLoginOpen(true)} />

        <main className="flex-1 pb-16">
          {activeMenu === 'dashboard' && <DashboardView />}
          {activeMenu === 'monitoring' && <MonitoringView />}
          {activeMenu === 'pembelajaran_saya' && <PembelajaranSayaView />}
          {activeMenu === 'guru_piket' && <PapanGuruPiketView />}
          {activeMenu === 'dashboard_pimpinan' && <DashboardPimpinanView />}
          {activeMenu === 'data_master' && <DataMasterView />}
          {activeMenu === 'laporan' && <LaporanView />}
          {activeMenu === 'manajemen_akun' && <ManajemenAkunView />}
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
