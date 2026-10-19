# SIMPATI SMKN 1 Tegalsari — Sistem Informasi Manajemen Pembelajaran Terintegrasi

Sistem Informasi Manajemen Pembelajaran Terintegrasi SMKN 1 Tegalsari dirancang khusus untuk memastikan kepastian pelaksanaan KBM di seluruh ruang teori, bengkel kejuruan, dan laboratorium komputer melalui verifikasi ganda terstruktur antara Guru Mata Pelajaran dan Guru Piket.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Revisi Alur Kehadiran & Verifikasi Ganda (Terkonfirmasi):**
> 1. **Guru Mapel (Jurnal & Materi Kelas)**:
>    - Guru Mapel memiliki akses mandiri untuk menekan tombol status (Hadir / Izin / Sakit / Dinas Luar).
>    - Saat hadir, guru mapel membuka sesi KBM dengan mengisi form ringkas: Topik/Materi Pembelajaran, Capaian/Jurnal Kelas, serta catatan ringkas kehadiran siswa.
> 2. **Kemudahan Aksi Cepat Mandiri**:
>    - Baik Guru Mapel maupun Guru Piket disediakan tombol aksi mandiri 1-klik (Hadir, Izin, Sakit, Terlambat) pada tabel maupun kartu jadwal untuk kecepatan pengisian di lapangan.
> 3. **Guru Piket sebagai Verifikator Utama & Penugasan Pengganti**:
>    - Guru Piket melakukan validasi fisik langsung di ruang/bengkel.
>    - Jika guru bersangkutan berhalangan (Izin/Sakit/Tugas Luar), Guru Piket dapat langsung:
>      - Memilih & menugaskan **Guru Pengganti (Inval)** dari daftar guru yang sedang free jam tersebut.
>      - Mengunggah/mencatat **Tugas Terstruktur Mandiri** agar siswa di kelas tetap produktif.
> 4. **Akses & Simulasi Peran Fleksibel**:
>    - Tersedia role switcher instan di header (Super Admin, Guru Mapel, Guru Piket, Kepala Sekolah/Pimpinan) serta modal Login Akun Demo dengan kredensial instan untuk pengujian menyeluruh.

---

## 1. Overview & Core Concept

- **Nama Aplikasi**: SIMPATI SMKN 1 Tegalsari (Sistem Informasi Manajemen Pembelajaran Terintegrasi SMKN 1 Tegalsari).
- **Visi Operasional**: Mewujudkan KBM zero-class-empty (tidak ada kelas kosong tanpa pendampingan/tugas) di SMKN 1 Tegalsari dengan transparansi status real-time antara ruang kelas, pos piket, dan ruang pimpinan.
- **Pengguna & Peran**:
  - **Administrator (Super Admin)**: Mengelola master data (guru, mata pelajaran, rombel, ruang/bengkel, jadwal), mengelola akun pengguna, dan konfigurasi sistem.
  - **Guru Mata Pelajaran**: Melakukan check-in/out mengajar, mengisi materi KBM & jurnal kelas, menandai status kehadiran diri.
  - **Guru Piket**: Verifikator utama KBM harian, memantau kehadiran aktual di lapangan, memvalidasi kehadiran guru mapel, serta menugaskan guru pengganti/tugas terstruktur bila guru izin.
  - **Pimpinan (Kepala Sekolah / Waka Kurikulum)**: Dashboard eksekutif pemantauan persentase kehadiran guru, rekap kelas terisi vs kosong, dan tren kedisiplinan.
  - **Display Mode TV Sekolah**: Layar monitor lobi/ruang guru tanpa login interaktif yang berputar otomatis menampilkan live status kelas pada jam berjalan.

---

## 2. User Experience & Visual Design

### A. Estetika Sesuai Desain Asli SIMPATI SMKN 1 Tegalsari
- **Sidebar Kiri**: Dark Navy (`#0B1926` hingga `#0F2231`), logo SIMPATI dengan ikon toga/topi sarjana, status user aktif ("Administrator - Super Admin") di footer sidebar dengan tombol "Keluar".
- **Aksen Aktif**: Warm Amber / Golden Honey (`#F59E0B`) dengan kontras teks tajam, serasi dengan kartu status dan badge "Menunggu".
- **Header Atas**:
  - Judul sistem: "SIMPATI SMKN 1 Tegalsari" dengan subjudul "Sistem Informasi Manajemen Pembelajaran Terintegrasi".
  - Metadata waktu live: Hari, tanggal Indonesia (`Selasa, 13 Oktober 2026`), jam digital WIB live (`09:40:15 WIB`), serta informasi `Semester Ganjil · 2026/2027`.
  - Simulasi waktu & tombol ganti peran instan.
- **6 Kartu Ringkasan Statistik Hari Ini**:
  1. `TOTAL JADWAL` (396) [Ikon Jam]
  2. `GURU MENGAJAR` (0) [Ikon Pengguna]
  3. `SEDANG BERLANGSUNG` (0) [Ikon Gelombang/Aktivitas]
  4. `TERLAKSANA` (0) [Ikon Checkmark]
  5. `BELUM KONFIRMASI` (396) [Ikon Pengguna Menunggu]
  6. `TIDAK HADIR` (0) [Ikon Pengguna Silang]
- **Tiga Pintasan Cepat**:
  - `Pembelajaran Saya →`
  - `Papan Guru Piket →`
  - `Dashboard Pimpinan →`

### B. Detail Struktur Menu
1. **Dashboard**:
   - Ringkasan statistik 6 kartu, tombol navigasi cepat.
   - Tabel "Pembelajaran Hari Ini" dengan dropdown baris (10, 20, 50, 100), filter jam pelajaran, pencarian guru/mapel/kelas/ruang, status konfirmasi ganda, dan pagination.
2. **Monitoring Pembelajaran**:
   - Filter grid per program keahlian: TKJ (Teknik Komputer & Jaringan), TKR (Teknik Kendaraan Ringan), TSM (Teknik Sepeda Motor), DPB (Desain Pemodelan Bangunan).
   - Indikator status per bengkel dan lab komputer.
3. **Pembelajaran Saya (Menu Guru Mapel)**:
   - Daftar jadwal mengajar guru aktif hari ini.
   - Tombol mandiri cepat: "Hadir Mengajar" atau "Ajukan Izin/Sakit/Tugas Luar".
   - Form Jurnal Mengajar: Judul Pokok Bahasan/Materi, Catatan Progres Kelas, Jumlah Siswa Hadir/Tidak Hadir, Tombol "Selesaikan Jam Mengajar".
4. **Guru Piket (Papan Guru Piket)**:
   - Panel monitoring seluruh ruang kelas jam ini.
   - Filter kelas: "Belum Divalidasi", "Sudah Validasi Hadir", "Izin Butuh Pengganti".
   - Aksi Verifikator Utama:
     - 1-Klik "Validasi Hadir Fisik"
     - "Catat Guru Berhalangan" -> Form Pemilihan Guru Pengganti (Inval) dari daftar guru tidak mengajar di jam tersebut + Form Penugasan Mandiri Siswa.
5. **Dashboard Pimpinan**:
   - Metrik makro keterlaksanaan sekolah, rekap guru terlambat/izin, grafik perbandingan per jurusan, dan log catatan penting piket.
6. **Data Master**:
   - CRUD Guru (NIP, Nama, Gelar, Jurusan, Kontak).
   - CRUD Mata Pelajaran (Kode, Nama, Kelompok Mapel Produktif/Umum).
   - CRUD Kelas & Ruang (Kelas 10/11/12 TKJ/TKR/TSM/DPB, Lab C1/C2, Bengkel TKR A/B, Bengkel TSM A, Ruang Teori B1/G2).
   - CRUD Jadwal Pelajaran Mingguan (Senin - Jumat, Jam Ke 1-10).
7. **Laporan**:
   - Rekapitulasi absensi guru bulanan/rentang tanggal, filter per guru / per jurusan.
   - Opsi Ekspor CSV/Excel dan Format Cetak Resmi Berita Acara KBM Sekolah.
8. **Manajemen Akun & Jadwal Piket**:
   - Penugasan guru yang bertugas piket hari ini (misal: 3-4 guru per hari).
   - Pengaturan hak akses.
9. **Mode TV Sekolah**:
   - Tampilan digital signage fullscreen, layout responsif TV, auto-slide setiap 15 detik, jam digital besar, dan tampilan kelas yang sedang berlangsung.

---

## 3. Key Product Decisions & Trade-Offs

- **Independent Action vs Dual Consensus Engine**:
  - Guru mapel dapat menandai kehadiran/izin secara mandiri kapan saja.
  - Guru piket memiliki otoritas mengonfirmasi atau mengoreksi kehadiran di lapangan. Status akhir KBM dihitung secara deterministik:
    - *Belum Ada Konfirmasi*: Guru mapel dan piket belum input.
    - *Menunggu Validasi Piket*: Guru mapel sudah klik hadir/isi materi, piket belum keliling.
    - *Hadir Terverifikasi*: Guru mapel konfirmasi hadir DAN guru piket memvalidasi hadir fisik.
    - *Izin (Ada Guru Pengganti)*: Guru izin, piket telah menunjuk pengganti.
    - *Izin (Tugas Terstruktur)*: Guru izin, materi tugas telah dibagikan piket.
    - *Tidak Hadir (Tanpa Keterangan)*: Jam pembelajaran usai tanpa konfirmasi.
- **Penyimpanan Lokal Persisten**: Seluruh data tersimpan aman di `localStorage` dengan state awal lengkap sesuai nama-nama guru asli SMKN 1 Tegalsari (Bayu Pandu Wibisono, S.Kom, Imatur Rofiqoh, S.Pd, Ani Purwanti, S.Pd, Imam Ansori, S.Kom, Achmad Mackrus, ST, Moch. Zaenal Fanani, S.Tr.T, dll.).
- **Simulasi Jam Pembelajaran Fleksibel**: Kontrol simulasi waktu memungkinkan penguji beralih antara Jam Ke-1 (06:45–07:20), Jam Ke-2 (07:20–07:55), Jam Ke-5 (09:40–10:15), dll., untuk melihat perubahan dinamis status KBM.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SIMPATI SMKN 1 Tegalsari                        │
│                 Sistem Informasi Manajemen Pembelajaran                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌───────────────────────────────────┐      ┌─────────────────────────────┐
│ Reactive LocalStorage Store       │      │ Real-Time Clock & Jam Ke-   │
│ - Data Master (Guru, Mapel, Rombel)│     │ Time Slot Matcher (WIB)     │
│ - Jadwal Pembelajaran Mingguan    │      │ - Real Clock / Time Warp    │
│ - Log Konfirmasi Guru Mapel       │      │ - Auto Period Determination │
│ - Log Validasi Guru Piket         │      └──────────────┬──────────────┘
│ - Catatan Inval & Tugas Pengganti │                     │
└──────────────────┬────────────────┘                     │
                   │                                      │
                   └──────────────────┬───────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Komponen Tampilan & Controller                     │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│  Dashboard   │  Monitoring  │ Pembelajaran │ Papan Piket  │ Dashboard  │
│  Ringkasan   │ KBM Jurusan  │  Saya (Guru) │ (Inval/Tugas)│  Pimpinan  │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────┤
│ Data Master  │ Laporan &    │  Manajemen   │   Mode TV    │ Modal Jurnal│
│ CRUD Lengkap │ Cetak Rekap  │    Akun      │   Sekolah    │ & Inval    │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

### Model Data Utama:
```typescript
interface ScheduleItem {
  id: string;
  dayOfWeek: number; // 1: Senin, 2: Selasa, dst
  periodIndex: number; // Jam Ke-1, 2, dst
  timeRange: string; // "06:45–07:20"
  teacherId: string;
  teacherName: string;
  subjectCode: string;
  subjectName: string;
  classId: string;
  className: string;
  department: 'TKJ' | 'TKR' | 'TSM' | 'DPB' | 'UMUM';
  roomName: string;
  roomType: 'Teori' | 'Lab Komputer' | 'Bengkel Praktik';
}

interface AttendanceVerification {
  scheduleId: string;
  dateString: string; // YYYY-MM-DD
  teacherStatus: 'pending' | 'hadir' | 'izin' | 'sakit' | 'dinas_luar';
  teacherTimestamp?: string;
  journalTopic?: string;
  studentAttendanceSummary?: { hadir: number; sakit: number; izin: number; alpa: number };
  
  piketStatus: 'pending' | 'terverifikasi_hadir' | 'terlambat' | 'tidak_hadir' | 'izin_terkonfirmasi';
  piketTimestamp?: string;
  piketVerifierName?: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  assignedTaskDescription?: string;
  piketNotes?: string;
  
  startTime?: string;
  endTime?: string;
}
```

---

## Verification Plan

### Automated Build Testing
- Validasi TypeScript kompilasi dengan tool `compile_applet` untuk menjamin tidak ada error import, tipe data, atau sintaksis.

### Skenario Pengujian Alur Interaktif
1. **Uji Tampilan & Presisi Visual**: Memastikan layout, warna sidebar, font sans modern, kartu metrik, dan tabel persis seperti screenshot aplikasi SIMPATI SMKN 1 Tegalsari.
2. **Uji Mandiri Guru Mapel**:
   - Ganti peran ke Guru Mapel (misal: "BAYU PANDU WIBISONO, S.Kom").
   - Pada menu "Pembelajaran Saya", buka form input materi ("MKK 3 - Konfigurasi Routing Mikrotik"), klik "Mulai Mengajar & Konfirmasi Hadir".
   - Verifikasi status di tabel dashboard berubah menjadi "Menunggu Validasi Piket".
3. **Uji Validasi Utama Guru Piket**:
   - Ganti peran ke Guru Piket.
   - Buka menu "Papan Guru Piket", lakukan verifikasi fisik pada kelas bersangkutan -> status berubah menjadi "Terlaksana & Terverifikasi" (Hijau).
   - Pada baris guru lain yang izin (misal: ANI PURWANTI, S.Pd), klik tombol "Catat Izin & Tugaskan Pengganti", pilih guru pengganti dari daftar guru kosong serta isi tugas mandiri.
4. **Uji Dashboard Pimpinan & Laporan**:
   - Akses "Dashboard Pimpinan" untuk mengecek pembaruan persentase kehadiran seketika.
   - Akses menu "Laporan", lakukan filter tanggal dan unduh file ekspor rekapitulasi.
5. **Uji Mode TV Sekolah**:
   - Buka menu "Mode TV Sekolah", periksa tampilan fullscreen digital signage ramah monitor lobi dengan jam digital WIB besar dan perputaran otomatis.
