import { Check, CheckCircle2, FolderOpen, Loader2, Terminal, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import type { ProviderId } from '../types';

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
  } = useAppContext();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setChecking(true);
    refreshCliStatus().finally(() => setChecking(false));
  }, [refreshCliStatus]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[120] flex items-center justify-center p-5">
      <div className="w-full max-w-3xl bg-[#141214] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-zinc-300" />
          </div>
          <h2 className="text-2xl text-white font-semibold mt-5">Agent Workspace einrichten</h2>
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
