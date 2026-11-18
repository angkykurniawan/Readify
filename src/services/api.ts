import { SEED_BOOKS, SEED_SHELVES, SEED_USERS } from '../data/seedData';
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import type {
  AIConfig,
  AIModelInfo,
  AIProvider,
  AvatarActivity,
  Book,
  Loan,
  OnlineUser,
  RealtimeEvent,
  Shelf,
  User,
  UserRole,
  ZoneId,
} from '../types/library';
import { extractTextFromBookFile } from '../utils/fileExtractor';

const MAX_CONCURRENT_USERS = 10;
const SESSION_TTL_MS = 35_000;
const LS_KEY = 'readify_supabase_fallback_v2';
const BC_NAME = 'readify_realtime_v2';

interface LocalUserRecord extends User {
  password: string;
}

interface LocalSessionRecord extends OnlineUser {
  last_heartbeat_ms: number;
}

interface LocalDB {
  users: LocalUserRecord[];
  sessions: LocalSessionRecord[];
  shelves: Shelf[];
  books: Book[];
  loans: Array<Loan & { user_id: number }>;
  events: RealtimeEvent[];
  nextIds: {
    user: number;
    shelf: number;
    book: number;
    loan: number;
    event: number;
  };
  ai_config: AIConfig;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(BC_NAME);
  }
  return channel;
}

async function withMutex<T>(lockName: string, fn: () => T | Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
    return navigator.locks.request(`readify:${lockName}`, async () => fn());
  }
  return fn();
}

function loadLocalDB(): LocalDB {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalDB;
      if (parsed && Array.isArray(parsed.shelves) && Array.isArray(parsed.books)) {
        return parsed;
      }
    } catch {
      // reset jika korup
    }
  }
  const initial: LocalDB = {
    users: structuredClone(SEED_USERS),
    sessions: [],
    shelves: structuredClone(SEED_SHELVES),
    books: structuredClone(SEED_BOOKS),
    loans: [],
    events: [],
    nextIds: { user: 10, shelf: 10, book: 20, loan: 1, event: 1 },
    ai_config: {
      provider: 'gemini',
      base_url: '',
      selected_model: '',
      is_configured: false,
      api_key: '',
    },
  };
  localStorage.setItem(LS_KEY, JSON.stringify(initial));
  return initial;
}

function saveLocalDB(db: LocalDB): void {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
  getChannel()?.postMessage({ type: 'db_updated', at: Date.now() });
}

function pushLocalEvent(
  db: LocalDB,
  event_type: RealtimeEvent['event_type'],
  actor_id: number | null,
  actor_name: string | null,
  payload: Record<string, unknown>
): RealtimeEvent {
  const ev: RealtimeEvent = {
    id: db.nextIds.event++,
    event_type,
    actor_id,
    actor_name,
    payload,
    created_at: new Date().toISOString(),
  };
  db.events.push(ev);
  if (db.events.length > 200) db.events = db.events.slice(-200);
  return ev;
}

function purgeLocalExpiredSessions(db: LocalDB): void {
  const now = Date.now();
  const kept: LocalSessionRecord[] = [];
  for (const s of db.sessions) {
    if (now - s.last_heartbeat_ms > SESSION_TTL_MS) {
      pushLocalEvent(db, 'user_leave', s.user_id, s.user_name, {
        session_token: s.session_token,
        user_id: s.user_id,
        user_name: s.user_name,
      });
    } else {
      kept.push(s);
    }
  }
  db.sessions = kept;
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeBook(b: Record<string, unknown>): Book {
  return {
    id: Number(b.id),
    shelf_id: Number(b.shelf_id),
    slot_index: Number(b.slot_index),
    title: String(b.title || ''),
    author: String(b.author || ''),
    category: String(b.category || 'Umum'),
    publish_year: Number(b.publish_year || 2025),
    cover_color: String(b.cover_color || '#2563eb'),
    summary: String(b.summary || ''),
    key_points: Array.isArray(b.key_points) ? b.key_points.map(String) : [],
    file_name: b.file_name ? String(b.file_name) : null,
    file_url: b.file_url ? String(b.file_url) : null,
    content_text: b.content_text ? String(b.content_text) : null,
    total_copies: Number(b.total_copies || 1),
    available_copies: Number(b.available_copies || 0),
    version: Number(b.version || 1),
  };
}

export function isUsingSupabase(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

export function subscribeRealtime(onChange: () => void): () => void {
  if (isUsingSupabase() && supabase) {
    const ch = supabase
      .channel('readify-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'realtime_events' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shelves' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, onChange)
      .subscribe();
    return () => {
      supabase?.removeChannel(ch);
    };
  }

  const ch = getChannel();
  if (!ch) return () => {};
  const handler = () => onChange();
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

export async function getOnlineCountPreview(): Promise<{ online: number; max: number }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_online_count');
    if (!error && typeof data === 'number') {
      return { online: data, max: MAX_CONCURRENT_USERS };
    }
    return { online: 0, max: MAX_CONCURRENT_USERS };
  }
  const db = loadLocalDB();
  purgeLocalExpiredSessions(db);
  saveLocalDB(db);
  return { online: db.sessions.length, max: MAX_CONCURRENT_USERS };
}

export async function login(email: string, password: string): Promise<{
  session_token: string;
  user: User;
  event_id: number;
}> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_login', {
      p_email: email,
      p_password: password,
    });
    if (error) throw new Error(error.message);
    return data as { session_token: string; user: User; event_id: number };
  }

  return withMutex('room_capacity', () => {
    const db = loadLocalDB();
    purgeLocalExpiredSessions(db);

    const normalized = email.trim().toLowerCase();
    const found = db.users.find((u) => u.email.toLowerCase() === normalized);
    if (!found || found.password !== password) {
      throw new Error('Email atau password tidak sesuai.');
    }

    if (db.sessions.length >= MAX_CONCURRENT_USERS) {
      throw new Error('Perpustakaan sedang penuh (10/10 pengguna aktif). Silakan coba sesaat lagi.');
    }

    const token = randomToken();
    const spawnX = Number(((Math.random() - 0.5) * 3.6).toFixed(2));
    const spawnZ = Number((5.2 + Math.random() * 1.4).toFixed(2));
    db.sessions.push({
      session_token: token,
      user_id: found.id,
      user_name: found.name,
      role: found.role,
      avatar_color: found.avatar_color,
      pos_x: spawnX,
      pos_z: spawnZ,
      current_zone: 'lobby',
      activity: 'idle',
      seat_id: null,
      status_text: 'Baru masuk perpustakaan',
      last_heartbeat_ms: Date.now(),
    });
    const ev = pushLocalEvent(db, 'user_join', found.id, found.name, {
      session_token: token,
      user_id: found.id,
      user_name: found.name,
      role: found.role,
      avatar_color: found.avatar_color,
      pos_x: spawnX,
      pos_z: spawnZ,
      current_zone: 'lobby',
    });
    saveLocalDB(db);
    return {
      session_token: token,
      event_id: ev.id,
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        avatar_color: found.avatar_color,
      },
    };
  });
}

export async function logout(token: string): Promise<void> {
  if (!token) return;
  if (isUsingSupabase() && supabase) {
    await supabase.rpc('rf_logout', { p_token: token });
    return;
  }

  await withMutex('room_capacity', () => {
    const db = loadLocalDB();
    const target = db.sessions.find((s) => s.session_token === token);
    if (target) {
      db.sessions = db.sessions.filter((s) => s.session_token !== token);
      pushLocalEvent(db, 'user_leave', target.user_id, target.user_name, {
        session_token: token,
        user_id: target.user_id,
        user_name: target.user_name,
      });
      saveLocalDB(db);
    }
  });
}

export function logoutBeacon(token: string): void {
  if (!token) return;
  if (isUsingSupabase()) {
    const url = `${supabaseUrl}/rest/v1/rpc/rf_logout`;
    const key = supabaseAnonKey;
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_token: token }),
    }).catch(() => {});
    return;
  }
  const db = loadLocalDB();
  const target = db.sessions.find((s) => s.session_token === token);
  if (target) {
    db.sessions = db.sessions.filter((s) => s.session_token !== token);
    pushLocalEvent(db, 'user_leave', target.user_id, target.user_name, {
      session_token: token,
      user_id: target.user_id,
      user_name: target.user_name,
    });
    saveLocalDB(db);
  }
}

// ============================================================================
// MANAJEMEN PENGGUNA KHUSUS ADMIN PUSTAKAWAN
// ============================================================================

export async function listUsersByAdmin(token: string): Promise<User[]> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_list_users', { p_token: token });
    if (error) throw new Error(error.message);
    return (data as User[]) || [];
  }

  const db = loadLocalDB();
  const me = db.sessions.find((s) => s.session_token === token);
  if (!me || me.role !== 'admin') throw new Error('Akses ditolak.');
  return db.users.map(({ password: _, ...u }) => u);
}

export async function createUserByAdmin(
  token: string,
  input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    avatar_color: string;
  }
): Promise<User> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_create_user', {
      p_token: token,
      p_name: input.name,
      p_email: input.email,
      p_password: input.password,
      p_role: input.role,
      p_avatar_color: input.avatar_color,
    });
    if (error) throw new Error(error.message);
    return data as User;
  }

  return withMutex('users_write', () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') {
      throw new Error('Akses ditolak. Hanya Admin Pustakawan yang dapat menambah akun.');
    }

    const trimmedName = input.name.trim();
    const normalized = input.email.trim().toLowerCase();
    if (!trimmedName || !normalized.includes('@') || input.password.length < 4) {
      throw new Error('Nama, email valid, dan password minimal 4 karakter wajib diisi.');
    }
    if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new Error('Email tersebut sudah terdaftar.');
    }

    const newUser: LocalUserRecord = {
      id: db.nextIds.user++,
      name: trimmedName,
      email: normalized,
      password: input.password,
      role: input.role === 'admin' ? 'admin' : 'member',
      avatar_color: input.avatar_color || '#3b82f6',
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveLocalDB(db);
    const { password: _, ...pub } = newUser;
    return pub;
  });
}

export async function deleteUserByAdmin(token: string, userId: number): Promise<void> {
  if (isUsingSupabase() && supabase) {
    const { error } = await supabase.rpc('rf_admin_delete_user', {
      p_token: token,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await withMutex('users_write', () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') throw new Error('Akses ditolak.');
    if (me.user_id === userId) throw new Error('Tidak dapat menghapus akun Anda sendiri.');
    db.users = db.users.filter((u) => u.id !== userId);
    db.sessions = db.sessions.filter((s) => s.user_id !== userId);
    saveLocalDB(db);
  });
}

// ============================================================================
// STATE PERPUSTAKAAN & REALTIME SYNC
// ============================================================================

export async function fetchLibraryState(token: string): Promise<{
  shelves: Shelf[];
  books: Book[];
  loans: Loan[];
  online_users: OnlineUser[];
  ai_config: AIConfig;
  last_event_id: number;
  max_concurrent_users: number;
}> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_get_library_state', { p_token: token });
    if (error) throw new Error(error.message);
    const payload = data as {
      shelves: Shelf[];
      books: Array<Record<string, unknown>>;
      loans: Loan[];
      online_users: OnlineUser[];
      ai_config: AIConfig;
      last_event_id: number;
      max_concurrent_users: number;
    };
    return {
      ...payload,
      books: (payload.books || []).map(normalizeBook),
    };
  }

  const db = loadLocalDB();
  purgeLocalExpiredSessions(db);
  const me = db.sessions.find((s) => s.session_token === token);
  if (!me) throw new Error('Sesi tidak valid.');
  me.last_heartbeat_ms = Date.now();
  saveLocalDB(db);

  const myLoans = db.loans
    .filter((l) => l.user_id === me.user_id)
    .sort((a, b) => (b.borrowed_at > a.borrowed_at ? 1 : -1));

  const safeAIConfig: AIConfig =
    me.role === 'admin'
      ? db.ai_config
      : {
          provider: db.ai_config.provider,
          base_url: '',
          selected_model: db.ai_config.selected_model,
          is_configured: db.ai_config.is_configured,
        };

  return {
    shelves: db.shelves,
    books: db.books,
    loans: myLoans,
    online_users: db.sessions.map(({ last_heartbeat_ms: _, ...rest }) => rest),
    ai_config: safeAIConfig,
    last_event_id: db.events.length ? db.events[db.events.length - 1].id : 0,
    max_concurrent_users: MAX_CONCURRENT_USERS,
  };
}

export async function syncRealtime(
  token: string,
  payload: {
    since_event_id: number;
    pos_x?: number;
    pos_z?: number;
    current_zone?: string;
    activity?: AvatarActivity;
    seat_id?: string | null;
    status_text?: string;
  }
): Promise<{
  last_event_id: number;
  online_users: OnlineUser[];
  events: RealtimeEvent[];
  max_concurrent_users: number;
}> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_sync', {
      p_token: token,
      p_since_event_id: payload.since_event_id,
      p_pos_x: payload.pos_x ?? null,
      p_pos_z: payload.pos_z ?? null,
      p_zone: payload.current_zone ?? null,
      p_activity: payload.activity ?? null,
      p_seat_id: payload.seat_id ?? null,
      p_status_text: payload.status_text ?? null,
    });
    if (error) throw new Error(error.message);
    return data as {
      last_event_id: number;
      online_users: OnlineUser[];
      events: RealtimeEvent[];
      max_concurrent_users: number;
    };
  }

  const db = loadLocalDB();
  const me = db.sessions.find((s) => s.session_token === token);
  if (me) {
    if (typeof payload.pos_x === 'number') me.pos_x = payload.pos_x;
    if (typeof payload.pos_z === 'number') me.pos_z = payload.pos_z;
    if (payload.current_zone) me.current_zone = payload.current_zone;
    if (payload.activity) me.activity = payload.activity;
    me.seat_id = payload.seat_id ?? null;
    if (payload.status_text) me.status_text = payload.status_text;
    me.last_heartbeat_ms = Date.now();
  }
  purgeLocalExpiredSessions(db);
  saveLocalDB(db);

  const events = db.events.filter((e) => e.id > payload.since_event_id);
  const lastEventId = events.length ? events[events.length - 1].id : payload.since_event_id;

  return {
    last_event_id: lastEventId,
    online_users: db.sessions.map(({ last_heartbeat_ms: _, ...rest }) => rest),
    events,
    max_concurrent_users: MAX_CONCURRENT_USERS,
  };
}

// ============================================================================
// RAK, BUKU, UPLOAD FILE BUKU, & PEMINJAMAN
// ============================================================================

export async function uploadBookDocument(file: File): Promise<{
  file_name: string;
  file_url: string | null;
  content_text: string;
  page_count: number;
}> {
  const extracted = await extractTextFromBookFile(file);
  let fileUrl: string | null = null;

  if (isUsingSupabase() && supabase) {
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage
      .from('book-files')
      .upload(safeName, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('book-files').getPublicUrl(safeName);
      fileUrl = data.publicUrl;
    }
  }

  return {
    file_name: extracted.fileName,
    file_url: fileUrl,
    content_text: extracted.text,
    page_count: extracted.pageCount,
  };
}

export async function addShelf(
  token: string,
  input: {
    code: string;
    name: string;
    zone_id: ZoneId;
    grid_x: number;
    grid_z: number;
    rotation_y: number;
    accent_color: string;
    capacity: number;
  }
): Promise<{ shelf: Shelf }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_add_shelf', {
      p_token: token,
      p_code: input.code,
      p_name: input.name,
      p_zone_id: input.zone_id,
      p_grid_x: input.grid_x,
      p_grid_z: input.grid_z,
      p_rotation_y: input.rotation_y,
      p_accent_color: input.accent_color,
      p_capacity: input.capacity,
    });
    if (error) throw new Error(error.message);
    return data as { shelf: Shelf };
  }

  return withMutex('shelves_write', () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') throw new Error('Khusus Admin Pustakawan.');

    const code = input.code.trim().toUpperCase();
    if (!code || !input.name.trim()) throw new Error('Kode dan nama rak wajib diisi.');
    if (db.shelves.some((s) => s.code === code)) throw new Error(`Kode rak ${code} sudah dipakai.`);
    if (
      db.shelves.some(
        (s) => s.zone_id === input.zone_id && s.grid_x === input.grid_x && s.grid_z === input.grid_z
      )
    ) {
      throw new Error('Posisi grid tersebut di zona ini sudah ditempati rak lain.');
    }

    const shelf: Shelf = {
      id: db.nextIds.shelf++,
      code,
      name: input.name.trim(),
      zone_id: input.zone_id,
      grid_x: input.grid_x,
      grid_z: input.grid_z,
      rotation_y: input.rotation_y,
      accent_color: input.accent_color,
      capacity: Math.max(4, Math.min(16, input.capacity)),
      isNew: true,
    };
    db.shelves.push(shelf);
    pushLocalEvent(db, 'shelf_added', me.user_id, me.user_name, { shelf });
    saveLocalDB(db);
    return { shelf };
  });
}

export async function deleteShelf(token: string, shelfId: number): Promise<void> {
  if (isUsingSupabase() && supabase) {
    const { error } = await supabase.rpc('rf_admin_delete_shelf', {
      p_token: token,
      p_shelf_id: shelfId,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await withMutex('shelves_write', () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') throw new Error('Khusus Admin Pustakawan.');
    const shelfBookIds = new Set(db.books.filter((b) => b.shelf_id === shelfId).map((b) => b.id));
    if (db.loans.some((l) => l.status === 'borrowed' && shelfBookIds.has(l.book_id))) {
      throw new Error('Rak tidak bisa dihapus karena masih ada buku yang sedang dipinjam.');
    }
    db.books = db.books.filter((b) => b.shelf_id !== shelfId);
    db.shelves = db.shelves.filter((s) => s.id !== shelfId);
    pushLocalEvent(db, 'shelf_deleted', me.user_id, me.user_name, { shelf_id: shelfId });
    saveLocalDB(db);
  });
}

export async function addBook(
  token: string,
  input: {
    shelf_id: number;
    slot_index: number;
    title: string;
    author: string;
    category: string;
    publish_year: number;
    cover_color: string;
    summary: string;
    key_points: string[];
    total_copies: number;
    file_name?: string | null;
    file_url?: string | null;
    content_text?: string | null;
  }
): Promise<{ book: Book }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_add_book', {
      p_token: token,
      p_shelf_id: input.shelf_id,
      p_slot_index: input.slot_index,
      p_title: input.title,
      p_author: input.author,
      p_category: input.category,
      p_publish_year: input.publish_year,
      p_cover_color: input.cover_color,
      p_summary: input.summary,
      p_key_points: input.key_points,
      p_total_copies: input.total_copies,
      p_file_name: input.file_name ?? null,
      p_file_url: input.file_url ?? null,
      p_content_text: input.content_text ?? null,
    });
    if (error) throw new Error(error.message);
    return { book: normalizeBook((data as { book: Record<string, unknown> }).book) };
  }

  return withMutex(`shelf_slot_${input.shelf_id}`, () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') throw new Error('Khusus Admin Pustakawan.');

    const shelf = db.shelves.find((s) => s.id === input.shelf_id);
    if (!shelf) throw new Error('Rak tujuan tidak ditemukan.');
    if (input.slot_index < 0 || input.slot_index >= shelf.capacity) {
      throw new Error('Nomor slot melebihi kapasitas rak.');
    }
    if (db.books.some((b) => b.shelf_id === input.shelf_id && b.slot_index === input.slot_index)) {
      throw new Error('Slot rak tersebut sudah terisi buku lain.');
    }

    const book: Book = {
      id: db.nextIds.book++,
      shelf_id: input.shelf_id,
      slot_index: input.slot_index,
      title: input.title.trim(),
      author: input.author.trim(),
      category: input.category.trim() || 'Umum',
      publish_year: input.publish_year || new Date().getFullYear(),
      cover_color: input.cover_color,
      summary: input.summary.trim(),
      key_points: input.key_points.filter(Boolean),
      file_name: input.file_name ?? null,
      file_url: input.file_url ?? null,
      content_text: input.content_text ?? null,
      total_copies: Math.max(1, input.total_copies),
      available_copies: Math.max(1, input.total_copies),
      version: 1,
    };
    db.books.push(book);
    pushLocalEvent(db, 'book_added', me.user_id, me.user_name, { book });
    saveLocalDB(db);
    return { book };
  });
}

export async function attachFileToExistingBook(
  token: string,
  bookId: number,
  fileData: { file_name: string; file_url: string | null; content_text: string }
): Promise<{ book: Book }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_attach_book_file', {
      p_token: token,
      p_book_id: bookId,
      p_file_name: fileData.file_name,
      p_file_url: fileData.file_url,
      p_content_text: fileData.content_text,
    });
    if (error) throw new Error(error.message);
    return { book: normalizeBook((data as { book: Record<string, unknown> }).book) };
  }

  return withMutex(`book_${bookId}`, () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me || me.role !== 'admin') throw new Error('Khusus Admin Pustakawan.');
    const book = db.books.find((b) => b.id === bookId);
    if (!book) throw new Error('Buku tidak ditemukan.');
    book.file_name = fileData.file_name;
    book.file_url = fileData.file_url;
    book.content_text = fileData.content_text;
    book.version += 1;
    pushLocalEvent(db, 'book_updated', me.user_id, me.user_name, { book });
    saveLocalDB(db);
    return { book };
  });
}

export async function borrowBook(
  token: string,
  bookId: number
): Promise<{ loan: Loan; available_copies: number; event_id: number }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_borrow_book', {
      p_token: token,
      p_book_id: bookId,
    });
    if (error) throw new Error(error.message);
    return data as { loan: Loan; available_copies: number; event_id: number };
  }

  return withMutex(`book_${bookId}`, () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me) throw new Error('Sesi login tidak valid.');

    const book = db.books.find((b) => b.id === bookId);
    if (!book) throw new Error('Buku tidak ditemukan.');
    if (book.available_copies <= 0) {
      throw new Error('Stok buku baru saja habis dipinjam pengunjung lain.');
    }
    if (db.loans.some((l) => l.user_id === me.user_id && l.book_id === bookId && l.status === 'borrowed')) {
      throw new Error('Anda sedang meminjam buku ini.');
    }

    book.available_copies -= 1;
    book.version += 1;

    const now = new Date();
    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const loan: Loan & { user_id: number } = {
      id: db.nextIds.loan++,
      user_id: me.user_id,
      book_id: book.id,
      status: 'borrowed',
      borrowed_at: now.toISOString(),
      due_date: due.toISOString(),
      returned_at: null,
      title: book.title,
      author: book.author,
      shelf_id: book.shelf_id,
      slot_index: book.slot_index,
      cover_color: book.cover_color,
    };
    db.loans.push(loan);
    me.status_text = `Meminjam: ${book.title.slice(0, 32)}`;

    const ev = pushLocalEvent(db, 'book_borrow', me.user_id, me.user_name, {
      loan_id: loan.id,
      book_id: book.id,
      title: book.title,
      shelf_id: book.shelf_id,
      slot_index: book.slot_index,
      cover_color: book.cover_color,
      available_copies: book.available_copies,
      version: book.version,
      session_token: me.session_token,
    });
    saveLocalDB(db);
    return { loan, available_copies: book.available_copies, event_id: ev.id };
  });
}

export async function returnBook(
  token: string,
  loanId: number
): Promise<{ book_id: number; available_copies: number; event_id: number }> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_return_book', {
      p_token: token,
      p_loan_id: loanId,
    });
    if (error) throw new Error(error.message);
    return data as { book_id: number; available_copies: number; event_id: number };
  }

  return withMutex(`loan_${loanId}`, () => {
    const db = loadLocalDB();
    const me = db.sessions.find((s) => s.session_token === token);
    if (!me) throw new Error('Sesi login tidak valid.');

    const loan = db.loans.find((l) => l.id === loanId && l.user_id === me.user_id);
    if (!loan || loan.status !== 'borrowed') {
      throw new Error('Data peminjaman aktif tidak ditemukan.');
    }

    const book = db.books.find((b) => b.id === loan.book_id);
    if (!book) throw new Error('Data buku tidak ditemukan.');

    loan.status = 'returned';
    loan.returned_at = new Date().toISOString();
    book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
    book.version += 1;
    me.status_text = `Mengembalikan: ${book.title.slice(0, 28)}`;

    const ev = pushLocalEvent(db, 'book_return', me.user_id, me.user_name, {
      loan_id: loan.id,
      book_id: book.id,
      title: book.title,
      shelf_id: book.shelf_id,
      slot_index: book.slot_index,
      cover_color: book.cover_color,
      available_copies: book.available_copies,
      version: book.version,
      session_token: me.session_token,
    });
    saveLocalDB(db);
    return { book_id: book.id, available_copies: book.available_copies, event_id: ev.id };
  });
}

// ============================================================================
// INTEGRASI AI DINAMIS (Khusus Admin untuk Pengaturan, Semua User untuk Ringkasan)
// ============================================================================

function getProviderBaseUrl(provider: AIProvider, customBase: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'groq':
      return 'https://api.groq.com/openai/v1';
    case 'custom':
      return customBase.trim().replace(/\/+$/, '');
    default:
      return '';
  }
}

export async function fetchAvailableAIModels(
  token: string,
  input: { provider: AIProvider; api_key: string; base_url?: string }
): Promise<AIModelInfo[]> {
  let key = input.api_key.trim();

  if (isUsingSupabase() && supabase) {
    if (!key) {
      const { data } = await supabase.rpc('rf_get_ai_runtime', { p_token: token });
      key = String((data as { api_key?: string } | null)?.api_key || '');
    }
  } else {
    const dbCheck = loadLocalDB();
    const meCheck = dbCheck.sessions.find((s) => s.session_token === token);
    if (!meCheck || meCheck.role !== 'admin') {
      throw new Error('Akses ditolak. Hanya Admin yang dapat mengatur API AI.');
    }
    key = key || dbCheck.ai_config.api_key || '';
  }

  if (!key) throw new Error('Masukkan API Key terlebih dahulu.');

  if (input.provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Gagal memuat model Gemini (HTTP ${res.status})`);
    }
    const list: AIModelInfo[] = [];
    for (const m of data.models || []) {
      const methods: string[] = m.supportedGenerationMethods || [];
      if (!methods.includes('generateContent')) continue;
      const id = String(m.name || '').replace(/^models\//, '');
      list.push({ id, name: m.displayName || id, description: m.description || '' });
    }
    return list;
  }

  const base = getProviderBaseUrl(input.provider, input.base_url || '');
  if (!base) throw new Error('Base URL wajib diisi untuk provider Custom.');

  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gagal memuat model (HTTP ${res.status})`);
  }
  const models: AIModelInfo[] = [];
  for (const m of data.data || []) {
    const id = String(m.id || '');
    if (!id) continue;
    if (/(embedding|whisper|tts|dall-e|moderation|audio|image-gen)/i.test(id)) continue;
    models.push({ id, name: m.name || id, description: m.owned_by || '' });
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

export async function saveAIConfig(
  token: string,
  input: {
    provider: AIProvider;
    api_key: string;
    base_url: string;
    selected_model: string;
  }
): Promise<AIConfig> {
  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_admin_save_ai_config', {
      p_token: token,
      p_provider: input.provider,
      p_base_url: input.base_url,
      p_api_key: input.api_key,
      p_selected_model: input.selected_model,
    });
    if (error) throw new Error(error.message);
    return data as AIConfig;
  }

  const db = loadLocalDB();
  const me = db.sessions.find((s) => s.session_token === token);
  if (!me || me.role !== 'admin') {
    throw new Error('Akses ditolak. Hanya Admin yang dapat menyimpan konfigurasi API AI.');
  }
  const finalKey = input.api_key.trim() || db.ai_config.api_key || '';
  if (!finalKey || !input.selected_model) {
    throw new Error('API Key dan pilihan model wajib diisi.');
  }
  db.ai_config = {
    provider: input.provider,
    base_url: input.base_url.trim(),
    selected_model: input.selected_model,
    api_key: finalKey,
    is_configured: true,
  };
  pushLocalEvent(db, 'ai_updated', me.user_id, me.user_name, {
    provider: db.ai_config.provider,
    selected_model: db.ai_config.selected_model,
    is_configured: true,
  });
  saveLocalDB(db);
  return db.ai_config;
}

export async function requestAIBookSummary(
  token: string,
  params: {
    title: string;
    author: string;
    category: string;
    existing_summary?: string;
    content_text?: string | null;
    mode?: 'ringkas' | 'poin' | 'mendalam' | 'auto_admin';
    question?: string;
  }
): Promise<{ text: string; model: string }> {
  let provider: AIProvider = 'gemini';
  let baseUrl = '';
  let apiKey = '';
  let selectedModel = '';

  if (isUsingSupabase() && supabase) {
    const { data, error } = await supabase.rpc('rf_get_ai_runtime', { p_token: token });
    if (error) throw new Error(error.message);
    const rt = data as { provider: AIProvider; base_url: string; api_key: string; selected_model: string };
    provider = rt.provider;
    baseUrl = rt.base_url;
    apiKey = rt.api_key;
    selectedModel = rt.selected_model;
  } else {
    const db = loadLocalDB();
    provider = db.ai_config.provider;
    baseUrl = db.ai_config.base_url;
    apiKey = db.ai_config.api_key || '';
    selectedModel = db.ai_config.selected_model;
  }

  if (!apiKey || !selectedModel) {
    throw new Error('API AI belum dikonfigurasi oleh Admin Pustakawan.');
  }

  // Sertakan isi file buku asli jika telah diunggah Admin!
  const fileExcerpt = params.content_text?.trim()
    ? `\n\nIsi dokumen buku yang diunggah (potongan teks):\n"""\n${params.content_text.slice(0, 14000)}\n"""`
    : '';

  const contextBlock = `Judul: "${params.title}" karya ${params.author} (Kategori: ${params.category}). Ringkasan katalog: ${params.existing_summary || '-'}.${fileExcerpt}`;

  const prompt = params.question?.trim()
    ? `Kamu adalah pustakawan AI Readify. Jawab pertanyaan pembaca berdasarkan konteks buku berikut.\n${contextBlock}\n\nPertanyaan pembaca: ${params.question}\nJawab dalam Bahasa Indonesia yang jelas, rapi, dan akurat.`
    : params.mode === 'poin'
      ? `Buatkan 5 poin pembelajaran utama yang konkret berdasarkan buku berikut.\n${contextBlock}\nGunakan Bahasa Indonesia dengan format bullet rapi.`
      : params.mode === 'mendalam'
        ? `Buatkan ringkasan mendalam buku berikut mencakup: 1) Premis Utama, 2) Gagasan Inti, 3) Keunggulan Buku, dan 4) Rekomendasi Pembaca.\n${contextBlock}\nGunakan Bahasa Indonesia.`
        : params.mode === 'auto_admin'
          ? `Buatkan ringkasan singkat (2-3 kalimat padat) untuk katalog perpustakaan berdasarkan data/dokumen buku berikut, diikuti baris baru 'POIN:' dan 3 poin singkat dipisah tanda '|'.\n${contextBlock}`
          : `Buatkan ringkasan padat dan menarik dalam 1 menit baca berdasarkan buku berikut, akhiri dengan 3 poin penting.\n${contextBlock}\nGunakan Bahasa Indonesia.`;

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      selectedModel
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1000 },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Permintaan AI gagal (HTTP ${res.status})`);
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Model tidak mengembalikan respons teks.');
    return { text, model: selectedModel };
  }

  const base = getProviderBaseUrl(provider, baseUrl);
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah asisten pustakawan AI Readify yang menjawab dalam Bahasa Indonesia yang rapi dan akurat.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Permintaan AI gagal (HTTP ${res.status})`);
  }
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Model tidak mengembalikan respons teks.');
  return { text, model: selectedModel };
}
