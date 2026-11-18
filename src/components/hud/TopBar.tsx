import {
  BookMarked,
  Compass,
  Eye,
  Footprints,
  LogOut,
  Menu,
  PlusSquare,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ZONES } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';
import { ReadifyLogo } from '../common/ReadifyLogo';

export function TopBar() {
  const currentUser = useLibraryStore((s) => s.currentUser);
  const cameraMode = useLibraryStore((s) => s.cameraMode);
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const loans = useLibraryStore((s) => s.loans);
  const onlineUsers = useLibraryStore((s) => s.onlineUsers);
  const maxConcurrentUsers = useLibraryStore((s) => s.maxConcurrentUsers);
  const books = useLibraryStore((s) => s.books);
  const shelves = useLibraryStore((s) => s.shelves);

  const focusEagleEye = useLibraryStore((s) => s.focusEagleEye);
  const setCameraMode = useLibraryStore((s) => s.setCameraMode);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const selectBook = useLibraryStore((s) => s.selectBook);
  const focusShelf = useLibraryStore((s) => s.focusShelf);
  const logoutUser = useLibraryStore((s) => s.logoutUser);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const activeLoanCount = useMemo(
    () => loans.filter((l) => l.status === 'borrowed').length,
    [loans]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { books: [], shelves: [] };
    return {
      books: books
        .filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            b.category.toLowerCase().includes(q)
        )
        .slice(0, 5),
      shelves: shelves
        .filter(
          (s) =>
            s.code.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            ZONES[s.zone_id]?.label.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [query, books, shelves]);

  if (!currentUser) return null;

  const openDrawerMobileSafe = (drawer: typeof activeDrawer) => {
    setActiveDrawer(drawer);
    setMobileMenuOpen(false);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Brand Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/92 px-2.5 py-1.5 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md sm:px-3.5 sm:py-2">
          <ReadifyLogo className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
          <div className="leading-tight">
            <div className="text-xs font-extrabold tracking-tight text-slate-800">READIFY</div>
            <div className="hidden text-[10px] font-medium text-slate-400 sm:block">
              Perpustakaan 3D
            </div>
          </div>
        </div>

        {/* Desktop Navigation Pills */}
        <nav className="pointer-events-auto hidden items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md lg:flex">
          <button
            type="button"
            onClick={focusEagleEye}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              cameraMode === 'eagle' && activeDrawer === 'none'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Eagle Eye
          </button>

          <button
            type="button"
            onClick={() => setCameraMode(cameraMode === 'walk' ? 'eagle' : 'walk')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              cameraMode === 'walk'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Footprints className="h-3.5 w-3.5" />
            Jelajah
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer('catalog')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeDrawer === 'catalog'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Koleksi ({books.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer('loans')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeDrawer === 'loans'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" />
            Pinjaman
            {activeLoanCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-extrabold text-white">
                {activeLoanCount}
              </span>
            )}
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => setActiveDrawer('admin')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeDrawer === 'admin'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-pink-700 hover:bg-pink-50'
                }`}
              >
                <PlusSquare className="h-3.5 w-3.5" />
                Admin
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawer('ai')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeDrawer === 'ai'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Pengaturan AI
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveDrawer('online')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeDrawer === 'online'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users className="h-3.5 w-3.5" />
            {onlineUsers.length}/{maxConcurrentUsers}
          </button>
        </nav>

        {/* Right Controls (Desktop Search + Mobile Compact Buttons) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Search */}
          <div className="relative hidden md:block">
            <div className="flex items-center gap-2 rounded-full bg-white/92 px-3.5 py-2 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Cari buku atau rak..."
                className="w-40 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none xl:w-48"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchOpen && query.trim() && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl bg-white/98 p-2 shadow-xl ring-1 ring-slate-200 backdrop-blur-xl">
                {searchResults.books.length === 0 && searchResults.shelves.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">
                    Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.books.map((b) => (
                      <button
                        key={`sb-${b.id}`}
                        type="button"
                        onClick={() => {
                          selectBook(b.id);
                          setSearchOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-blue-50 cursor-pointer"
                      >
                        <span
                          className="h-7 w-5 rounded-sm shrink-0 shadow-xs"
                          style={{ backgroundColor: b.cover_color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-800">{b.title}</div>
                          <div className="truncate text-[10px] text-slate-500">
                            {b.author} • Stok {b.available_copies}/{b.total_copies}
                          </div>
                        </div>
                      </button>
                    ))}
                    {searchResults.shelves.map((s) => (
                      <button
                        key={`ss-${s.id}`}
                        type="button"
                        onClick={() => {
                          focusShelf(s.id);
                          setSearchOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700">
                            {s.code} — {s.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {ZONES[s.zone_id]?.label}
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Rak
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Quick Search & Online & Menu Buttons */}
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((v) => !v);
              setMobileMenuOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-slate-600 shadow-sm ring-1 ring-slate-200/80 md:hidden cursor-pointer"
            aria-label="Cari"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer('online')}
            className="flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80 lg:hidden cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {onlineUsers.length}/{maxConcurrentUsers}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((v) => !v);
              setMobileSearchOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white shadow-sm lg:hidden cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* Desktop User Logout Pill */}
          <button
            type="button"
            onClick={logoutUser}
            title={`Keluar (${currentUser.name})`}
            className="hidden items-center gap-1.5 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md transition hover:bg-rose-50 hover:text-rose-600 lg:flex cursor-pointer"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: currentUser.avatar_color }}
            />
            <span className="max-w-[90px] truncate">{currentUser.name}</span>
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Dropdown */}
      {mobileSearchOpen && (
        <div className="pointer-events-auto mt-2 rounded-2xl bg-white/96 p-2.5 shadow-xl ring-1 ring-slate-200 md:hidden">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul buku, penulis, atau rak..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {query.trim() && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {searchResults.books.map((b) => (
                <button
                  key={`msb-${b.id}`}
                  type="button"
                  onClick={() => {
                    selectBook(b.id);
                    setMobileSearchOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-blue-50"
                >
                  <span
                    className="h-6 w-4 rounded-sm shrink-0"
                    style={{ backgroundColor: b.cover_color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-800">{b.title}</div>
                    <div className="truncate text-[10px] text-slate-500">{b.author}</div>
                  </div>
                </button>
              ))}
              {searchResults.shelves.map((s) => (
                <button
                  key={`mss-${s.id}`}
                  type="button"
                  onClick={() => {
                    focusShelf(s.id);
                    setMobileSearchOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {s.code} — {s.name}
                  </span>
                  <span className="text-[10px] text-slate-400">Rak</span>
                </button>
              ))}
              {searchResults.books.length === 0 && searchResults.shelves.length === 0 && (
                <p className="py-3 text-center text-xs text-slate-400">Tidak ditemukan hasil.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu Sheet */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto mt-2 rounded-2xl bg-white/96 p-3 shadow-xl ring-1 ring-slate-200 backdrop-blur-xl lg:hidden">
          <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: currentUser.avatar_color }}
              />
              <div>
                <div className="text-xs font-extrabold text-slate-800">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400">
                  {currentUser.role === 'admin' ? 'Admin Pustakawan' : 'Pengunjung'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                focusEagleEye();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 text-blue-600" />
              Eagle Eye
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraMode(cameraMode === 'walk' ? 'eagle' : 'walk');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${
                cameraMode === 'walk'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-emerald-50'
              }`}
            >
              <Footprints className="h-4 w-4" />
              Mode Jelajah
            </button>
            <button
              type="button"
              onClick={() => openDrawerMobileSafe('catalog')}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"
            >
              <Compass className="h-4 w-4 text-blue-600" />
              Koleksi ({books.length})
            </button>
            <button
              type="button"
              onClick={() => openDrawerMobileSafe('loans')}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"
            >
              <BookMarked className="h-4 w-4 text-amber-600" />
              Pinjaman ({activeLoanCount})
            </button>

            {currentUser.role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => openDrawerMobileSafe('admin')}
                  className="flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-2.5 text-xs font-bold text-pink-700"
                >
                  <PlusSquare className="h-4 w-4" />
                  Panel Admin
                </button>
                <button
                  type="button"
                  onClick={() => openDrawerMobileSafe('ai')}
                  className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Pengaturan AI
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
