# Rencana Implementasi: Perubahan Konsep Jadwal Pelajaran (3 Status)

## Status: Selesai (Completed)

### 1. Penghapusan Konfirmasi Kehadiran & Guru Piket
- Menghapus tombol konfirmasi kehadiran mandiri guru ("Hadir Cepat", "Mulai Mengajar & Isi Jurnal") di seluruh menu.
- Menghapus modal jurnal KBM (`JournalModal`) dan verifikasi piket (`PiketVerifyModal`) dari semua view.
- Menghapus tombol aksi validasi fisik piket ("Valid Hadir", "Terlambat", "Atur Inval") di papan piket dan dashboard.

### 2. Standarisasi 3 Status Jadwal Pelajaran
Menerapkan 3 status jadwal pelajaran yang dihitung secara real-time berdasarkan jam operasional dan rotasi hari/pekan:
1. **`Berlangsung`**: Jam pelajaran yang sedang aktif pada saat ini (berkedip hijau / live indicator).
2. **`Selesai`**: Jam pelajaran yang telah lampau/berlalu pada hari ini atau hari sebelumnya dalam pekan berjalan.
3. **`Terjadwal`**: Jam pelajaran yang akan datang pada jam berikutnya atau hari mendatang.

### 3. Penyesuaian di Seluruh Menu
- **Monitoring Pembelajaran (`MonitoringView.tsx`)**: Menampilkan badge 3 status dan filter Status (`Semua`, `Berlangsung`, `Selesai`, `Terjadwal`).
- **Pembelajaran Saya (`PembelajaranSayaView.tsx`)**: Menampilkan jadwal guru yang login dengan 3 status real-time serta filter tab status.
- **Papan Guru Piket (`PapanGuruPiketView.tsx`)**: Kolom jadwal difokuskan pada monitoring 3 status jadwal pembelajaran dan ekspor Excel yang telah diperbarui.
- **Dashboard Utama (`DashboardView.tsx`)**: Ringkasan metrik statistik berfokus pada 3 status (Total, Guru Mengajar, Berlangsung, Selesai, Terjadwal) beserta filter status tabel.
- **Dashboard Pimpinan (`DashboardPimpinanView.tsx`)**: Metrik pimpinan, grafik keterlaksanaan per jurusan, dan tabel log diperbarui berbasis 3 status.
- **Laporan & Berita Acara (`LaporanView.tsx`)**: Rekapitulasi cetak berita acara dan unduhan CSV diselaraskan dengan 3 status.
- **Mode TV Sekolah (`ModeTVSekolahView.tsx`)**: Tampilan digital signage layar TV dibersihkan dari kolom presensi kehadiran dan menampilkan status Berlangsung, Selesai, Terjadwal dengan sangat jelas.

### 4. Verifikasi
- TypeScript Type Checking (`tsc --noEmit`): Lolos tanpa error.
- Vite Compilation (`npm run build`): Build sukses 100%.
