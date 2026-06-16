import { Check, CheckCircle2, FolderOpen, KeyRound, Loader2, Sparkles, Terminal, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RECOMMENDED_SYSTEM_PROMPT, useAppContext } from '../AppContext';
import type { ProviderId } from '../types';
import AppLogo from './AppLogo';

const PROVIDERS: { id: ProviderId; name: string; command: string; description: string }[] = [
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    command: 'agy',
    description: 'Gemini, Claude und GPT-OSS über die Antigravity CLI.',
  },
  {
    id: 'openai',
    name: 'OpenAI Codex',
    command: 'codex',
    description: 'Codex arbeitet nicht-interaktiv direkt im Projektordner.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    command: 'claude',
    description: 'Claude Code mit konfigurierbarem Modell und Zugriffsmodus.',
  },
];

export default function SetupModal() {
  const {
    provider,
    setProvider,
    cliStatus,
    refreshCliStatus,
    selectedProject,
    addProject,
    setHasSetupCompleted,
    apiKeys,
    setApiKey,
    systemPrompt,
    setSystemPrompt,
    useRecommendedSystemPrompt,
    generateSystemPrompt,
  } = useAppContext();
  const [checking, setChecking] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState('');

  useEffect(() => {
    setChecking(true);
    refreshCliStatus().finally(() => setChecking(false));
  }, [refreshCliStatus]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[120] flex items-center justify-center p-5">
      <div className="w-full max-w-3xl bg-[#141214] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <AppLogo className="w-9 h-9" />
          </div>
          <h2 className="text-2xl text-white font-semibold mt-5">CodeForge einrichten</h2>
          <p className="text-sm text-zinc-500 mt-2">
            Wähle eine lokale Agent-CLI und den Projektordner, in dem sie arbeiten soll.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-8">
          {PROVIDERS.map((item) => {
            const status = cliStatus[item.id];
            return (
              <button
                key={item.id}
                onClick={() => setProvider(item.id)}
                className={`relative text-left p-4 rounded-xl border transition-colors ${
                  provider === item.id ? 'border-white/30 bg-white/[0.06]' : 'border-white/5 hover:border-white/15'
                }`}
              >
                {provider === item.id && (
                  <div className="absolute top-2 right-2 bg-white text-black rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="text-sm text-white font-medium">{item.name}</div>
                <div className="text-[10px] text-zinc-600 font-mono mt-1">{item.command}</div>
                <p className="text-[11px] leading-4 text-zinc-500 mt-3">{item.description}</p>
                <div className={`flex items-center gap-1.5 text-[10px] mt-4 ${status.installed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {checking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : status.installed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {checking ? 'Prüfe...' : status.installed ? status.version || 'Installiert' : 'Nicht gefunden'}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={addProject}
          className="mt-5 w-full panel !p-4 flex items-center gap-3 text-left hover:border-white/20"
        >
          <FolderOpen className="w-5 h-5 text-amber-400/70" />
          <div className="min-w-0">
            <div className="text-sm text-white">{selectedProject?.title || 'Projektordner auswählen'}</div>
            <div className="text-[11px] text-zinc-600 truncate">
              {selectedProject?.path || 'Dieser Ordner wird als Arbeitsverzeichnis des Agenten verwendet.'}
            </div>
          </div>
        </button>

        {!cliStatus[provider].installed && (
          <div className="mt-4 text-xs text-amber-300/80 bg-amber-500/[0.06] border border-amber-500/10 rounded-lg px-3 py-2">
            Die gewählte CLI fehlt noch. Du kannst die App einrichten, aber Agent-Aufrufe funktionieren erst nach der Installation.
          </div>
        )}

        <div className="grid grid-cols-[0.8fr_1.2fr] gap-4 mt-5">
          <div className="panel !p-4">
            <div className="flex items-center gap-2 section-label">
              <KeyRound className="w-3.5 h-3.5" />
              API-Key
            </div>
            <input
              type="password"
              value={apiKeys[provider] || ''}
              onChange={(event) => setApiKey(provider, event.target.value)}
              className="input w-full mt-3"
              placeholder={`${PROVIDERS.find((item) => item.id === provider)?.name} API-Key`}
              autoComplete="off"
            />
            <p className="text-[11px] leading-4 text-zinc-600 mt-2">
              Wird nur fuer den gewaehlten CLI-Prozess als Umgebungsvariable gesetzt.
            </p>
          </div>

          <div className="panel !p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="section-label">System-Prompt</div>
              <div className="flex gap-2">
                <button
                  onClick={useRecommendedSystemPrompt}
                  className="text-[11px] text-amber-300 hover:text-amber-200"
                  title={RECOMMENDED_SYSTEM_PROMPT}
                >
                  Empfohlen
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
                  AI generieren
                </button>
              </div>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="input w-full mt-3 min-h-24 resize-none"
              placeholder="Lege fest, wie der Agent grundsaetzlich arbeiten soll."
            />
            {promptError && <div className="text-[11px] text-red-400 mt-2">{promptError}</div>}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setHasSetupCompleted(true)}
            disabled={!selectedProject}
            className="primary-button !px-6 !py-2.5"
          >
            Einrichtung abschließen
          </button>
        </div>
      </div>
    </div>
  );
}
