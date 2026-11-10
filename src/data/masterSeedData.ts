import {
  Department,
  SchoolClass,
  Teacher,
  Subject,
  Room,
  ScheduleItem,
} from '../types';
import {
  PRESET_KELAS_X,
  PRESET_KELAS_XI,
  PRESET_KELAS_XII,
  MATRIX_PERIODS,
} from './monitoringMatrixPreset';

// ---------------------------------------------------------------------------
// 1. MASTER JURUSAN / PROGRAM KEAHLIAN (7 PROGRAM RESMI SMKN 1 TEGALSARI)
// ---------------------------------------------------------------------------
export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-tkr', code: 'TKR', name: 'Teknik Kendaraan Ringan', description: 'Program keahlian teknik otomotif kendaraan roda empat dan mesin mobil.' },
  { id: 'dept-tsm', code: 'TSM', name: 'Teknik Sepeda Motor', description: 'Program keahlian teknik otomotif kendaraan bermotor roda dua.' },
  { id: 'dept-tpl', code: 'TPL', name: 'Teknik Pengelasan', description: 'Program keahlian fabrikasi logam, las SMAW, GMAW, GTAW, dan OAW.' },
  { id: 'dept-tkj', code: 'TKJ', name: 'Teknik Komputer & Jaringan', description: 'Program keahlian infrastruktur jaringan, server, fiber optic, dan cyber security.' },
  { id: 'dept-ak', code: 'AK', name: 'Akuntansi & Keuangan Lembaga', description: 'Program keahlian pembukuan keuangan, perpajakan, perbankan, dan MYOB/Accurate.' },
  { id: 'dept-dpb', code: 'DPB', name: 'Desain Pemodelan & Informasi Bangunan', description: 'Program keahlian gambar teknik arsitektur, CAD 2D/3D, BIM, dan RAB gedung.' },
  { id: 'dept-klr', code: 'KLR', name: 'Kuliner / Tata Boga', description: 'Program keahlian pengolahan makanan kontinental, pastry, bakery, dan catering.' },
];

// ---------------------------------------------------------------------------
// 2. MASTER GURU DARI DATA PRESET MONITORING
// ---------------------------------------------------------------------------
export const SEED_TEACHERS: Teacher[] = [
  { id: 'tch-tr1', code: 'TR1', nip: '19820510 200902 1 003', name: 'Dwi Prasetyo, S.T', title: 'Guru TKR', email: 'dwi.prasetyo@smkn1tegalsari.sch.id', phone: '08123456701' },
  { id: 'tch-tr2', code: 'TR2', nip: '19850119 201101 1 014', name: 'Rudi Hartono, S.T', title: 'Guru TKR', email: 'rudi.hartono@smkn1tegalsari.sch.id', phone: '08123456702' },
  { id: 'tch-tr3', code: 'TR3', nip: '19750312 200501 1 005', name: 'Drs. Tri Raharjo', title: 'Guru TKR', email: 'tri.raharjo@smkn1tegalsari.sch.id', phone: '08123456703' },
  { id: 'tch-tr4', code: 'TR4', nip: '19830514 201001 1 018', name: 'Agung Wicaksono, S.T', title: 'Guru TKR', email: 'agung.w@smkn1tegalsari.sch.id', phone: '08123456704' },
  { id: 'tch-tr5', code: 'TR5', nip: '19790412 200501 1 008', name: 'Nanang Qosim, S.Pd', title: 'Guru TKR', email: 'nanang.q@smkn1tegalsari.sch.id', phone: '08123456705' },

  { id: 'tch-ts1', code: 'TS1', nip: '19811124 200801 1 009', name: 'Wahyu Nugroho, S.Pd', title: 'Guru TSM', email: 'wahyu.nugroho@smkn1tegalsari.sch.id', phone: '08123456711' },
  { id: 'tch-ts2', code: 'TS2', nip: '19830718 201001 1 015', name: 'Rahmat Hidayat, S.T', title: 'Guru TSM', email: 'rahmat.hidayat@smkn1tegalsari.sch.id', phone: '08123456712' },
  { id: 'tch-ts3', code: 'TS3', nip: '19850114 201001 1 012', name: 'Budi Santoso, S.Pd', title: 'Guru TSM', email: 'budi.santoso@smkn1tegalsari.sch.id', phone: '08123456713' },
  { id: 'tch-ts4', code: 'TS4', nip: '19870822 201101 1 008', name: 'Agus Subagyo, S.T', title: 'Guru TSM', email: 'agus.subagyo@smkn1tegalsari.sch.id', phone: '08123456714' },
  { id: 'tch-ts5', code: 'TS5', nip: '19860219 201402 1 004', name: 'Hendra Gunawan, S.Pd', title: 'Guru TSM', email: 'hendra.gunawan@smkn1tegalsari.sch.id', phone: '08123456715' },
  { id: 'tch-ts6', code: 'TS6', nip: '19880112 201503 1 003', name: 'Danang Hermawan, S.T', title: 'Guru TSM', email: 'danang.h@smkn1tegalsari.sch.id', phone: '08123456716' },
  { id: 'tch-ts7', code: 'TS7', nip: '19860714 201101 1 009', name: 'Ferry Irawan, S.T', title: 'Guru TSM', email: 'ferry.irawan@smkn1tegalsari.sch.id', phone: '08123456717' },

  { id: 'tch-tp1', code: 'TP1', nip: '19750811 200312 1 005', name: 'Subagio, S.T', title: 'Guru TPL', email: 'subagio@smkn1tegalsari.sch.id', phone: '08123456721' },
  { id: 'tch-tp2', code: 'TP2', nip: '19810319 200801 1 012', name: 'Suwarno, S.Pd', title: 'Guru TPL', email: 'suwarno@smkn1tegalsari.sch.id', phone: '08123456722' },
  { id: 'tch-tp3', code: 'TP3', nip: '19840220 201101 1 007', name: 'Eko Yulianto, S.T', title: 'Guru TPL', email: 'eko.yulianto@smkn1tegalsari.sch.id', phone: '08123456723' },
  { id: 'tch-tp4', code: 'TP4', nip: '19790615 200604 1 011', name: 'Samsul Hadi, S.T', title: 'Guru TPL', email: 'samsul.hadi@smkn1tegalsari.sch.id', phone: '08123456724' },

  { id: 'tch-tkj1', code: 'TKJ1', nip: '19870105 201402 1 002', name: 'Achmad Fauzi, S.Kom', title: 'Guru TKJ', email: 'achmad.fauzi@smkn1tegalsari.sch.id', phone: '08123456731' },
  { id: 'tch-tkj2', code: 'TKJ2', nip: '19860418 201101 1 010', name: 'Bambang Pamungkas, S.Kom', title: 'Guru TKJ', email: 'bambang.p@smkn1tegalsari.sch.id', phone: '08123456732' },
  { id: 'tch-tkj3', code: 'TKJ3', nip: '19890912 201503 2 004', name: 'Dian Anggraini, S.Kom', title: 'Guru TKJ', email: 'dian.anggraini@smkn1tegalsari.sch.id', phone: '08123456733' },
  { id: 'tch-tkj4', code: 'TKJ4', nip: '19880315 201402 1 005', name: 'Fajar Nugraha, S.Kom', title: 'Guru TKJ', email: 'fajar.nugraha@smkn1tegalsari.sch.id', phone: '08123456734' },
  { id: 'tch-tkj5', code: 'TKJ5', nip: '19850914 201101 1 009', name: 'Rizal Efendi, S.Pd', title: 'Guru TKJ', email: 'rizal.efendi@smkn1tegalsari.sch.id', phone: '08123456735' },
  { id: 'tch-inf2', code: 'INF2', nip: '19900318 201903 2 006', name: 'Nurul Hidayati, S.Kom', title: 'Guru Informatika', email: 'nurul.hidayati@smkn1tegalsari.sch.id', phone: '08123456736' },

  { id: 'tch-ak1', code: 'AK1', nip: '19790118 200501 1 007', name: 'Kuswanto, S.E', title: 'Guru AKL', email: 'kuswanto@smkn1tegalsari.sch.id', phone: '08123456741' },
  { id: 'tch-ak2', code: 'AK2', nip: '19720512 199802 2 001', name: 'Hj. Mardiana, S.Pd, M.M', title: 'Guru AKL', email: 'mardiana@smkn1tegalsari.sch.id', phone: '08123456742' },
  { id: 'tch-ak3', code: 'AK3', nip: '19820816 201001 2 009', name: 'Yuliana, S.E', title: 'Guru AKL', email: 'yuliana@smkn1tegalsari.sch.id', phone: '08123456743' },
  { id: 'tch-ak4', code: 'AK4', nip: '19770815 200312 2 004', name: 'Ratna Juwita, S.E, M.M', title: 'Guru AKL', email: 'ratna.juwita@smkn1tegalsari.sch.id', phone: '08123456744' },
  { id: 'tch-ak5', code: 'AK5', nip: '19810214 200801 1 011', name: 'Dedi Irawan, S.E', title: 'Guru AKL', email: 'dedi.irawan@smkn1tegalsari.sch.id', phone: '08123456745' },
  { id: 'tch-ak6', code: 'AK6', nip: '19800723 200801 2 014', name: 'Endang Sulistiyani, S.Pd', title: 'Guru AKL', email: 'endang.s@smkn1tegalsari.sch.id', phone: '08123456746' },
  { id: 'tch-ak7', code: 'AK7', nip: '19830911 201001 2 016', name: 'Maya Indriani, S.E', title: 'Guru AKL', email: 'maya.indriani@smkn1tegalsari.sch.id', phone: '08123456747' },
  { id: 'tch-ak8', code: 'AK8', nip: '19860612 201101 2 011', name: 'Lina Marlina, S.Pd', title: 'Guru AKL', email: 'lina.marlina@smkn1tegalsari.sch.id', phone: '08123456748' },
  { id: 'tch-ak9', code: 'AK9', nip: '19760514 200312 2 003', name: 'Sri Wahyuni, S.E, M.Pd', title: 'Guru AKL', email: 'sri.wahyuni@smkn1tegalsari.sch.id', phone: '08123456749' },
  { id: 'tch-ak10', code: 'AK10', nip: '19870314 201402 1 003', name: 'Nur Kholis, S.Pd', title: 'Guru AKL', email: 'nur.kholis@smkn1tegalsari.sch.id', phone: '08123456750' },
  { id: 'tch-ak11', code: 'AK11', nip: '19740319 200212 2 002', name: 'Dra. Siti Aminah', title: 'Guru AKL', email: 'siti.aminah@smkn1tegalsari.sch.id', phone: '08123456751' },

  { id: 'tch-dpb1', code: 'DPB1', nip: '19800612 200604 1 009', name: 'Bambang Triyono, S.T', title: 'Guru DPB', email: 'bambang.triyono@smkn1tegalsari.sch.id', phone: '08123456761' },
  { id: 'tch-dpb2', code: 'DPB2', nip: '19830415 200902 1 005', name: 'Hendro Gunawan, S.T', title: 'Guru DPB', email: 'hendro.gunawan@smkn1tegalsari.sch.id', phone: '08123456762' },
  { id: 'tch-tbs4', code: 'TBS4', nip: '19730214 199903 1 004', name: 'Ir. Agus Supriyadi, M.T', title: 'Guru DPB', email: 'agus.supriyadi@smkn1tegalsari.sch.id', phone: '08123456763' },

  { id: 'tch-tbg1', code: 'TBG1', nip: '19850514 201101 2 012', name: 'Tri Hapsari, S.Pd', title: 'Guru Kuliner', email: 'tri.hapsari@smkn1tegalsari.sch.id', phone: '08123456771' },
  { id: 'tch-tbg2', code: 'TBG2', nip: '19910214 201903 2 010', name: 'Fitri Handayani, S.Pd', title: 'Guru Kuliner', email: 'fitri.handayani@smkn1tegalsari.sch.id', phone: '08123456772' },
  { id: 'tch-tbg3', code: 'TBG3', nip: '19900218 201503 2 007', name: 'Rina Wahyuningsih, S.Pd', title: 'Guru Kuliner', email: 'rina.w@smkn1tegalsari.sch.id', phone: '08123456773' },

  { id: 'tch-ipas3', code: 'IPAS3', nip: '19880415 201201 2 004', name: 'Dewi Sartika, S.Pd', title: 'Guru IPAS', email: 'dewi.sartika@smkn1tegalsari.sch.id', phone: '08123456781' },
  { id: 'tch-ipas4', code: 'IPAS4', nip: '19890412 201903 2 008', name: 'Siti Nurhaliza, S.Pd', title: 'Guru IPAS', email: 'siti.nurhaliza@smkn1tegalsari.sch.id', phone: '08123456782' },
  { id: 'tch-mtk1', code: 'MTK1', nip: '19870618 202421 1 002', name: 'Eko Pramesti Sumarto, S.Mat', title: 'Waka Kurikulum / Guru MTK', email: 'eko.pramesti@smkn1tegalsari.sch.id', phone: '08123456783' },
  { id: 'tch-bin1', code: 'BIN1', nip: '19810412 200701 2 008', name: 'Siti Rohmah, M.Pd', title: 'Guru Bahasa Indonesia', email: 'siti.rohmah@smkn1tegalsari.sch.id', phone: '08123456784' },
  { id: 'tch-big2', code: 'BIG2', nip: '19890214 201402 2 005', name: 'Anita Kusuma, S.Pd', title: 'Guru Bahasa Inggris', email: 'anita.kusuma@smkn1tegalsari.sch.id', phone: '08123456785' },
  { id: 'tch-pai1', code: 'PAI1', nip: '19780315 200501 1 006', name: 'H. Mukhlis, S.Ag, M.PdI', title: 'Guru PAI', email: 'mukhlis@smkn1tegalsari.sch.id', phone: '08123456786' },
  { id: 'tch-pkn1', code: 'PKN1', nip: '19750912 200212 1 003', name: 'Hadi Suwito, S.Pd', title: 'Guru PKn', email: 'hadi.suwito@smkn1tegalsari.sch.id', phone: '08123456787' },
  { id: 'tch-pjok1', code: 'PJOK1', nip: '19871114 201201 1 006', name: 'Bagus Setyawan, S.Pd', title: 'Guru PJOK', email: 'bagus.s@smkn1tegalsari.sch.id', phone: '08123456788' },
  { id: 'tch-sej1', code: 'SEJ1', nip: '19840519 200902 2 007', name: 'Tri Wulandari, S.Pd', title: 'Guru Sejarah', email: 'tri.wulandari@smkn1tegalsari.sch.id', phone: '08123456789' },
];

// ---------------------------------------------------------------------------
// 3. MASTER KELAS (54 KELAS: 18 KELAS X, 18 KELAS XI, 18 KELAS XII)
// ---------------------------------------------------------------------------
function generateClassesForGrade(grade: 10 | 11 | 12): SchoolClass[] {
  const roman = grade === 10 ? 'X' : grade === 11 ? 'XI' : 'XII';
  const prefix = `k${grade}`;

  return [
    { id: `${prefix}-tkr-1`, code: `${roman}-TKR-1`, name: `${roman} TKR 1`, grade, department: 'TKR', totalStudents: 36 },
    { id: `${prefix}-tkr-2`, code: `${roman}-TKR-2`, name: `${roman} TKR 2`, grade, department: 'TKR', totalStudents: 36 },
    { id: `${prefix}-tkr-3`, code: `${roman}-TKR-3`, name: `${roman} TKR 3`, grade, department: 'TKR', totalStudents: 36 },
    { id: `${prefix}-tsm-1`, code: `${roman}-TSM-1`, name: `${roman} TSM 1`, grade, department: 'TSM', totalStudents: 35 },
    { id: `${prefix}-tsm-2`, code: `${roman}-TSM-2`, name: `${roman} TSM 2`, grade, department: 'TSM', totalStudents: 35 },
    { id: `${prefix}-tsm-3`, code: `${roman}-TSM-3`, name: `${roman} TSM 3`, grade, department: 'TSM', totalStudents: 35 },
    { id: `${prefix}-tpl-1`, code: `${roman}-TPL-1`, name: `${roman} TPL 1`, grade, department: 'TPL', totalStudents: 34 },
    { id: `${prefix}-tpl-2`, code: `${roman}-TPL-2`, name: `${roman} TPL 2`, grade, department: 'TPL', totalStudents: 34 },
    { id: `${prefix}-tkj-1`, code: `${roman}-TKJ-1`, name: `${roman} TKJ 1`, grade, department: 'TKJ', totalStudents: 36 },
    { id: `${prefix}-tkj-2`, code: `${roman}-TKJ-2`, name: `${roman} TKJ 2`, grade, department: 'TKJ', totalStudents: 36 },
    { id: `${prefix}-ak-1`, code: `${roman}-AK-1`, name: `${roman} AK 1`, grade, department: 'AK', totalStudents: 36 },
    { id: `${prefix}-ak-2`, code: `${roman}-AK-2`, name: `${roman} AK 2`, grade, department: 'AK', totalStudents: 36 },
    { id: `${prefix}-ak-3`, code: `${roman}-AK-3`, name: `${roman} AK 3`, grade, department: 'AK', totalStudents: 36 },
    { id: `${prefix}-ak-4`, code: `${roman}-AK-4`, name: `${roman} AK 4`, grade, department: 'AK', totalStudents: 36 },
    { id: `${prefix}-dpb-1`, code: `${roman}-DPB-1`, name: `${roman} DPB 1`, grade, department: 'DPB', totalStudents: 35 },
    { id: `${prefix}-dpb-2`, code: `${roman}-DPB-2`, name: `${roman} DPB 2`, grade, department: 'DPB', totalStudents: 35 },
    { id: `${prefix}-klr-1`, code: `${roman}-KLR-1`, name: `${roman} KLR 1`, grade, department: 'KLR', totalStudents: 36 },
    { id: `${prefix}-klr-2`, code: `${roman}-KLR-2`, name: `${roman} KLR 2`, grade, department: 'KLR', totalStudents: 36 },
  ];
}

export const SEED_CLASSES: SchoolClass[] = [
  ...generateClassesForGrade(10),
  ...generateClassesForGrade(11),
  ...generateClassesForGrade(12),
];

// ---------------------------------------------------------------------------
// 4. MASTER RUANG BELAJAR
// ---------------------------------------------------------------------------
export const SEED_ROOMS: Room[] = [
  { id: 'rm-bengkel-tkr-1', code: 'B-TKR-1', name: 'Bengkel TKR 1', building: 'Gedung Otomotif A', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-tkr-2', code: 'B-TKR-2', name: 'Bengkel TKR 2', building: 'Gedung Otomotif A', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-tkr-3', code: 'B-TKR-3', name: 'Bengkel TKR 3', building: 'Gedung Otomotif A', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-tsm-1', code: 'B-TSM-1', name: 'Bengkel TSM 1', building: 'Gedung Otomotif B', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-tsm-2', code: 'B-TSM-2', name: 'Bengkel TSM 2', building: 'Gedung Otomotif B', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-tsm-3', code: 'B-TSM-3', name: 'Bengkel TSM 3', building: 'Gedung Otomotif B', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-las-1', code: 'B-LAS-1', name: 'Bengkel Las 1', building: 'Gedung Fabrikasi', type: 'Bengkel Praktik' },
  { id: 'rm-bengkel-las-2', code: 'B-LAS-2', name: 'Bengkel Las 2', building: 'Gedung Fabrikasi', type: 'Bengkel Praktik' },
  { id: 'rm-lab-komp-1', code: 'LAB-KOMP-1', name: 'Lab Komputer 1', building: 'Gedung IT Center', type: 'Lab Komputer' },
  { id: 'rm-lab-komp-2', code: 'LAB-KOMP-2', name: 'Lab Komputer 2', building: 'Gedung IT Center', type: 'Lab Komputer' },
  { id: 'rm-lab-komp-3', code: 'LAB-KOMP-3', name: 'Lab Komputer 3', building: 'Gedung IT Center', type: 'Lab Komputer' },
  { id: 'rm-lab-server', code: 'LAB-SRV', name: 'Lab Server & Cloud', building: 'Gedung IT Center', type: 'Lab Komputer' },
  { id: 'rm-lab-jaringan', code: 'LAB-JAR', name: 'Lab Jaringan', building: 'Gedung IT Center', type: 'Lab Komputer' },
  { id: 'rm-studio-dpb', code: 'STD-DPB', name: 'Studio Studio DPB', building: 'Gedung Arsitektur', type: 'Lab Komputer' },
  { id: 'rm-dapur-1', code: 'DPR-1', name: 'Dapur Praktik 1', building: 'Gedung Kuliner', type: 'Bengkel Praktik' },
  { id: 'rm-dapur-2', code: 'DPR-2', name: 'Dapur Praktik 2', building: 'Gedung Kuliner', type: 'Bengkel Praktik' },
  { id: 'rm-lab-ak-1', code: 'LAB-AK-1', name: 'Lab Akuntansi 1', building: 'Gedung Bisnis & Manajemen', type: 'Lab Komputer' },
  { id: 'rm-lab-ak-2', code: 'LAB-AK-2', name: 'Lab Akuntansi 2', building: 'Gedung Bisnis & Manajemen', type: 'Lab Komputer' },
  { id: 'rm-lab-bank', code: 'LAB-BANK', name: 'Lab Mini Bank', building: 'Gedung Bisnis & Manajemen', type: 'Lab Komputer' },
  { id: 'rm-lab-ipa', code: 'LAB-IPA', name: 'Lab IPA', building: 'Gedung Sains', type: 'Teori' },
];

// ---------------------------------------------------------------------------
// 5. MASTER MATA PELAJARAN
// ---------------------------------------------------------------------------
export const SEED_SUBJECTS: Subject[] = [
  { id: 'sbj-tkr1', code: 'TKR1', name: 'Dasar Program Keahlian TKR 1', category: 'Produktif', department: 'TKR', jp: 4 },
  { id: 'sbj-pkkr', code: 'PKKR', name: 'Pemeliharaan Kelistrikan Kendaraan Ringan', category: 'Produktif', department: 'TKR', jp: 6 },
  { id: 'sbj-pscr', code: 'PSCR', name: 'Pemeliharaan Sasis Kendaraan Ringan', category: 'Produktif', department: 'TKR', jp: 6 },
  { id: 'sbj-pmkr', code: 'PMKR', name: 'Pemeliharaan Mesin Kendaraan Ringan', category: 'Produktif', department: 'TKR', jp: 6 },
  { id: 'sbj-tsm1', code: 'TSM1', name: 'Dasar Otomotif Sepeda Motor', category: 'Produktif', department: 'TSM', jp: 6 },
  { id: 'sbj-pmsm', code: 'PMSM', name: 'Pemeliharaan Mesin Sepeda Motor', category: 'Produktif', department: 'TSM', jp: 6 },
  { id: 'sbj-pksm', code: 'PKSM', name: 'Pemeliharaan Kelistrikan Sepeda Motor', category: 'Produktif', department: 'TSM', jp: 6 },
  { id: 'sbj-tpl1', code: 'TPL1', name: 'Dasar Pengelasan SMAW & OAW', category: 'Produktif', department: 'TPL', jp: 11 },
  { id: 'sbj-gmaw', code: 'GMAW', name: 'Teknik Pengelasan Gas Metal (GMAW/MIG)', category: 'Produktif', department: 'TPL', jp: 11 },
  { id: 'sbj-dpk', code: 'DPK', name: 'Dasar-Dasar TKJ & Pemrograman', category: 'Produktif', department: 'TKJ', jp: 4 },
  { id: 'sbj-aij', code: 'AIJ', name: 'Administrasi Infrastruktur Jaringan', category: 'Produktif', department: 'TKJ', jp: 6 },
  { id: 'sbj-asj', code: 'ASJ', name: 'Administrasi Sistem Jaringan', category: 'Produktif', department: 'TKJ', jp: 6 },
  { id: 'sbj-ipas', code: 'IPAS', name: 'Projek IPAS (Ilmu Pengetahuan Alam & Sosial)', category: 'Umum', department: 'UMUM', jp: 4 },
  { id: 'sbj-myob', code: 'MYOB', name: 'Komputer Akuntansi (MYOB/Accurate)', category: 'Produktif', department: 'AK', jp: 4 },
  { id: 'sbj-akdag', code: 'AKDAG', name: 'Praktikum Akuntansi Perusahaan Dagang', category: 'Produktif', department: 'AK', jp: 4 },
  { id: 'sbj-cad', code: 'CAD', name: 'Aplikasi Perangkat Lunak & BIM Bangunan', category: 'Produktif', department: 'DPB', jp: 6 },
  { id: 'sbj-dp', code: 'DP', name: 'Gambar Teknik Bangunan & CAD', category: 'Produktif', department: 'DPB', jp: 9 },
  { id: 'sbj-kl', code: 'KL', name: 'Dasar Kuliner & Sanitasi Hygiene', category: 'Produktif', department: 'KLR', jp: 2 },
  { id: 'sbj-past', code: 'PAST', name: 'Produk Pastry dan Bakery Nusantara', category: 'Produktif', department: 'KLR', jp: 4 },
  { id: 'sbj-peng', code: 'PENG', name: 'Pengolahan dan Penyajian Makanan Kontinental', category: 'Produktif', department: 'KLR', jp: 6 },
  { id: 'sbj-mtk', code: 'MTK', name: 'Matematika Terapan', category: 'Umum', department: 'UMUM', jp: 4 },
  { id: 'sbj-bin', code: 'BIN', name: 'Bahasa Indonesia', category: 'Umum', department: 'UMUM', jp: 4 },
  { id: 'sbj-big', code: 'BIG', name: 'Bahasa Inggris', category: 'Umum', department: 'UMUM', jp: 4 },
  { id: 'sbj-pai', code: 'PAI', name: 'Pendidikan Agama Islam', category: 'Umum', department: 'UMUM', jp: 3 },
  { id: 'sbj-pkn', code: 'PKN', name: 'Pendidikan Pancasila & Kewarganegaraan', category: 'Umum', department: 'UMUM', jp: 2 },
];

// ---------------------------------------------------------------------------
// 6. GENERASI JADWAL TERPADU (SINKRON DENGAN DOKUMEN MONITORING KBM)
// ---------------------------------------------------------------------------
export function generateScheduleItemsFromPresets(): ScheduleItem[] {
  const result: ScheduleItem[] = [];

  const processRowGroup = (
    rows: typeof PRESET_KELAS_X,
    grade: 10 | 11 | 12,
    defaultWeek: 'P10_PROD_P11_NORM' | 'P10_NORM_P11_PROD' | 'ALL'
  ) => {
    rows.forEach((row) => {
      MATRIX_PERIODS.forEach((p) => {
        const slot = row.slots[p.index];
        if (!slot) return; // slot kosong tidak perlu item jadwal

        // Cari guru
        const teacher = SEED_TEACHERS.find(
          (t) => t.code === slot.teacherCode || t.name === slot.teacherName
        );

        result.push({
          id: `sched-${row.className.toLowerCase().replace(/\s+/g, '-')}-j${p.index}-senin`,
          dayOfWeek: 1, // Senin (sesuai dokumen lampiran monitoring)
          dayName: 'SENIN',
          periodIndex: p.index,
          timeRange: p.range,
          startTime: p.time,
          endTime: p.range.split('-')[1]?.trim() || p.time,
          teacherId: teacher?.id || `tch-${slot.teacherCode.toLowerCase()}`,
          teacherName: slot.teacherName,
          teacherCode: slot.teacherCode,
          subjectCode: slot.subjectCode,
          subjectName: slot.subjectName,
          classId: row.id,
          className: row.className,
          department: row.programCode,
          roomName: slot.roomName,
          roomType: slot.roomType || 'Teori',
          weekType: defaultWeek,
        });
      });
    });
  };

  // Kelas X: Pekan Produktif (P10_PROD_P11_NORM)
  processRowGroup(PRESET_KELAS_X, 10, 'P10_PROD_P11_NORM');

  // Kelas XI: Pekan Produktif Kelas 11 (P10_NORM_P11_PROD)
  processRowGroup(PRESET_KELAS_XI, 11, 'P10_NORM_P11_PROD');

  // Kelas XII: Semua Pekan (ALL)
  processRowGroup(PRESET_KELAS_XII, 12, 'ALL');

  return result;
}

export const SEED_SCHEDULES: ScheduleItem[] = generateScheduleItemsFromPresets();
