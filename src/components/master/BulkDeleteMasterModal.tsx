import React from 'react';
import { Trash2, X, AlertTriangle, AlertCircle } from 'lucide-react';

interface BulkDeleteMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'guru' | 'mapel' | 'jurusan' | 'kelas' | 'ruang' | 'tahun_pelajaran' | 'jadwal';
  selectedCount: number;
  selectedItemsPreview: Array<{ id: string; title: string; subtitle?: string; badge?: string }>;
  onConfirm: () => void;
}

export const BulkDeleteMasterModal: React.FC<BulkDeleteMasterModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  selectedCount,
  selectedItemsPreview,
  onConfirm,
}) => {
  if (!isOpen || selectedCount === 0) return null;

  const tabTitles: Record<string, string> = {
    guru: 'Data Guru',
    mapel: 'Mata Pelajaran',
    jurusan: 'Program Keahlian / Jurusan',
    kelas: 'Kelas & Rombel',
    ruang: 'Ruang & Bengkel',
    tahun_pelajaran: 'Tahun Pelajaran',
    jadwal: 'Jadwal Pelajaran',
  };

  const warningNotes: Record<string, string> = {
    guru: 'Data guru yang dihapus akan otomatis memutuskan akun login terkait. Jadwal mengajar yang terhubung dengan guru-guru ini akan diubah menjadi "Belum Ditentukan".',
    mapel: 'Mata pelajaran yang dipilih akan dihapus. Guru pengampu mapel ini dan jadwal pelajaran terkait akan disesuaikan.',
    jurusan: 'Jurusan yang dipilih akan dihapus dari daftar kompetensi keahlian sekolah.',
    kelas: 'Kelas yang dipilih beserta seluruh jadwal KBM yang terdaftar pada kelas tersebut akan ikut terhapus.',
    ruang: 'Ruangan yang dipilih akan dihapus dari daftar sarana prasarana sekolah.',
    tahun_pelajaran: 'Hanya tahun pelajaran yang berstatus non-aktif yang akan dihapus. Tahun pelajaran yang sedang aktif tidak dapat dihapus.',
    jadwal: 'Slot jadwal pelajaran yang dipilih akan dihapus secara permanen dari agenda kelas dan agenda mengajar guru.',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-50 via-rose-50 to-orange-50 border-b border-rose-100 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                Hapus Masal {tabTitles[activeTab]}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">
                {selectedCount} item
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Konfirmasi penghapusan serentak data yang telah Anda centang.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Warning banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <strong className="font-bold">Peringatan:</strong> {warningNotes[activeTab] || 'Data akan dihapus permanen.'}
            </div>
          </div>

          {/* List of items to delete */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Daftar item yang akan dihapus:</span>
              <span className="text-slate-500 font-normal">Total: {selectedCount} data</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {selectedItemsPreview.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 truncate">
                      {idx + 1}. {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded shrink-0 border border-slate-200">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Tindakan ini tidak dapat dibatalkan.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ya, Hapus {selectedCount} Data Terpilih</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
