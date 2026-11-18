import { BookMarked, CheckCircle2, Clock, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { useLibraryStore } from '../../store/useLibraryStore';

export function LoansDrawer() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const loans = useLibraryStore((s) => s.loans);
  const shelves = useLibraryStore((s) => s.shelves);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const returnLoan = useLibraryStore((s) => s.returnLoan);
  const addToast = useLibraryStore((s) => s.addToast);

  const [returningId, setReturningId] = useState<number | null>(null);

  if (activeDrawer !== 'loans') return null;

  const activeLoans = loans.filter((l) => l.status === 'borrowed');
  const historyLoans = loans.filter((l) => l.status === 'returned');

  const handleReturn = async (loanId: number) => {
    setReturningId(loanId);
    try {
      await returnLoan(loanId);
    } catch (err) {
      addToast({
        title: 'Gagal Mengembalikan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      });
    } finally {
      setReturningId(null);
    }
  };

  return (
    <aside className="fixed inset-x-2 top-16 bottom-20 z-30 flex flex-col overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-slate-200/90 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-20 sm:bottom-24 sm:w-full sm:max-w-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <BookMarked className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Meja Sirkulasi &amp; Pinjaman</h2>
            <p className="text-[11px] text-slate-500">{activeLoans.length} buku aktif dipinjam</p>
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

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 readify-scroll">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Sedang Dipinjam
          </h3>
          {activeLoans.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
              <p className="text-xs font-semibold text-slate-600">Belum ada buku yang dipinjam</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Klik buku di rak 3D untuk membaca ringkasan &amp; meminjamnya.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2.5">
              {activeLoans.map((loan) => {
                const shelf = shelves.find((s) => s.id === loan.shelf_id);
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 h-10 w-7 shrink-0 rounded-md shadow-xs"
                        style={{ backgroundColor: loan.cover_color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-extrabold text-slate-800">
                          {loan.title}
                        </div>
                        <div className="text-[11px] text-slate-500">{loan.author}</div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                          <Clock className="h-3 w-3" />
                          Rak asal: {shelf?.code ?? `#${loan.shelf_id}`} (Slot #{loan.slot_index + 1})
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={returningId === loan.id}
                      onClick={() => handleReturn(loan.id)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {returningId === loan.id ? 'Mengembalikan...' : 'Kembalikan ke Rak'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {historyLoans.length > 0 && (
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Riwayat Pengembalian
            </h3>
            <div className="mt-2 space-y-2">
              {historyLoans.slice(0, 8).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-bold text-slate-700">{loan.title}</div>
                    <div className="text-[10px] text-slate-400">{loan.author}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Kembali
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
