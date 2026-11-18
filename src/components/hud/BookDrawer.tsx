import {
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ZONES } from '../../data/zones';
import { requestAIBookSummary, uploadBookDocument } from '../../services/api';
import { useLibraryStore } from '../../store/useLibraryStore';

export function BookDrawer() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const selectedBookId = useLibraryStore((s) => s.selectedBookId);
  const books = useLibraryStore((s) => s.books);
  const shelves = useLibraryStore((s) => s.shelves);
  const loans = useLibraryStore((s) => s.loans);
  const currentUser = useLibraryStore((s) => s.currentUser);
  const aiConfig = useLibraryStore((s) => s.aiConfig);
  const sessionToken = useLibraryStore((s) => s.sessionToken);

  const selectBook = useLibraryStore((s) => s.selectBook);
  const borrowSelectedBook = useLibraryStore((s) => s.borrowSelectedBook);
  const attachBookFile = useLibraryStore((s) => s.attachBookFile);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const addToast = useLibraryStore((s) => s.addToast);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState<{ text: string; model: string } | null>(null);
  const [aiError, setAiError] = useState('');
  const [question, setQuestion] = useState('');

  const book = books.find((b) => b.id === selectedBookId);
  const shelf = book ? shelves.find((s) => s.id === book.shelf_id) : undefined;
  const alreadyBorrowed = book
    ? loans.some((l) => l.book_id === book.id && l.status === 'borrowed')
    : false;

  useEffect(() => {
    setAiReply(null);
    setAiError('');
    setQuestion('');
  }, [selectedBookId]);

  if (activeDrawer !== 'book' || !book) return null;

  const handleBorrow = async () => {
    setBorrowing(true);
    try {
      await borrowSelectedBook(book.id);
    } catch (err) {
      addToast({
        title: 'Gagal Meminjam Buku',
        description: err instanceof Error ? err.message : 'Terjadi kendala.',
        variant: 'error',
      });
    } finally {
      setBorrowing(false);
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const uploaded = await uploadBookDocument(file);
      await attachBookFile(book.id, {
        file_name: uploaded.file_name,
        file_url: uploaded.file_url,
        content_text: uploaded.content_text,
      });
    } catch (err) {
      addToast({
        title: 'Gagal Mengunggah File',
        description: err instanceof Error ? err.message : 'Format file tidak didukung.',
        variant: 'error',
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const askAI = async (mode?: 'ringkas' | 'poin' | 'mendalam', customQuestion?: string) => {
    if (!sessionToken) return;
    if (!aiConfig.is_configured) {
      setAiError(
        currentUser?.role === 'admin'
          ? 'API AI belum dikonfigurasi. Buka Pengaturan AI untuk memasukkan API Key & memilih model.'
          : 'Fitur Ringkasan AI belum diaktifkan oleh Admin Pustakawan.'
      );
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await requestAIBookSummary(sessionToken, {
        title: book.title,
        author: book.author,
        category: book.category,
        existing_summary: book.summary,
        content_text: book.content_text,
        mode,
        question: customQuestion,
      });
      setAiReply(res);
      if (customQuestion) setQuestion('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal menghubungi AI.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <aside className="fixed inset-x-2 top-16 bottom-20 z-30 flex flex-col overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-slate-200/90 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-20 sm:bottom-24 sm:w-full sm:max-w-sm">
      {/* Header Cover Banner */}
      <div
        className="relative px-5 py-4 text-white sm:py-5"
        style={{ background: `linear-gradient(135deg, ${book.cover_color}, #1e293b)` }}
      >
        <button
          type="button"
          onClick={() => selectBook(null)}
          className="absolute right-3.5 top-3.5 rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-13 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-inner ring-1 ring-white/30">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {book.category} • {book.publish_year}
            </span>
            <h2 className="mt-1 text-sm font-extrabold leading-snug sm:text-base">{book.title}</h2>
            <p className="text-xs text-white/85">{book.author}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10.5px]">
          {shelf && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 font-medium">
              <MapPin className="h-3 w-3" />
              {shelf.code} • Slot #{book.slot_index + 1} ({ZONES[shelf.zone_id]?.shortLabel})
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 font-bold ${
              book.available_copies > 0
                ? 'bg-emerald-400/25 text-emerald-100'
                : 'bg-rose-400/30 text-rose-100'
            }`}
          >
            {book.available_copies > 0
              ? `Tersedia ${book.available_copies}/${book.total_copies}`
              : 'Sedang Kosong (0)'}
          </span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 readify-scroll">
        {/* Dokumen File Buku */}
        {(book.file_name || currentUser?.role === 'admin') && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-800">
                    {book.file_name || 'Belum ada file dokumen'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {book.content_text
                      ? 'Dokumen siap dibaca & diringkas AI'
                      : 'Unggah PDF / TXT / MD agar AI dapat merangkum isi buku'}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {book.file_url && (
                  <a
                    href={book.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                  >
                    <Download className="h-3 w-3" />
                    Buka
                  </a>
                )}
                {currentUser?.role === 'admin' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.csv,.json"
                      onChange={handleAttachFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {book.file_name ? 'Ganti' : 'Unggah'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ringkasan Katalog */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Ringkasan Buku
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{book.summary}</p>
        </div>

        {book.key_points.length > 0 && (
          <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
            <h4 className="text-[11px] font-bold text-slate-700">Poin Penting</h4>
            <ul className="mt-2 space-y-1.5">
              {book.key_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Minta Ringkasan AI */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-800">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Ringkasan AI {book.content_text ? '(Dari File)' : ''}
            </div>
            {currentUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setActiveDrawer('ai')}
                className="text-[10.5px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {aiConfig.is_configured ? aiConfig.selected_model.slice(0, 18) : 'Atur AI →'}
              </button>
            ) : (
              <span className="text-[10.5px] font-semibold text-indigo-500">
                {aiConfig.is_configured ? aiConfig.selected_model.slice(0, 18) : 'Belum aktif'}
              </span>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => askAI('ringkas')}
              className="rounded-xl bg-white px-2 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-xs ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Ringkas 1m
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => askAI('poin')}
              className="rounded-xl bg-white px-2 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-xs ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              5 Poin Inti
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => askAI('mendalam')}
              className="rounded-xl bg-white px-2 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-xs ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Mendalam
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) askAI(undefined, question.trim());
            }}
            className="mt-2.5 flex gap-1.5"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Tanya AI tentang buku ini..."
              className="flex-1 rounded-xl border border-indigo-200/80 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={aiLoading || !question.trim()}
              className="flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-1.5 text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>

          {aiLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI sedang merangkum...
            </div>
          )}

          {aiError && (
            <div className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
              {aiError}
            </div>
          )}

          {aiReply && !aiLoading && (
            <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-xs ring-1 ring-indigo-100 whitespace-pre-line">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-indigo-500">
                <span>RINGKASAN AI</span>
                <span>{aiReply.model}</span>
              </div>
              {aiReply.text}
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
        {alreadyBorrowed ? (
          <button
            type="button"
            onClick={() => setActiveDrawer('loans')}
            className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 cursor-pointer"
          >
            Sedang Anda Pinjam • Lihat Pinjaman
          </button>
        ) : (
          <button
            type="button"
            disabled={borrowing || book.available_copies <= 0}
            onClick={handleBorrow}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:bg-slate-300 disabled:shadow-none cursor-pointer"
          >
            {borrowing
              ? 'Memproses Peminjaman...'
              : book.available_copies <= 0
                ? 'Stok Habis Dipinjam'
                : 'Pinjam Buku'}
          </button>
        )}
      </div>
    </aside>
  );
}
