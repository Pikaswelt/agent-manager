# Agent Workspace

Electron-Desktop-App für lokale Coding-Agenten:

```text
React UI
  -> sichere Electron IPC-Bridge
  -> Node child_process
  -> Antigravity CLI, Codex CLI oder Claude Code
  -> ausgewählter Projektordner
```

## Voraussetzungen

- Node.js 20 oder neuer
- Mindestens eine installierte und angemeldete CLI:
  - `agy` für Google Antigravity
  - `codex` für OpenAI Codex
  - `claude` für Anthropic Claude Code
- Optional: Git für Branch-Auswahl

## Entwicklung

```powershell
npm install
npm run dev
```

## Prüfen und bauen

```powershell
npm run lint
npm run build
npm run dist
```

`npm run dist` erzeugt den Windows-Installer unter `release/`.

## Sicherheit

Der Renderer hat keinen direkten Node-Zugriff. Dateioperationen, Git, npm,
Fenstersteuerung und Agent-Prozesse laufen ausschließlich über die begrenzte
Preload-API. Der Zugriffsmodus kann pro Anfrage auf Nur-Lesen,
Projektzugriff oder Vollzugriff gesetzt werden.
