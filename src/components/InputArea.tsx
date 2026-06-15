import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Box,
  Check,
  ChevronDown,
  GitBranch,
  Mic,
  Monitor,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import { PROVIDER_MODELS, useAppContext } from '../AppContext';
import type { AccessMode } from '../types';

const ACCESS_OPTIONS: { id: AccessMode; label: string; description: string }[] = [
  { id: 'read-only', label: 'Nur lesen', description: 'Keine Dateiänderungen erlauben' },
  { id: 'workspace-write', label: 'Projektzugriff', description: 'Im Projekt lesen und schreiben' },
  { id: 'full', label: 'Voller Zugriff', description: 'Auch Befehle ohne Sandbox erlauben' },
];

export default function InputArea() {
  const {
    provider,
    aiModel,
    setAiModel,
    accessMode,
    setAccessMode,
    sendMessage,
    cancelRun,
    isSending,
    folders,
    selectedFolderId,
    selectFolder,
    addProject,
    selectedProject,
    attachments,
    addAttachments,
    removeAttachment,
    cliStatus,
    gitInfo,
    branches,
    switchBranch,
  } = useAppContext();
  const [text, setText] = useState('');
  const [dropdown, setDropdown] = useState<'access' | 'model' | 'project' | 'runtime' | 'branch' | null>(
    null,
  );
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);

  const send = async () => {
    if (!text.trim() || isSending) return;
    setError('');
    const prompt = text.trim();
    setText('');
    try {
      await sendMessage(prompt);
    } catch (sendError) {
      setText(prompt);
      setError(sendError instanceof Error ? sendError.message : 'Nachricht konnte nicht gesendet werden.');
    }
  };

  const startDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Spracherkennung wird auf diesem System nicht unterstützt.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError('Spracherkennung konnte nicht gestartet werden.');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setText((current) => `${current}${current ? ' ' : ''}${transcript}`);
    };
    recognition.start();
  };

  const access = ACCESS_OPTIONS.find((option) => option.id === accessMode)!;
  const models = PROVIDER_MODELS[provider];
  const selectedModel = models.find((model) => model.id === aiModel) || models[0];
  const runtime = cliStatus[provider];

  return (
    <div className="w-full max-w-[760px] mt-4">
      <div className="bg-[#181516] border border-white/10 rounded-[18px] shadow-2xl focus-within:border-white/20 transition-all p-1">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachments.map((file) => (
              <div
                key={file}
                title={file}
                className="flex items-center gap-1.5 max-w-52 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-zinc-400"
              >
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate">{file.split(/[\\/]/).at(-1)}</span>
                <button onClick={() => removeAttachment(file)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 pt-3 pb-1 max-h-56 overflow-y-auto custom-scrollbar">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            className="w-full bg-transparent text-white placeholder-zinc-600 text-[15px] outline-none resize-none min-h-[48px]"
            placeholder={selectedProject ? 'Beschreibe, was im Projekt erledigt werden soll...' : 'Öffne zuerst einen Projektordner...'}
            rows={2}
          />
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <button
              onClick={addAttachments}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5"
              title="Dateien anhängen"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setDropdown(dropdown === 'access' ? null : 'access')}
              className="flex items-center gap-1.5 text-orange-400 bg-orange-500/[0.08] px-2.5 py-1 rounded-full text-[12px] border border-orange-500/10"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {access.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {dropdown === 'access' && (
              <Dropdown className="left-8 w-64">
                {ACCESS_OPTIONS.map((option) => (
                  <DropdownButton
                    key={option.id}
                    checked={accessMode === option.id}
                    onClick={() => {
                      setAccessMode(option.id);
                      setDropdown(null);
                    }}
                    title={option.label}
                    subtitle={option.description}
                  />
                ))}
              </Dropdown>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setDropdown(dropdown === 'model' ? null : 'model')}
              className="flex items-center gap-2 px-3 py-1 rounded-md text-left text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/5"
            >
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-medium leading-tight">{selectedModel.name}</span>
                <span className="text-[9.5px] text-zinc-600 font-mono mt-0.5">{selectedModel.id}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {dropdown === 'model' && (
              <Dropdown className="right-14 w-72 max-h-72 overflow-y-auto custom-scrollbar">
                {models.map((model) => (
                  <DropdownButton
                    key={model.id}
                    checked={aiModel === model.id}
                    onClick={() => {
                      setAiModel(model.id);
                      setDropdown(null);
                    }}
                    title={model.name}
                    subtitle={model.id}
                  />
                ))}
              </Dropdown>
            )}
            <button
              onClick={startDictation}
              className={`p-1.5 rounded-md ${listening ? 'text-red-400 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              title="Spracheingabe"
            >
              <Mic className="w-4 h-4" />
            </button>
            {isSending ? (
              <button
                onClick={cancelRun}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-400"
                title="Agent stoppen"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!text.trim() || !selectedProject}
                className="p-2 rounded-full bg-white text-black hover:bg-zinc-200 disabled:bg-white/10 disabled:text-zinc-600"
                title="Senden"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 pb-3 pt-1 flex items-center gap-1.5 text-[12px] relative">
          <button
            onClick={() => setDropdown(dropdown === 'project' ? null : 'project')}
            className="context-button"
          >
            <Box className="w-3.5 h-3.5" />
            <span className="max-w-40 truncate">{selectedProject?.title || 'Projekt wählen'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {dropdown === 'project' && (
            <Dropdown className="left-3 w-64">
              {folders.map((folder) => (
                <DropdownButton
                  key={folder.id}
                  checked={selectedFolderId === folder.id}
                  onClick={() => {
                    selectFolder(folder.id);
                    setDropdown(null);
                  }}
                  title={folder.title}
                  subtitle={folder.path}
                />
              ))}
              <button onClick={addProject} className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-white/10">
                + Projektordner öffnen
              </button>
            </Dropdown>
          )}

          <button
            onClick={() => setDropdown(dropdown === 'runtime' ? null : 'runtime')}
            className="context-button"
          >
            <Monitor className="w-3.5 h-3.5" />
            {runtime.installed ? 'CLI bereit' : 'CLI fehlt'}
            <span className={`w-1.5 h-1.5 rounded-full ${runtime.installed ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </button>
          {dropdown === 'runtime' && (
            <Dropdown className="left-32 w-80">
              <div className="px-3 py-2">
                <div className="text-xs text-white">{runtime.installed ? runtime.version : 'Nicht installiert'}</div>
                <div className="text-[10px] text-zinc-600 mt-1 break-all">
                  {runtime.executable || 'Die gewählte CLI ist nicht im PATH verfügbar.'}
                </div>
              </div>
            </Dropdown>
          )}

          <button
            onClick={() => setDropdown(dropdown === 'branch' ? null : 'branch')}
            disabled={!gitInfo.isRepository}
            className="context-button disabled:opacity-35"
          >
            <GitBranch className="w-3.5 h-3.5" />
            {gitInfo.isRepository ? gitInfo.branch || 'detached' : 'Kein Git'}
            {gitInfo.isRepository && <ChevronDown className="w-3 h-3" />}
          </button>
          {dropdown === 'branch' && (
            <Dropdown className="left-56 w-56 max-h-56 overflow-y-auto custom-scrollbar">
              {branches.map((branch) => (
                <DropdownButton
                  key={branch}
                  checked={gitInfo.branch === branch}
                  onClick={async () => {
                    try {
                      await switchBranch(branch);
                      setDropdown(null);
                    } catch (branchError) {
                      setError(branchError instanceof Error ? branchError.message : 'Branchwechsel fehlgeschlagen.');
                    }
                  }}
                  title={branch}
                />
              ))}
            </Dropdown>
          )}
        </div>
      </div>
      {error && <div className="mt-2 px-3 text-xs text-red-400">{error}</div>}
    </div>
  );
}

function Dropdown({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`absolute bottom-full mb-2 bg-[#27272a] border border-white/10 rounded-lg shadow-2xl py-1.5 z-50 ${className}`}>
      {children}
    </div>
  );
}

function DropdownButton({
  checked,
  onClick,
  title,
  subtitle,
}: {
  checked: boolean;
  onClick(): void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <div className="text-[12.5px] text-zinc-200 truncate">{title}</div>
        {subtitle && <div className="text-[9.5px] text-zinc-600 font-mono truncate mt-0.5">{subtitle}</div>}
      </div>
      {checked && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
    </button>
  );
}
