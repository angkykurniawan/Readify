import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';

export function BookReaderModal() {
  const readingBookId = useLibraryStore((s) => s.readingBookId);
  const setReadingBookId = useLibraryStore((s) => s.setReadingBookId);
  const books = useLibraryStore((s) => s.books);
  const loans = useLibraryStore((s) => s.loans);
  const borrowSelectedBook = useLibraryStore((s) => s.borrowSelectedBook);

  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf');
  const [fontSize, setFontSize] = useState<number>(15); // in px
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [borrowing, setBorrowing] = useState(false);

  const book = books.find((b) => b.id === readingBookId);
  const isBorrowed = loans.some((l) => l.book_id === book?.id && l.status === 'borrowed');

  useEffect(() => {
    if (book) {
      if (book.file_url) {
        setActiveTab('pdf');
      } else {
        setActiveTab('text');
      }
    }
  }, [book]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReadingBookId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setReadingBookId]);

  if (!book) return null;

  const handleBorrow = async () => {
    setBorrowing(true);
    try {
      await borrowSelectedBook(book.id);
    } finally {
      setBorrowing(false);
    }
  };

  const themeClasses = {
    light: 'bg-white text-slate-800',
    sepia: 'bg-[#fbf0d9] text-[#5f4b32]',
    dark: 'bg-[#1e2430] text-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-10 w-7 shrink-0 rounded-md shadow-sm"
              style={{ backgroundColor: book.cover_color }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm sm:text-base font-extrabold text-slate-900">
                  {book.title}
                </h2>
                {isBorrowed ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Sedang Dipinjam
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    <BookOpen className="h-3 w-3" />
                    Pratinjau Buku
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {book.author} • {book.category} ({book.publish_year})
              </p>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center gap-2">
            {/* Tab Selector if both file_url and text exist */}
            {book.file_url && (
              <div className="flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold text-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('pdf')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                    activeTab === 'pdf'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF Viewer
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                    activeTab === 'text'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Teks Buku
                </button>
              </div>
            )}

            {book.file_url && (
              <a
                href={book.file_url}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                title="Buka di Tab Baru / Download"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka Tab
              </a>
            )}

            <button
              type="button"
              onClick={() => setReadingBookId(null)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
              aria-label="Tutup Reader"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-hidden bg-slate-100">
          {activeTab === 'pdf' && book.file_url ? (
            <div className="flex h-full w-full flex-col">
              <iframe
                src={`${book.file_url}#toolbar=1&navpanes=0`}
                title={`PDF Viewer: ${book.title}`}
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <div className={`flex h-full flex-col ${themeClasses[theme]}`}>
              {/* Text Reader Toolbar */}
              <div className="flex flex-wrap items-center justify-between border-b border-black/10 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[11px] opacity-70">Ukuran Font:</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                    className="flex h-6 w-6 items-center justify-center rounded bg-black/5 hover:bg-black/10"
                    title="Perkecil Font"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center font-mono text-[11px]">{fontSize}</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                    className="flex h-6 w-6 items-center justify-center rounded bg-black/5 hover:bg-black/10"
                    title="Perbesar Font"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[11px] opacity-70">Tema:</span>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      theme === 'light'
                        ? 'bg-slate-900 text-white'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    Putih
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('sepia')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      theme === 'sepia'
                        ? 'bg-[#d8be92] text-[#3f3120]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    Sepia
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    Gelap
                  </button>
                </div>
              </div>

              {/* Text Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 readify-scroll">
                <article className="mx-auto max-w-3xl space-y-6">
                  {/* Key points banner */}
                  {book.key_points && book.key_points.length > 0 && (
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                        <Sparkles className="h-4 w-4" />
                        Gagasan &amp; Poin Inti Buku:
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
                        {book.key_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary / Content */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider opacity-60">
                      Sinopsis &amp; Ringkasan Katalog
                    </h3>
                    <p
                      className="mt-2 leading-relaxed"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {book.summary}
                    </p>
                  </div>

                  {book.content_text ? (
                    <div className="pt-4 border-t border-black/10">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider opacity-60">
                        Isi Teks Dokumen Buku ({book.file_name || 'Dokumen'}):
                      </h3>
                      <div
                        className="mt-3 whitespace-pre-wrap leading-relaxed font-sans"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {book.content_text}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900">
                      <p className="font-bold">Info File Digital:</p>
                      <p className="mt-1">
                        Buku ini belum memiliki file dokumen PDF/teks lengkap yang diunggah oleh Pustakawan.
                        Admin dapat mengunggah file PDF/TXT/MD melalui Panel Buku atau Panel Admin agar pengunjung dapat membaca isi penuh di viewer.
                      </p>
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="text-xs text-slate-500">
            {isBorrowed ? (
              <span className="font-semibold text-emerald-700">
                Buku ini ada di daftar pinjaman aktif Anda.
              </span>
            ) : (
              <span>
                Status: {book.available_copies > 0 ? `Tersedia (${book.available_copies}/${book.total_copies})` : 'Stok Habis'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isBorrowed && book.available_copies > 0 && (
              <button
                type="button"
                disabled={borrowing}
                onClick={handleBorrow}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {borrowing ? 'Memproses...' : 'Pinjam Buku'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setReadingBookId(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
