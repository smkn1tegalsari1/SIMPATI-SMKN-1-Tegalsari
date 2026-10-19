export type DepartmentCode = 'TKJ' | 'TKR' | 'TSM' | 'DPB' | 'UMUM' | (string & {});

export type RoomType = 'Teori' | 'Lab Komputer' | 'Bengkel Praktik';

export type UserRole = 'admin' | 'guru' | 'piket' | 'pimpinan';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface AcademicYear {
  id: string;
  name: string; // contoh: "2026/2027 Ganjil"
  startDate: string; // contoh: "2026-07-15"
  endDate: string; // contoh: "2026-12-20"
  status: 'aktif' | 'non_aktif';
}

export interface Teacher {
  id: string;
  code: string; // Kode Guru (contoh: G01, BPW)
  nip: string;
  name: string;
  title: string;
  department?: string; // Opsional/dihapus sesuai kebutuhan
  email: string;
  phone: string;
  isPiketToday?: boolean;
  piketDays?: string[];
}

export interface Subject {
  id: string;
  code: string; // Kode Mapel
  name: string; // Nama Mapel
  category: 'Umum' | 'Produktif' | 'Muatan Lokal';
  department?: string;
  jp: number; // Jumlah Jam Pelajaran (JP)
}

export interface SchoolClass {
  id: string;
  code: string; // Kode Kelas
  name: string; // Nama Kelas
  grade: 10 | 11 | 12;
  department: string; // Dari menu jurusan
  homeroomTeacherId?: string; // Dari menu data guru
  homeroomTeacherName?: string;
  totalStudents: number;
}

export interface Room {
  id: string;
  code: string; // Kode Ruangan
  name: string; // Nama Ruangan
  building: string; // Nama Gedung
  type: RoomType;
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: number; // 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat
  dayName?: string; // "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"
  periodIndex: number | string; // 1, 2, ... 11, "EKS", "UPACARA"
  timeRange: string; // "06.45 - 07.20"
  startTime: string; // "06:45"
  endTime: string; // "07:20"
  teacherId: string;
  teacherName: string;
  teacherCode?: string;
  subjectCode: string;
  subjectName: string;
  classId: string;
  className: string;
  department: string;
  roomName: string;
  roomType: RoomType | string;
  weekType?: ScheduleWeekType; // Rotasi mingguan: P10_PROD_P11_NORM | P10_NORM_P11_PROD | ALL
}

export type ScheduleWeekType =
  | 'P10_PROD_P11_NORM' // Pekan Kelas 10 Produktif dan Kelas 11 Normatif Adaptif
  | 'P10_NORM_P11_PROD' // Pekan Kelas 10 Normatif Adaptif dan Kelas 11 Produktif
  | 'ALL'; // Berlaku Semua Pekan / Rutin Tiap Minggu

export type TeacherAttendanceStatus =
  | 'belum_konfirmasi'
  | 'hadir'
  | 'izin'
  | 'sakit'
  | 'dinas_luar';

export type PiketAttendanceStatus =
  | 'belum_konfirmasi'
  | 'terverifikasi_hadir'
  | 'terlambat'
  | 'izin_terkonfirmasi'
  | 'tidak_hadir';

export interface AttendanceRecord {
  scheduleId: string;
  date: string; // "YYYY-MM-DD"
  teacherConfirmation: {
    status: TeacherAttendanceStatus;
    timestamp?: string;
    journalTopic?: string;
    journalNotes?: string;
    studentAbsence?: {
      sakit: number;
      izin: number;
      alpa: number;
      totalHadir: number;
    };
  };
  piketConfirmation: {
    status: PiketAttendanceStatus;
    timestamp?: string;
    piketTeacherName?: string;
    notes?: string;
    substituteTeacherId?: string;
    substituteTeacherName?: string;
    assignedTask?: string;
  };
  startedAt?: string;
  completedAt?: string;
}

export type AccountRole = 'admin' | 'guru' | 'pimpinan';
export type DayNameIndo = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: AccountRole;
  teacherId?: string; // Terhubung dengan data guru di Data Master
  teacherCode?: string;
  nip?: string;
  email?: string;
  piketDays: string[]; // Tugas tambahan guru piket sesuai harinya, e.g. ['Senin', 'Kamis']
  status: 'aktif' | 'nonaktif';
  additionalDuty?: string; // Contoh: 'Guru Piket', 'Waka Kurikulum', dll
  lastLogin?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  teacherId?: string;
  username?: string;
  piketDays?: string[];
  isPiketToday?: boolean;
  teacherCode?: string;
  nip?: string;
}

export type ActiveMenu =
  | 'dashboard'
  | 'monitoring'
  | 'pembelajaran_saya'
  | 'guru_piket'
  | 'dashboard_pimpinan'
  | 'data_master'
  | 'laporan'
  | 'manajemen_akun'
  | 'mode_tv';

