const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hclipper', {
  selectFile: (options) => ipcRenderer.invoke('hclipper:select-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('hclipper:save-file-dialog', options),
  openPath: (filePath) => ipcRenderer.invoke('hclipper:open-path', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('hclipper:show-in-folder', filePath),
  runEngine: (command, args, jobId) => ipcRenderer.invoke('hclipper:run-engine', { command, args, jobId }),
  cancelJob: (jobId) => ipcRenderer.invoke('hclipper:cancel-job', jobId),
  readQueue: () => ipcRenderer.invoke('hclipper:read-queue'),
  saveQueue: (items) => ipcRenderer.invoke('hclipper:save-queue', items),
  readProjects: () => ipcRenderer.invoke('hclipper:read-projects'),
  saveProjects: (projects) => ipcRenderer.invoke('hclipper:save-projects', projects),
  selectDirectory: (options) => ipcRenderer.invoke('hclipper:select-directory', options),
  openFolder: (folderPath) => ipcRenderer.invoke('hclipper:open-folder', folderPath),
  getSettings: () => ipcRenderer.invoke('hclipper:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('hclipper:save-settings', settings),
  listDownloads: () => ipcRenderer.invoke('hclipper:list-downloads'),
  getSystemInfo: () => ipcRenderer.invoke('hclipper:get-system-info'),
  resolveMediaUrl: (rawPath) => ipcRenderer.invoke('hclipper:resolve-media-url', rawPath),
  onEngineEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('hclipper:engine-event', handler);
    return () => ipcRenderer.removeListener('hclipper:engine-event', handler);
  },
  onEngineLog: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('hclipper:engine-log', handler);
    return () => ipcRenderer.removeListener('hclipper:engine-log', handler);
  }
});
