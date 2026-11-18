import { create } from 'zustand';
import { getActivitySpotById } from '../data/activities';
import { buildLibraryColliders, findPath, liveAvatarPos } from '../data/collision';
import {
  CIRCULATION_DESK_POS,
  EAGLE_EYE_CAMERA,
  ZONES,
  detectZoneFromPosition,
  getBookWorldPosition,
  getShelfWorldPosition,
} from '../data/zones';
import * as api from '../services/api';
import type {
  AIConfig,
  ActiveDrawer,
  ActivitySpot,
  AvatarActivity,
  Book,
  CameraMode,
  FlyingBookAnim,
  Loan,
  OnlineUser,
  RealtimeEvent,
  Shelf,
  ToastItem,
  User,
  ZoneId,
} from '../types/library';

interface LibraryState {
  isReady: boolean;
  sessionToken: string | null;
  currentUser: User | null;
  maxConcurrentUsers: number;

  shelves: Shelf[];
  books: Book[];
  loans: Loan[];
  onlineUsers: OnlineUser[];
  activityFeed: RealtimeEvent[];
  lastEventId: number;
  aiConfig: AIConfig;

  // Avatar lokal user saat ini (termasuk pathfinding & aktivitas duduk/baca)
  myPos: [number, number];
  myPath: Array<[number, number]>;
  myActivity: AvatarActivity;
  mySeatId: string | null;
  pendingSeatId: string | null;
  myStatusText: string;
  virtualMove: { dx: number; dz: number };

  // Kamera & UI HUD
  cameraMode: CameraMode;
  activeZone: ZoneId | 'all';
  cameraGoal: { pos: [number, number, number]; target: [number, number, number]; stamp: number };
  activeDrawer: ActiveDrawer;
  selectedBookId: number | null;
  selectedShelfId: number | null;
  hoveredBookId: number | null;
  flyingBooks: FlyingBookAnim[];
  toasts: ToastItem[];

  // Actions
  initApp: () => void;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  pollSync: () => Promise<void>;

  setCameraMode: (mode: CameraMode) => void;
  focusEagleEye: () => void;
  focusZone: (zone: ZoneId | 'all') => void;
  focusShelf: (shelfId: number) => void;
  selectBook: (bookId: number | null) => void;
  setHoveredBook: (bookId: number | null) => void;
  setActiveDrawer: (drawer: ActiveDrawer) => void;

  moveMyAvatarTo: (x: number, z: number, status?: string) => void;
  goToActivitySpot: (spot: ActivitySpot) => void;
  completeArrivalAtSpot: (spotId: string) => void;
  standUp: () => void;
  setVirtualMove: (dx: number, dz: number) => void;
  updateMyPosImmediate: (x: number, z: number, clearPath?: boolean) => void;

  borrowSelectedBook: (bookId: number) => Promise<void>;
  returnLoan: (loanId: number) => Promise<void>;
  createShelf: (input: Parameters<typeof api.addShelf>[1]) => Promise<void>;
  removeShelf: (shelfId: number) => Promise<void>;
  createBook: (input: Parameters<typeof api.addBook>[1]) => Promise<void>;
  attachBookFile: (
    bookId: number,
    fileData: { file_name: string; file_url: string | null; content_text: string }
  ) => Promise<void>;
  updateAIConfig: (cfg: AIConfig) => void;

  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  pruneFinishedAnims: () => void;
}

const joinedAnimTracker = new Set<string>();

export function isMovementLocked(state: {
  myActivity: AvatarActivity;
  mySeatId: string | null;
  selectedBookId: number | null;
  activeDrawer: ActiveDrawer;
}): boolean {
  if (state.mySeatId !== null) return true;
  if (state.selectedBookId !== null || state.activeDrawer === 'book') return true;
  return (
    state.myActivity === 'sitting_read' ||
    state.myActivity === 'sitting_lounge' ||
    state.myActivity === 'sitting_work' ||
    state.myActivity === 'reading_stand' ||
    state.myActivity === 'circulating'
  );
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  isReady: false,
  sessionToken: null,
  currentUser: null,
  maxConcurrentUsers: 10,

  shelves: [],
  books: [],
  loans: [],
  onlineUsers: [],
  activityFeed: [],
  lastEventId: 0,
  aiConfig: {
    provider: 'gemini',
    base_url: '',
    selected_model: '',
    is_configured: false,
  },

  myPos: [0, 14.2],
  myPath: [[0, 5.4]],
  myActivity: 'idle',
  mySeatId: null,
  pendingSeatId: null,
  myStatusText: 'Baru masuk perpustakaan',
  virtualMove: { dx: 0, dz: 0 },

  cameraMode: 'eagle',
  activeZone: 'all',
  cameraGoal: {
    pos: EAGLE_EYE_CAMERA.pos,
    target: EAGLE_EYE_CAMERA.target,
    stamp: 1,
  },
  activeDrawer: 'none',
  selectedBookId: null,
  selectedShelfId: null,
  hoveredBookId: null,
  flyingBooks: [],
  toasts: [],

  initApp: () => {
    set({ isReady: true });
  },

  addToast: (toast) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4200);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  pruneFinishedAnims: () => {
    const now = Date.now();
    set((s) => ({
      flyingBooks: s.flyingBooks.filter((f) => now - f.startedAt < f.durationMs + 400),
    }));
  },

  loginUser: async (email, password) => {
    const res = await api.login(email, password);
    joinedAnimTracker.clear();
    set({
      sessionToken: res.session_token,
      currentUser: res.user,
      myPos: [0, 14.2],
      myPath: [[0, 5.4]],
      myActivity: 'walking',
      mySeatId: null,
      pendingSeatId: null,
      myStatusText: 'Baru masuk perpustakaan',
      activeDrawer: 'none',
      activeZone: 'all',
      cameraMode: 'eagle',
      cameraGoal: { ...EAGLE_EYE_CAMERA, stamp: Date.now() },
    });
    await get().refreshLibrary();
    get().addToast({
      title: `Selamat datang, ${res.user.name}!`,
      description: 'Selamat menjelajah perpustakaan digital 3D Readify.',
      variant: 'success',
    });
  },

  logoutUser: async () => {
    const token = get().sessionToken;
    if (token) {
      await api.logout(token);
    }
    set({
      sessionToken: null,
      currentUser: null,
      activeDrawer: 'none',
      selectedBookId: null,
      onlineUsers: [],
      loans: [],
    });
  },

  refreshLibrary: async () => {
    const token = get().sessionToken;
    if (!token) return;
    const data = await api.fetchLibraryState(token);
    const me = data.online_users.find((u) => u.session_token === token);
    const markedUsers = data.online_users.map((u) => {
      const isNew = !joinedAnimTracker.has(u.session_token);
      if (isNew) joinedAnimTracker.add(u.session_token);
      return {
        ...u,
        activity: u.activity || 'idle',
        isJoining: u.session_token === token ? true : isNew,
        joinedAtMs: Date.now(),
      };
    });
    set({
      shelves: data.shelves,
      books: data.books,
      loans: data.loans,
      onlineUsers: markedUsers,
      aiConfig: data.ai_config,
      lastEventId: data.last_event_id,
      maxConcurrentUsers: data.max_concurrent_users,
      myPath: me ? [[me.pos_x, me.pos_z]] : [[0, 5.4]],
    });
  },

  pollSync: async () => {
    const state = get();
    if (!state.sessionToken) return;
    try {
      const zone = detectZoneFromPosition(liveAvatarPos.x, liveAvatarPos.z);
      const res = await api.syncRealtime(state.sessionToken, {
        since_event_id: state.lastEventId,
        pos_x: Number(liveAvatarPos.x.toFixed(2)),
        pos_z: Number(liveAvatarPos.z.toFixed(2)),
        current_zone: zone,
        activity: state.myActivity,
        seat_id: state.mySeatId,
        status_text: state.myStatusText,
      });

      const prevByToken = new Map(state.onlineUsers.map((u) => [u.session_token, u]));
      const nextUsers: OnlineUser[] = res.online_users.map((u) => {
        const existed = prevByToken.get(u.session_token);
        const isFresh = !existed && !joinedAnimTracker.has(u.session_token);
        if (isFresh) joinedAnimTracker.add(u.session_token);
        return {
          ...u,
          activity: u.activity || 'idle',
          isJoining: existed ? existed.isJoining : isFresh,
          joinedAtMs: existed?.joinedAtMs ?? Date.now(),
        };
      });

      let shelves = state.shelves;
      let books = state.books;
      let aiConfig = state.aiConfig;
      const newFlying: FlyingBookAnim[] = [];

      for (const ev of res.events) {
        const isSelfEvent = ev.payload?.session_token === state.sessionToken;
        if (ev.event_type === 'user_join' && !isSelfEvent) {
          get().addToast({
            title: `${ev.actor_name || 'Pengunjung'} masuk ke perpustakaan`,
            variant: 'info',
          });
        } else if (ev.event_type === 'user_leave' && !isSelfEvent) {
          get().addToast({
            title: `${ev.actor_name || 'Pengunjung'} keluar`,
            variant: 'info',
          });
        } else if (ev.event_type === 'shelf_added') {
          const added = ev.payload.shelf as Shelf | undefined;
          if (added && !shelves.some((s) => s.id === added.id)) {
            shelves = [...shelves, { ...added, isNew: true }];
          }
        } else if (ev.event_type === 'shelf_deleted') {
          const sid = Number(ev.payload.shelf_id);
          shelves = shelves.filter((s) => s.id !== sid);
          books = books.filter((b) => b.shelf_id !== sid);
        } else if (ev.event_type === 'book_added') {
          const added = ev.payload.book as Book | undefined;
          if (added && !books.some((b) => b.id === added.id)) {
            books = [...books, added];
          }
        } else if (ev.event_type === 'book_updated') {
          const upd = ev.payload.book as Book | undefined;
          if (upd) {
            books = books.map((b) => (b.id === upd.id ? upd : b));
          }
        } else if (ev.event_type === 'book_deleted') {
          const bid = Number(ev.payload.book_id);
          books = books.filter((b) => b.id !== bid);
        } else if (ev.event_type === 'book_borrow' || ev.event_type === 'book_return') {
          const bookId = Number(ev.payload.book_id);
          const avail = Number(ev.payload.available_copies);
          const ver = Number(ev.payload.version || 1);
          books = books.map((b) =>
            b.id === bookId ? { ...b, available_copies: avail, version: ver } : b
          );

          if (!isSelfEvent) {
            const shelf = shelves.find((s) => s.id === Number(ev.payload.shelf_id));
            if (shelf) {
              const slotPos = getBookWorldPosition(shelf, Number(ev.payload.slot_index || 0));
              const isBorrow = ev.event_type === 'book_borrow';
              newFlying.push({
                id: `ev_${ev.id}`,
                type: isBorrow ? 'borrow' : 'return',
                bookTitle: String(ev.payload.title || 'Buku'),
                coverColor: String(ev.payload.cover_color || '#3b82f6'),
                actorName: ev.actor_name || 'Pengunjung',
                from: isBorrow ? slotPos : CIRCULATION_DESK_POS,
                to: isBorrow ? CIRCULATION_DESK_POS : slotPos,
                startedAt: Date.now(),
                durationMs: 2100,
              });
            }
          }
        } else if (ev.event_type === 'ai_updated') {
          aiConfig = {
            ...aiConfig,
            provider: (ev.payload.provider as AIConfig['provider']) || aiConfig.provider,
            selected_model: String(ev.payload.selected_model || aiConfig.selected_model),
            is_configured: Boolean(ev.payload.is_configured),
          };
        }
      }

      set((s) => ({
        onlineUsers: nextUsers,
        shelves,
        books,
        aiConfig,
        lastEventId: res.last_event_id,
        maxConcurrentUsers: res.max_concurrent_users,
        activityFeed: [...res.events.reverse(), ...s.activityFeed].slice(0, 30),
        flyingBooks: newFlying.length ? [...s.flyingBooks, ...newFlying] : s.flyingBooks,
      }));
    } catch {
      // abaikan kendala sementara
    }
  },

  setCameraMode: (mode) => {
    set({
      cameraMode: mode,
      myStatusText: mode === 'walk' ? 'Menjelajah perpustakaan' : 'Melihat dari Eagle Eye',
    });
    if (mode === 'eagle') {
      get().focusEagleEye();
    }
  },

  focusEagleEye: () => {
    set({
      cameraMode: 'eagle',
      activeZone: 'all',
      cameraGoal: {
        pos: EAGLE_EYE_CAMERA.pos,
        target: EAGLE_EYE_CAMERA.target,
        stamp: Date.now(),
      },
    });
  },

  focusZone: (zone) => {
    if (zone === 'all') {
      get().focusEagleEye();
      return;
    }
    const def = ZONES[zone];
    if (!def) return;
    set({
      cameraMode: 'eagle',
      activeZone: zone,
      cameraGoal: {
        pos: def.cameraPos,
        target: def.cameraTarget,
        stamp: Date.now(),
      },
    });
  },

  focusShelf: (shelfId) => {
    const shelf = get().shelves.find((s) => s.id === shelfId);
    if (!shelf) return;
    const [sx, , sz] = getShelfWorldPosition(shelf);
    set({
      cameraMode: 'eagle',
      activeZone: shelf.zone_id,
      selectedShelfId: shelfId,
      cameraGoal: {
        pos: [sx + 5.2, 6.2, sz + 6.0],
        target: [sx, 1.0, sz],
        stamp: Date.now(),
      },
    });
  },

  selectBook: (bookId) => {
    if (bookId === null) {
      set((s) => ({
        selectedBookId: null,
        activeDrawer: 'none',
        myActivity: s.mySeatId ? s.myActivity : 'idle',
        myStatusText: s.mySeatId ? s.myStatusText : 'Menjelajah perpustakaan',
      }));
      return;
    }
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;
    const shelf = get().shelves.find((s) => s.id === book.shelf_id);
    if (shelf) {
      const [bx, by, bz] = getBookWorldPosition(shelf, book.slot_index);
      set((s) => ({
        selectedBookId: bookId,
        selectedShelfId: shelf.id,
        activeDrawer: 'book',
        activeZone: shelf.zone_id,
        cameraMode: 'eagle',
        myPath: [],
        pendingSeatId: null,
        myActivity: s.mySeatId ? s.myActivity : 'reading_stand',
        myStatusText: `Membaca ringkasan: ${book.title.slice(0, 26)}`,
        cameraGoal: {
          pos: [bx + 3.6, by + 3.4, bz + 4.4],
          target: [bx, by, bz],
          stamp: Date.now(),
        },
      }));
    } else {
      set((s) => ({
        selectedBookId: bookId,
        activeDrawer: 'book',
        myPath: [],
        pendingSeatId: null,
        myActivity: s.mySeatId ? s.myActivity : 'reading_stand',
      }));
    }
  },

  setHoveredBook: (bookId) => set({ hoveredBookId: bookId }),

  setActiveDrawer: (drawer) => {
    set((s) => ({
      activeDrawer: s.activeDrawer === drawer ? 'none' : drawer,
    }));
  },

  moveMyAvatarTo: (x, z, status) => {
    const state = get();
    // Tidak dapat berjalan saat sedang melakukan aktivitas (duduk, membaca buku, dll.)
    if (isMovementLocked(state)) {
      return;
    }

    const colliders = buildLibraryColliders(state.shelves);
    const startX = liveAvatarPos.x;
    const startZ = liveAvatarPos.z;

    const path = findPath(startX, startZ, x, z, colliders);
    if (!path.length) return;

    set({
      myPos: [startX, startZ],
      myPath: path,
      mySeatId: null,
      pendingSeatId: null,
      myActivity: 'walking',
      myStatusText: status ?? 'Berjalan di perpustakaan',
    });
  },

  goToActivitySpot: (spot) => {
    const state = get();
    // Jika sedang membaca buku di drawer, tutup dulu sebelum berpindah ke kursi
    if (state.selectedBookId !== null || state.activeDrawer === 'book') {
      return;
    }
    // Jika sedang duduk di kursi lain, harus berdiri terlebih dahulu
    if (state.mySeatId !== null && state.mySeatId !== spot.id) {
      return;
    }
    if (spot.adminOnly && state.currentUser?.role !== 'admin') {
      state.addToast({
        title: 'Area Khusus Pustakawan',
        description: 'Meja kerja ini hanya dapat digunakan oleh Admin.',
        variant: 'warning',
      });
      return;
    }

    const occupied = state.onlineUsers.some(
      (u) => u.session_token !== state.sessionToken && u.seat_id === spot.id
    );
    if (occupied) {
      state.addToast({
        title: 'Tempat sedang digunakan',
        description: 'Silakan pilih kursi atau sofa lain yang masih kosong.',
        variant: 'warning',
      });
      return;
    }

    const colliders = buildLibraryColliders(state.shelves);
    const startX = liveAvatarPos.x;
    const startZ = liveAvatarPos.z;
    const path = findPath(startX, startZ, spot.approachPos[0], spot.approachPos[1], colliders);

    set({
      myPos: [startX, startZ],
      myPath: path.length ? path : [spot.approachPos],
      mySeatId: null,
      pendingSeatId: spot.id,
      myActivity: 'walking',
      myStatusText: `Menuju ${spot.label}`,
    });
  },

  completeArrivalAtSpot: (spotId) => {
    const spot = getActivitySpotById(spotId);
    if (!spot) return;
    liveAvatarPos.x = spot.seatPos[0];
    liveAvatarPos.z = spot.seatPos[1];
    set({
      myPos: [spot.seatPos[0], spot.seatPos[1]],
      myPath: [],
      mySeatId: spot.id,
      pendingSeatId: null,
      myActivity: spot.activity,
      myStatusText: spot.statusText,
    });
  },

  standUp: () => {
    const state = get();
    const spot = getActivitySpotById(state.mySeatId);
    const nextPos: [number, number] = spot ? spot.approachPos : [liveAvatarPos.x, liveAvatarPos.z];
    liveAvatarPos.x = nextPos[0];
    liveAvatarPos.z = nextPos[1];
    set({
      myPos: nextPos,
      myPath: [],
      mySeatId: null,
      pendingSeatId: null,
      myActivity: 'idle',
      myStatusText: 'Menjelajah perpustakaan',
    });
  },

  setVirtualMove: (dx, dz) => set({ virtualMove: { dx, dz } }),

  updateMyPosImmediate: (x, z, clearPath = false) => {
    set((s) => ({
      myPos: [x, z],
      myPath: clearPath ? [] : s.myPath,
      myActivity: clearPath && s.myActivity === 'walking' ? 'idle' : s.myActivity,
    }));
  },

  borrowSelectedBook: async (bookId) => {
    const state = get();
    if (!state.sessionToken || !state.currentUser) return;
    const book = state.books.find((b) => b.id === bookId);
    const shelf = book ? state.shelves.find((s) => s.id === book.shelf_id) : undefined;
    if (!book || !shelf) return;

    const res = await api.borrowBook(state.sessionToken, bookId);
    const slotPos = getBookWorldPosition(shelf, book.slot_index);

    const anim: FlyingBookAnim = {
      id: `borrow_${Date.now()}`,
      type: 'borrow',
      bookTitle: book.title,
      coverColor: book.cover_color,
      actorName: state.currentUser.name,
      from: slotPos,
      to: CIRCULATION_DESK_POS,
      startedAt: Date.now(),
      durationMs: 2200,
    };

    set((s) => ({
      books: s.books.map((b) =>
        b.id === bookId ? { ...b, available_copies: res.available_copies, version: b.version + 1 } : b
      ),
      loans: [res.loan, ...s.loans],
      flyingBooks: [...s.flyingBooks, anim],
      cameraMode: 'eagle',
      activeZone: 'all',
      activeDrawer: 'none',
      selectedBookId: null,
      myActivity: s.mySeatId ? s.myActivity : 'idle',
      myStatusText: `Meminjam: ${book.title.slice(0, 28)}`,
      cameraGoal: {
        pos: [17, 17.5, 19],
        target: [slotPos[0] * 0.35, 1.0, slotPos[2] * 0.35 + 1.0],
        stamp: Date.now(),
      },
    }));

    const deskSpot = getActivitySpotById('lobby_desk');
    if (deskSpot && !get().mySeatId) {
      get().goToActivitySpot(deskSpot);
    }

    get().addToast({
      title: `Berhasil meminjam "${book.title}"`,
      description: 'Buku dikirim menuju Meja Sirkulasi (tenggat 7 hari).',
      variant: 'success',
    });
  },

  returnLoan: async (loanId) => {
    const state = get();
    if (!state.sessionToken || !state.currentUser) return;
    const loan = state.loans.find((l) => l.id === loanId);
    if (!loan) return;
    const shelf = state.shelves.find((s) => s.id === loan.shelf_id);

    const res = await api.returnBook(state.sessionToken, loanId);
    const destPos = shelf
      ? getBookWorldPosition(shelf, loan.slot_index)
      : ([0, 1.2, -5] as [number, number, number]);

    const anim: FlyingBookAnim = {
      id: `return_${Date.now()}`,
      type: 'return',
      bookTitle: loan.title,
      coverColor: loan.cover_color,
      actorName: state.currentUser.name,
      from: CIRCULATION_DESK_POS,
      to: destPos,
      startedAt: Date.now(),
      durationMs: 2200,
    };

    set((s) => ({
      loans: s.loans.map((l) =>
        l.id === loanId ? { ...l, status: 'returned', returned_at: new Date().toISOString() } : l
      ),
      books: s.books.map((b) =>
        b.id === res.book_id ? { ...b, available_copies: res.available_copies, version: b.version + 1 } : b
      ),
      flyingBooks: [...s.flyingBooks, anim],
      cameraMode: 'eagle',
      activeZone: 'all',
      activeDrawer: 'none',
      selectedBookId: null,
      myActivity: s.mySeatId ? s.myActivity : 'idle',
      myStatusText: `Mengembalikan: ${loan.title.slice(0, 26)}`,
      cameraGoal: {
        pos: [17, 17.5, 19],
        target: [destPos[0] * 0.35, 1.0, destPos[2] * 0.35 + 1.0],
        stamp: Date.now(),
      },
    }));

    const deskSpot = getActivitySpotById('lobby_desk');
    if (deskSpot && !get().mySeatId) {
      get().goToActivitySpot(deskSpot);
    }

    get().addToast({
      title: `Buku "${loan.title}" dikembalikan!`,
      description: 'Buku kembali tersusun di slot rak aslinya.',
      variant: 'success',
    });
  },

  createShelf: async (input) => {
    const token = get().sessionToken;
    if (!token) return;
    const { shelf } = await api.addShelf(token, input);
    set((s) => ({
      shelves: s.shelves.some((x) => x.id === shelf.id) ? s.shelves : [...s.shelves, { ...shelf, isNew: true }],
    }));
    get().focusShelf(shelf.id);
    get().addToast({
      title: `Rak ${shelf.code} berhasil dipasang`,
      description: `Ditempatkan di ${ZONES[shelf.zone_id].label}.`,
      variant: 'success',
    });
  },

  removeShelf: async (shelfId) => {
    const token = get().sessionToken;
    if (!token) return;
    await api.deleteShelf(token, shelfId);
    set((s) => ({
      shelves: s.shelves.filter((x) => x.id !== shelfId),
      books: s.books.filter((b) => b.shelf_id !== shelfId),
    }));
    get().addToast({ title: 'Rak berhasil dihapus', variant: 'info' });
  },

  createBook: async (input) => {
    const token = get().sessionToken;
    if (!token) return;
    const { book } = await api.addBook(token, input);
    set((s) => ({
      books: s.books.some((x) => x.id === book.id) ? s.books : [...s.books, book],
    }));
    get().focusShelf(book.shelf_id);
    get().addToast({
      title: `Buku "${book.title}" ditambahkan`,
      description: `Terpasang di slot #${book.slot_index + 1}.`,
      variant: 'success',
    });
  },

  attachBookFile: async (bookId, fileData) => {
    const token = get().sessionToken;
    if (!token) return;
    const { book } = await api.attachFileToExistingBook(token, bookId, fileData);
    set((s) => ({
      books: s.books.map((b) => (b.id === book.id ? book : b)),
    }));
    get().addToast({
      title: `File "${fileData.file_name}" terpasang`,
      description: 'Isi dokumen buku kini siap diringkas oleh AI.',
      variant: 'success',
    });
  },

  updateAIConfig: (cfg) => set({ aiConfig: cfg }),
}));
