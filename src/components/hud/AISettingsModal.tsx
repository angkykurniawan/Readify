import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchAvailableAIModels, saveAIConfig } from '../../services/api';
import { useLibraryStore } from '../../store/useLibraryStore';
import type { AIModelInfo, AIProvider } from '../../types/library';

const PROVIDERS: Array<{ id: AIProvider; label: string; hint: string }> = [
  { id: 'gemini', label: 'Google Gemini', hint: 'AIza... (Google AI Studio)' },
  { id: 'openai', label: 'OpenAI', hint: 'sk-... (OpenAI Platform)' },
  { id: 'openrouter', label: 'OpenRouter', hint: 'sk-or-... (Multi-model gateway)' },
  { id: 'groq', label: 'Groq Cloud', hint: 'gsk_... (Inference super cepat)' },
  { id: 'custom', label: 'Custom OpenAI-Compatible', hint: 'Masukkan Base URL + API Key' },
];

export function AISettingsModal() {
  const activeDrawer = useLibraryStore((s) => s.activeDrawer);
  const currentUser = useLibraryStore((s) => s.currentUser);
  const aiConfig = useLibraryStore((s) => s.aiConfig);
  const sessionToken = useLibraryStore((s) => s.sessionToken);
  const setActiveDrawer = useLibraryStore((s) => s.setActiveDrawer);
  const updateAIConfig = useLibraryStore((s) => s.updateAIConfig);
  const addToast = useLibraryStore((s) => s.addToast);

  const [provider, setProvider] = useState<AIProvider>(aiConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(aiConfig.api_key || '');
  const [baseUrl, setBaseUrl] = useState(aiConfig.base_url || '');
  const [showKey, setShowKey] = useState(false);

  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [modelFilter, setModelFilter] = useState('');
  const [selectedModel, setSelectedModel] = useState(aiConfig.selected_model || '');
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredModels = useMemo(() => {
    const q = modelFilter.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [models, modelFilter]);

  if (activeDrawer !== 'ai' || currentUser?.role !== 'admin') return null;

  const handleFetchModels = async () => {
    if (!sessionToken) return;
    setError('');
    setLoadingModels(true);
    try {
      const list = await fetchAvailableAIModels(sessionToken, {
        provider,
        api_key: apiKey,
        base_url: baseUrl,
      });
      setModels(list);
      if (list.length > 0 && !list.some((m) => m.id === selectedModel)) {
        // Prioritaskan model cepat/umum sebagai default awal pilihan
        const preferred =
          list.find((m) => /flash|gpt-4o-mini|llama-3|claude/i.test(m.id)) || list[0];
        setSelectedModel(preferred.id);
      }
      addToast({
        title: `${list.length} model AI ditemukan!`,
        description: 'Silakan pilih model yang ingin digunakan lalu simpan.',
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar model dari API.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setError('');
    setSaving(true);
    try {
      const saved = await saveAIConfig(sessionToken, {
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        selected_model: selectedModel,
      });
      updateAIConfig(saved);
      addToast({
        title: 'API AI berhasil dikonfigurasi!',
        description: `Model aktif: ${saved.selected_model}`,
        variant: 'success',
      });
      setActiveDrawer('none');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi AI.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-3 backdrop-blur-xs sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 readify-scroll">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Integrasi AI &amp; Pemilih Model Dinamis</h2>
              <p className="text-[11px] text-indigo-100">
                Masukkan API Key → Muat daftar model resmi → Pilih model untuk ringkasan buku
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveDrawer('none')}
            className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
          {/* Provider Pills */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">1. Pilih Provider API</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    setModels([]);
                    setError('');
                  }}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition cursor-pointer ${
                    provider === p.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {provider === 'custom' && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Base URL (OpenAI-Compatible)</label>
              <input
                type="url"
                required
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          )}

          {/* API Key Input + Fetch Models */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              2. Masukkan API Key ({PROVIDERS.find((p) => p.id === provider)?.hint})
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiConfig.is_configured ? '•••••••• (tersimpan, isi jika ingin ganti)' : 'Tempel API Key di sini...'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                disabled={loadingModels}
                onClick={handleFetchModels}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {loadingModels ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Muat Model
              </button>
            </div>
          </div>

          {/* Model Selection Dropdown / List */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                3. Pilih Model yang Tersedia pada API
              </label>
              {models.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600">
                  {models.length} model tersedia
                </span>
              )}
            </div>

            {models.length > 0 ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="Filter nama model (misal: flash, gpt-4o, llama)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2 readify-scroll">
                  {filteredModels.map((m) => {
                    const active = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-indigo-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate text-xs font-bold">{m.id}</div>
                          {m.name && m.name !== m.id && (
                            <div className={`truncate text-[10px] ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {m.name}
                            </div>
                          )}
                        </div>
                        {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center">
                {selectedModel ? (
                  <p className="text-xs font-semibold text-slate-700">
                    Model aktif saat ini: <span className="text-indigo-700">{selectedModel}</span>
                    <br />
                    <span className="text-[11px] font-normal text-slate-400">
                      Klik &ldquo;Muat Model&rdquo; di atas untuk melihat seluruh model yang tersedia pada API Key Anda.
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Masukkan API Key lalu klik <strong className="text-slate-700">Muat Model</strong> agar daftar model resmi dari API tampil di sini.
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveDrawer('none')}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !selectedModel}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:bg-slate-300 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan & Aktifkan Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
