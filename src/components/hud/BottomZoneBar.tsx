import { Armchair, ArrowUpFromLine, BookX } from 'lucide-react';
import { getSpotsForZone } from '../../data/activities';
import { ZONE_LIST, detectZoneFromPosition } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';

export function BottomZoneBar() {
  const currentUser = useLibraryStore((s) => s.currentUser);
  const activeZone = useLibraryStore((s) => s.activeZone);
  const aiConfig = useLibraryStore((s) => s.aiConfig);
  const myPos = useLibraryStore((s) => s.myPos);
  const mySeatId = useLibraryStore((s) => s.mySeatId);
  const myActivity = useLibraryStore((s) => s.myActivity);
  const selectedBookId = useLibraryStore((s) => s.selectedBookId);

  const focusZone = useLibraryStore((s) => s.focusZone);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const goToActivitySpot = useLibraryStore((s) => s.goToActivitySpot);
  const standUp = useLibraryStore((s) => s.standUp);
  const selectBook = useLibraryStore((s) => s.selectBook);

  if (!currentUser) return null;

  const currentAvatarZone = detectZoneFromPosition(myPos[0], myPos[1]);
  const zoneSpots = getSpotsForZone(currentAvatarZone, currentUser.role === 'admin');
  const quickSpot = zoneSpots.find((s) => s.activity !== 'circulating') ?? zoneSpots[0];
  const isReadingBook = selectedBookId !== null || myActivity === 'reading_stand';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 px-2.5 pb-2.5 sm:gap-2 sm:px-4 sm:pb-3.5">
      {/* Bar Aksi Aktivitas Ruangan + Petunjuk Singkat Desktop */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
        {isReadingBook ? (
          <button
            type="button"
            onClick={() => selectBook(null)}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 cursor-pointer"
          >
            <BookX className="h-3.5 w-3.5" />
            Selesai Membaca
          </button>
        ) : mySeatId || myActivity === 'circulating' ? (
          <button
            type="button"
            onClick={standUp}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-600 cursor-pointer"
          >
            <ArrowUpFromLine className="h-3.5 w-3.5" />
            {myActivity === 'circulating' ? 'Selesai di Meja Sirkulasi' : 'Berdiri'}
          </button>
        ) : (
          quickSpot && (
            <button
              type="button"
              onClick={() => goToActivitySpot(quickSpot)}
              className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-md transition hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
            >
              <Armchair className="h-3.5 w-3.5 text-blue-600" />
              {quickSpot.label}
            </button>
          )
        )}

        <div className="hidden items-center gap-2 rounded-full bg-white/88 px-4 py-1.5 text-[11px] font-medium text-slate-500 shadow-xs ring-1 ring-slate-200/75 backdrop-blur-md md:flex">
          <span>Klik buku untuk ringkasan &amp; pinjam</span>
          <span>•</span>
          <span>Klik kursi/sofa untuk duduk</span>
          <span>•</span>
          <span>Seret geser • Scroll zoom</span>
        </div>
      </div>

      {/* Zone Quick-Jump Pills + AI Status */}
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-white/92 p-1 shadow-md ring-1 ring-slate-200/80 backdrop-blur-md readify-scroll sm:gap-1.5 sm:p-1.5">
        <button
          type="button"
          onClick={() => focusZone('all')}
          className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs cursor-pointer ${
            activeZone === 'all'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua Ruang
        </button>

        {ZONE_LIST.map((zone) => {
          const isActive = activeZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => focusZone(zone.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-300 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: zone.accentColor }}
              />
              {zone.shortLabel}
            </button>
          );
        })}

        <div className="mx-0.5 h-4 w-px bg-slate-200 shrink-0 sm:mx-1" />

        {currentUser.role === 'admin' ? (
          <button
            type="button"
            onClick={() => setActiveDrawer('ai')}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs cursor-pointer ${
              aiConfig.is_configured
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                aiConfig.is_configured ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            {aiConfig.is_configured
              ? `AI Aktif (${aiConfig.selected_model.slice(0, 16)})`
              : 'Atur API AI'}
          </button>
        ) : (
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold sm:px-3 sm:text-xs ${
              aiConfig.is_configured
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                aiConfig.is_configured ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            {aiConfig.is_configured ? 'AI Aktif' : 'AI Nonaktif'}
          </div>
        )}
      </div>
    </div>
  );
}
