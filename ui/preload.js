const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPapers: () => ipcRenderer.invoke('get-papers'),
  updatePaperStatus: (id, status) => ipcRenderer.invoke('update-paper-status', { id, status }),
  openNotebook: (pdfPath) => ipcRenderer.invoke('open-notebook', { pdfPath }),
  startDrag: (pdfPath, title) => ipcRenderer.send('start-drag', { pdfPath, title }),
});
