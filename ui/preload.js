const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPapers: () => ipcRenderer.invoke('get-papers'),
  updatePaperStatus: (id, status) => ipcRenderer.invoke('update-paper-status', { id, status }),
  updateNotebookStatus: (id, status) => ipcRenderer.invoke('update-notebook-status', { id, status }),
  updateLastOpened: (id) => ipcRenderer.invoke('update-last-opened', { id }),
  openNotebook: (pdfPath) => ipcRenderer.invoke('open-notebook', { pdfPath }),
  getPdfPreview: (pdfPath) => ipcRenderer.invoke('get-pdf-preview', { pdfPath }),
  startDrag: (pdfPath, title) => ipcRenderer.send('start-drag', { pdfPath, title }),
});
