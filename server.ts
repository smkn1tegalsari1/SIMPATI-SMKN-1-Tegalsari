import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_TEACHERS,
  INITIAL_SUBJECTS,
  INITIAL_CLASSES,
  INITIAL_DEPARTMENTS,
  INITIAL_ROOMS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_SCHEDULE,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_USER_ACCOUNTS,
  INITIAL_JOURNALS,
  ensureDefaultAccounts,
} from './src/data/initialData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'simpati_store.json');

// Pastikan direktori penyimpanan data server tersedia
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inisialisasi struktur data terpusat jika file belum ada
function getInitialStore() {
  return {
    teachers: INITIAL_TEACHERS,
    subjects: INITIAL_SUBJECTS,
    classes: INITIAL_CLASSES,
    departments: INITIAL_DEPARTMENTS,
    rooms: INITIAL_ROOMS,
    academicYears: INITIAL_ACADEMIC_YEARS,
    schedules: INITIAL_SCHEDULE,
    attendanceRecords: INITIAL_ATTENDANCE_RECORDS,
    userAccounts: ensureDefaultAccounts(INITIAL_USER_ACCOUNTS),
    journals: INITIAL_JOURNALS,
    activeWeekFilter: 'ACTIVE',
    lastUpdated: Date.now(),
    lastUpdatedBy: 'System',
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
      } else {
        inMemoryStore.userAccounts = ensureDefaultAccounts(inMemoryStore.userAccounts || INITIAL_USER_ACCOUNTS);
        // Jika data kelas, jurusan, atau jadwal masih kosong, isi dengan data master terpadu SMKN 1 Tegalsari
        if (!Array.isArray(inMemoryStore.classes) || inMemoryStore.classes.length === 0) {
          inMemoryStore.classes = INITIAL_CLASSES;
          inMemoryStore.departments = INITIAL_DEPARTMENTS;
          inMemoryStore.teachers = INITIAL_TEACHERS;
          inMemoryStore.subjects = INITIAL_SUBJECTS;
          inMemoryStore.rooms = INITIAL_ROOMS;
          inMemoryStore.schedules = INITIAL_SCHEDULE;
          saveStore();
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
      lastUpdated: inMemoryStore?.lastUpdated || Date.now(),
    });
  });

  // 3. Endpoint POST /api/sync: Simpan pembaruan data dari admin mana pun
  app.post('/api/sync', (req, res) => {
    try {
      const { key, data, updatedBy, fullState, clientId } = req.body;

      if (!inMemoryStore) {
        loadStore();
      }

      if (fullState) {
        inMemoryStore = {
          ...inMemoryStore,
          ...fullState,
          userAccounts: ensureDefaultAccounts(fullState.userAccounts || inMemoryStore.userAccounts),
          lastUpdated: Date.now(),
          lastUpdatedBy: updatedBy || 'Admin',
        };
      } else if (key && data !== undefined) {
        if (key === 'userAccounts') {
          inMemoryStore.userAccounts = ensureDefaultAccounts(data);
        } else {
          inMemoryStore[key] = data;
        }
        inMemoryStore.lastUpdated = Date.now();
        inMemoryStore.lastUpdatedBy = updatedBy || 'Admin';
      }

      saveStore();

      // Siarkan pembaruan langsung ke semua tab & laptop admin lain secara real-time!
      broadcastEvent('state_updated', {
        key,
        data: key === 'userAccounts' ? inMemoryStore.userAccounts : (key ? data : inMemoryStore),
        updatedBy: updatedBy || 'Admin',
        originClientId: clientId,
        lastUpdated: inMemoryStore.lastUpdated,
      });

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
      if (type === 'empty') {
        inMemoryStore = {
          teachers: [],
          subjects: [],
          classes: [],
          departments: [],
          rooms: [],
          academicYears: [],
          schedules: [],
          attendanceRecords: {},
          journals: [],
          userAccounts: ensureDefaultAccounts(
            (inMemoryStore?.userAccounts || INITIAL_USER_ACCOUNTS).filter(
              (u: any) => u.role === 'admin' || u.role === 'pimpinan'
            )
          ),
          activeWeekFilter: 'ACTIVE',
          lastUpdated: Date.now(),
          lastUpdatedBy: updatedBy || 'Admin',
        };
      } else {
        inMemoryStore = getInitialStore();
        inMemoryStore.lastUpdated = Date.now();
        inMemoryStore.lastUpdatedBy = updatedBy || 'Admin';
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
