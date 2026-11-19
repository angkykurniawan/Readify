import { Lock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getOnlineCountPreview } from '../../services/api';
import { useLibraryStore } from '../../store/useLibraryStore';
import { ReadifyLogo } from '../common/ReadifyLogo';

export function LoginModal() {
  const loginUser = useLibraryStore((s) => s.loginUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlinePreview, setOnlinePreview] = useState<{ online: number; max: number }>({
    online: 0,
    max: 10,
  });

  useEffect(() => {
    getOnlineCountPreview().then(setOnlinePreview).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke perpustakaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/96 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-cyan-700 px-6 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ReadifyLogo className="h-11 w-11 shrink-0 drop-shadow-md" />
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">READIFY</h1>
                <p className="text-xs text-blue-100">Perpustakaan Digital 3D</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur-xs">
              <Users className="h-3.5 w-3.5" />
              {onlinePreview.online}/{onlinePreview.max} Online
            </span>
          </div>
        </div>

        {/* Form Masuk */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            {loading ? 'Memproses...' : 'Masuk ke Perpustakaan'}
          </button>

          <div className="pt-2 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Untuk demo minta akun ke{' '}
              <a
                href="mailto:kurniawan.angang2005@gmail.com"
                className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
              >
                kurniawan.angang2005@gmail.com
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
