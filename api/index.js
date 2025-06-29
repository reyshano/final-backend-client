const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // --- BARU: Import library CORS ---

const app = express();
app.use(express.json());

// --- START: Konfigurasi CORS ---
// PENTING: Ganti 'https://react-client-five.vercel.app' dengan domain frontend Vercel kamu yang sebenarnya
// Jika kamu punya domain preview seperti 'https://namaproject-xxxx.vercel.app',
// kamu bisa tambahkan regex untuk mengizinkan semua subdomain Vercel.
app.use(cors({
  origin: [
    'https://react-client-five.vercel.app', // Domain utama frontend kamu
    /\.react-client-five\.vercel\.app$/ // Mengizinkan semua subdomain (misalnya untuk Preview Deployment)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Izinkan metode HTTP yang diperlukan
  allowedHeaders: ['Content-Type', 'Authorization'] // Izinkan header yang mungkin dikirim frontend
}));

// Jika kamu ingin mengizinkan semua origin (kurang aman untuk produksi, tapi mudah untuk testing awal),
// cukup gunakan:
// app.use(cors());
// --- END: Konfigurasi CORS ---


// Function to load database
function loadDatabase() {
  try {
    // Try to load from db.json first
    const dbFile = path.join(__dirname, '../db.json');
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf-8');
      return JSON.parse(content);
    }

    // Fallback: load from db folder
    const dbFolder = path.join(__dirname, '../db');
    if (fs.existsSync(dbFolder)) {
      const files = fs.readdirSync(dbFolder).filter(f => f.endsWith('.json'));
      const combined = {};

      files.forEach(file => {
        const key = path.basename(file, '.json');
        const filePath = path.join(dbFolder, file);

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          combined[key] = JSON.parse(content);
        } catch (error) {
          console.error(`Error reading ${file}:`, error.message);
        }
      });

      return combined;
    }

    // Ultimate fallback
    return {
      dosen: [
        { id: 1, nama: "Dr. John Doe", nidn: "1234567890" }
      ],
      mahasiswa: [
        { id: 1, nama: "Jane Smith", nim: "12345678" }
      ]
    };

  } catch (error) {
    console.error('Database loading error:', error);
    return {};
  }
}

// Load database
const db = loadDatabase();

// Routes
// Perhatikan bahwa semua route di sini menggunakan '/api/' prefix
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    collections: Object.keys(db),
    platform: 'Vercel Serverless',
    timestamp: new Date().toISOString(),
    itemCounts: Object.keys(db).reduce((acc, key) => {
      acc[key] = Array.isArray(db[key]) ? db[key].length : 'not array';
      return acc;
    }, {})
  });
});

app.get('/api/:collection', (req, res) => {
  const { collection } = req.params;

  // Untuk `/chart`, `/matkul`, `/users` yang kamu panggil, mereka akan masuk ke sini
  // sebagai 'chart', 'matkul', 'users'. Pastikan data untuk ini ada di `db.json`
  // atau folder `db` kamu.
  // Contoh: Jika ada data di db.json dengan key "chart", "matkul", "users"
  // `db.json` mungkin terlihat seperti:
  // {
  //   "dosen": [...],
  //   "mahasiswa": [...],
  //   "chart": [...], // <-- Ini yang akan diakses
  //   "matkul": [...], // <-- Ini yang akan diakses
  //   "users": [...]   // <-- Ini yang akan diakses
  // }

  if (db[collection]) {
    res.json(db[collection]);
  } else {
    res.status(404).json({
      error: `Collection '${collection}' not found`,
      available: Object.keys(db),
      debug: {
        requested: collection,
        dbKeys: Object.keys(db),
        dbType: typeof db
      }
    });
  }
});

app.get('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;

  if (!db[collection]) {
    return res.status(404).json({
      error: `Collection '${collection}' not found`,
      available: Object.keys(db)
    });
  }

  const item = db[collection].find(item => item.id == id);

  if (item) {
    res.json(item);
  } else {
    res.status(404).json({
      error: `Item with id '${id}' not found in collection '${collection}'`,
      totalItems: db[collection].length
    });
  }
});

// Catch all for debugging
app.get('*', (req, res) => {
  res.json({
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      '/api/status',
      '/api/:collection',
      '/api/:collection/:id'
    ]
  });
});

module.exports = app;