import { useEffect, useRef, useState } from 'react';
import {
  Blocks,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import InputArea from './InputArea';

const PHRASES = [
  'Was wollen wir entwickeln?',
  'Was steht heute an?',
  'Lass uns dein Projekt verbessern.',
  'Welcher Agent soll übernehmen?',
];

export default function MainArea() {
  const { mainView } = useAppContext();
  if (mainView === 'plugins') return <PluginsView />;
  if (mainView === 'automations') return <AutomationsView />;
  return <ChatView />;
}

function ChatView() {
  const { chats, selectedChatId, selectedProject, isSending, provider } = useAppContext();
  const [phrase, setPhrase] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  useEffect(() => {
    const timer = window.setInterval(() => setPhrase((value) => (value + 1) % PHRASES.length), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages.length, isSending]);

  if (!selectedChat) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[760px] flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-6">
            <Terminal className="w-6 h-6 text-zinc-400" />
          </div>
          <h1 className="text-3xl text-white font-medium text-center tracking-tight">
            {selectedProject ? PHRASES[phrase] : 'Öffne einen Projektordner'}
          </h1>
          <p className="text-sm text-zinc-600 mt-3 text-center max-w-lg">
            {selectedProject
              ? `Agenten arbeiten direkt in ${selectedProject.path}`
              : 'Agent Workspace startet Antigravity, Codex oder Claude als lokalen Prozess im gewählten Ordner.'}
          </p>
          <InputArea />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8">
        <div className="max-w-[760px] mx-auto flex flex-col gap-6">
          <div className="pb-4 border-b border-white/5">
            <h2 className="text-lg text-white font-medium">{selectedChat.title}</h2>
            <p className="text-[11px] text-zinc-600 mt-1">{selectedProject?.path}</p>
          </div>
          {selectedChat.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap text-[14px] leading-6 ${
                  message.sender === 'user'
                    ? 'bg-[#292629] border border-white/5 text-white px-4 py-3 rounded-2xl'
                    : message.isError
                      ? 'bg-red-500/5 border border-red-500/15 text-red-300 px-4 py-3 rounded-xl'
                      : 'text-zinc-300'
                }`}
              >
                {message.sender !== 'user' && (
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
                    <Bot className="w-3 h-3" />
                    {message.sender === 'system' ? 'System' : 'Agent'}
                  </div>
                )}
                {message.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              {provider === 'antigravity'
                ? 'Antigravity arbeitet im Projekt...'
                : provider === 'openai'
                  ? 'Codex arbeitet im Projekt...'
                  : 'Claude arbeitet im Projekt...'}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="shrink-0 px-8 pb-5 pt-2 bg-gradient-to-t from-[#111] via-[#111] to-transparent">
        <div className="mx-auto max-w-[760px]">
          <InputArea />
        </div>
      </div>
    </main>
  );
}

function PluginsView() {
  const { plugins, installPlugin, removePlugin, selectedProject } = useAppContext();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const install = async () => {
    if (!name.trim()) return;
    setBusy(name.trim());
    setNotice('');
    try {
      await installPlugin(name.trim());
      setNotice(`${name.trim()} wurde im Projekt installiert.`);
      setName('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Installation fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar px-8 py-10">
      <div className="max-w-2xl mx-auto">
        <Header icon={Blocks} title="Projekt-Plugins" subtitle="npm-Pakete im aktiven Projekt installieren und entfernen." />
        <section className="panel mt-7">
          <div className="text-sm text-white font-medium">npm-Paket installieren</div>
          <div className="text-xs text-zinc-600 mt-1">
            Ziel: {selectedProject?.path || 'Kein Projekt ausgewählt'}
          </div>
          <div className="flex gap-2 mt-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && install()}
              placeholder="z.B. zod oder @scope/package"
              className="input flex-1"
            />
            <button disabled={!name.trim() || !!busy || !selectedProject} onClick={install} className="primary-button">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Installieren
            </button>
          </div>
          {notice && <div className="text-xs text-zinc-400 mt-3">{notice}</div>}
        </section>
        <section className="mt-7">
          <div className="text-xs text-zinc-600 uppercase tracking-wider mb-3">
            Über Agent Workspace installiert ({plugins.length})
          </div>
          <div className="space-y-2">
            {plugins.map((plugin) => (
              <div key={plugin} className="panel !p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-200">{plugin}</span>
                </div>
                <button
                  onClick={async () => {
                    setBusy(plugin);
                    try {
                      await removePlugin(plugin);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  disabled={!!busy}
                  className="p-2 text-zinc-600 hover:text-red-400"
                  title="Deinstallieren"
                >
                  {busy === plugin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
            {plugins.length === 0 && <div className="text-sm text-zinc-700">Noch keine Pakete über Agent Workspace installiert.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function AutomationsView() {
  const { automations, addAutomation, toggleAutomation, deleteAutomation, runAutomation, isSending } =
    useAppContext();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar px-8 py-10">
      <div className="max-w-2xl mx-auto">
        <Header
          icon={Clock}
          title="Automatisierungen"
          subtitle="Agent-Aufgaben planen oder sofort ausführen, solange Agent Workspace geöffnet ist."
        />
        <section className="panel mt-7 grid gap-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" placeholder="Name der Automatisierung" />
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="input min-h-24 resize-y" placeholder="Aufgabe für den Agenten..." />
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500">Intervall in Minuten</label>
            <input
              type="number"
              min={5}
              value={intervalMinutes}
              onChange={(event) => setIntervalMinutes(Math.max(5, Number(event.target.value)))}
              className="input w-28"
            />
            <button
              onClick={() => {
                if (!title.trim() || !prompt.trim()) return;
                addAutomation({ title: title.trim(), prompt: prompt.trim(), intervalMinutes, enabled: false });
                setTitle('');
                setPrompt('');
              }}
              disabled={!title.trim() || !prompt.trim()}
              className="primary-button ml-auto"
            >
              <Plus className="w-4 h-4" />
              Anlegen
            </button>
          </div>
        </section>
        <div className="space-y-2 mt-7">
          {automations.map((automation) => (
            <div key={automation.id} className="panel !p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-white font-medium">{automation.title}</div>
                  <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{automation.prompt}</div>
                  <div className="text-[10px] text-zinc-700 mt-2">
                    Intervall: {automation.intervalMinutes} Min.
                    {automation.lastRun ? ` · Zuletzt ${new Date(automation.lastRun).toLocaleString('de-DE')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAutomation(automation.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] ${
                      automation.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-500'
                    }`}
                    title="Aktivstatus umschalten"
                  >
                    {automation.enabled ? 'Aktiv' : 'Pausiert'}
                  </button>
                  <button
                    onClick={() => runAutomation(automation.id)}
                    disabled={isSending}
                    className="p-2 text-zinc-500 hover:text-white"
                    title="Jetzt ausführen"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAutomation(automation.id)} className="p-2 text-zinc-600 hover:text-red-400" title="Löschen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {automations.length === 0 && <div className="text-sm text-zinc-700">Noch keine Automatisierungen angelegt.</div>}
        </div>
      </div>
    </main>
  );
}

function Header({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Blocks;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-6 border-b border-white/5">
      <div className="p-2.5 bg-white/5 rounded-xl">
        <Icon className="w-5 h-5 text-zinc-300" />
      </div>
      <div>
        <h2 className="text-xl text-white font-semibold">{title}</h2>
        <p className="text-sm text-zinc-600 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
