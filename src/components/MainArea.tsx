import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Blocks,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Gauge,
  GitPullRequest,
  Loader2,
  Play,
  Plus,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import InputArea from './InputArea';
import type { Message } from '../types';

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
  if (mainView === 'usage') return <UsageView />;
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
              : 'CodeForge startet Antigravity, Codex oder Claude als lokalen Prozess im gewaehlten Ordner.'}
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
                className={`text-[14px] leading-6 ${
                  message.sender === 'user'
                    ? 'max-w-[88%] whitespace-pre-wrap bg-[#292629] border border-white/5 text-white px-4 py-3 rounded-2xl'
                    : message.isError
                      ? 'w-full bg-red-500/5 border border-red-500/15 text-red-300 px-4 py-3 rounded-xl'
                      : 'w-full text-zinc-300'
                }`}
              >
                {message.sender !== 'user' && (
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
                    <Bot className="w-3 h-3" />
                    {message.sender === 'system' ? 'System' : 'Agent'}
                  </div>
                )}
                <MessageContent message={message} />
              </div>
            </div>
          ))}
          {isSending && <RunStatus provider={provider} />}
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

function MessageContent({ message }: { message: Message }) {
  if (message.sender !== 'user') return <CodexMessage message={message} />;
  return <InlineMarkdown text={message.text} />;
}

function CodexMessage({ message }: { message: Message }) {
  const [showRaw, setShowRaw] = useState(false);
  const parsed = parseCodexOutput(message.text);
  const hasCodexBlocks = parsed.diffs.length > 0 || parsed.tokensUsed || message.runDurationMs;

  return (
    <div className="codex-message">
      {hasCodexBlocks && (
        <button
          type="button"
          onClick={() => setShowRaw((value) => !value)}
          className="mb-3 flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-300"
        >
          {message.runDurationMs ? `${formatDuration(message.runDurationMs)} lang gearbeitet` : 'Agent-Ausgabe'}
          {showRaw ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      )}

      {parsed.before && <InlineMarkdown text={parsed.before.trim()} />}

      {parsed.diffs.map((diff, index) => (
        <DiffBlock key={`${diff.file}-${index}`} diff={diff} />
      ))}

      {parsed.after && <InlineMarkdown text={parsed.after.trim()} />}

      {parsed.tokensUsed && (
        <div className="mt-4 border-t border-white/5 pt-3 text-[12px] text-zinc-500">
          <div className="uppercase tracking-wide text-zinc-700">tokens used</div>
          <div className="mt-1 font-mono text-zinc-300">{parsed.tokensUsed}</div>
        </div>
      )}

      {parsed.files.length > 0 && <ChangedFilesCard files={parsed.files} />}

      {showRaw && (
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 text-[11px] leading-5 text-zinc-400 custom-scrollbar whitespace-pre-wrap">
          {message.text}
        </pre>
      )}

      {!hasCodexBlocks && !parsed.before && !parsed.after && <InlineMarkdown text={message.text} />}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="message-content whitespace-pre-wrap">
      {parts.map((part, index) => {
        const fence = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
        if (fence) {
          return (
            <pre key={index} className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-3 text-[12px] leading-5 text-zinc-300">
              <code>{fence[2]}</code>
            </pre>
          );
        }
        return <span key={index}>{renderInline(part)}</span>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, label, target] = match;
    nodes.push(<SmartLink key={`${target}-${match.index}`} label={label} target={target} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function SmartLink({ label, target }: { label: string; target: string }) {
  const isWebUrl = /^https?:\/\//i.test(target);
  const open = async () => {
    if (isWebUrl) await window.agentWorkspace?.openExternal(target);
    else await window.agentWorkspace?.openPath(target);
  };

  return (
    <button
      type="button"
      onClick={open}
      title={target}
      className="inline-flex items-center gap-1 align-baseline text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:text-sky-200"
    >
      {isWebUrl ? <ExternalLink className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      {label}
    </button>
  );
}

type ParsedDiff = {
  file: string;
  text: string;
  additions: number;
  deletions: number;
};

function parseCodexOutput(text: string) {
  const normalized = text.replace(/\r\n/g, '\n');
  const tokenMatch =
    normalized.match(/^tokens used\s*\n\s*([0-9][0-9.,]*)/im) ||
    normalized.match(/tokens used\s+([0-9][0-9.,]*)/i);
  const withoutTokens = normalized
    .replace(/^tokens used\s*\n\s*[0-9][0-9.,]*\s*$/im, '')
    .replace(/\btokens used\s+[0-9][0-9.,]*/i, '')
    .trim();
  const firstDiffIndex = withoutTokens.search(/^diff --git /m);
  const before = firstDiffIndex >= 0 ? withoutTokens.slice(0, firstDiffIndex).trim() : withoutTokens;
  const diffText = firstDiffIndex >= 0 ? withoutTokens.slice(firstDiffIndex).trim() : '';
  const diffChunks = diffText
    ? diffText.split(/(?=^diff --git )/m).map((chunk) => chunk.trim()).filter(Boolean)
    : [];
  const diffs = diffChunks.map(parseDiffChunk);

  return {
    before: firstDiffIndex >= 0 ? before : withoutTokens,
    after: '',
    diffs,
    files: diffs.map((diff) => ({
      path: diff.file,
      additions: diff.additions,
      deletions: diff.deletions,
    })),
    tokensUsed: tokenMatch?.[1] || '',
  };
}

function parseDiffChunk(text: string): ParsedDiff {
  const lines = text.split('\n');
  const header = lines[0] || '';
  const file =
    header.match(/^diff --git a\/.+ b\/(.+)$/)?.[1] ||
    lines.find((line) => line.startsWith('+++ b/'))?.replace('+++ b/', '') ||
    lines.find((line) => line.startsWith('--- a/'))?.replace('--- a/', '') ||
    'diff';
  const additions = lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length;
  const deletions = lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length;
  return { file, text, additions, deletions };
}

function DiffBlock({ diff }: { diff: ParsedDiff }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(diff.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-white/10 bg-[#1d1d1f]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-4 h-4 text-sky-300" />
          <span className="truncate font-mono text-[12px] text-sky-300">{diff.file}</span>
          <span className="font-mono text-[11px] text-emerald-400">+{diff.additions}</span>
          <span className="font-mono text-[11px] text-red-400">-{diff.deletions}</span>
        </div>
        <button onClick={copy} className="p-1.5 text-zinc-500 hover:text-zinc-200" title="Diff kopieren">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="max-h-[460px] overflow-auto text-[12px] leading-5 custom-scrollbar">
        {diff.text.split('\n').map((line, index) => (
          <div key={index} className={diffLineClass(line)}>
            <span className="mr-3 inline-block w-8 select-none text-right text-zinc-600">{index + 1}</span>
            <span>{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function diffLineClass(line: string) {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return 'min-w-max bg-emerald-500/10 px-3 font-mono text-emerald-200';
  }
  if (line.startsWith('-') && !line.startsWith('---')) {
    return 'min-w-max bg-red-500/10 px-3 font-mono text-red-200';
  }
  if (line.startsWith('@@')) return 'min-w-max bg-sky-500/10 px-3 font-mono text-sky-300';
  if (/^(diff --git|index |new file mode|deleted file mode|--- |\+\+\+ )/.test(line)) {
    return 'min-w-max bg-black/20 px-3 font-mono text-zinc-400';
  }
  return 'min-w-max px-3 font-mono text-zinc-300';
}

function ChangedFilesCard({
  files,
}: {
  files: { path: string; additions: number; deletions: number }[];
}) {
  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg border border-white/10 bg-black/25 p-2">
            <GitPullRequest className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} bearbeitet
            </div>
            <div className="font-mono text-[12px]">
              <span className="text-emerald-400">+{totalAdditions}</span>
              <span className="mx-1 text-zinc-600"> </span>
              <span className="text-red-400">-{totalDeletions}</span>
            </div>
          </div>
        </div>
        <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
          Ueberpruefen
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {files.slice(0, 4).map((file) => (
          <div key={file.path} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
            <span className="truncate font-mono text-zinc-300">{file.path}</span>
            <span className="shrink-0 font-mono text-[12px]">
              <span className="text-emerald-400">+{file.additions}</span>
              <span className="mx-1 text-zinc-600"> </span>
              <span className="text-red-400">-{file.deletions}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function RunStatus({ provider }: { provider: ReturnType<typeof useAppContext>['provider'] }) {
  const { runStats } = useAppContext();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(runStats ? Math.max(0, Math.floor((Date.now() - runStats.startedAt) / 1000)) : 0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [runStats?.startedAt]);

  const providerName =
    provider === 'antigravity' ? 'Antigravity' : provider === 'openai' ? 'Codex' : 'Claude';
  const progressItems = buildProgressItems(runStats, providerName, elapsed);
  return (
    <div className="forge-feed">
      <div className="run-feed-visible forge-feed-visible">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-zinc-500">
          <span className="forge-feed-dot" />
          CodeForge Laufspur
        </div>
        {progressItems.map((item, index) =>
          item.kind === 'text' ? (
            <p key={`${item.text}-${index}`} className="text-[14px] leading-6 text-zinc-100">
              {item.text}
            </p>
          ) : (
            <div key={`${item.text}-${index}`} className="flex items-center gap-2 text-[13px] text-zinc-500">
              {item.icon === 'files' ? (
              <FileCode2 className="w-3.5 h-3.5 text-sky-300" />
              ) : item.icon === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
              <Terminal className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{item.text}</span>
            </div>
          ),
        )}
        <div className="flex items-center gap-2 text-[13px] text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
          <span>{providerName} arbeitet in CodeForge...</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-600 truncate">
              {runStats?.phase || 'Startet Agent'} · {elapsed}s · {runStats?.model || ''}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

type ProgressItem =
  | { kind: 'text'; text: string }
  | { kind: 'meta'; text: string; icon: 'terminal' | 'files' | 'done' };

function buildProgressItems(
  runStats: ReturnType<typeof useAppContext>['runStats'],
  providerName: string,
  elapsed: number,
): ProgressItem[] {
  const lines = extractReadableProgress(runStats?.liveOutput || '');
  const items: ProgressItem[] = [];
  const intro =
    runStats?.outputLines && lines[0]
      ? lines[0]
      : `${providerName} ist gestartet und sammelt Kontext im Projekt.`;

  items.push({ kind: 'text', text: intro });

  const commandCount = estimateCommandCount(runStats?.liveOutput || '', runStats?.testSignals || 0);
  if (commandCount > 0) {
    items.push({
      kind: 'meta',
      text: `${commandCount} ${commandCount === 1 ? 'Befehl' : 'Befehle'} ausgefuehrt`,
      icon: 'terminal',
    });
  }

  for (const line of lines.slice(1, 4)) {
    items.push({ kind: 'text', text: line });
  }

  if (runStats?.files.length) {
    const fileCount = runStats.files.length;
    items.push({
      kind: 'meta',
      text: `${fileCount} ${fileCount === 1 ? 'Datei' : 'Dateien'} erkannt`,
      icon: 'files',
    });
  }

  items.push({
    kind: 'meta',
    text: `${runStats?.phase || 'Startet Agent'}, ${formatDuration(elapsed * 1000)} aktiv`,
    icon: 'done',
  });

  return items.slice(-7);
}

function extractReadableProgress(output: string) {
  const ignored = /^(sandbox:|reasoning|reasoning summaries|session id:|--------|user$|codex$|npm |ps |dir |ls |cd |git |>|\+|-|@@|diff --git|index |--- |\+\+\+ |[{\]}])/i;
  return output
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && line.length <= 220)
    .filter((line) => !ignored.test(line))
    .filter((line) => /[a-zA-ZÄÖÜäöüß]/.test(line))
    .slice(-5);
}

function estimateCommandCount(output: string, testSignals: number) {
  const shellPrompts = (
    output.match(/(?:^|\n)(?:npm|pnpm|yarn|npx|git|node|powershell|cmd|python|tsc|vite)\b/gi) || []
  ).length;
  const executedMentions = output.match(/(\d+)\s+Befehle?\s+ausgef/i)?.[1];
  return Math.max(Number(executedMentions || 0), shellPrompts, Math.floor(testSignals / 2));
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
            Ueber CodeForge installiert ({plugins.length})
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
            {plugins.length === 0 && <div className="text-sm text-zinc-700">Noch keine Pakete ueber CodeForge installiert.</div>}
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
          subtitle="Agent-Aufgaben planen oder sofort ausfuehren, solange CodeForge geoeffnet ist."
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

function UsageView() {
  const { usage, setTokenLimit, resetUsage } = useAppContext();
  const remaining = usage.tokenLimit > 0 ? Math.max(0, usage.tokenLimit - usage.totalTokens) : null;
  const percent = usage.tokenLimit > 0 ? Math.min(100, (usage.totalTokens / usage.tokenLimit) * 100) : 0;

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <Header
          icon={Gauge}
          title="Nutzung"
          subtitle="Verbrauchte Tokens und verbleibendes lokal eingestelltes Nutzungslimit."
        />

        <section className="grid grid-cols-3 gap-3 mt-7">
          <UsageMetric label="Verbraucht" value={formatTokens(usage.totalTokens)} />
          <UsageMetric label="Limit" value={usage.tokenLimit ? formatTokens(usage.tokenLimit) : 'Nicht gesetzt'} />
          <UsageMetric label="Verbleibend" value={remaining === null ? 'Unbekannt' : formatTokens(remaining)} />
        </section>

        <section className="panel mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Nutzungslimit</div>
              <div className="text-xs text-zinc-600 mt-1">
                Das echte Provider-Limit wird von den CLIs nicht einheitlich geliefert. Dieses Limit dient als lokaler Zaehler.
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={usage.tokenLimit || ''}
              onChange={(event) => setTokenLimit(Number(event.target.value))}
              placeholder="z.B. 200000"
              className="input w-40"
            />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-zinc-600">
            <span>{usage.tokenLimit ? `${Math.round(percent)}% genutzt` : 'Limit setzen, um verbleibende Tokens zu sehen'}</span>
            <button onClick={resetUsage} className="text-zinc-500 hover:text-red-300">Zaehler zuruecksetzen</button>
          </div>
        </section>

        <section className="mt-7">
          <div className="section-label mb-3">Letzte Agent-Laeufe</div>
          <div className="overflow-hidden rounded-lg border border-white/10">
            {usage.records.length > 0 ? (
              usage.records.map((record) => (
                <div key={record.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/5 px-3 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-zinc-200">{record.title}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-600">
                      {record.provider} · {record.model} · {new Date(record.timestamp).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-zinc-300">{formatTokens(record.tokens)}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-zinc-600">
                Noch keine Token-Daten. Sie erscheinen, sobald die Agent-Ausgabe `tokens used` enthaelt.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function UsageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel !p-4">
      <div className="section-label">{label}</div>
      <div className="mt-2 font-mono text-lg text-white">{value}</div>
    </div>
  );
}

function formatTokens(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
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
