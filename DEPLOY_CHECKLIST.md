# Checklist Deployment MatHeal

## Sebelum unggah

- Gunakan PHP 8.1+, MySQL/MariaDB, HTTPS, dan ekstensi `mysqli`, `fileinfo`, serta `mbstring`.
- Buat database dan user database khusus MatHeal dengan hak hanya pada database tersebut.
- Impor `private/setup/schema.sql`, lalu `private/setup/academic_content.sql`.
- Jangan unggah folder `private` ke document root.

## Konfigurasi PHP

- Salin `public_html/backend/.env.example` menjadi `public_html/backend/.env`.
- Isi `APP_ALLOWED_ORIGIN` dengan origin HTTPS yang tepat, tanpa path.
- Isi kredensial database produksi.
- Gunakan `ADMIN_REGISTRATION_KEY` dan `INTERNAL_API_KEY` acak yang panjang dan berbeda.
- Setelah admin pertama dibuat, ubah `ADMIN_REGISTRATION_ENABLED=false`.

## Konfigurasi Node AI

- Deploy isi `node-api`, jalankan `npm ci --omit=dev`, lalu `npm start`.
- Isi `GEMINI_KEY`, `AI_ALLOWED_ORIGIN`, `PHP_AUTH_URL`, dan `INTERNAL_API_KEY`.
- Nilai `INTERNAL_API_KEY` harus sama dengan konfigurasi PHP.
- Reverse proxy `/api` ke proses Node dan jangan membuka port Node langsung ke publik jika tidak diperlukan.

## Verifikasi setelah online

- Pastikan `backend/.env`, SQL, alat migrasi, dan source Node tidak dapat diunduh melalui browser.
- Uji health check PHP dan Node.
- Uji daftar, masuk, logout, reset password, materi, semua tipe kuis, dan AskMatheal.
- Uji CRUD admin serta unggah PDF valid dan penolakan berkas non-PDF.
- Pastikan tidak ada mixed content dan sertifikat HTTPS valid.
- Aktifkan backup rutin untuk database serta folder `Materi`.
