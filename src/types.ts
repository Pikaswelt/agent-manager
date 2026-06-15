export type ProviderId = 'antigravity' | 'openai' | 'anthropic';
export type AccessMode = 'read-only' | 'workspace-write' | 'full';

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  isError?: boolean;
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
  prompt: string;
  projectPath: string;
  attachments: string[];
};

export type AgentResult = {
  ok: boolean;
  output: string;
  error: string;
  exitCode: number;
};
