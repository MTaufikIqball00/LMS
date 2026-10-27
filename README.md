# 🎓 Learning Management System (LMS) - Jabar Istimewa

Platform Manajemen Pembelajaran Digital Modern berbasis **Next.js 15**, **Supabase (PostgreSQL)**, dan **AI Early Warning System (Machine Learning)** yang dirancang untuk mendukung ekosistem pendidikan terintegrasi, multi-tenant, dan aman.

---

## 📸 Antarmuka Aplikasi

### 1. Dashboard Utama Siswa
![Dashboard Siswa](docs/screenshots/dashboard.jpg)

### 2. Manajemen Tugas & Assignment
![Tugas & Assignment](docs/screenshots/tugas.jpg)

### 3. Nilai & Performa Akademik
![Nilai Akademik](docs/screenshots/nilai.jpg)

---

## 🚀 Fitur Unggulan

### 🔐 1. Multi-Role RBAC & Multi-Tenancy
Sistem autentikasi berbasis JWT dengan pembagian hak akses terisolasi untuk 5 peran:
- **Siswa**: Akses materi, pengumpulan tugas, kuis online, rekap nilai, presensi, dan forum diskusi.
- **Guru**: Manajemen modul pembelajaran, pembuatan tugas & kuis, penilaian submission, dan pemantauan risiko akademik siswa.
- **Kepala Sekolah**: Dashboard analitik sekolah, evaluasi kinerja guru, rekapitulasi nilai, dan log aktivitas.
- **Admin Sekolah**: Pengelolaan akun siswa dan guru khusus sekolah yang bersangkutan (terisolasi per `school_id`).
- **Admin Langganan (Super Admin)**: Manajemen lisensi sekolah, paket langganan, dan data pembayaran.

### 🤖 2. AI Early Warning System (Machine Learning)
- Service backend Python Flask terintegrasi yang memanfaatkan algoritma **K-Means Clustering (scikit-learn)**.
- Menganalisis tingkat kehadiran, kelengkapan tugas, dan skor kuis secara otomatis untuk mengelompokkan siswa ke dalam tingkat risiko: **Aman**, **Berisiko Sedang**, atau **Berisiko Tinggi**.
- Membantu pendidik melakukan intervensi dini sebelum siswa mengalami kendala akademik lebih lanjut.

### 🗄️ 3. Universal Database Engine
Aplikasi dilengkapi dengan adapter cerdas ([src/lib/db.ts](src/lib/db.ts)) yang mendukung:
- **Supabase Cloud (PostgreSQL)**: Menggunakan pooler SSL terenkripsi, parsing otomatis placeholder parameter, dan pemetaan transaksi.
- **MySQL (Lokal/Docker)**: Skema MySQL 24 tabel relasional siap pakai ([lms_db.sql](lms_db.sql)).

### 🛡️ 4. Keamanan Standar OWASP
- **Password Hashing**: Menggunakan algoritma derivasi kunci **scrypt** (salt acak 16-byte) dengan verifikasi *constant-time* (`crypto.timingSafeEqual`) untuk mencegah serangan *timing attack*.
- **Multi-Tenant Data Isolation**: Seluruh endpoint API memverifikasi `school_id` sesi guna mencegah kebocoran data lintas sekolah (*IDOR prevention*).
- **File Persistence**: Pengumpulan tugas dialirkan langsung ke storage lokal (`/public/uploads/submissions/`) tanpa membebani RAM server.

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|---|---|
| **Frontend Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, React 19, TypeScript) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/) |
| **Database Cloud** | [Supabase](https://supabase.com/) (PostgreSQL 15+) |
| **Database Lokal** | MySQL 8.0 / MariaDB (Alternatif) |
| **Machine Learning** | Python 3.10+, Flask, Pandas, Scikit-Learn |
| **Video & Stream** | [@stream-io/video-react-sdk](https://getstream.io/) |
| **Visualisasi Data** | [Recharts](https://recharts.org/) |

---

## ⚡ Cara Menjalankan Proyek

### Opsi 1: 1-Klik Launcher (Paling Praktis di Windows)
Proyek telah dilengkapi dengan launcher otomatis yang langsung menjalankan seluruh layanan dalam sekali klik:
1. Klik ganda ikon **`LMS Portal`** di Desktop Anda (atau klik ganda file [`start-lms.bat`](start-lms.bat)).
2. Launcher akan otomatis:
   - Memvalidasi koneksi ke Supabase.
   - Menjalankan AI Python Service di latar belakang (*Port 5000*).
   - Menjalankan Next.js Web Server (*Port 3000*).
   - Membuka browser ke `http://localhost:3000`.

---

### Opsi 2: Menjalankan Manual via Terminal

#### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/MTaufikIqball00/LMS.git
cd LMS
npm install
```

#### 2. Install Dependensi Python (AI Service)
```bash
pip install -r flask_service/requirements.txt
```

#### 3. Konfigurasi Lingkungan (`.env`)
Salin file template lingkungan:
```bash
cp .env.example .env
```
Sesuaikan variabel di dalam `.env`:
```env
# Koneksi Database Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Keamanan Sesi JWT
JWT_SECRET_KEY=kunci_rahasia_lms_super_aman_12345

# Layanan AI Flask
FLASK_SERVICE_URL=http://127.0.0.1:5000
```

#### 4. Impor Skema Basis Data
- **Supabase**: Buka **SQL Editor** di dashboard Supabase Anda, salin seluruh isi file [`supabase_schema.sql`](supabase_schema.sql), lalu klik tombol **Run**.
- **MySQL Lokal**: Jalankan `mysql -u root -p < lms_db.sql`.

#### 5. Jalankan Aplikasi
Jalankan AI Flask Service di terminal 1:
```bash
cd flask_service
python app.py
```

Jalankan Web LMS di terminal 2:
```bash
npm run dev
```
Buka browser Anda di [http://localhost:3000](http://localhost:3000).

---

## 👥 Akun Pengujian Default (Seed Accounts)

Seluruh akun telah disiapkan dengan kata sandi default: **`password123`**

| Peran (Role) | Email | Nama Pengguna | Sekolah |
|---|---|---|---|
| **Siswa (Kelas 12)** | `murid.jabar@sekolah.id` | Siswa Jabar | SMAN 1 Bandung |
| **Siswa (Kelas 11)** | `murid.luar@sekolah.id` | Siswa Luar Jabar | SMAN 1 Medan |
| **Siswa (Kelas 10)** | `murid.kelas10@sekolah.id` | Siswa Kelas 10 | SMAN 3 Jakarta |
| **Guru** | `guru.jabar@sekolah.id` | Guru Jabar | SMAN 1 Bandung |
| **Kepala Sekolah** | `kepala@sekolah.id` | Kepala Sekolah Bandung | SMAN 1 Bandung |
| **Admin Sekolah** | `admin.sekolah@sekolah.id` | Admin Sekolah Bandung | SMAN 1 Bandung |
| **Admin Langganan** | `admin@langganan.id` | Admin Langganan | Platform Super Admin |

---

## 📁 Struktur Direktori

```text
├── docs/                      # Dokumentasi & aset tangkapan layar
│   └── screenshots/           # Tangkapan layar antarmuka LMS
├── flask_service/             # Layanan AI Early Warning System (Python Flask)
│   ├── app.py                 # Endpoint analitik prediktif & KMeans
│   ├── requirements.txt       # Dependensi Python
│   └── Dockerfile             # Containerisasi layanan AI
├── scripts/                   # Skrip utilitas pengujian & database
│   ├── seed-full.js           # Pengisian data seed dengan scrypt hashing
│   ├── test-db.js             # Skrip diagnosa konektivitas database
│   └── create-desktop-shortcut.ps1 # Pembuat pintasan desktop otomatis
├── src/
│   ├── app/                   # Next.js App Router (Halaman & API Routes)
│   │   ├── (auth)/            # Halaman login & verifikasi
│   │   ├── api/               # REST API Handlers (Admin, Guru, Siswa, Tryout, dll.)
│   │   ├── components/        # Komponen UI Reusable
│   │   └── teacher/           # Portal Khusus Guru
│   ├── lib/                   # Utilitas Sistem
│   │   ├── auth/              # Sistem Otentikasi (JWT, scrypt, session, RBAC)
│   │   └── db.ts              # Universal Database Adapter (Supabase & MySQL)
├── .env.example               # Template variabel lingkungan
├── docker-compose.yml         # Konfigurasi orkestrasi container Docker
├── lms_db.sql                 # Skema relational 24 tabel MySQL
├── start-lms.bat              # Launcher 1-klik untuk Windows
├── start-lms.ps1              # Launcher 1-klik untuk PowerShell
├── supabase_schema.sql        # Skema & data seed PostgreSQL Supabase
└── tsconfig.json              # Konfigurasi TypeScript compiler
```

---

## 📄 Lisensi
Proyek ini dikembangkan untuk implementasi Sistem Manajemen Pembelajaran (LMS). Hak cipta dilindungi undang-undang.
