import { BookOpen, Compass, Layers, X } from 'lucide-react';
import { useState } from 'react';
import { ZONE_LIST, ZONES } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { ZoneId } from '../../types/library';

export function CatalogDrawer() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const shelves = useLibraryStore((s) => s.shelves);
  const books = useLibraryStore((s) => s.books);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const selectBook = useLibraryStore((s) => s.selectBook);
  const focusShelf = useLibraryStore((s) => s.focusShelf);

  const [zoneFilter, setZoneFilter] = useState<ZoneId | 'all'>('all');

  if (activeDrawer !== 'catalog') return null;

  const filteredShelves =
    zoneFilter === 'all' ? shelves : shelves.filter((s) => s.zone_id === zoneFilter);

  return (
    <aside className="fixed inset-x-2 top-16 bottom-20 z-30 flex flex-col overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-slate-200/90 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-20 sm:bottom-24 sm:w-full sm:max-w-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Koleksi &amp; Direktori Rak</h2>
            <p className="text-[11px] text-slate-500">
              {shelves.length} rak aktif • {books.length} judul buku
            </p>
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

      {/* Zone filter pills */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2.5 readify-scroll">
        <button
          type="button"
          onClick={() => setZoneFilter('all')}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
            zoneFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Semua Zona
        </button>
        {ZONE_LIST.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => setZoneFilter(z.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              zoneFilter === z.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {z.shortLabel}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 readify-scroll">
        {filteredShelves.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Belum ada rak di zona ini. Admin dapat menambahkan rak baru kapan saja.
          </div>
        ) : (
          filteredShelves.map((shelf) => {
            const shelfBooks = books.filter((b) => b.shelf_id === shelf.id);
            return (
              <div
                key={shelf.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
              >
                <button
                  type="button"
                  onClick={() => focusShelf(shelf.id)}
                  className="flex w-full items-center justify-between bg-slate-50/90 px-3.5 py-2.5 text-left transition hover:bg-blue-50/60 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: shelf.accent_color }}
                    />
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {shelf.code} — {shelf.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {ZONES[shelf.zone_id]?.label} • Grid ({shelf.grid_x}, {shelf.grid_z})
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                    <Layers className="h-2.5 w-2.5" />
                    {shelfBooks.length}/{shelf.capacity}
                  </span>
                </button>

                <div className="divide-y divide-slate-100">
                  {shelfBooks.length === 0 ? (
                    <div className="px-3.5 py-2.5 text-[11px] italic text-slate-400">
                      Rak masih kosong.
                    </div>
                  ) : (
                    shelfBooks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBook(b.id)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition hover:bg-blue-50/60 cursor-pointer"
                      >
                        <div
                          className="flex h-7 w-5 shrink-0 items-center justify-center rounded-sm text-white shadow-xs"
                          style={{ backgroundColor: b.cover_color }}
                        >
                          <BookOpen className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-800">{b.title}</div>
                          <div className="truncate text-[10px] text-slate-500">
                            {b.author} • Slot #{b.slot_index + 1}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            b.available_copies > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {b.available_copies}/{b.total_copies}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
