const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hclipper', {
  selectFile: (options) => ipcRenderer.invoke('hclipper:select-file', options),
  runEngine: (command, args) => ipcRenderer.invoke('hclipper:run-engine', { command, args }),
  getSystemInfo: () => ipcRenderer.invoke('hclipper:get-system-info'),
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
