const { app, BrowserWindow, dialog, ipcMain, shell, Notification } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const activeProcesses = new Map();
let mainWindow = null;

if (process.platform === 'win32') {
  app.setAppUserModelId('app.codeforge.desktop');
}

const PROVIDERS = {
  antigravity: {
    command: 'agy',
    label: 'Antigravity CLI',
    versionArgs: ['--version'],
  },
  openai: {
    command: 'codex',
    label: 'Codex CLI',
    versionArgs: ['--version'],
  },
  anthropic: {
    command: 'claude',
    label: 'Claude Code',
    versionArgs: ['--version'],
  },
};

const MODEL_ALLOWLIST = {
  antigravity: new Set([
    'Gemini 3.5 Flash (Medium)',
    'Gemini 3.5 Flash (High)',
    'Gemini 3.5 Flash (Low)',
    'Gemini 3.1 Pro (High)',
    'Gemini 3.1 Pro (Low)',
    'Claude Sonnet 4.6 (Thinking)',
    'Claude Opus 4.6 (Thinking)',
    'GPT-OSS 120B (Medium)',
  ]),
  openai: new Set(['gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex']),
  anthropic: new Set(['sonnet', 'opus', 'haiku', 'fable', 'claude-sonnet-4-6', 'claude-opus-4-6']),
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#111111',
    title: 'CodeForge',
    icon: path.join(__dirname, '..', 'assets', 'codeforge.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function findExecutable(command) {
  return new Promise((resolve) => {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    execFile(locator, [command], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      const candidates = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const executable =
        process.platform === 'win32'
          ? candidates.find((file) => /\.(exe|com)$/i.test(file)) ||
            candidates.find((file) => /\.(cmd|bat)$/i.test(file))
          : candidates[0];
      resolve(executable || null);
    });
  });
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    const isCommandScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
    const spawnCommand = isCommandScript ? process.env.ComSpec || 'cmd.exe' : command;
    const scriptCommandLine = isCommandScript
      ? `"${quoteCmdArgument(command)} ${args.map(quoteCmdArgument).join(' ')}"`
      : '';
    const spawnArgs = isCommandScript
      ? ['/d', '/s', '/c', scriptCommandLine]
      : args;
    const child = spawn(spawnCommand, spawnArgs, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}), FORCE_COLOR: '0', NO_COLOR: '1' },
      windowsHide: true,
      shell: false,
      windowsVerbatimArguments: isCommandScript,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      options.onOutput?.(chunk, 'stdout');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      options.onOutput?.(chunk, 'stderr');
    });
    child.on('error', (error) => resolve({ ok: false, stdout, stderr, error: error.message, exitCode: -1 }));
    child.on('close', (exitCode) => {
      resolve({
        ok: exitCode === 0,
        stdout,
        stderr,
        error: exitCode === 0 ? '' : stderr.trim() || `Prozess mit Code ${exitCode} beendet.`,
        exitCode: exitCode ?? -1,
      });
    });

    if (options.stdin) child.stdin.write(options.stdin);
    child.stdin.end();
    options.onSpawn?.(child);
  });
}

function quoteCmdArgument(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9_./:@=+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '""').replace(/%/g, '%%')}"`;
}

function accessToCodexSandbox(access) {
  if (access === 'read-only') return 'read-only';
  if (access === 'full') return 'danger-full-access';
  return 'workspace-write';
}

function accessToClaudeMode(access) {
  if (access === 'read-only') return 'plan';
  if (access === 'full') return 'bypassPermissions';
  return 'auto';
}

function buildPrompt(prompt, attachments, access, projectPath) {
  const accessInstruction =
    access === 'read-only'
      ? 'WICHTIG: Arbeite ausschließlich lesend. Verändere keine Dateien und führe keine destruktiven Befehle aus.'
      : access === 'workspace-write'
        ? `WICHTIG: Verändere nur Dateien innerhalb dieses Projektordners: ${projectPath}`
        : 'Du darfst die für die Aufgabe erforderlichen lokalen Werkzeuge verwenden.';
  const attachmentInstruction = attachments?.length
    ? `\n\nLokale Anhänge, die du bei Bedarf lesen sollst:\n${attachments.map((file) => `- ${file}`).join('\n')}`
    : '';
  return `${accessInstruction}\n\n${prompt}${attachmentInstruction}`;
}

function buildProviderEnv(provider, apiKeys = {}) {
  const key = typeof apiKeys[provider] === 'string' ? apiKeys[provider].trim() : '';
  if (!key) return {};
  if (provider === 'openai') return { OPENAI_API_KEY: key };
  if (provider === 'anthropic') return { ANTHROPIC_API_KEY: key };
  return {
    GOOGLE_API_KEY: key,
    GEMINI_API_KEY: key,
    ANTIGRAVITY_API_KEY: key,
  };
}

function withSystemPrompt(systemPrompt, prompt) {
  const trimmed = typeof systemPrompt === 'string' ? systemPrompt.trim() : '';
  if (!trimmed) return prompt;
  return `System-Prompt:\n${trimmed}\n\nNutzerauftrag:\n${prompt}`;
}

function showTaskNotification(input = {}) {
  if (!Notification.isSupported()) return false;
  const title = String(input.title || 'CodeForge').slice(0, 80);
  const body = String(input.body || 'Aufgabe ist erledigt.').slice(0, 240);
  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, '..', 'assets', 'codeforge.png'),
  });
  notification.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  notification.show();
  return true;
}

async function runAgent(event, request) {
  const provider = PROVIDERS[request.provider];
  if (!provider) throw new Error('Unbekannter Anbieter.');
  if (!MODEL_ALLOWLIST[request.provider]?.has(request.model)) {
    throw new Error('Das angeforderte Modell ist für diesen Anbieter nicht freigegeben.');
  }
  if (!['read-only', 'workspace-write', 'full'].includes(request.access)) {
    throw new Error('Ungültiger Zugriffsmodus.');
  }
  if (typeof request.prompt !== 'string' || !request.prompt.trim() || request.prompt.length > 100_000) {
    throw new Error('Die Anfrage ist leer oder zu lang.');
  }
  if (
    !request.projectPath ||
    !fs.existsSync(request.projectPath) ||
    !fs.statSync(request.projectPath).isDirectory()
  ) {
    throw new Error('Der Projektordner existiert nicht.');
  }

  const executable = await findExecutable(provider.command);
  if (!executable) {
    return {
      ok: false,
      output: '',
      error: `${provider.label} wurde nicht gefunden. Installiere die CLI und starte CodeForge neu.`,
      exitCode: -1,
    };
  }
  if (request.provider === 'antigravity' && /\.(cmd|bat)$/i.test(executable)) {
    return {
      ok: false,
      output: '',
      error: 'Für Antigravity wird unter Windows die native agy-Installation benötigt, kein unsicherer .cmd-Wrapper.',
      exitCode: -1,
    };
  }

  const prompt = buildPrompt(
    withSystemPrompt(request.systemPrompt, request.prompt),
    request.attachments,
    request.access,
    request.projectPath,
  );
  const args = [];
  let stdin = '';

  if (request.provider === 'antigravity') {
    args.push('-p', prompt, '--model', request.model);
    if (request.access === 'full') args.push('--dangerously-skip-permissions');
  } else if (request.provider === 'openai') {
    args.push(
      'exec',
      '-',
      '--model',
      request.model,
      '--cd',
      request.projectPath,
      '--color',
      'never',
      '--skip-git-repo-check',
      '--sandbox',
      accessToCodexSandbox(request.access),
    );
    stdin = prompt;
  } else {
    args.push(
      '-p',
      '--model',
      request.model,
      '--output-format',
      'text',
      '--permission-mode',
      accessToClaudeMode(request.access),
    );
    if (request.access === 'full') args.push('--dangerously-skip-permissions');
    stdin = prompt;
  }

  const runId = request.runId || crypto.randomUUID();
  const result = await runCapture(executable, args, {
    cwd: request.projectPath,
    stdin,
    env: buildProviderEnv(request.provider, request.apiKeys),
    onSpawn: (child) => activeProcesses.set(runId, child),
    onOutput: (chunk, stream) => {
      event.sender.send('agent:output', { runId, chunk, stream });
    },
  });
  activeProcesses.delete(runId);

  return {
    ok: result.ok,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    error: result.error,
    exitCode: result.exitCode,
  };
}

async function generateSystemPrompt(_event, request) {
  const generationAccess = 'read-only';
  const provider = PROVIDERS[request.provider];
  if (!provider) throw new Error('Unbekannter Anbieter.');
  if (!MODEL_ALLOWLIST[request.provider]?.has(request.model)) {
    throw new Error('Das angeforderte Modell ist fuer diesen Anbieter nicht freigegeben.');
  }
  if (!['read-only', 'workspace-write', 'full'].includes(request.access)) {
    throw new Error('Ungueltiger Zugriffsmodus.');
  }
  if (
    !request.projectPath ||
    !fs.existsSync(request.projectPath) ||
    !fs.statSync(request.projectPath).isDirectory()
  ) {
    throw new Error('Der Projektordner existiert nicht.');
  }

  const executable = await findExecutable(provider.command);
  if (!executable) {
    return {
      ok: false,
      output: '',
      error: `${provider.label} wurde nicht gefunden. Installiere die CLI und starte CodeForge neu.`,
      exitCode: -1,
    };
  }
  if (request.provider === 'antigravity' && /\.(cmd|bat)$/i.test(executable)) {
    return {
      ok: false,
      output: '',
      error: 'Fuer Antigravity wird unter Windows die native agy-Installation benoetigt, kein unsicherer .cmd-Wrapper.',
      exitCode: -1,
    };
  }

  const prompt = buildPrompt(
    'Erstelle einen empfohlenen System-Prompt fuer einen lokalen Coding-Agenten in diesem Projekt. Antworte nur mit dem fertigen System-Prompt, ohne Markdown, ohne Erklaerung. Der Prompt soll kurz, praezise und sicher sein: bestehende Patterns lesen, Nutzerarbeit schuetzen, relevante Dateien aendern, Tests/Builds pruefen, knapp auf Deutsch antworten.',
    [],
    generationAccess,
    request.projectPath,
  );
  const args = [];
  let stdin = '';

  if (request.provider === 'antigravity') {
    args.push('-p', prompt, '--model', request.model);
  } else if (request.provider === 'openai') {
    args.push(
      'exec',
      '-',
      '--model',
      request.model,
      '--cd',
      request.projectPath,
      '--color',
      'never',
      '--skip-git-repo-check',
      '--sandbox',
      accessToCodexSandbox(generationAccess),
    );
    stdin = prompt;
  } else {
    args.push(
      '-p',
      '--model',
      request.model,
      '--output-format',
      'text',
      '--permission-mode',
      accessToClaudeMode(generationAccess),
    );
    stdin = prompt;
  }

  const result = await runCapture(executable, args, {
    cwd: request.projectPath,
    stdin,
    env: buildProviderEnv(request.provider, request.apiKeys),
  });

  return {
    ok: result.ok,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
    error: result.error,
    exitCode: result.exitCode,
  };
}

async function getCliStatus() {
  const entries = await Promise.all(
    Object.entries(PROVIDERS).map(async ([id, provider]) => {
      const executable = await findExecutable(provider.command);
      if (!executable) return [id, { installed: false, executable: '', version: '' }];
      const result = await runCapture(executable, provider.versionArgs);
      return [
        id,
        {
          installed: result.ok,
          executable,
          version: (result.stdout || result.stderr).trim().split(/\r?\n/)[0] || '',
        },
      ];
    }),
  );
  return Object.fromEntries(entries);
}

function validatePackageName(name) {
  return /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(name);
}

async function runNpm(projectPath, action, packageName) {
  if (!validatePackageName(packageName)) throw new Error('Ungültiger npm-Paketname.');
  const npm = await findExecutable('npm');
  if (!npm) throw new Error('npm wurde nicht gefunden.');
  const args = action === 'install' ? ['install', packageName] : ['uninstall', packageName];
  const result = await runCapture(npm, args, { cwd: projectPath });
  if (!result.ok) throw new Error(result.error || result.stderr || 'npm konnte nicht ausgeführt werden.');
  return (result.stdout || result.stderr).trim();
}

function runGit(projectPath, args) {
  return new Promise(async (resolve) => {
    const git = await findExecutable('git');
    if (!git) {
      resolve({ ok: false, output: '', error: 'Git wurde nicht gefunden.' });
      return;
    }
    const result = await runCapture(git, args, { cwd: projectPath });
    resolve({
      ok: result.ok,
      output: result.stdout.trim(),
      error: result.error || result.stderr.trim(),
    });
  });
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:select-project', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Projektordner auswählen',
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:select-attachments', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Dateien anhängen',
      properties: ['openFile', 'multiSelections'],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('system:status', getCliStatus);
  ipcMain.handle('agent:run', runAgent);
  ipcMain.handle('agent:generate-system-prompt', generateSystemPrompt);
  ipcMain.handle('agent:notify-complete', (_event, input) => showTaskNotification(input));
  ipcMain.handle('agent:cancel', (_event, runId) => {
    const child = activeProcesses.get(runId);
    if (!child) return false;
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
    activeProcesses.delete(runId);
    return true;
  });

  ipcMain.handle('git:info', async (_event, projectPath) => {
    const branch = await runGit(projectPath, ['branch', '--show-current']);
    const root = await runGit(projectPath, ['rev-parse', '--show-toplevel']);
    return {
      isRepository: branch.ok || root.ok,
      branch: branch.output || '',
      root: root.output || '',
    };
  });
  ipcMain.handle('git:branches', async (_event, projectPath) => {
    const result = await runGit(projectPath, ['branch', '--format=%(refname:short)']);
    return result.ok ? result.output.split(/\r?\n/).filter(Boolean) : [];
  });
  ipcMain.handle('git:switch', async (_event, projectPath, branch) => {
    if (!/^[\w./-]+$/.test(branch)) throw new Error('Ungültiger Branch-Name.');
    return runGit(projectPath, ['switch', branch]);
  });

  ipcMain.handle('plugins:install', (_event, projectPath, packageName) =>
    runNpm(projectPath, 'install', packageName),
  );
  ipcMain.handle('plugins:remove', (_event, projectPath, packageName) =>
    runNpm(projectPath, 'remove', packageName),
  );

  ipcMain.handle('shell:open-external', (_event, url) => {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('URL-Protokoll nicht erlaubt.');
    return shell.openExternal(parsed.toString());
  });
  ipcMain.handle('shell:open-path', (_event, targetPath) => {
    if (typeof targetPath !== 'string' || !targetPath.trim()) throw new Error('Ungueltiger Pfad.');
    if (/^[a-z]+:\/\//i.test(targetPath)) throw new Error('Nur lokale Dateipfade sind erlaubt.');
    return shell.openPath(targetPath);
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
