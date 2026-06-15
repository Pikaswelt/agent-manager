import { useMemo, useState } from 'react';
import {
  Blocks,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Folder,
  Plus,
  Search,
  Settings,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import type { ProjectFolder } from '../types';

export default function Sidebar({ onSettingsClick }: { onSettingsClick: () => void }) {
  const {
    folders,
    chats,
    selectedChatId,
    selectedFolderId,
    mainView,
    selectChat,
    selectFolder,
    setMainView,
    addProject,
    renameProject,
    deleteProject,
  } = useAppContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) => {
        if (!search) return true;
        return (
          folder.title.toLowerCase().includes(search.toLowerCase()) ||
          chats.some(
            (chat) =>
              chat.folderId === folder.id &&
              chat.title.toLowerCase().includes(search.toLowerCase()),
          )
        );
      }),
    [folders, chats, search],
  );

  const navClass = (active: boolean) =>
    `flex items-center gap-2.5 w-full px-4 py-2 text-[13px] transition-colors ${
      active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <aside className="w-[270px] h-full bg-gradient-to-b from-[#251f21] to-[#0a0a0a] flex flex-col shrink-0 border-r border-white/[0.03]">
      <div className="py-3">
        <button onClick={() => selectChat(null)} className={navClass(mainView === 'chat' && !selectedChatId)}>
          <SquarePen className="w-4 h-4" />
          Neuer Chat
        </button>
        <button onClick={() => setSearchOpen((value) => !value)} className={navClass(searchOpen)}>
          <Search className="w-4 h-4" />
          Suche
        </button>
        {searchOpen && (
          <div className="px-3 py-2">
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Projekte und Chats filtern..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/25"
            />
          </div>
        )}
        <button onClick={() => setMainView('plugins')} className={navClass(mainView === 'plugins')}>
          <Blocks className="w-4 h-4" />
          Plugins
        </button>
        <button
          onClick={() => setMainView('automations')}
          className={navClass(mainView === 'automations')}
        >
          <Clock className="w-4 h-4" />
          Automatisierungen
        </button>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Projekte
        </span>
        <button onClick={addProject} className="p-1 text-zinc-500 hover:text-white" title="Projektordner öffnen">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        {visibleFolders.length === 0 ? (
          <button
            onClick={addProject}
            className="mx-3 mt-2 p-4 w-[calc(100%-1.5rem)] rounded-xl border border-dashed border-white/10 text-left"
          >
            <div className="text-sm text-zinc-300">Projektordner hinzufügen</div>
            <div className="text-xs text-zinc-600 mt-1">Der Agent arbeitet direkt in diesem Ordner.</div>
          </button>
        ) : (
          visibleFolders.map((folder) => (
            <ProjectSection
              key={folder.id}
              folder={folder}
              chats={chats.filter(
                (chat) =>
                  chat.folderId === folder.id &&
                  (!search || chat.title.toLowerCase().includes(search.toLowerCase())),
              )}
              active={selectedFolderId === folder.id}
              selectedChatId={selectedChatId}
              onSelectFolder={() => selectFolder(folder.id)}
              onSelectChat={selectChat}
              onRename={(title) => renameProject(folder.id, title)}
              onDelete={() => deleteProject(folder.id)}
            />
          ))
        )}
      </div>

      <button onClick={onSettingsClick} className={navClass(false)}>
        <Settings className="w-4 h-4" />
        Einstellungen
      </button>
    </aside>
  );
}

function ProjectSection({
  folder,
  chats,
  active,
  selectedChatId,
  onSelectFolder,
  onSelectChat,
  onRename,
  onDelete,
}: {
  folder: ProjectFolder;
  chats: ReturnType<typeof useAppContext>['chats'];
  active: boolean;
  selectedChatId: string | null;
  onSelectFolder(): void;
  onSelectChat(id: string): void;
  onRename(title: string): void;
  onDelete(): void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(folder.title);

  const save = () => {
    if (title.trim()) onRename(title.trim());
    else setTitle(folder.title);
    setEditing(false);
  };

  return (
    <div className="mt-2">
      <div
        className={`group flex items-center px-3 py-2 text-[13px] ${
          active ? 'text-white' : 'text-zinc-400'
        }`}
      >
        <button
          onClick={() => {
            onSelectFolder();
            setOpen(true);
          }}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          title={folder.path}
        >
          <Folder className="w-4 h-4 text-amber-400/70 shrink-0" />
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={save}
              onKeyDown={(event) => event.key === 'Enter' && save()}
              onClick={(event) => event.stopPropagation()}
              className="min-w-0 flex-1 bg-zinc-800 border border-white/10 rounded px-1.5 py-0.5 outline-none"
            />
          ) : (
            <span className="truncate">{folder.title}</span>
          )}
        </button>
        {!editing && (
          <div className="hidden group-hover:flex items-center">
            <button onClick={() => setEditing(true)} className="p-1 hover:text-white" title="Umbenennen">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 hover:text-red-400" title="Entfernen">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
        <button onClick={() => setOpen((value) => !value)} className="p-1">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full pl-9 pr-3 py-1.5 text-left text-[12.5px] truncate ${
                selectedChatId === chat.id
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}
            >
              {chat.title}
            </button>
          ))}
          {chats.length === 0 && <div className="pl-9 py-1 text-xs text-zinc-700">Keine Chats</div>}
        </div>
      )}
    </div>
  );
}
