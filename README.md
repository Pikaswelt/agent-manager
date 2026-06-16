# CodeForge

Electron-Desktop-App fuer lokale Coding-Agenten:

```text
React UI
  -> sichere Electron IPC-Bridge
  -> Node child_process
  -> Antigravity CLI, Codex CLI oder Claude Code
  -> ausgewaehlter Projektordner
```

## Voraussetzungen

- Node.js 20 oder neuer
- Mindestens eine installierte und angemeldete CLI:
  - `agy` fuer Google Antigravity
  - `codex` fuer OpenAI Codex
  - `claude` fuer Anthropic Claude Code
- Optional: Git fuer Branch-Auswahl

## Entwicklung

```powershell
npm install
npm run dev
```

## Pruefen und bauen

```powershell
npm run lint
npm run build
npm run dist
```

`npm run dist` erzeugt den Windows-Installer unter `release/`.

## Sicherheit

Der Renderer hat keinen direkten Node-Zugriff. Dateioperationen, Git, npm,
Fenstersteuerung und Agent-Prozesse laufen ausschliesslich ueber die begrenzte
Preload-API. Der Zugriffsmodus kann pro Anfrage auf Nur-Lesen,
Projektzugriff oder Vollzugriff gesetzt werden.
