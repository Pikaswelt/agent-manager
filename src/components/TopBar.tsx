import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Folder,
  HelpCircle,
  Minus,
  Settings,
  Square,
  X,
} from 'lucide-react';
import { useAppContext } from '../AppContext';

export default function TopBar({ onSettingsClick }: { onSettingsClick: () => void }) {
  const {
    selectedProject,
    addProject,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward,
    selectChat,
    clearChat,
  } = useAppContext();
  const [menu, setMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const menuButton = (label: string, items: { label: string; action: () => void }[]) => (
    <div className="relative">
      <button
        onClick={() => setMenu(menu === label ? null : label)}
        className="px-1.5 py-1 hover:bg-white/5 hover:text-white rounded transition-colors"
      >
        {label}
      </button>
      {menu === label && (
        <div className="absolute top-8 left-0 w-52 bg-[#242124] border border-white/10 rounded-lg shadow-2xl py-1.5 z-[80]">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                setMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="app-drag flex items-center justify-between h-10 px-3 bg-black/10 text-zinc-400 select-none shrink-0"
    >
      <div className="app-no-drag flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={navigateBack}
            disabled={!canGoBack}
            className="p-1.5 hover:bg-white/5 rounded disabled:opacity-25"
            title="Zurück"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={navigateForward}
            disabled={!canGoForward}
            className="p-1.5 hover:bg-white/5 rounded disabled:opacity-25"
            title="Vor"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          {menuButton('Datei', [
            { label: 'Neuer Chat', action: () => selectChat(null) },
            { label: 'Projektordner öffnen...', action: addProject },
            { label: 'App schließen', action: () => window.agentWorkspace?.closeWindow() },
          ])}
          {menuButton('Bearbeiten', [
            { label: 'Aktuellen Chat löschen', action: clearChat },
            { label: 'Einstellungen', action: onSettingsClick },
          ])}
          {menuButton('Ansicht', [
            {
              label: 'Fenster maximieren / wiederherstellen',
              action: () => window.agentWorkspace?.maximizeWindow(),
            },
          ])}
          {menuButton('Hilfe', [
            {
              label: 'Antigravity Dokumentation',
              action: () => window.agentWorkspace?.openExternal('https://antigravity.google/docs/cli-overview'),
            },
            {
              label: 'Codex Dokumentation',
              action: () => window.agentWorkspace?.openExternal('https://developers.openai.com/codex/cli'),
            },
            {
              label: 'Claude Code Dokumentation',
              action: () => window.agentWorkspace?.openExternal('https://code.claude.com/docs'),
            },
          ])}
        </div>
      </div>

      <div className="app-no-drag flex items-center gap-2">
        <button
          onClick={addProject}
          className="flex items-center gap-2 max-w-72 px-2.5 py-1 hover:bg-white/5 rounded text-xs transition-colors"
          title={selectedProject?.path || 'Projektordner auswählen'}
        >
          <Folder className="w-3.5 h-3.5 fill-[#dcb85d] text-[#dcb85d] shrink-0" />
          <span className="truncate">{selectedProject?.title || 'Projekt öffnen'}</span>
          {selectedProject && <Check className="w-3 h-3 text-emerald-400" />}
        </button>
        <button onClick={onSettingsClick} className="p-1.5 hover:bg-white/5 rounded" title="Einstellungen">
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.agentWorkspace?.openExternal('https://antigravity.google/docs/cli-troubleshooting')}
          className="p-1.5 hover:bg-white/5 rounded"
          title="Hilfe"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center ml-1">
          <button onClick={() => window.agentWorkspace?.minimizeWindow()} className="window-control">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => window.agentWorkspace?.maximizeWindow()} className="window-control">
            <Square className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => window.agentWorkspace?.closeWindow()} className="window-control hover:!bg-red-500 hover:!text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
