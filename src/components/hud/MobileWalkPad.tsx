import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { isMovementLocked, useLibraryStore } from '../../store/useLibraryStore';

export function MobileWalkPad() {
  const cameraMode = useLibraryStore((s) => s.cameraMode);
  const currentUser = useLibraryStore((s) => s.currentUser);
  const myActivity = useLibraryStore((s) => s.myActivity);
  const mySeatId = useLibraryStore((s) => s.mySeatId);
  const selectedBookId = useLibraryStore((s) => s.selectedBookId);
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const setVirtualMove = useLibraryStore((s) => s.setVirtualMove);

  const locked = isMovementLocked({ myActivity, mySeatId, selectedBookId, activeDrawer });

  if (!currentUser || cameraMode !== 'walk' || locked) return null;

  const stop = () => setVirtualMove(0, 0);

  return (
    <div className="fixed bottom-24 left-3 z-20 select-none touch-none sm:bottom-28 sm:left-5 lg:hidden">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/85 p-2 shadow-lg ring-1 ring-slate-200/80 backdrop-blur-md">
        <div />
        <button
          type="button"
          onPointerDown={() => setVirtualMove(0, -1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-blue-600 active:text-white"
          aria-label="Maju"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <div />
        <button
          type="button"
          onPointerDown={() => setVirtualMove(-1, 0)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-blue-600 active:text-white"
          aria-label="Kiri"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={() => setVirtualMove(0, 1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-blue-600 active:text-white"
          aria-label="Mundur"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={() => setVirtualMove(1, 0)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:bg-blue-600 active:text-white"
          aria-label="Kanan"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
