# Readify — Perpustakaan Digital 3D

Perpustakaan digital 3D interaktif berbasis **React + React Three Fiber (Three.js)** dan **Supabase** (PostgreSQL, Realtime, Storage).

## Fitur Utama
- **Ruang Perpustakaan 3D Isometrik + Kamera Eagle Eye & Mode Jelajah**
- **Animasi Sirkulasi Buku 3D** (ambil, baca ringkasan, pinjam, kembalikan)
- **Animasi Duduk & Aktivitas Ruangan** (duduk membaca di Ruang Baca, santai di sofa Lobby, bekerja di Meja Pustakawan, memegang buku)
- **Collision Detection & Pathfinding** (avatar tidak dapat menembus dinding kaca, rak buku, meja, maupun sofa)
- **Upload File Buku (PDF / TXT / MD)** yang teksnya diekstrak untuk diringkas & ditanya melalui AI
- **Integrasi AI Dinamis Khusus Admin** (masukkan API Key, muat daftar model tersedia, pilih model aktif)
- **Manajemen Akun Khusus Admin Pustakawan** (hanya Admin yang dapat menambahkan akun Pengunjung atau Admin lainnya)
- **Responsif Penuh Mobile & Desktop** lengkap dengan kontrol sentuh dan virtual D-Pad

## Setup Supabase
1. Buat project baru di [Supabase](https://supabase.com).
2. Buka **SQL Editor** dan jalankan seluruh isi file [`supabase/schema.sql`](supabase/schema.sql).
3. Salin `.env.example` menjadi `.env`, lalu isi:
   ```env
   VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
4. Jalankan aplikasi:
   ```bash
   npm install
   npm run dev
   ```

## Akun Awal
Lihat daftar email dan password akun bawaan di file [`AKUN.md`](AKUN.md).
