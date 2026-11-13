import { Department } from '../types';

/**
 * Grup alias kode jurusan / program keahlian yang umum digunakan di SMK
 * (misal nama master kelas memakai "X KL 1" / "KL", sementara master jurusan memakai "KLR").
 */
export const DEPARTMENT_ALIAS_GROUPS: string[][] = [
  ['KLR', 'KL', 'TBG', 'KUL', 'KULINER', 'BOGA', 'TATABOGA'],
  ['TKR', 'TKRO', 'OTO'],
  ['TSM', 'TBSM'],
  ['TPL', 'TP', 'LAS'],
  ['TKJ', 'TJKT'],
  ['AK', 'AKL', 'AKUNTANSI'],
  ['DPB', 'DPIB', 'BKP'],
];

/**
 * Normalisasi kode jurusan (trim + uppercase + hilangkan spasi berlebih).
 */
export function normalizeDeptToken(value?: string): string {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Mengembalikan daftar seluruh variasi alias yang setara dengan suatu kode jurusan.
 */
export function getDepartmentAliases(code?: string): string[] {
  const upper = normalizeDeptToken(code);
  if (!upper) return [];
  const group = DEPARTMENT_ALIAS_GROUPS.find((g) => g.includes(upper));
  return group ? group : [upper];
}

/**
 * Mengecek apakah dua kode jurusan/program merepresentasikan jurusan yang sama
 * (mendukung kecocokan persis maupun alias seperti "KL" <-> "KLR").
 */
export function areDepartmentsEquivalent(a?: string, b?: string): boolean {
  const ua = normalizeDeptToken(a);
  const ub = normalizeDeptToken(b);
  if (!ua || !ub) return false;
  if (ua === ub) return true;
  return DEPARTMENT_ALIAS_GROUPS.some((g) => g.includes(ua) && g.includes(ub));
}

const IGNORED_CLASS_TOKENS = new Set([
  'X',
  'XI',
  'XII',
  '10',
  '11',
  '12',
  'KELAS',
  'KLS',
  'ROMBEL',
]);

/**
 * Mengekstrak dan mencocokkan kode jurusan dari nama/kode kelas (misal "X KL 1" -> "KLR" atau "KL").
 */
export function inferDepartmentFromClassName(
  className?: string,
  validDepartmentCodes: string[] = []
): string | null {
  if (!className || !className.trim()) return null;

  const upperValid = Array.from(
    new Set(validDepartmentCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))
  );

  // Pecah berdasarkan pemisah umum: spasi, tanda hubung, garis bawah, garis miring, titik
  const rawTokens = className
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const candidateTokens: string[] = [];
  for (const tok of rawTokens) {
    if (IGNORED_CLASS_TOKENS.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    // Abaikan sufiks 1 huruf di belakang (misal rombel A/B/C), kecuali jika memang ada jurusan 1 huruf di master
    if (tok.length === 1 && !upperValid.includes(tok)) continue;
    candidateTokens.push(tok);
  }

  // Dukungan tambahan jika nama kelas ditulis rapat tanpa spasi (misal "XKL1" atau "KL1")
  if (candidateTokens.length === 0) {
    const stripped = className
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/^(XII|XI|X|10|11|12)/, '')
      .replace(/\d+$/, '');
    if (stripped.length >= 2) {
      candidateTokens.push(stripped);
    }
  }

  // 1. Prioritas kecocokan persis dengan kode jurusan aktif
  for (const tok of candidateTokens) {
    const exact = upperValid.find((vc) => vc === tok);
    if (exact) return exact;
  }

  // 2. Prioritas kecocokan alias terhadap kode jurusan aktif (misal token "KL" -> master "KLR")
  for (const tok of candidateTokens) {
    const aliasMatch = upperValid.find((vc) => areDepartmentsEquivalent(vc, tok));
    if (aliasMatch) return aliasMatch;
  }

  // 3. Fallback ke grup alias standar jika master jurusan kosong
  for (const tok of candidateTokens) {
    const group = DEPARTMENT_ALIAS_GROUPS.find((g) => g.includes(tok));
    if (group) return group[0];
  }

  // 4. Fallback token kandidat pertama (jika minimal 2 huruf dan mengandung huruf)
  const fallbackTok = candidateTokens.find((t) => /[A-Z]{2,}/.test(t));
  return fallbackTok || null;
}

/**
 * Menyelesaikan kode jurusan kanonik untuk suatu kelas atau jadwal agar sinkron
 * antara Master Jurusan, Master Kelas (misal "X KL 1" / "KL"), dan seluruh filter Monitoring/Laporan.
 */
export function resolveDepartmentCode(
  rawDept?: string,
  className?: string,
  masterDepartments: Department[] = [],
  fallbackCodes: string[] = []
): string {
  const masterCodes = Array.from(
    new Set(masterDepartments.map((d) => (d.code || '').trim().toUpperCase()).filter(Boolean))
  );
  const allTargetCodes = [...masterCodes];
  for (const fc of fallbackCodes) {
    const upper = (fc || '').trim().toUpperCase();
    if (upper && !allTargetCodes.some((mc) => mc === upper || areDepartmentsEquivalent(mc, upper))) {
      allTargetCodes.push(upper);
    }
  }

  const rawClean = (rawDept || '').trim().toUpperCase();
  const isGenericRaw = !rawClean || rawClean === 'UMUM' || rawClean === 'LAINNYA';

  if (!isGenericRaw) {
    // 1. Jika persis ada di Master Jurusan, langsung gunakan kode Master Jurusan tersebut
    const exactMaster = masterCodes.find((mc) => mc === rawClean);
    if (exactMaster) return exactMaster;

    // 2. Jika merupakan alias dari salah satu Master Jurusan (misal "KL" -> "KLR"), sinkronkan ke Master Jurusan
    const aliasMaster = masterCodes.find((mc) => areDepartmentsEquivalent(mc, rawClean));
    if (aliasMaster) return aliasMaster;

    // 3. Jika belum ada di Master Jurusan, cocokkan dengan fallback/preset program (misal "KL" -> "KLR")
    const aliasTarget = allTargetCodes.find((tc) => tc === rawClean || areDepartmentsEquivalent(tc, rawClean));
    if (aliasTarget) return aliasTarget;
  }

  // 4. Coba inferensi dari nama kelas (misal "X KL 1" -> "KLR")
  const inferred = inferDepartmentFromClassName(className, allTargetCodes);
  if (inferred) return inferred;

  return !isGenericRaw ? rawClean : 'UMUM';
}

/**
 * Mencari objek Department dari Master Jurusan berdasarkan kode atau aliasnya.
 */
export function getDepartmentInfo(
  code?: string,
  masterDepartments: Department[] = []
): Department | undefined {
  const clean = (code || '').trim().toUpperCase();
  if (!clean) return undefined;
  return (
    masterDepartments.find((d) => (d.code || '').trim().toUpperCase() === clean) ||
    masterDepartments.find((d) => areDepartmentsEquivalent(d.code, clean))
  );
}
