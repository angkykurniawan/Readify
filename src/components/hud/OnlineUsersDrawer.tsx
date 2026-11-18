import { Activity, Users, X } from 'lucide-react';
import { ZONES } from '../../data/zones';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { ZoneId } from '../../types/library';

export function OnlineUsersDrawer() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const onlineUsers = useLibraryStore((s) => s.onlineUsers);
  const maxConcurrentUsers = useLibraryStore((s) => s.maxConcurrentUsers);
  const sessionToken = useLibraryStore((s) => s.sessionToken);
  const activityFeed = useLibraryStore((s) => s.activityFeed);

  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const focusZone = useLibraryStore((s) => s.focusZone);

  if (activeDrawer !== 'online') return null;

  const isFull = onlineUsers.length >= maxConcurrentUsers;

  return (
    <aside className="fixed inset-x-2 top-16 bottom-20 z-30 flex flex-col overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-slate-200/90 backdrop-blur-xl sm:left-auto sm:right-4 sm:top-20 sm:bottom-24 sm:w-full sm:max-w-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              Pengunjung Online ({onlineUsers.length}/{maxConcurrentUsers})
            </h2>
            <p className="text-[11px] text-slate-500">Kapasitas ruang perpustakaan</p>
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

      {/* Capacity Progress */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-600">Kapasitas Aktif</span>
          <span className={isFull ? 'text-rose-600' : 'text-emerald-700'}>
            {onlineUsers.length} / {maxConcurrentUsers} Pengunjung
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (onlineUsers.length / maxConcurrentUsers) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 readify-scroll">
        <div className="space-y-2">
          {onlineUsers.map((u) => {
            const isSelf = u.session_token === sessionToken;
            const zoneLabel = ZONES[u.current_zone as ZoneId]?.shortLabel || u.current_zone;
            return (
              <button
                key={u.session_token}
                type="button"
                onClick={() => focusZone((u.current_zone as ZoneId) || 'lobby')}
                className={`flex w-full items-center gap-2.5 rounded-2xl border p-3 text-left transition cursor-pointer ${
                  isSelf
                    ? 'border-blue-200 bg-blue-50/60'
                    : 'border-slate-200/70 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-xs"
                  style={{ backgroundColor: u.avatar_color }}
                >
                  {u.user_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-extrabold text-slate-800">
                      {u.user_name}
                    </span>
                    {isSelf && (
                      <span className="rounded bg-blue-600 px-1.5 text-[9px] font-bold text-white">
                        ANDA
                      </span>
                    )}
                    {u.role === 'admin' && (
                      <span className="rounded bg-pink-100 px-1.5 text-[9px] font-bold text-pink-700">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[10.5px] text-slate-500">
                    {zoneLabel} • {u.status_text}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            <Activity className="h-3.5 w-3.5" />
            Aktivitas Terbaru
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-[11px] text-slate-400">Belum ada aktivitas baru.</p>
          ) : (
            <div className="space-y-1.5">
              {activityFeed.slice(0, 10).map((ev) => (
                <div key={ev.id} className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">{ev.actor_name || 'Sistem'}</span>{' '}
                  {ev.event_type === 'user_join' && 'memasuki perpustakaan.'}
                  {ev.event_type === 'user_leave' && 'keluar dari perpustakaan.'}
                  {ev.event_type === 'book_borrow' && `meminjam "${String(ev.payload.title || 'buku')}".`}
                  {ev.event_type === 'book_return' && `mengembalikan "${String(ev.payload.title || 'buku')}".`}
                  {ev.event_type === 'shelf_added' && 'menambahkan rak baru.'}
                  {ev.event_type === 'book_added' && 'menambahkan buku baru.'}
                  {ev.event_type === 'book_updated' && 'memperbarui dokumen buku.'}
                  {ev.event_type === 'ai_updated' && 'memperbarui pengaturan AI.'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
