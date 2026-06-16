import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AccessMode,
  AgentRunStats,
  ApiKeys,
  Automation,
  Chat,
  CliStatus,
  GitInfo,
  Message,
  ProjectFolder,
  ProviderId,
  UsageRecord,
  UsageState,
} from './types';

export type Theme =
  | 'modern-dark'
  | 'classic-light'
  | 'deep-galactic'
  | 'muted-earth'
  | 'neon-cyber';
export type MainView = 'chat' | 'plugins' | 'automations' | 'usage';

export const PROVIDER_MODELS: Record<ProviderId, { id: string; name: string }[]> = {
  antigravity: [
    { id: 'Gemini 3.5 Flash (Medium)', name: 'Gemini 3.5 Flash Medium' },
    { id: 'Gemini 3.5 Flash (High)', name: 'Gemini 3.5 Flash High' },
    { id: 'Gemini 3.5 Flash (Low)', name: 'Gemini 3.5 Flash Low' },
    { id: 'Gemini 3.1 Pro (High)', name: 'Gemini 3.1 Pro High' },
    { id: 'Gemini 3.1 Pro (Low)', name: 'Gemini 3.1 Pro Low' },
    { id: 'Claude Sonnet 4.6 (Thinking)', name: 'Claude Sonnet 4.6 Thinking' },
    { id: 'Claude Opus 4.6 (Thinking)', name: 'Claude Opus 4.6 Thinking' },
    { id: 'GPT-OSS 120B (Medium)', name: 'GPT-OSS 120B Medium' },
  ],
  openai: [
    { id: 'gpt-5.5', name: 'GPT-5.5' },
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
  ],
  anthropic: [
    { id: 'sonnet', name: 'Claude Sonnet' },
    { id: 'opus', name: 'Claude Opus' },
    { id: 'haiku', name: 'Claude Haiku' },
    { id: 'fable', name: 'Claude Fable' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  ],
};

const DEFAULT_MODEL: Record<ProviderId, string> = {
  antigravity: PROVIDER_MODELS.antigravity[0].id,
  openai: PROVIDER_MODELS.openai[0].id,
  anthropic: PROVIDER_MODELS.anthropic[0].id,
};

const EMPTY_STATUS: CliStatus = {
  antigravity: { installed: false, executable: '', version: '' },
  openai: { installed: false, executable: '', version: '' },
  anthropic: { installed: false, executable: '', version: '' },
};

const EMPTY_USAGE: UsageState = {
  tokenLimit: 0,
  totalTokens: 0,
  records: [],
};

const STORAGE_PREFIX = 'agentWorkspace';

export const RECOMMENDED_SYSTEM_PROMPT =
  'Du bist ein sorgfaeltiger Coding-Agent im lokalen Projekt. Arbeite in kleinen, nachvollziehbaren Schritten, lies vorhandene Patterns zuerst, veraendere nur relevante Dateien, schuetze bestehende Nutzerarbeit und pruefe deine Aenderungen mit passenden Tests oder Builds. Antworte knapp, ehrlich und mit konkreten Ergebnissen.';

interface AppContextType {
  folders: ProjectFolder[];
  chats: Chat[];
  automations: Automation[];
  plugins: string[];
  usage: UsageState;
  selectedChatId: string | null;
  selectedFolderId: string | null;
  selectedProject: ProjectFolder | null;
  provider: ProviderId;
  aiModel: string;
  accessMode: AccessMode;
  apiKeys: ApiKeys;
  systemPrompt: string;
  theme: Theme;
  mainView: MainView;
  hasSetupCompleted: boolean;
  isSending: boolean;
  activeRunId: string | null;
  runStats: AgentRunStats | null;
  attachments: string[];
  cliStatus: CliStatus;
  gitInfo: GitInfo;
  branches: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  setProvider(provider: ProviderId): void;
  setAiModel(model: string): void;
  setAccessMode(mode: AccessMode): void;
  setTokenLimit(limit: number): void;
  resetUsage(): void;
  setApiKey(provider: ProviderId, key: string): void;
  setSystemPrompt(prompt: string): void;
  useRecommendedSystemPrompt(): void;
  generateSystemPrompt(): Promise<string>;
  setTheme(theme: Theme): void;
  setMainView(view: MainView): void;
  setHasSetupCompleted(value: boolean): void;
  selectChat(id: string | null): void;
  selectFolder(id: string): void;
  addProject(): Promise<void>;
  renameProject(id: string, title: string): void;
  deleteProject(id: string): void;
  sendMessage(text: string): Promise<void>;
  cancelRun(): Promise<void>;
  addAttachments(): Promise<void>;
  removeAttachment(path: string): void;
  refreshCliStatus(): Promise<void>;
  refreshGit(): Promise<void>;
  switchBranch(branch: string): Promise<void>;
  installPlugin(name: string): Promise<void>;
  removePlugin(name: string): Promise<void>;
  addAutomation(input: Omit<Automation, 'id' | 'lastRun'>): void;
  toggleAutomation(id: string): void;
  deleteAutomation(id: string): void;
  runAutomation(id: string): Promise<void>;
  navigateBack(): void;
  navigateForward(): void;
  clearChat(): void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const currentKey = `${STORAGE_PREFIX}.${key}`;
    const value = localStorage.getItem(currentKey);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  localStorage.setItem(`${STORAGE_PREFIX}.${key}`, JSON.stringify(value));
}

function projectName(projectPath: string) {
  return projectPath.split(/[\\/]/).filter(Boolean).at(-1) || projectPath;
}

function newId() {
  return crypto.randomUUID();
}

function parseTokenUsage(output: string) {
  const match =
    output.match(/^tokens used\s*\n\s*([0-9][0-9.,]*)/im) ||
    output.match(/\btokens used\s+([0-9][0-9.,]*)/i);
  if (!match) return 0;
  const raw = match[1].trim();
  if (/,\d{1,2}$/.test(raw)) return Math.round(Number(raw.replace(/\./g, '').replace(',', '.')));
  return Number(raw.replace(/[.,]/g, '')) || 0;
}

function formatDurationForNotification(ms: number) {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<ProjectFolder[]>(() => readStorage('folders', []));
  const [chats, setChats] = useState<Chat[]>(() => readStorage('chats', []));
  const [automations, setAutomations] = useState<Automation[]>(() =>
    readStorage('automations', []),
  );
  const [plugins, setPlugins] = useState<string[]>(() => readStorage('plugins', []));
  const [usage, setUsage] = useState<UsageState>(() =>
    readStorage<UsageState>('usage', EMPTY_USAGE),
  );
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() =>
    readStorage<string | null>('selectedFolder', null),
  );
  const [provider, setProviderState] = useState<ProviderId>(() =>
    readStorage<ProviderId>('provider', 'antigravity'),
  );
  const [aiModel, setAiModelState] = useState(() =>
    readStorage('model', DEFAULT_MODEL.antigravity),
  );
  const [accessMode, setAccessModeState] = useState<AccessMode>(() =>
    readStorage<AccessMode>('access', 'workspace-write'),
  );
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => readStorage<ApiKeys>('apiKeys', {}));
  const [systemPrompt, setSystemPromptState] = useState(() =>
    readStorage('systemPrompt', RECOMMENDED_SYSTEM_PROMPT),
  );
  const [theme, setThemeState] = useState<Theme>(() =>
    readStorage<Theme>('theme', 'modern-dark'),
  );
  const [mainView, setMainView] = useState<MainView>('chat');
  const [hasSetupCompleted, setHasSetupCompletedState] = useState(
    () => readStorage('setup', false),
  );
  const [isSending, setIsSending] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStats, setRunStats] = useState<AgentRunStats | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [cliStatus, setCliStatus] = useState<CliStatus>(EMPTY_STATUS);
  const [gitInfo, setGitInfo] = useState<GitInfo>({
    isRepository: false,
    branch: '',
    root: '',
  });
  const [branches, setBranches] = useState<string[]>([]);
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyNavigation = useRef(false);

  const selectedProject =
    folders.find((folder) => folder.id === selectedFolderId) || folders[0] || null;

  useEffect(() => writeStorage('folders', folders), [folders]);
  useEffect(() => writeStorage('chats', chats), [chats]);
  useEffect(
    () => writeStorage('automations', automations),
    [automations],
  );
  useEffect(() => writeStorage('plugins', plugins), [plugins]);
  useEffect(() => writeStorage('usage', usage), [usage]);
  useEffect(
    () => writeStorage('selectedFolder', selectedFolderId),
    [selectedFolderId],
  );

  useEffect(() => {
    if (!selectedFolderId && folders[0]) setSelectedFolderId(folders[0].id);
  }, [folders, selectedFolderId]);

  const refreshCliStatus = useCallback(async () => {
    if (!window.agentWorkspace) return;
    setCliStatus(await window.agentWorkspace.getSystemStatus());
  }, []);

  const refreshGit = useCallback(async () => {
    if (!window.agentWorkspace || !selectedProject) {
      setGitInfo({ isRepository: false, branch: '', root: '' });
      setBranches([]);
      return;
    }
    const [info, branchList] = await Promise.all([
      window.agentWorkspace.getGitInfo(selectedProject.path),
      window.agentWorkspace.getBranches(selectedProject.path),
    ]);
    setGitInfo(info);
    setBranches(branchList);
  }, [selectedProject?.path]);

  useEffect(() => {
    refreshCliStatus();
  }, [refreshCliStatus]);

  useEffect(() => {
    refreshGit();
  }, [refreshGit]);

  useEffect(() => {
    if (!window.agentWorkspace?.onAgentOutput) return;
    return window.agentWorkspace.onAgentOutput(({ runId, chunk }) => {
      setRunStats((current) => {
        if (!current || current.runId !== runId) return current;
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        const fileMatches =
          chunk.match(/[\w./\\-]+\.(?:ts|tsx|js|jsx|json|css|html|md|cjs|mjs|py|yml|yaml)/gi) || [];
        const codeSignals =
          (chunk.match(/\b(edit|patch|write|update|modify|create|build|compile|lint|diff|file)\b/gi) || [])
            .length;
        const testSignals =
          (chunk.match(/\b(test|spec|lint|tsc|vite|passed|failed|build)\b/gi) || []).length;
        const lastOutput = lines.at(-1)?.trim() || chunk.trim() || current.lastOutput;
        const phase =
          testSignals > 0
            ? 'Prueft Ergebnis'
            : codeSignals > 0
              ? 'Codet im Projekt'
              : current.outputLines === 0
                ? 'Startet Agent'
                : 'Analysiert Kontext';

        return {
          ...current,
          outputLines: current.outputLines + lines.length,
          outputBytes: current.outputBytes + chunk.length,
          codeSignals: current.codeSignals + codeSignals,
          testSignals: current.testSignals + testSignals,
          files: [...new Set([...current.files, ...fileMatches])].slice(0, 12),
          lastOutput,
          liveOutput: `${current.liveOutput}${chunk}`,
          phase,
        };
      });
    });
  }, []);

  const setProvider = (nextProvider: ProviderId) => {
    setProviderState(nextProvider);
    setAiModelState(DEFAULT_MODEL[nextProvider]);
    writeStorage('provider', nextProvider);
    writeStorage('model', DEFAULT_MODEL[nextProvider]);
  };

  const setAiModel = (model: string) => {
    setAiModelState(model);
    writeStorage('model', model);
  };

  const setAccessMode = (mode: AccessMode) => {
    setAccessModeState(mode);
    writeStorage('access', mode);
  };

  const setTokenLimit = (limit: number) => {
    setUsage((current) => ({
      ...current,
      tokenLimit: Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0,
    }));
  };

  const resetUsage = () => {
    setUsage((current) => ({ ...current, totalTokens: 0, records: [] }));
  };

  const setApiKey = (keyProvider: ProviderId, key: string) => {
    setApiKeys((current) => {
      const next = { ...current, [keyProvider]: key };
      writeStorage('apiKeys', next);
      return next;
    });
  };

  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
    writeStorage('systemPrompt', prompt);
  };

  const useRecommendedSystemPrompt = () => {
    setSystemPrompt(RECOMMENDED_SYSTEM_PROMPT);
  };

  const generateSystemPrompt = async () => {
    if (!window.agentWorkspace) throw new Error('Diese Funktion ist nur in der Desktop-App verfuegbar.');
    if (!selectedProject) throw new Error('Waehle zuerst einen Projektordner.');
    const result = await window.agentWorkspace.generateSystemPrompt({
      provider,
      model: aiModel,
      access: accessMode,
      apiKeys,
      projectPath: selectedProject.path,
    });
    if (!result.ok) {
      throw new Error(result.error || result.output || 'System-Prompt konnte nicht generiert werden.');
    }
    const generatedPrompt = result.output.trim();
    setSystemPrompt(generatedPrompt);
    return generatedPrompt;
  };

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    writeStorage('theme', nextTheme);
  };

  const setHasSetupCompleted = (value: boolean) => {
    setHasSetupCompletedState(value);
    writeStorage('setup', value);
  };

  const selectChat = (id: string | null) => {
    setSelectedChatId(id);
    setMainView('chat');
    if (!historyNavigation.current) {
      setHistory((current) => [...current.slice(0, historyIndex + 1), id]);
      setHistoryIndex((index) => index + 1);
    }
    historyNavigation.current = false;
    const chat = chats.find((item) => item.id === id);
    if (chat) setSelectedFolderId(chat.folderId);
  };

  const selectFolder = (id: string) => {
    setSelectedFolderId(id);
    setSelectedChatId(null);
    setMainView('chat');
  };

  const addProject = async () => {
    const selectedPath = await window.agentWorkspace?.selectProjectFolder();
    if (!selectedPath) return;
    const existing = folders.find((folder) => folder.path === selectedPath);
    if (existing) {
      selectFolder(existing.id);
      return;
    }
    const folder = { id: newId(), title: projectName(selectedPath), path: selectedPath };
    setFolders((current) => [...current, folder]);
    setSelectedFolderId(folder.id);
    setSelectedChatId(null);
  };

  const renameProject = (id: string, title: string) => {
    setFolders((current) =>
      current.map((folder) => (folder.id === id ? { ...folder, title } : folder)),
    );
  };

  const deleteProject = (id: string) => {
    setFolders((current) => current.filter((folder) => folder.id !== id));
    setChats((current) => current.filter((chat) => chat.folderId !== id));
    if (selectedFolderId === id) {
      const next = folders.find((folder) => folder.id !== id);
      setSelectedFolderId(next?.id || null);
      setSelectedChatId(null);
    }
  };

  const sendMessage = async (text: string, forceNewChat = false) => {
    if (!window.agentWorkspace) throw new Error('Diese Funktion ist nur in der Desktop-App verfügbar.');
    if (!selectedProject) throw new Error('Wähle zuerst einen Projektordner.');
    if (isSending) return;

    const targetId = !forceNewChat && selectedChatId ? selectedChatId : newId();
    const existingChat = chats.find((chat) => chat.id === targetId);
    const userMessage: Message = {
      id: newId(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    };
    const nextChat: Chat =
      existingChat || {
        id: targetId,
        title: text.length > 42 ? `${text.slice(0, 42)}...` : text,
        updatedAt: Date.now(),
        folderId: selectedProject.id,
        messages: [],
      };
    const updatedChat = {
      ...nextChat,
      updatedAt: Date.now(),
      messages: [...nextChat.messages, userMessage],
    };

    setChats((current) => [
      updatedChat,
      ...current.filter((chat) => chat.id !== targetId),
    ]);
    if (forceNewChat || !selectedChatId) selectChat(targetId);
    setIsSending(true);
    const runId = newId();
    const runStartedAt = Date.now();
    setActiveRunId(runId);
    setRunStats({
      runId,
      provider,
      model: aiModel,
      startedAt: runStartedAt,
      outputLines: 0,
      outputBytes: 0,
      codeSignals: 0,
      testSignals: 0,
      files: [],
      lastOutput: 'Agent wird gestartet...',
      liveOutput: '',
      phase: 'Startet Agent',
    });

    const context = updatedChat.messages
      .slice(-12)
      .map((message) => `${message.sender === 'user' ? 'Nutzer' : 'Assistent'}: ${message.text}`)
      .join('\n\n');
    const prompt =
      updatedChat.messages.length > 1
        ? `Setze diese Unterhaltung fort:\n\n${context}\n\nBearbeite die letzte Nutzeranfrage im Projektordner.`
        : text;

    try {
      const result = await window.agentWorkspace.runAgent({
        runId,
        provider,
        model: aiModel,
        access: accessMode,
        apiKeys,
        systemPrompt,
        prompt,
        projectPath: selectedProject.path,
        attachments,
      });
      const tokenUsage = parseTokenUsage(result.output || result.error || '');
      const durationMs = Date.now() - runStartedAt;
      const reply: Message = {
        id: newId(),
        text: result.ok
          ? result.output || 'Der Agent wurde ohne Textausgabe beendet.'
          : result.error || result.output || 'Der Agent-Aufruf ist fehlgeschlagen.',
        sender: 'ai',
        timestamp: Date.now(),
        runDurationMs: durationMs,
        tokenUsage: tokenUsage || undefined,
        isError: !result.ok,
      };
      void window.agentWorkspace.notifyAgentComplete({
        title: result.ok ? 'CodeForge: Aufgabe erledigt' : 'CodeForge: Aufgabe fehlgeschlagen',
        body: `${updatedChat.title} - ${formatDurationForNotification(durationMs)}`,
      });
      if (tokenUsage > 0) {
        const record: UsageRecord = {
          id: newId(),
          provider,
          model: aiModel,
          tokens: tokenUsage,
          timestamp: Date.now(),
          chatId: targetId,
          title: updatedChat.title,
        };
        setUsage((current) => ({
          ...current,
          totalTokens: current.totalTokens + tokenUsage,
          records: [record, ...current.records].slice(0, 250),
        }));
      }
      setChats((current) =>
        current.map((chat) =>
          chat.id === targetId
            ? { ...chat, updatedAt: Date.now(), messages: [...chat.messages, reply] }
            : chat,
        ),
      );
      setAttachments([]);
    } catch (error) {
      const reply: Message = {
        id: newId(),
        text: error instanceof Error ? error.message : 'Unbekannter Fehler beim Agent-Aufruf.',
        sender: 'system',
        timestamp: Date.now(),
        isError: true,
      };
      void window.agentWorkspace.notifyAgentComplete({
        title: 'CodeForge: Aufgabe fehlgeschlagen',
        body: error instanceof Error ? error.message : 'Unbekannter Fehler beim Agent-Aufruf.',
      });
      setChats((current) =>
        current.map((chat) =>
          chat.id === targetId ? { ...chat, messages: [...chat.messages, reply] } : chat,
        ),
      );
    } finally {
      setIsSending(false);
      setActiveRunId(null);
      setRunStats(null);
    }
  };

  const cancelRun = async () => {
    if (!activeRunId) return;
    await window.agentWorkspace?.cancelAgent(activeRunId);
  };

  const addAttachments = async () => {
    const files = (await window.agentWorkspace?.selectAttachments()) || [];
    setAttachments((current) => [...new Set([...current, ...files])]);
  };

  const switchBranch = async (branch: string) => {
    if (!selectedProject || !window.agentWorkspace) return;
    const result = await window.agentWorkspace.switchBranch(selectedProject.path, branch);
    if (!result.ok) throw new Error(result.error);
    await refreshGit();
  };

  const installPlugin = async (name: string) => {
    if (!selectedProject || !window.agentWorkspace) throw new Error('Wähle zuerst ein Projekt.');
    await window.agentWorkspace.installPlugin(selectedProject.path, name);
    setPlugins((current) => [...new Set([...current, name])]);
  };

  const removePlugin = async (name: string) => {
    if (!selectedProject || !window.agentWorkspace) return;
    await window.agentWorkspace.removePlugin(selectedProject.path, name);
    setPlugins((current) => current.filter((plugin) => plugin !== name));
  };

  const addAutomation = (input: Omit<Automation, 'id' | 'lastRun'>) => {
    setAutomations((current) => [...current, { ...input, id: newId() }]);
  };
  const toggleAutomation = (id: string) => {
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  };
  const deleteAutomation = (id: string) => {
    setAutomations((current) => current.filter((item) => item.id !== id));
  };
  const runAutomation = async (id: string) => {
    const automation = automations.find((item) => item.id === id);
    if (!automation) return;
    setMainView('chat');
    await sendMessage(`[Automatisierung: ${automation.title}]\n${automation.prompt}`, true);
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, lastRun: Date.now() } : item)),
    );
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isSending || !selectedProject) return;
      const now = Date.now();
      const due = automations.find(
        (automation) =>
          automation.enabled &&
          (!automation.lastRun ||
            now - automation.lastRun >= automation.intervalMinutes * 60_000),
      );
      if (due) void runAutomation(due.id);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [automations, isSending, selectedProject, provider, aiModel, accessMode, apiKeys, systemPrompt]);

  const navigateBack = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    historyNavigation.current = true;
    setHistoryIndex(nextIndex);
    setSelectedChatId(history[nextIndex]);
  };
  const navigateForward = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    historyNavigation.current = true;
    setHistoryIndex(nextIndex);
    setSelectedChatId(history[nextIndex]);
  };

  const clearChat = () => {
    if (!selectedChatId) return;
    setChats((current) => current.filter((chat) => chat.id !== selectedChatId));
    selectChat(null);
  };

  const value = useMemo<AppContextType>(
    () => ({
      folders,
      chats,
      automations,
      plugins,
      usage,
      selectedChatId,
      selectedFolderId,
      selectedProject,
      provider,
      aiModel,
      accessMode,
      apiKeys,
      systemPrompt,
      theme,
      mainView,
      hasSetupCompleted,
      isSending,
      activeRunId,
      runStats,
      attachments,
      cliStatus,
      gitInfo,
      branches,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < history.length - 1,
      setProvider,
      setAiModel,
      setAccessMode,
      setTokenLimit,
      resetUsage,
      setApiKey,
      setSystemPrompt,
      useRecommendedSystemPrompt,
      generateSystemPrompt,
      setTheme,
      setMainView,
      setHasSetupCompleted,
      selectChat,
      selectFolder,
      addProject,
      renameProject,
      deleteProject,
      sendMessage,
      cancelRun,
      addAttachments,
      removeAttachment: (file) =>
        setAttachments((current) => current.filter((item) => item !== file)),
      refreshCliStatus,
      refreshGit,
      switchBranch,
      installPlugin,
      removePlugin,
      addAutomation,
      toggleAutomation,
      deleteAutomation,
      runAutomation,
      navigateBack,
      navigateForward,
      clearChat,
    }),
    [
      folders,
      chats,
      automations,
      plugins,
      usage,
      selectedChatId,
      selectedFolderId,
      selectedProject,
      provider,
      aiModel,
      accessMode,
      apiKeys,
      systemPrompt,
      theme,
      mainView,
      hasSetupCompleted,
      isSending,
      activeRunId,
      runStats,
      attachments,
      cliStatus,
      gitInfo,
      branches,
      history,
      historyIndex,
      refreshCliStatus,
      refreshGit,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
