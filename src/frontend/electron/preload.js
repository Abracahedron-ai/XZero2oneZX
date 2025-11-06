const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getState: () => ipcRenderer.invoke('get-state'),
  updateLayer: (layerId, transform) => ipcRenderer.invoke('update-layer', layerId, transform),
  captureFrame: () => ipcRenderer.invoke('capture-frame'),
  onWSMessage: (callback) => ipcRenderer.on('ws-message', (event, data) => callback(data)),
});
