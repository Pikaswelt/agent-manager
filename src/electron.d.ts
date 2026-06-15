import type { AgentRequest, AgentResult, CliStatus, GitInfo } from './types';

declare global {
  interface Window {
    agentWorkspace?: {
      selectProjectFolder(): Promise<string | null>;
      selectAttachments(): Promise<string[]>;
      getSystemStatus(): Promise<CliStatus>;
      runAgent(request: AgentRequest): Promise<AgentResult>;
      cancelAgent(runId: string): Promise<boolean>;
      onAgentOutput(
        callback: (payload: { runId: string; chunk: string; stream: 'stdout' | 'stderr' }) => void,
      ): () => void;
      getGitInfo(projectPath: string): Promise<GitInfo>;
      getBranches(projectPath: string): Promise<string[]>;
      switchBranch(
        projectPath: string,
        branch: string,
      ): Promise<{ ok: boolean; output: string; error: string }>;
      installPlugin(projectPath: string, packageName: string): Promise<string>;
      removePlugin(projectPath: string, packageName: string): Promise<string>;
      openExternal(url: string): Promise<void>;
      minimizeWindow(): void;
      maximizeWindow(): void;
      closeWindow(): void;
    };
  }
}

export {};
