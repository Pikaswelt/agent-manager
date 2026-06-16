export type ProviderId = 'antigravity' | 'openai' | 'anthropic';
export type AccessMode = 'read-only' | 'workspace-write' | 'full';
export type ApiKeys = Partial<Record<ProviderId, string>>;

export type UsageRecord = {
  id: string;
  provider: ProviderId;
  model: string;
  tokens: number;
  timestamp: number;
  chatId: string;
  title: string;
};

export type UsageState = {
  tokenLimit: number;
  totalTokens: number;
  records: UsageRecord[];
};

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  isError?: boolean;
  runDurationMs?: number;
  tokenUsage?: number;
};

export type Chat = {
  id: string;
  title: string;
  updatedAt: number;
  folderId: string;
  messages: Message[];
};

export type ProjectFolder = {
  id: string;
  title: string;
  path: string;
};

export type Automation = {
  id: string;
  title: string;
  prompt: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun?: number;
};

export type AgentRunStats = {
  runId: string;
  provider: ProviderId;
  model: string;
  startedAt: number;
  outputLines: number;
  outputBytes: number;
  codeSignals: number;
  testSignals: number;
  files: string[];
  lastOutput: string;
  liveOutput: string;
  phase: string;
};

export type CliStatus = Record<
  ProviderId,
  { installed: boolean; executable: string; version: string }
>;

export type GitInfo = {
  isRepository: boolean;
  branch: string;
  root: string;
};

export type AgentRequest = {
  runId: string;
  provider: ProviderId;
  model: string;
  access: AccessMode;
  apiKeys: ApiKeys;
  systemPrompt: string;
  prompt: string;
  projectPath: string;
  attachments: string[];
};

export type SystemPromptRequest = {
  provider: ProviderId;
  model: string;
  access: AccessMode;
  apiKeys: ApiKeys;
  projectPath: string;
};

export type AgentResult = {
  ok: boolean;
  output: string;
  error: string;
  exitCode: number;
};
