# Panduan Hosting MatHeal

MatHeal terdiri dari tiga bagian: frontend React, backend PHP/MySQL, dan server Node.js untuk AskMatheal. Frontend dan PHP dapat ditempatkan pada Apache/cPanel. AskMatheal memerlukan hosting yang mendukung proses Node.js atau layanan Node terpisah.

Folder siap unggah dibuat di `hosting-package/`. Unggah **isi** `hosting-package/public_html` ke document root domain. Folder `hosting-package/private` hanya untuk proses setup dan tidak boleh ditempatkan di dalam `public_html`.

## Kebutuhan server

- Apache dengan `mod_rewrite` dan PHP 8.1 atau lebih baru.
- MySQL/MariaDB dengan ekstensi PHP `mysqli`, `fileinfo`, dan `mbstring`.
- Node.js 18 atau lebih baru untuk AskMatheal.
- HTTPS aktif pada domain produksi.

## 1. Siapkan database

1. Buat database dan pengguna database melalui panel hosting.
2. Impor `backend/schema.sql`.
3. Impor data materi dan bank soal dari database lokal apabila data produksi harus sama dengan aplikasi saat ini.
4. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi kredensial database, domain, dan kunci pendaftaran admin.
5. Buat satu nilai acak minimal 32 byte untuk `INTERNAL_API_KEY`. Nilai ini harus sama pada konfigurasi PHP dan Node.

Jangan mengunggah `.env` ke repositori. Apache sudah dikonfigurasi untuk menolak akses web ke berkas tersebut.

## 2. Atur frontend produksi

Salin `.env.production.example` menjadi `.env.production` lalu sesuaikan:

- `VITE_BASE_PATH=/` jika aplikasi berada di root domain.
- `VITE_BASE_PATH=/matheal/` jika aplikasi berada dalam subfolder `matheal`.
- `VITE_API_BASE` menunjuk ke folder backend PHP.
- `VITE_AI_API_BASE` menunjuk ke endpoint `/api` server AskMatheal.

Jalankan:

```text
npm ci
npm run build
```

Unggah seluruh isi folder `dist` ke document root aplikasi. Setelah itu unggah folder `backend` dan `Materi` sejajar dengan `index.html`.

Struktur produksi yang diharapkan:

```text
public_html/
  index.html
  .htaccess
  assets/
  tahukah_kamu.png
  backend/
  Materi/
```

Folder `Materi` harus dapat ditulis oleh akun web server jika fitur unggah dan ganti nama materi digunakan. Gunakan izin minimum yang disediakan hosting; hindari izin `777`.

## 3. Jalankan AskMatheal

Di folder `backend` jalankan:

```text
npm ci --omit=dev
npm start
```

Isi `GEMINI_KEY` di `backend/.env`. MatHeal hanya menggunakan Google Gemini sebagai penyedia AskMatheal dan penilai jawaban esai. Atur `AI_ALLOWED_ORIGIN` ke domain frontend. Arahkan reverse proxy domain dari `/api` menuju port Node yang ditentukan oleh `PORT`.

Atur `PHP_AUTH_URL` ke URL HTTPS `backend/verify_token.php`. Server Node menggunakan URL ini bersama `INTERNAL_API_KEY` untuk memastikan endpoint AI hanya dapat dipakai oleh pengguna yang sudah login.

Jika shared hosting tidak mendukung Node.js, deploy folder backend Node ke layanan lain dan masukkan URL layanannya pada `VITE_AI_API_BASE`, kemudian build ulang frontend.

## 4. Buat administrator pertama

Buka `/register-admin`, masukkan nilai yang sama dengan `ADMIN_REGISTRATION_KEY`, lalu buat akun admin. Setelah administrator pertama tersedia, ubah `ADMIN_REGISTRATION_ENABLED=false`. Admin yang sudah login tetap dapat mengelola akun dari dashboard.

## 5. Pemeriksaan setelah deployment

- Buka `backend/health.php`; respons harus menunjukkan `status: ok`.
- Uji login user dan admin.
- Uji Materi PDF, satu kuis, penyimpanan progres, dan logout-login kembali.
- Uji CRUD pengguna, materi, bank soal, video, serta developer dari admin.
- Uji AskMatheal dan pastikan browser tidak menampilkan mixed-content HTTP pada situs HTTPS.
- Uji refresh langsung pada `/home`, `/materi`, `/profile`, dan `/admin`.

## Catatan keamanan

- Semua operasi admin memakai token sesi dan validasi role backend.
- Endpoint AI memverifikasi token pengguna melalui jalur internal PHP sebelum memakai kuota Gemini.
- Login, pendaftaran, dan permintaan reset password dibatasi per alamat IP.
- Token berlaku sesuai `AUTH_TOKEN_TTL_HOURS` dan dicabut saat logout.
- Endpoint seed, migrasi, impor manual, file SQL, `.env`, dan server Node ditolak oleh Apache.
- Gunakan backup database dan folder `Materi` sebelum pembaruan produksi.
