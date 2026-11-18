import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useLibraryStore } from '../../store/useLibraryStore';

export function ToastOverlay() {
  const toasts = useLibraryStore((s) => s.toasts);
  const removeToast = useLibraryStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-16 z-50 flex flex-col gap-2 sm:inset-x-auto sm:left-4 sm:top-20 sm:w-80">
      {toasts.map((t) => {
        const style =
          t.variant === 'success'
            ? 'border-emerald-200 bg-white/95 text-emerald-900'
            : t.variant === 'error'
              ? 'border-rose-200 bg-white/95 text-rose-900'
              : t.variant === 'warning'
                ? 'border-amber-200 bg-white/95 text-amber-900'
                : 'border-blue-200 bg-white/95 text-slate-800';

        const Icon =
          t.variant === 'success'
            ? CheckCircle2
            : t.variant === 'error'
              ? XCircle
              : t.variant === 'warning'
                ? AlertTriangle
                : Info;

        const iconColor =
          t.variant === 'success'
            ? 'text-emerald-500'
            : t.variant === 'error'
              ? 'text-rose-500'
              : t.variant === 'warning'
                ? 'text-amber-500'
                : 'text-blue-500';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border p-3 shadow-lg backdrop-blur-md ${style}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold leading-snug">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">{t.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
