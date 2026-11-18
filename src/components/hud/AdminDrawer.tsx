import {
  BookPlus,
  FileText,
  Layers,
  Loader2,
  PlusSquare,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ZONE_LIST, ZONES } from '../../data/zones';
import {
  createUserByAdmin,
  deleteUserByAdmin,
  listUsersByAdmin,
  requestAIBookSummary,
  uploadBookDocument,
} from '../../services/api';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { User, UserRole, ZoneId } from '../../types/library';

const SHELF_COLORS = ['#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
const BOOK_COLORS = ['#2563eb', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777', '#dc2626', '#0f766e'];
const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function AdminDrawer() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const currentUser = useLibraryStore((s) => s.currentUser);
  const shelves = useLibraryStore((s) => s.shelves);
  const books = useLibraryStore((s) => s.books);
  const sessionToken = useLibraryStore((s) => s.sessionToken);
  const aiConfig = useLibraryStore((s) => s.aiConfig);

  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const createShelf = useLibraryStore((s) => s.createShelf);
  const removeShelf = useLibraryStore((s) => s.removeShelf);
  const createBook = useLibraryStore((s) => s.createBook);
  const addToast = useLibraryStore((s) => s.addToast);

  const [tab, setTab] = useState<'shelf' | 'book' | 'users'>('shelf');

  // Form Tambah Rak
  const [zoneId, setZoneId] = useState<ZoneId>('fiksi');
  const [gridX, setGridX] = useState(1);
  const [gridZ, setGridZ] = useState(1);
  const [shelfCode, setShelfCode] = useState('');
  const [shelfName, setShelfName] = useState('');
  const [shelfColor, setShelfColor] = useState('#3b82f6');
  const [capacity, setCapacity] = useState(10);
  const [rotationY, setRotationY] = useState(0);
  const [savingShelf, setSavingShelf] = useState(false);

  // Form Tambah Buku + Upload File Buku
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetShelfId, setTargetShelfId] = useState<number>(shelves[0]?.id ?? 1);
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Teknologi');
  const [publishYear, setPublishYear] = useState(2025);
  const [totalCopies, setTotalCopies] = useState(2);
  const [coverColor, setCoverColor] = useState('#2563eb');
  const [summary, setSummary] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState<{
    file_name: string;
    file_url: string | null;
    content_text: string;
    page_count: number;
  } | null>(null);
  const [extractingFile, setExtractingFile] = useState(false);
  const [savingBook, setSavingBook] = useState(false);
  const [aiGenLoading, setAiGenLoading] = useState(false);

  // Form Kelola Pengguna (Khusus Admin Pustakawan)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserColor, setNewUserColor] = useState('#3b82f6');
  const [savingUser, setSavingUser] = useState(false);

  const selectedZone = ZONES[zoneId];
  const occupiedGrid = useMemo(() => {
    const set = new Set<string>();
    for (const s of shelves) {
      if (s.zone_id === zoneId) set.add(`${s.grid_x},${s.grid_z}`);
    }
    return set;
  }, [shelves, zoneId]);

  const effectiveShelf = shelves.find((s) => s.id === targetShelfId) ?? shelves[0];
  const occupiedSlots = useMemo(() => {
    if (!effectiveShelf) return new Set<number>();
    return new Set(books.filter((b) => b.shelf_id === effectiveShelf.id).map((b) => b.slot_index));
  }, [books, effectiveShelf]);

  useEffect(() => {
    if (!occupiedGrid.has(`${gridX},${gridZ}`)) return;
    for (let gz = 0; gz < selectedZone.gridRows; gz++) {
      for (let gx = 0; gx < selectedZone.gridCols; gx++) {
        if (!occupiedGrid.has(`${gx},${gz}`)) {
          setGridX(gx);
          setGridZ(gz);
          return;
        }
      }
    }
  }, [zoneId, occupiedGrid, gridX, gridZ, selectedZone.gridRows, selectedZone.gridCols]);

  useEffect(() => {
    if (!effectiveShelf || !occupiedSlots.has(slotIndex)) return;
    for (let i = 0; i < effectiveShelf.capacity; i++) {
      if (!occupiedSlots.has(i)) {
        setSlotIndex(i);
        return;
      }
    }
  }, [effectiveShelf, occupiedSlots, slotIndex]);

  useEffect(() => {
    if (activeDrawer !== 'admin' || tab !== 'users' || !sessionToken) return;
    setLoadingUsers(true);
    listUsersByAdmin(sessionToken)
      .then(setUsersList)
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [activeDrawer, tab, sessionToken]);

  if (activeDrawer !== 'admin' || currentUser?.role !== 'admin') return null;

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShelf(true);
    try {
      const autoCode = shelfCode.trim() || `RAK-${zoneId.slice(0, 2).toUpperCase()}${shelves.length + 1}`;
      await createShelf({
        code: autoCode,
        name: shelfName.trim() || `Rak Baru ${selectedZone.shortLabel}`,
        zone_id: zoneId,
        grid_x: gridX,
        grid_z: gridZ,
        rotation_y: rotationY,
        accent_color: shelfColor,
        capacity,
      });
      setShelfCode('');
      setShelfName('');
    } catch (err) {
      addToast({
        title: 'Gagal Menambah Rak',
        description: err instanceof Error ? err.message : 'Terjadi kendala.',
        variant: 'error',
      });
    } finally {
      setSavingShelf(false);
    }
  };

  const handleSelectBookFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingFile(true);
    try {
      const res = await uploadBookDocument(file);
      setUploadedDoc(res);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
      }
      addToast({
        title: `File "${res.file_name}" berhasil dibaca`,
        description: `${res.page_count} halaman siap diringkas AI.`,
        variant: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Gagal Membaca File',
        description: err instanceof Error ? err.message : 'Pastikan file PDF/TXT/MD valid.',
        variant: 'error',
      });
    } finally {
      setExtractingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAIGenerateSummary = async () => {
    if (!sessionToken || (!title.trim() && !uploadedDoc)) {
      addToast({
        title: 'Lengkapi Judul atau Unggah File',
        description: 'Isi judul buku atau unggah file terlebih dahulu.',
        variant: 'warning',
      });
      return;
    }
    if (!aiConfig.is_configured) {
      setActiveDrawer('ai');
      return;
    }
    setAiGenLoading(true);
    try {
      const res = await requestAIBookSummary(sessionToken, {
        title: title.trim() || uploadedDoc?.file_name || 'Buku Baru',
        author: author.trim() || 'Penulis',
        category,
        content_text: uploadedDoc?.content_text ?? null,
        mode: 'auto_admin',
      });
      const parts = res.text.split(/POIN\s*:/i);
      setSummary((parts[0] || res.text).trim());
      if (parts[1]) {
        const pts = parts[1]
          .split('|')
          .map((p) => p.replace(/^[-•*\s]+/, '').trim())
          .filter(Boolean);
        setKeyPointsText(pts.join('\n'));
      }
      addToast({ title: 'Ringkasan AI berhasil dibuat', variant: 'success' });
    } catch (err) {
      addToast({
        title: 'Gagal Membuat Ringkasan AI',
        description: err instanceof Error ? err.message : 'Periksa pengaturan AI.',
        variant: 'error',
      });
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveShelf) return;
    setSavingBook(true);
    try {
      const points = keyPointsText
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      await createBook({
        shelf_id: effectiveShelf.id,
        slot_index: slotIndex,
        title,
        author,
        category,
        publish_year: publishYear,
        cover_color: coverColor,
        summary,
        key_points: points,
        total_copies: totalCopies,
        file_name: uploadedDoc?.file_name ?? null,
        file_url: uploadedDoc?.file_url ?? null,
        content_text: uploadedDoc?.content_text ?? null,
      });
      setTitle('');
      setAuthor('');
      setSummary('');
      setKeyPointsText('');
      setUploadedDoc(null);
    } catch (err) {
      addToast({
        title: 'Gagal Menambah Buku',
        description: err instanceof Error ? err.message : 'Slot mungkin sudah terisi.',
        variant: 'error',
      });
    } finally {
      setSavingBook(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setSavingUser(true);
    try {
      const created = await createUserByAdmin(sessionToken, {
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        avatar_color: newUserColor,
      });
      setUsersList((prev) => [...prev, created]);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRole('member');
      addToast({
        title: `Akun ${created.name} berhasil dibuat`,
        description: `Peran: ${created.role === 'admin' ? 'Admin Pustakawan' : 'Pengunjung'}`,
        variant: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Gagal Menambah Pengguna',
        description: err instanceof Error ? err.message : 'Periksa data pengguna.',
        variant: 'error',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!sessionToken) return;
    try {
      await deleteUserByAdmin(sessionToken, userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      addToast({ title: 'Akun berhasil dihapus', variant: 'info' });
    } catch (err) {
      addToast({
        title: 'Gagal Menghapus Akun',
        description: err instanceof Error ? err.message : '',
        variant: 'error',
      });
    }
  };

  return (
    <aside className="fixed inset-x-2 top-16 bottom-20 z-30 flex flex-col overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-pink-200/80 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-20 sm:bottom-24 sm:w-full sm:max-w-md">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-pink-50 to-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-600 text-white">
            <PlusSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Panel Admin Pustakawan</h2>
            <p className="text-[11px] text-slate-500">Kelola rak 3D, buku &amp; file, serta pengguna</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawer('none')}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 3 Tabs: Rak, Buku, Pengguna */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-50/70 p-2">
        <button
          type="button"
          onClick={() => setTab('shelf')}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition cursor-pointer ${
            tab === 'shelf' ? 'bg-white text-pink-700 shadow-xs ring-1 ring-pink-200' : 'text-slate-500'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Rak 3D
        </button>
        <button
          type="button"
          onClick={() => setTab('book')}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition cursor-pointer ${
            tab === 'book' ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-200' : 'text-slate-500'
          }`}
        >
          <BookPlus className="h-3.5 w-3.5" />
          Buku &amp; File
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition cursor-pointer ${
            tab === 'users' ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200' : 'text-slate-500'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Pengguna
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 readify-scroll">
        {tab === 'shelf' && (
          <div className="space-y-4">
            <form onSubmit={handleAddShelf} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Zona Penempatan</label>
                <select
                  value={zoneId}
                  onChange={(e) => {
                    setZoneId(e.target.value as ZoneId);
                    setGridX(0);
                    setGridZ(0);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-pink-500"
                >
                  {ZONE_LIST.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Posisi Grid di {selectedZone.shortLabel}
                </label>
                <div
                  className="grid gap-1.5 rounded-2xl bg-slate-100/90 p-2.5"
                  style={{ gridTemplateColumns: `repeat(${selectedZone.gridCols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: selectedZone.gridRows }).map((_, gz) =>
                    Array.from({ length: selectedZone.gridCols }).map((__, gx) => {
                      const key = `${gx},${gz}`;
                      const taken = occupiedGrid.has(key);
                      const isSel = gridX === gx && gridZ === gz;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={taken}
                          onClick={() => {
                            setGridX(gx);
                            setGridZ(gz);
                          }}
                          className={`rounded-xl py-2.5 text-[11px] font-bold transition ${
                            taken
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : isSel
                                ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-300 cursor-pointer'
                                : 'bg-white text-slate-600 hover:bg-pink-50 cursor-pointer'
                          }`}
                        >
                          {taken ? 'Terisi' : `(${gx},${gz})`}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kode Rak</label>
                  <input
                    type="text"
                    required
                    value={shelfCode}
                    onChange={(e) => setShelfCode(e.target.value)}
                    placeholder="RAK-F3"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kapasitas Slot</label>
                  <input
                    type="number"
                    min={4}
                    max={16}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nama Rak</label>
                <input
                  type="text"
                  required
                  value={shelfName}
                  onChange={(e) => setShelfName(e.target.value)}
                  placeholder="Rak Novel Fantasi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Warna Aksen</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SHELF_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setShelfColor(c)}
                        className={`h-6 w-6 rounded-full transition cursor-pointer ${
                          shelfColor === c ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Orientasi</label>
                  <select
                    value={rotationY}
                    onChange={(e) => setRotationY(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none"
                  >
                    <option value={0}>Horizontal (0°)</option>
                    <option value={90}>Vertikal (90°)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingShelf || occupiedGrid.has(`${gridX},${gridZ}`)}
                className="w-full rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700 disabled:bg-slate-300 cursor-pointer"
              >
                {savingShelf ? 'Menambahkan...' : 'Pasang Rak ke Ruang 3D'}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Rak Terpasang ({shelves.length})
              </div>
              <div className="space-y-1.5">
                {shelves.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.accent_color }} />
                      <span className="font-bold text-slate-700 truncate">
                        {s.code} • {s.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        removeShelf(s.id).catch((err) =>
                          addToast({
                            title: 'Tidak dapat menghapus rak',
                            description: err instanceof Error ? err.message : '',
                            variant: 'error',
                          })
                        )
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'book' && (
          <form onSubmit={handleAddBook} className="space-y-3">
            {/* Upload File Buku (PDF / TXT / MD) */}
            <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv,.json"
                onChange={handleSelectBookFile}
                className="hidden"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800">
                      {uploadedDoc ? uploadedDoc.file_name : 'Unggah File Buku (PDF / TXT / MD)'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {uploadedDoc
                        ? `${uploadedDoc.page_count} halaman • siap diringkas AI`
                        : 'Teks dokumen akan diekstrak untuk diringkas AI'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={extractingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-blue-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                >
                  {extractingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadedDoc ? 'Ganti' : 'Pilih File'}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Rak Tujuan</label>
              <select
                value={effectiveShelf?.id ?? ''}
                onChange={(e) => setTargetShelfId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} ({ZONES[s.zone_id]?.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            {effectiveShelf && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Slot Buku di {effectiveShelf.code}
                </label>
                <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-slate-100 p-2">
                  {Array.from({ length: effectiveShelf.capacity }).map((_, idx) => {
                    const taken = occupiedSlots.has(idx);
                    const isSel = slotIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={taken}
                        onClick={() => setSlotIndex(idx)}
                        className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                          taken
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : isSel
                              ? 'bg-blue-700 text-white shadow-xs cursor-pointer'
                              : 'bg-white text-slate-600 hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        #{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Judul Buku</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Filosofi Teras"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Penulis</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Henry Manampiring"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Kategori</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Tahun</label>
                <input
                  type="number"
                  value={publishYear}
                  onChange={(e) => setPublishYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Stok</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={totalCopies}
                  onChange={(e) => setTotalCopies(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Warna Sampul</label>
              <div className="flex flex-wrap gap-1.5">
                {BOOK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoverColor(c)}
                    className={`h-6 w-6 rounded-md transition cursor-pointer ${
                      coverColor === c ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Ringkasan Buku</label>
                <button
                  type="button"
                  disabled={aiGenLoading}
                  onClick={handleAIGenerateSummary}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10.5px] font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                >
                  {aiGenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {uploadedDoc ? 'Ringkas File via AI' : 'Auto-Ringkas AI'}
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ringkasan singkat isi buku..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Poin Penting (1 baris per poin)
              </label>
              <textarea
                rows={2}
                value={keyPointsText}
                onChange={(e) => setKeyPointsText(e.target.value)}
                placeholder={'Poin utama 1\nPoin utama 2'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingBook || !effectiveShelf || occupiedSlots.has(slotIndex)}
              className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:bg-slate-300 cursor-pointer"
            >
              {savingBook ? 'Menyimpan...' : 'Pasang Buku ke Rak 3D'}
            </button>
          </form>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Nadia Putri"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="nadia@readify.id"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newUserPass}
                    onChange={(e) => setNewUserPass(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Peran Akun</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('member')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      newUserRole === 'member'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Pengunjung
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('admin')}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      newUserRole === 'admin'
                        ? 'border-pink-600 bg-pink-50 text-pink-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Admin Pustakawan
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Warna Avatar</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewUserColor(c)}
                      className={`h-6 w-6 rounded-full transition cursor-pointer ${
                        newUserColor === c ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingUser}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                {savingUser ? 'Menyimpan...' : 'Tambah Pengguna Baru'}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Daftar Akun Terdaftar ({usersList.length})
              </div>
              {loadingUsers ? (
                <div className="py-4 text-center text-xs text-slate-400">Memuat daftar pengguna...</div>
              ) : (
                <div className="space-y-1.5">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ backgroundColor: u.avatar_color }}
                        >
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-bold text-slate-800">{u.name}</span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                u.role === 'admin'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {u.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                            </span>
                          </div>
                          <div className="truncate text-[10px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                      {u.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Hapus akun"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
