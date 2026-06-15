const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentWorkspace', {
  selectProjectFolder: () => ipcRenderer.invoke('dialog:select-project'),
  selectAttachments: () => ipcRenderer.invoke('dialog:select-attachments'),
  getSystemStatus: () => ipcRenderer.invoke('system:status'),
  runAgent: (request) => ipcRenderer.invoke('agent:run', request),
  cancelAgent: (runId) => ipcRenderer.invoke('agent:cancel', runId),
  onAgentOutput: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('agent:output', listener);
    return () => ipcRenderer.removeListener('agent:output', listener);
  },
  getGitInfo: (projectPath) => ipcRenderer.invoke('git:info', projectPath),
  getBranches: (projectPath) => ipcRenderer.invoke('git:branches', projectPath),
  switchBranch: (projectPath, branch) => ipcRenderer.invoke('git:switch', projectPath, branch),
  installPlugin: (projectPath, packageName) =>
    ipcRenderer.invoke('plugins:install', projectPath, packageName),
  removePlugin: (projectPath, packageName) =>
    ipcRenderer.invoke('plugins:remove', projectPath, packageName),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
