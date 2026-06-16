import { CheckCircle2, FolderOpen, Gauge, KeyRound, Loader2, RefreshCw, Sparkles, Terminal, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { RECOMMENDED_SYSTEM_PROMPT, useAppContext, type Theme } from '../AppContext';
import type { ProviderId } from '../types';

const PROVIDERS: { id: ProviderId; label: string; command: string }[] = [
  { id: 'antigravity', label: 'Google Antigravity', command: 'agy' },
  { id: 'openai', label: 'OpenAI Codex', command: 'codex' },
  { id: 'anthropic', label: 'Anthropic Claude', command: 'claude' },
];

const THEMES: { id: Theme; label: string }[] = [
  { id: 'modern-dark', label: 'Modern Dark' },
  { id: 'classic-light', label: 'Classic Light' },
  { id: 'deep-galactic', label: 'Deep Galactic' },
  { id: 'muted-earth', label: 'Muted Earth' },
  { id: 'neon-cyber', label: 'Neon Cyber' },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    provider,
    setProvider,
    apiKeys,
    setApiKey,
    systemPrompt,
    setSystemPrompt,
    useRecommendedSystemPrompt,
    generateSystemPrompt,
    theme,
    setTheme,
    cliStatus,
    refreshCliStatus,
    selectedProject,
    addProject,
    usage,
    setTokenLimit,
    resetUsage,
    setHasSetupCompleted,
  } = useAppContext();
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#181518] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg text-white font-semibold">Einstellungen</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Provider, CLI-Status, Projekt und Darstellung</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-7 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <section>
            <div className="section-label flex items-center justify-between">
              CLI-Anbieter
              <button onClick={refreshCliStatus} className="flex items-center gap-1 normal-case tracking-normal hover:text-white">
                <RefreshCw className="w-3 h-3" />
                Neu prüfen
              </button>
            </div>
            <div className="space-y-2 mt-3">
              {PROVIDERS.map((item) => {
                const status = cliStatus[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => setProvider(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
                      provider === item.id ? 'border-white/20 bg-white/[0.06]' : 'border-white/5 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-zinc-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200">{item.label}</div>
                      <div className="text-[10px] text-zinc-600 font-mono truncate">
                        {status.executable || item.command}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-[11px] ${status.installed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {status.installed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {status.installed ? 'Bereit' : 'Fehlt'}
                      </div>
                      <div className="text-[9px] text-zinc-700 mt-0.5">{status.version}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="section-label">Aktives Projekt</div>
            <button onClick={addProject} className="panel !p-3 w-full mt-3 flex items-center gap-3 text-left hover:border-white/15">
              <FolderOpen className="w-4 h-4 text-amber-400/70" />
              <div className="min-w-0">
                <div className="text-sm text-zinc-200">{selectedProject?.title || 'Projektordner auswählen'}</div>
                <div className="text-[10px] text-zinc-600 truncate">{selectedProject?.path || 'Noch kein Ordner gewählt'}</div>
              </div>
            </button>
          </section>

          <section>
            <div className="section-label flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" />
              API-Key
            </div>
            <input
              type="password"
              value={apiKeys[provider] || ''}
              onChange={(event) => setApiKey(provider, event.target.value)}
              className="input w-full mt-3"
              placeholder={`${PROVIDERS.find((item) => item.id === provider)?.label} API-Key`}
              autoComplete="off"
            />
            <p className="text-[11px] leading-4 text-zinc-600 mt-2">
              Der Key wird beim Start der gewaehlten CLI als passende Umgebungsvariable uebergeben.
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div className="section-label">System-Prompt</div>
              <div className="flex gap-3">
                <button
                  onClick={useRecommendedSystemPrompt}
                  className="text-[11px] text-amber-300 hover:text-amber-200"
                  title={RECOMMENDED_SYSTEM_PROMPT}
                >
                  Empfohlen nutzen
                </button>
                <button
                  onClick={async () => {
                    setPromptError('');
                    setGeneratingPrompt(true);
                    try {
                      await generateSystemPrompt();
                    } catch (error) {
                      setPromptError(error instanceof Error ? error.message : 'Generierung fehlgeschlagen.');
                    } finally {
                      setGeneratingPrompt(false);
                    }
                  }}
                  disabled={!selectedProject || generatingPrompt}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white disabled:text-zinc-700"
                >
                  {generatingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Mit AI generieren
                </button>
              </div>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="input w-full mt-3 min-h-32 resize-none"
              placeholder="Lege fest, wie der Agent grundsaetzlich arbeiten soll."
            />
            {promptError && <div className="text-[11px] text-red-400 mt-2">{promptError}</div>}
          </section>

          <section>
            <div className="section-label flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5" />
              Nutzungslimit
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 mt-3">
              <input
                type="number"
                min={0}
                value={usage.tokenLimit || ''}
                onChange={(event) => setTokenLimit(Number(event.target.value))}
                className="input w-full"
                placeholder="Token-Limit, z.B. 200000"
              />
              <button onClick={resetUsage} className="px-3 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-red-300 hover:bg-white/5">
                Reset
              </button>
            </div>
            <div className="mt-2 text-[11px] text-zinc-600">
              Verbraucht: {usage.totalTokens.toLocaleString('de-DE')} Tokens
              {usage.tokenLimit ? ` · Verbleibend: ${Math.max(0, usage.tokenLimit - usage.totalTokens).toLocaleString('de-DE')}` : ''}
            </div>
          </section>

          <section>
            <div className="section-label">Design</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  className={`py-2.5 rounded-lg text-xs border ${
                    theme === item.id ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() => {
              setHasSetupCompleted(false);
              onClose();
            }}
            className="text-xs text-zinc-600 hover:text-white"
          >
            Einrichtungsassistent erneut öffnen
          </button>
        </div>
      </div>
    </div>
  );
}
