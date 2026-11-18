-- ============================================================================
-- READIFY 3D — Skema Database PostgreSQL untuk Supabase
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabel Pengguna (Hanya Admin yang dapat menambahkan akun baru)
CREATE TABLE IF NOT EXISTS public.library_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  avatar_color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Sesi Aktif Realtime (Maksimal 10 pengguna login bersamaan)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  session_token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.library_users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  avatar_color TEXT NOT NULL DEFAULT '#3b82f6',
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_z DOUBLE PRECISION NOT NULL DEFAULT 5.2,
  current_zone TEXT NOT NULL DEFAULT 'lobby',
  activity TEXT NOT NULL DEFAULT 'idle',
  seat_id TEXT,
  status_text TEXT NOT NULL DEFAULT 'Baru masuk perpustakaan',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_hb ON public.active_sessions(last_heartbeat);

-- 3. Tabel Rak Buku 3D
CREATE TABLE IF NOT EXISTS public.shelves (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  grid_x INT NOT NULL,
  grid_z INT NOT NULL,
  rotation_y INT NOT NULL DEFAULT 0,
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  capacity INT NOT NULL DEFAULT 10,
  created_by BIGINT REFERENCES public.library_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shelf_zone_grid UNIQUE (zone_id, grid_x, grid_z)
);

-- 4. Tabel Buku 3D (termasuk File Buku & Ekstrak Teks untuk Ringkasan AI)
CREATE TABLE IF NOT EXISTS public.books (
  id BIGSERIAL PRIMARY KEY,
  shelf_id BIGINT NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  slot_index INT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  publish_year INT NOT NULL DEFAULT 2025,
  cover_color TEXT NOT NULL DEFAULT '#2563eb',
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_name TEXT,
  file_url TEXT,
  content_text TEXT,
  total_copies INT NOT NULL DEFAULT 2,
  available_copies INT NOT NULL DEFAULT 2,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_book_shelf_slot UNIQUE (shelf_id, slot_index)
);

-- 5. Tabel Peminjaman Buku
CREATE TABLE IF NOT EXISTS public.loans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.library_users(id) ON DELETE CASCADE,
  book_id BIGINT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans(user_id, status);

-- 6. Tabel Event Realtime
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id BIGINT,
  actor_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabel Pengaturan AI (Hanya Admin yang dapat mengubah)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'gemini',
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  selected_model TEXT NOT NULL DEFAULT '',
  updated_by BIGINT REFERENCES public.library_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_settings (id, provider, selected_model)
VALUES (1, 'gemini', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE BUCKET UNTUK UPLOAD FILE BUKU (PDF / TXT / MD)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-files', 'book-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read book files" ON storage.objects;
CREATE POLICY "Public read book files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-files');

DROP POLICY IF EXISTS "Allow upload book files" ON storage.objects;
CREATE POLICY "Allow upload book files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-files');

DROP POLICY IF EXISTS "Allow update book files" ON storage.objects;
CREATE POLICY "Allow update book files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-files');

-- ============================================================================
-- DATA AWAL (SEED)
-- Akun awal:
--   admin@readify.id  / admin123  (Admin Pustakawan)
--   sinta@readify.id  / member123 (Pengunjung)
--   budi@readify.id   / member123 (Pengunjung)
-- ============================================================================
INSERT INTO public.library_users (name, email, password_hash, role, avatar_color)
VALUES
  ('Admin Pustakawan', 'admin@readify.id', crypt('admin123', gen_salt('bf')), 'admin', '#ec4899'),
  ('Sinta Rahma', 'sinta@readify.id', crypt('member123', gen_salt('bf')), 'member', '#3b82f6'),
  ('Budi Santoso', 'budi@readify.id', crypt('member123', gen_salt('bf')), 'member', '#10b981')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.shelves (code, name, zone_id, grid_x, grid_z, rotation_y, accent_color, capacity)
VALUES
  ('RAK-F1', 'Rak Fiksi Populer', 'fiksi', 0, 0, 0, '#3b82f6', 10),
  ('RAK-F2', 'Rak Sastra Nusantara', 'fiksi', 2, 0, 0, '#6366f1', 10),
  ('RAK-S1', 'Rak AI & Pemrograman', 'sains', 0, 0, 0, '#0ea5e9', 10),
  ('RAK-S2', 'Rak Astrofisika & Sains', 'sains', 2, 0, 0, '#14b8a6', 10),
  ('RAK-B1', 'Rak Strategi & Bisnis', 'bisnis', 0, 0, 0, '#f59e0b', 10),
  ('RAK-H1', 'Rak Sejarah Peradaban', 'sejarah', 0, 0, 0, '#8b5cf6', 10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.books (shelf_id, slot_index, title, author, category, publish_year, cover_color, summary, key_points, total_copies, available_copies)
SELECT s.id, v.slot_index, v.title, v.author, v.category, v.publish_year, v.cover_color, v.summary, v.key_points::jsonb, v.total_copies, v.total_copies
FROM (VALUES
  ('RAK-F1', 0, 'Laskar Pelangi', 'Andrea Hirata', 'Fiksi', 2005, '#2563eb',
   'Kisah inspiratif sepuluh anak dari keluarga sederhana di Belitung yang berjuang mempertahankan sekolah mereka dengan semangat belajar luar biasa.',
   '["Pendidikan adalah cahaya perubahan sosial","Persahabatan tulus melampaui keterbatasan","Dedikasi guru mampu menyalakan mimpi besar"]', 3),
  ('RAK-F1', 1, 'Bumi', 'Tere Liye', 'Fiksi', 2014, '#1d4ed8',
   'Petualangan Raib, Seli, dan Ali menjelajahi dunia paralel Klan Bulan yang membuka rahasia kekuatan tersembunyi serta makna persahabatan sejati.',
   '["Keberanian menghadapi hal yang tidak diketahui","Kerja sama tim dalam situasi genting","Tanggung jawab di balik kemampuan istimewa"]', 2),
  ('RAK-F2', 0, 'Bumi Manusia', 'Pramoedya Ananta Toer', 'Sastra', 1980, '#4f46e5',
   'Perjalanan Minke, pemuda pribumi terpelajar di era kolonial Hindia Belanda, yang memperjuangkan martabat manusia bersama Nyai Ontosoroh.',
   '["Kesadaran kebangsaan dan kritik ketidakadilan","Peran ilmu pengetahuan membebaskan pikiran","Keteguhan menghadapi sistem feodal"]', 2),
  ('RAK-S1', 0, 'Clean Code', 'Robert C. Martin', 'Teknologi', 2008, '#0284c7',
   'Panduan praktis menulis kode perangkat lunak yang bersih, mudah dibaca, teruji, dan mudah dipelihara oleh tim rekayasa modern.',
   '["Nama variabel harus menjelaskan niat secara langsung","Fungsi kecil dengan satu tanggung jawab","Refactoring berkelanjutan menjaga kualitas"]', 3),
  ('RAK-S1', 1, 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Teknologi', 2017, '#0f766e',
   'Pembahasan mendalam arsitektur sistem modern: replikasi, partisi, transaksi ACID, konsistensi data, dan keandalan skala besar.',
   '["Memahami trade-off konsistensi dan latensi","Transaksi menjaga integritas data bersamaan","Event log mempermudah sinkronisasi realtime"]', 2),
  ('RAK-S2', 0, 'Cosmos', 'Carl Sagan', 'Sains', 1980, '#0d9488',
   'Eksplorasi puitis dan ilmiah mengenai sejarah alam semesta, evolusi bintang, penemuan sains, dan posisi manusia di tengah kosmos.',
   '["Metode ilmiah sebagai panduan pencarian kebenaran","Unsur kehidupan berasal dari bintang","Rasa ingin tahu mendorong peradaban"]', 2),
  ('RAK-B1', 0, 'Atomic Habits', 'James Clear', 'Pengembangan Diri', 2018, '#d97706',
   'Kerangka kerja berbasis riset tentang bagaimana perubahan kebiasaan kecil 1% setiap hari menciptakan hasil luar biasa melalui desain sistem.',
   '["Fokus pada sistem harian bukan sekadar target","4 hukum kebiasaan: jelas, menarik, mudah, memuaskan","Identitas dibentuk dari kebiasaan kecil"]', 3),
  ('RAK-B1', 1, 'Zero to One', 'Peter Thiel', 'Bisnis', 2014, '#ea580c',
   'Refleksi membangun inovasi yang menciptakan nilai baru dari nol ke satu alih-alih sekadar meniru kompetisi yang sudah ada.',
   '["Inovasi vertikal menciptakan lompatan nyata","Rahasia pasar menjadi fondasi produk unik","Tim kecil dengan visi jelas mengubah industri"]', 2),
  ('RAK-H1', 0, 'Sapiens: Riwayat Singkat Umat Manusia', 'Yuval Noah Harari', 'Sejarah', 2011, '#7c3aed',
   'Penelusuran evolusi Homo sapiens melalui Revolusi Kognitif, Pertanian, dan Ilmiah hingga membentuk peradaban global modern.',
   '["Kerja sama fleksibel melalui narasi bersama","Dampak revolusi pertanian terhadap masyarakat","Sains terus membentuk ulang masa depan"]', 2)
) AS v(code, slot_index, title, author, category, publish_year, cover_color, summary, key_points, total_copies)
JOIN public.shelves s ON s.code = v.code
ON CONFLICT (shelf_id, slot_index) DO NOTHING;

-- ============================================================================
-- FUNGSI RPC ATOMIK (TRANSAKSIONAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rf_purge_stale_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    DELETE FROM public.active_sessions
    WHERE last_heartbeat < NOW() - INTERVAL '35 seconds'
    RETURNING session_token, user_id, user_name
  LOOP
    INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
    VALUES ('user_leave', r.user_id, r.user_name, jsonb_build_object('session_token', r.session_token, 'user_id', r.user_id, 'user_name', r.user_name));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_login(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user public.library_users%ROWTYPE;
  v_count INT;
  v_token TEXT;
  v_x DOUBLE PRECISION;
  v_z DOUBLE PRECISION;
  v_event_id BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(900101);
  PERFORM public.rf_purge_stale_sessions();

  SELECT * INTO v_user
  FROM public.library_users
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'Email atau password tidak sesuai.';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.active_sessions;
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'Perpustakaan sedang penuh (10/10 pengguna aktif). Silakan coba sesaat lagi.';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_x := ROUND(((random() - 0.5) * 4.0)::numeric, 2);
  v_z := ROUND((4.8 + random() * 1.6)::numeric, 2);

  INSERT INTO public.active_sessions (session_token, user_id, user_name, role, avatar_color, pos_x, pos_z, current_zone, activity, status_text)
  VALUES (v_token, v_user.id, v_user.name, v_user.role, v_user.avatar_color, v_x, v_z, 'lobby', 'idle', 'Baru masuk perpustakaan');

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES (
    'user_join',
    v_user.id,
    v_user.name,
    jsonb_build_object(
      'session_token', v_token,
      'user_id', v_user.id,
      'user_name', v_user.name,
      'role', v_user.role,
      'avatar_color', v_user.avatar_color,
      'pos_x', v_x,
      'pos_z', v_z,
      'current_zone', 'lobby'
    )
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'session_token', v_token,
    'event_id', v_event_id,
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'role', v_user.role,
      'avatar_color', v_user.avatar_color
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_logout(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
BEGIN
  DELETE FROM public.active_sessions WHERE session_token = p_token RETURNING * INTO v_sess;
  IF FOUND THEN
    INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
    VALUES ('user_leave', v_sess.user_id, v_sess.user_name, jsonb_build_object('session_token', p_token, 'user_id', v_sess.user_id, 'user_name', v_sess.user_name));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_online_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  PERFORM public.rf_purge_stale_sessions();
  SELECT COUNT(*) INTO v_count FROM public.active_sessions;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_create_user(
  p_token TEXT,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_avatar_color TEXT DEFAULT '#3b82f6'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
  v_created public.library_users%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak. Hanya Admin Pustakawan yang dapat menambah pengguna.';
  END IF;

  IF TRIM(p_name) = '' OR POSITION('@' IN TRIM(p_email)) = 0 OR LENGTH(p_password) < 4 THEN
    RAISE EXCEPTION 'Nama, email valid, dan password minimal 4 karakter wajib diisi.';
  END IF;

  INSERT INTO public.library_users (name, email, password_hash, role, avatar_color)
  VALUES (
    TRIM(p_name),
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf')),
    CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'member' END,
    COALESCE(NULLIF(TRIM(p_avatar_color), ''), '#3b82f6')
  )
  RETURNING * INTO v_created;

  RETURN jsonb_build_object(
    'id', v_created.id,
    'name', v_created.name,
    'email', v_created.email,
    'role', v_created.role,
    'avatar_color', v_created.avatar_color,
    'created_at', v_created.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_list_users(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'email', email, 'role', role, 'avatar_color', avatar_color, 'created_at', created_at
    ) ORDER BY id ASC) FROM public.library_users),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_delete_user(p_token TEXT, p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;
  IF v_admin.user_id = p_user_id THEN
    RAISE EXCEPTION 'Tidak dapat menghapus akun Anda sendiri.';
  END IF;
  DELETE FROM public.library_users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_get_library_state(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
  v_ai public.ai_settings%ROWTYPE;
BEGIN
  PERFORM public.rf_purge_stale_sessions();
  SELECT * INTO v_sess FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi tidak valid. Silakan masuk kembali.';
  END IF;

  UPDATE public.active_sessions SET last_heartbeat = NOW() WHERE session_token = p_token;
  SELECT * INTO v_ai FROM public.ai_settings WHERE id = 1;

  RETURN jsonb_build_object(
    'shelves', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id ASC) FROM public.shelves s), '[]'::jsonb),
    'books', COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.shelf_id ASC, b.slot_index ASC) FROM public.books b), '[]'::jsonb),
    'loans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'book_id', l.book_id, 'status', l.status, 'borrowed_at', l.borrowed_at,
        'due_date', l.due_date, 'returned_at', l.returned_at, 'title', b.title,
        'author', b.author, 'shelf_id', b.shelf_id, 'slot_index', b.slot_index, 'cover_color', b.cover_color
      ) ORDER BY l.borrowed_at DESC)
      FROM public.loans l JOIN public.books b ON b.id = l.book_id
      WHERE l.user_id = v_sess.user_id
    ), '[]'::jsonb),
    'online_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'session_token', session_token, 'user_id', user_id, 'user_name', user_name,
        'role', role, 'avatar_color', avatar_color, 'pos_x', pos_x, 'pos_z', pos_z,
        'current_zone', current_zone, 'activity', activity, 'seat_id', seat_id, 'status_text', status_text
      ) ORDER BY joined_at ASC)
      FROM public.active_sessions
    ), '[]'::jsonb),
    'ai_config', jsonb_build_object(
      'provider', COALESCE(v_ai.provider, 'gemini'),
      'base_url', CASE WHEN v_sess.role = 'admin' THEN COALESCE(v_ai.base_url, '') ELSE '' END,
      'selected_model', COALESCE(v_ai.selected_model, ''),
      'is_configured', (COALESCE(v_ai.api_key, '') <> '' AND COALESCE(v_ai.selected_model, '') <> '')
    ),
    'last_event_id', COALESCE((SELECT MAX(id) FROM public.realtime_events), 0),
    'max_concurrent_users', 10
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_sync(
  p_token TEXT,
  p_since_event_id BIGINT,
  p_pos_x DOUBLE PRECISION DEFAULT NULL,
  p_pos_z DOUBLE PRECISION DEFAULT NULL,
  p_zone TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL,
  p_seat_id TEXT DEFAULT NULL,
  p_status_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
  v_last_id BIGINT;
BEGIN
  SELECT * INTO v_sess FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi berakhir.';
  END IF;

  UPDATE public.active_sessions
  SET
    pos_x = COALESCE(p_pos_x, pos_x),
    pos_z = COALESCE(p_pos_z, pos_z),
    current_zone = COALESCE(p_zone, current_zone),
    activity = COALESCE(p_activity, activity),
    seat_id = p_seat_id,
    status_text = COALESCE(p_status_text, status_text),
    last_heartbeat = NOW()
  WHERE session_token = p_token;

  PERFORM public.rf_purge_stale_sessions();

  SELECT COALESCE(MAX(id), p_since_event_id) INTO v_last_id FROM public.realtime_events;

  RETURN jsonb_build_object(
    'last_event_id', v_last_id,
    'max_concurrent_users', 10,
    'online_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'session_token', session_token, 'user_id', user_id, 'user_name', user_name,
        'role', role, 'avatar_color', avatar_color, 'pos_x', pos_x, 'pos_z', pos_z,
        'current_zone', current_zone, 'activity', activity, 'seat_id', seat_id, 'status_text', status_text
      ) ORDER BY joined_at ASC)
      FROM public.active_sessions
    ), '[]'::jsonb),
    'events', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id ASC)
      FROM public.realtime_events e
      WHERE e.id > p_since_event_id
      LIMIT 50
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_borrow_book(p_token TEXT, p_book_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
  v_book public.books%ROWTYPE;
  v_loan public.loans%ROWTYPE;
  v_event_id BIGINT;
BEGIN
  SELECT * INTO v_sess FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak valid.'; END IF;

  SELECT * INTO v_book FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buku tidak ditemukan.'; END IF;
  IF v_book.available_copies <= 0 THEN
    RAISE EXCEPTION 'Stok buku baru saja habis dipinjam pengunjung lain.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = v_sess.user_id AND book_id = p_book_id AND status = 'borrowed') THEN
    RAISE EXCEPTION 'Anda sedang meminjam buku ini.';
  END IF;

  UPDATE public.books
  SET available_copies = available_copies - 1, version = version + 1
  WHERE id = p_book_id;

  INSERT INTO public.loans (user_id, book_id, status, due_date)
  VALUES (v_sess.user_id, p_book_id, 'borrowed', NOW() + INTERVAL '7 days')
  RETURNING * INTO v_loan;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('book_borrow', v_sess.user_id, v_sess.user_name, jsonb_build_object(
    'loan_id', v_loan.id, 'book_id', v_book.id, 'title', v_book.title,
    'shelf_id', v_book.shelf_id, 'slot_index', v_book.slot_index, 'cover_color', v_book.cover_color,
    'available_copies', v_book.available_copies - 1, 'version', v_book.version + 1, 'session_token', p_token
  ))
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'available_copies', v_book.available_copies - 1,
    'loan', jsonb_build_object(
      'id', v_loan.id, 'book_id', v_book.id, 'status', v_loan.status,
      'borrowed_at', v_loan.borrowed_at, 'due_date', v_loan.due_date, 'returned_at', NULL,
      'title', v_book.title, 'author', v_book.author, 'shelf_id', v_book.shelf_id,
      'slot_index', v_book.slot_index, 'cover_color', v_book.cover_color
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_return_book(p_token TEXT, p_loan_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
  v_loan public.loans%ROWTYPE;
  v_book public.books%ROWTYPE;
  v_new_avail INT;
  v_event_id BIGINT;
BEGIN
  SELECT * INTO v_sess FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak valid.'; END IF;

  SELECT * INTO v_loan FROM public.loans WHERE id = p_loan_id AND user_id = v_sess.user_id FOR UPDATE;
  IF NOT FOUND OR v_loan.status <> 'borrowed' THEN
    RAISE EXCEPTION 'Data peminjaman aktif tidak ditemukan.';
  END IF;

  SELECT * INTO v_book FROM public.books WHERE id = v_loan.book_id FOR UPDATE;
  v_new_avail := LEAST(v_book.total_copies, v_book.available_copies + 1);

  UPDATE public.loans SET status = 'returned', returned_at = NOW() WHERE id = p_loan_id;
  UPDATE public.books SET available_copies = v_new_avail, version = version + 1 WHERE id = v_book.id;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('book_return', v_sess.user_id, v_sess.user_name, jsonb_build_object(
    'loan_id', p_loan_id, 'book_id', v_book.id, 'title', v_book.title,
    'shelf_id', v_book.shelf_id, 'slot_index', v_book.slot_index, 'cover_color', v_book.cover_color,
    'available_copies', v_new_avail, 'version', v_book.version + 1, 'session_token', p_token
  ))
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object('event_id', v_event_id, 'book_id', v_book.id, 'available_copies', v_new_avail);
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_add_shelf(
  p_token TEXT,
  p_code TEXT,
  p_name TEXT,
  p_zone_id TEXT,
  p_grid_x INT,
  p_grid_z INT,
  p_rotation_y INT,
  p_accent_color TEXT,
  p_capacity INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
  v_shelf public.shelves%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN RAISE EXCEPTION 'Khusus Admin Pustakawan.'; END IF;

  INSERT INTO public.shelves (code, name, zone_id, grid_x, grid_z, rotation_y, accent_color, capacity, created_by)
  VALUES (UPPER(TRIM(p_code)), TRIM(p_name), p_zone_id, p_grid_x, p_grid_z, p_rotation_y, p_accent_color, GREATEST(4, LEAST(16, p_capacity)), v_admin.user_id)
  RETURNING * INTO v_shelf;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('shelf_added', v_admin.user_id, v_admin.user_name, jsonb_build_object('shelf', to_jsonb(v_shelf)));

  RETURN jsonb_build_object('shelf', to_jsonb(v_shelf));
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_delete_shelf(p_token TEXT, p_shelf_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN RAISE EXCEPTION 'Khusus Admin Pustakawan.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.loans l JOIN public.books b ON b.id = l.book_id
    WHERE b.shelf_id = p_shelf_id AND l.status = 'borrowed'
  ) THEN
    RAISE EXCEPTION 'Rak tidak bisa dihapus karena masih ada buku yang sedang dipinjam.';
  END IF;

  DELETE FROM public.shelves WHERE id = p_shelf_id;
  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('shelf_deleted', v_admin.user_id, v_admin.user_name, jsonb_build_object('shelf_id', p_shelf_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_add_book(
  p_token TEXT,
  p_shelf_id BIGINT,
  p_slot_index INT,
  p_title TEXT,
  p_author TEXT,
  p_category TEXT,
  p_publish_year INT,
  p_cover_color TEXT,
  p_summary TEXT,
  p_key_points JSONB,
  p_total_copies INT,
  p_file_name TEXT DEFAULT NULL,
  p_file_url TEXT DEFAULT NULL,
  p_content_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
  v_shelf public.shelves%ROWTYPE;
  v_book public.books%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN RAISE EXCEPTION 'Khusus Admin Pustakawan.'; END IF;

  SELECT * INTO v_shelf FROM public.shelves WHERE id = p_shelf_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rak tujuan tidak ditemukan.'; END IF;
  IF p_slot_index < 0 OR p_slot_index >= v_shelf.capacity THEN
    RAISE EXCEPTION 'Nomor slot melebihi kapasitas rak.';
  END IF;

  INSERT INTO public.books (
    shelf_id, slot_index, title, author, category, publish_year, cover_color,
    summary, key_points, total_copies, available_copies, file_name, file_url, content_text
  )
  VALUES (
    p_shelf_id, p_slot_index, TRIM(p_title), TRIM(p_author), COALESCE(NULLIF(TRIM(p_category), ''), 'Umum'),
    p_publish_year, p_cover_color, TRIM(p_summary), COALESCE(p_key_points, '[]'::jsonb),
    GREATEST(1, p_total_copies), GREATEST(1, p_total_copies), p_file_name, p_file_url, p_content_text
  )
  RETURNING * INTO v_book;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('book_added', v_admin.user_id, v_admin.user_name, jsonb_build_object('book', to_jsonb(v_book)));

  RETURN jsonb_build_object('book', to_jsonb(v_book));
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_attach_book_file(
  p_token TEXT,
  p_book_id BIGINT,
  p_file_name TEXT,
  p_file_url TEXT,
  p_content_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
  v_book public.books%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN RAISE EXCEPTION 'Khusus Admin Pustakawan.'; END IF;

  UPDATE public.books
  SET file_name = p_file_name, file_url = p_file_url, content_text = p_content_text, version = version + 1
  WHERE id = p_book_id
  RETURNING * INTO v_book;

  IF NOT FOUND THEN RAISE EXCEPTION 'Buku tidak ditemukan.'; END IF;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('book_updated', v_admin.user_id, v_admin.user_name, jsonb_build_object('book', to_jsonb(v_book)));

  RETURN jsonb_build_object('book', to_jsonb(v_book));
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_admin_save_ai_config(
  p_token TEXT,
  p_provider TEXT,
  p_base_url TEXT,
  p_api_key TEXT,
  p_selected_model TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin public.active_sessions%ROWTYPE;
  v_final_key TEXT;
BEGIN
  SELECT * INTO v_admin FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND OR v_admin.role <> 'admin' THEN RAISE EXCEPTION 'Hanya Admin yang dapat mengatur API AI.'; END IF;

  SELECT CASE WHEN COALESCE(TRIM(p_api_key), '') <> '' THEN TRIM(p_api_key) ELSE api_key END
  INTO v_final_key
  FROM public.ai_settings WHERE id = 1;

  IF COALESCE(v_final_key, '') = '' OR COALESCE(TRIM(p_selected_model), '') = '' THEN
    RAISE EXCEPTION 'API Key dan model wajib dipilih.';
  END IF;

  UPDATE public.ai_settings
  SET provider = p_provider, base_url = COALESCE(p_base_url, ''), api_key = v_final_key,
      selected_model = p_selected_model, updated_by = v_admin.user_id, updated_at = NOW()
  WHERE id = 1;

  INSERT INTO public.realtime_events (event_type, actor_id, actor_name, payload)
  VALUES ('ai_updated', v_admin.user_id, v_admin.user_name, jsonb_build_object(
    'provider', p_provider, 'selected_model', p_selected_model, 'is_configured', true
  ));

  RETURN jsonb_build_object(
    'provider', p_provider, 'base_url', COALESCE(p_base_url, ''),
    'selected_model', p_selected_model, 'is_configured', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rf_get_ai_runtime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sess public.active_sessions%ROWTYPE;
  v_ai public.ai_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_sess FROM public.active_sessions WHERE session_token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak valid.'; END IF;
  SELECT * INTO v_ai FROM public.ai_settings WHERE id = 1;
  RETURN jsonb_build_object(
    'provider', v_ai.provider,
    'base_url', v_ai.base_url,
    'api_key', v_ai.api_key,
    'selected_model', v_ai.selected_model
  );
END;
$$;

-- Aktifkan Realtime pada tabel utama
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shelves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_events;
