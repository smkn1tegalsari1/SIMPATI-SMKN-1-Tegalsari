import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_ACADEMIC_YEARS,
  INITIAL_USER_ACCOUNTS,
  ensureDefaultAccounts,
} from './src/data/initialData';
import {
  hasMeaningfulSchoolData,
  isSystemPlaceholderStore,
} from './src/data/storeSync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'simpati_store.json');

// Pastikan direktori penyimpanan data server tersedia
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inisialisasi struktur data bersih tanpa timestamp palsu agar TIDAK PERNAH menimpa Cloud Firestore
function getInitialStore() {
  return {
    teachers: [],
    subjects: [],
    classes: [],
    departments: [],
    rooms: [],
    academicYears: INITIAL_ACADEMIC_YEARS,
    schedules: [],
    attendanceRecords: {},
    userAccounts: ensureDefaultAccounts(INITIAL_USER_ACCOUNTS),
    journals: [],
    activeWeekFilter: 'AUTO',
    monthlyWeekSchedules: {},
    lastUpdated: 0,
    lastUpdatedBy: 'System',
    isInitialEmpty: true,
  };
}

let inMemoryStore: any = null;

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      inMemoryStore = JSON.parse(raw);
      if (!inMemoryStore || typeof inMemoryStore !== 'object') {
        inMemoryStore = getInitialStore();
        saveStore();
      } else {
        inMemoryStore.userAccounts = ensureDefaultAccounts(inMemoryStore.userAccounts || INITIAL_USER_ACCOUNTS);
        if (!Array.isArray(inMemoryStore.teachers)) inMemoryStore.teachers = [];
        if (!Array.isArray(inMemoryStore.subjects)) inMemoryStore.subjects = [];
        if (!Array.isArray(inMemoryStore.classes)) inMemoryStore.classes = [];
        if (!Array.isArray(inMemoryStore.departments)) inMemoryStore.departments = [];
        if (!Array.isArray(inMemoryStore.rooms)) inMemoryStore.rooms = [];
        if (!Array.isArray(inMemoryStore.academicYears)) inMemoryStore.academicYears = INITIAL_ACADEMIC_YEARS;
        if (!Array.isArray(inMemoryStore.schedules)) inMemoryStore.schedules = [];
        if (!inMemoryStore.attendanceRecords || typeof inMemoryStore.attendanceRecords !== 'object') inMemoryStore.attendanceRecords = {};
        if (!Array.isArray(inMemoryStore.journals)) inMemoryStore.journals = [];
        if (!inMemoryStore.monthlyWeekSchedules || typeof inMemoryStore.monthlyWeekSchedules !== 'object') inMemoryStore.monthlyWeekSchedules = {};

        // Jika file lokal hanyalah placeholder kosong bawaan container/reset lama, nol-kan timestampnya
        if (!hasMeaningfulSchoolData(inMemoryStore) && isSystemPlaceholderStore(inMemoryStore)) {
          inMemoryStore.lastUpdated = 0;
          inMemoryStore.isInitialEmpty = true;
        }
      }
    } else {
      inMemoryStore = getInitialStore();
      saveStore();
    }
  } catch (err) {
    console.error('Error loading store, using initial data:', err);
    inMemoryStore = getInitialStore();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

// Muat store saat startup
loadStore();

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  // SSE Clients list untuk sinkronisasi real-time instan ke semua perangkat
  let sseClients: express.Response[] = [];

  const broadcastEvent = (type: string, payload: any) => {
    const message = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
    sseClients = sseClients.filter((client) => {
      try {
        client.write(message);
        return true;
      } catch (err) {
        return false;
      }
    });
  };

  // 1. Endpoint SSE untuk sinkronisasi antar-admin dan semua perangkat
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Kirim event ping selamat datang
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
  });

  // 2. Endpoint GET /api/state: Ambil database terpusat
  app.get('/api/state', (req, res) => {
    loadStore();
    res.json({
      success: true,
      data: inMemoryStore,
      lastUpdated: typeof inMemoryStore?.lastUpdated === 'number' ? inMemoryStore.lastUpdated : 0,
    });
  });

  // 2b. Endpoint GET /api/firestore-storage-metrics: Ambil ukuran aktual penyimpanan Firestore via Google Cloud Monitoring
  app.get('/api/firestore-storage-metrics', async (req, res) => {
    const FIRESTORE_FREE_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GiB
    let projectId = '';
    let databaseId = '(default)';

    try {
      const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        if (cfg.firestoreDatabaseId) {
          projectId = cfg.projectId || '';
          databaseId = cfg.firestoreDatabaseId;
        } else {
          projectId = 'model-cell-lrrhs';
          databaseId = 'ai-studio-simpatismkn1tega-a2de4c12-589c-4acb-97fa-2ab69d4a292a';
        }
      }
    } catch {
      // Abaikan jika gagal membaca konfigurasi
    }

    if (!projectId) {
      return res.json({
        success: true,
        available: false,
        source: 'unavailable',
        projectId: '',
        databaseId,
        quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
        quotaLabel: '1 GiB',
        reason: 'ID proyek Firebase belum terkonfigurasi.',
      });
    }

    try {
      let accessToken = process.env.GCP_MONITORING_ACCESS_TOKEN || '';
      if (!accessToken) {
        const tokRes = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
          {
            headers: { 'Metadata-Flavor': 'Google' },
            signal: AbortSignal.timeout(2000),
          }
        );
        if (tokRes.ok) {
          const tokJson: any = await tokRes.json();
          accessToken = tokJson?.access_token || '';
        }
      }

      if (!accessToken) {
        return res.json({
          success: true,
          available: false,
          source: 'unavailable',
          projectId,
          databaseId,
          quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
          quotaLabel: '1 GiB',
          reason: 'Token kredensial Google Cloud Monitoring tidak tersedia pada runtime ini.',
        });
      }

      const endIso = new Date().toISOString();
      const startIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const monitoringUrl =
        `https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(projectId)}/timeSeries` +
        `?filter=${encodeURIComponent('metric.type="firestore.googleapis.com/storage/data_and_index_size"')}` +
        `&interval.startTime=${encodeURIComponent(startIso)}` +
        `&interval.endTime=${encodeURIComponent(endIso)}`;

      const monRes = await fetch(monitoringUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(4000),
      });

      if (!monRes.ok) {
        const statusCode = monRes.status;
        return res.json({
          success: true,
          available: false,
          source: 'unavailable',
          projectId,
          databaseId,
          quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
          quotaLabel: '1 GiB',
          reason:
            statusCode === 403 || statusCode === 401
              ? `Akses Google Cloud Monitoring (roles/monitoring.viewer) pada proyek "${projectId}" belum diberikan untuk runtime server ini.`
              : `Google Cloud Monitoring mengembalikan status ${statusCode}.`,
        });
      }

      const monData: any = await monRes.json();
      const seriesList: any[] = Array.isArray(monData?.timeSeries) ? monData.timeSeries : [];
      const matchingSeries =
        seriesList.find((s) => s?.resource?.labels?.database_id === databaseId) || seriesList[0];
      const latestPoint = matchingSeries?.points?.[0];
      const rawVal = latestPoint?.value?.int64Value ?? latestPoint?.value?.doubleValue;
      const actualDatabaseBytes = rawVal !== undefined ? Number(rawVal) : null;

      if (actualDatabaseBytes === null || !Number.isFinite(actualDatabaseBytes)) {
        return res.json({
          success: true,
          available: false,
          source: 'unavailable',
          projectId,
          databaseId,
          quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
          quotaLabel: '1 GiB',
          reason: 'Data time-series ukuran penyimpanan Firestore belum tercatat oleh Google Cloud Monitoring.',
        });
      }

      return res.json({
        success: true,
        available: true,
        source: 'google_cloud_monitoring',
        metricType: 'firestore.googleapis.com/storage/data_and_index_size',
        projectId,
        databaseId,
        actualDatabaseBytes,
        measuredAt: latestPoint?.interval?.endTime || endIso,
        quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
        quotaLabel: '1 GiB',
      });
    } catch (err: any) {
      return res.json({
        success: true,
        available: false,
        source: 'unavailable',
        projectId,
        databaseId,
        quotaBytes: FIRESTORE_FREE_STORAGE_QUOTA_BYTES,
        quotaLabel: '1 GiB',
        reason: err?.message || 'Tidak dapat menghubungi Google Cloud Monitoring API.',
      });
    }
  });

  // 3. Endpoint POST /api/sync: Simpan pembaruan data dari admin atau hidrasi Cloud Firestore
  app.post('/api/sync', (req, res) => {
    try {
      const { key, data, updatedBy, fullState, clientId, lastUpdated, skipBroadcast } = req.body;

      if (!inMemoryStore) {
        loadStore();
      }

      const incomingTs =
        typeof lastUpdated === 'number' && lastUpdated >= 0
          ? lastUpdated
          : Date.now();

      if (fullState) {
        inMemoryStore = {
          ...inMemoryStore,
          ...fullState,
          userAccounts: ensureDefaultAccounts(fullState.userAccounts || inMemoryStore.userAccounts),
          lastUpdated: incomingTs,
          lastUpdatedBy: updatedBy || fullState.lastUpdatedBy || 'Admin',
          isInitialEmpty: false,
        };
      } else if (key && data !== undefined) {
        if (key === 'userAccounts') {
          inMemoryStore.userAccounts = ensureDefaultAccounts(data);
        } else {
          inMemoryStore[key] = data;
        }
        inMemoryStore.lastUpdated = incomingTs;
        inMemoryStore.lastUpdatedBy = updatedBy || 'Admin';
        inMemoryStore.isInitialEmpty = false;
      }

      saveStore();

      if (!skipBroadcast) {
        // Siarkan pembaruan langsung ke semua tab & laptop admin lain secara real-time
        broadcastEvent('state_updated', {
          key,
          data: key === 'userAccounts' ? inMemoryStore.userAccounts : (key ? data : inMemoryStore),
          updatedBy: updatedBy || 'Admin',
          originClientId: clientId,
          lastUpdated: inMemoryStore.lastUpdated,
        });
      }

      res.json({
        success: true,
        lastUpdated: inMemoryStore.lastUpdated,
      });
    } catch (err: any) {
      console.error('Error handling /api/sync:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Endpoint POST /api/reset: Kembalikan data ke awal atau kosongkan
  app.post('/api/reset', (req, res) => {
    try {
      const { type, clientId, updatedBy } = req.body;
      const now = Date.now();
      if (type === 'empty') {
        inMemoryStore = {
          teachers: [],
          subjects: [],
          classes: [],
          departments: [],
          rooms: [],
          academicYears: INITIAL_ACADEMIC_YEARS,
          schedules: [],
          attendanceRecords: {},
          journals: [],
          userAccounts: ensureDefaultAccounts(
            (inMemoryStore?.userAccounts || INITIAL_USER_ACCOUNTS).filter(
              (u: any) => u.role === 'admin' || u.role === 'pimpinan'
            )
          ),
          activeWeekFilter: 'AUTO',
          monthlyWeekSchedules: {},
          lastUpdated: now,
          lastUpdatedBy: updatedBy || 'Admin',
          isInitialEmpty: true,
          explicitResetAt: now,
        };
      } else {
        inMemoryStore = getInitialStore();
        inMemoryStore.lastUpdated = now;
        inMemoryStore.lastUpdatedBy = updatedBy || 'Admin';
        inMemoryStore.isInitialEmpty = true;
        inMemoryStore.explicitResetAt = now;
      }
      saveStore();

      broadcastEvent('state_updated', {
        key: null,
        data: inMemoryStore,
        updatedBy: updatedBy || 'Admin',
        originClientId: clientId,
        lastUpdated: inMemoryStore.lastUpdated,
      });

      res.json({ success: true, data: inMemoryStore });
    } catch (err: any) {
      console.error('Error handling /api/reset:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Endpoint POST /api/auth/login: Validasi login terpusat
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username dan Password wajib diisi!',
        });
      }

      const trimmedUser = String(username).trim().toLowerCase();
      // Selalu pastikan akun default admin & pimpinan aktif dan tersedia
      const accounts = ensureDefaultAccounts(inMemoryStore.userAccounts || []);
      inMemoryStore.userAccounts = accounts;

      const matched = accounts.find((acc: any) => {
        const uMatch = acc.username && acc.username.toLowerCase() === trimmedUser;
        const nipMatch = acc.nip && acc.nip.replace(/\s+/g, '').toLowerCase() === trimmedUser.replace(/\s+/g, '');
        const codeMatch = acc.teacherCode && acc.teacherCode.toLowerCase() === trimmedUser;
        return (uMatch || nipMatch || codeMatch) && acc.password === String(password);
      });

      if (!matched) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah! Pastikan akun telah didaftarkan oleh Admin.',
        });
      }

      if (matched.status === 'nonaktif') {
        return res.status(403).json({
          success: false,
          message: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi admin sekolah.',
        });
      }

      const teacher = matched.teacherId
        ? inMemoryStore.teachers?.find((t: any) => t.id === matched.teacherId)
        : undefined;

      const userSession = {
        id: matched.id,
        name: matched.name,
        role: matched.role,
        title: matched.additionalDuty || teacher?.title || 'Pengguna SIMPATI',
        username: matched.username,
        teacherId: matched.teacherId,
        teacherCode: matched.teacherCode || teacher?.code,
        nip: matched.nip || teacher?.nip,
        piketDays: matched.piketDays || teacher?.piketDays || [],
        email: matched.email || teacher?.email,
        phone: matched.phone || teacher?.phone,
      };

      res.json({
        success: true,
        message: `Selamat datang, ${matched.name}!`,
        user: userSession,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Vite development middleware or static serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIMPATI Server] Berjalan pada port ${PORT} (0.0.0.0)`);
  });
}

startServer().catch((err) => {
  console.error('[SIMPATI Server] Gagal memulai:', err);
  process.exit(1);
});
