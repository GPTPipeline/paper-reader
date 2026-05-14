const { app, BrowserWindow, ipcMain, shell, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { pathToFileURL } = require('url');

const dbPath = path.join(__dirname, '..', 'papers.db');
const db = new Database(dbPath);

function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      title TEXT,
      authors TEXT,
      published TEXT,
      summary TEXT,
      pdf_url TEXT,
      local_path TEXT,
      source TEXT,
      downloaded_at TEXT,
      status TEXT DEFAULT 'UNREAD'
    )
  `);

  const columns = new Set(db.prepare('PRAGMA table_info(papers)').all().map((column) => column.name));
  const additions = [
    ['category', 'TEXT'],
    ['tags', 'TEXT DEFAULT \'[]\''],
    ['notebook_status', 'TEXT DEFAULT \'NOT_ADDED\''],
    ['last_opened_at', 'TEXT'],
    ['notes', 'TEXT'],
  ];

  additions.forEach(([name, definition]) => {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE papers ADD COLUMN ${name} ${definition}`);
    }
  });
}

ensureSchema();

function createWindow() {
  nativeTheme.themeSource = 'dark';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Helper to get absolute PDF path
function getPdfAbsolutePath(pdfPath) {
  if (!pdfPath) return null;
  if (path.isAbsolute(pdfPath)) return pdfPath;
  
  // The DB stores paths like "../papers/filename.pdf"
  // The project root is at path.join(__dirname, "..")
  // The 'papers' folder is at path.join(__dirname, "..", "..", "papers")
  // So we resolve relative to the project root:
  return path.resolve(__dirname, '..', pdfPath);
}

// IPC Handlers
ipcMain.handle('get-papers', async () => {
  const stmt = db.prepare('SELECT * FROM papers ORDER BY published DESC');
  return stmt.all();
});

ipcMain.handle('update-paper-status', async (event, { id, status }) => {
  const stmt = db.prepare('UPDATE papers SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  return result.changes > 0;
});

ipcMain.handle('update-notebook-status', async (event, { id, status }) => {
  const stmt = db.prepare('UPDATE papers SET notebook_status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  return result.changes > 0;
});

ipcMain.handle('update-last-opened', async (event, { id }) => {
  const stmt = db.prepare('UPDATE papers SET last_opened_at = ? WHERE id = ?');
  const result = stmt.run(new Date().toISOString(), id);
  return result.changes > 0;
});

ipcMain.on('start-drag', async (event, { pdfPath, title }) => {
  const absolutePath = getPdfAbsolutePath(pdfPath);
  console.log('Main Process: Handling start-drag for:', absolutePath);
  
  if (absolutePath && fs.existsSync(absolutePath)) {
    try {
      // Use the official OS icon for the file type
      const icon = await app.getFileIcon(absolutePath, { size: 'normal' });
      
      console.log('Main Process: OS File Icon retrieved. IsEmpty:', icon.isEmpty());
      
      console.log('Main Process: Calling webContents.startDrag...');
      event.sender.startDrag({
        file: absolutePath,
        icon: icon
      });
    } catch (err) {
      console.error('Main Process: Error getting file icon:', err);
      // Fallback to empty icon if system fails
      event.sender.startDrag({
        file: absolutePath,
        icon: nativeImage.createEmpty()
      });
    }
  } else {
    console.error('Main Process: File not found for drag:', absolutePath);
  }
});

ipcMain.handle('open-notebook', async (event, { pdfPath }) => {
  // Reveal the PDF in Finder/Explorer so the user can drag it manually if they prefer
  const absolutePath = getPdfAbsolutePath(pdfPath);
  if (absolutePath && fs.existsSync(absolutePath)) {
    shell.showItemInFolder(absolutePath);
  }
});

ipcMain.handle('get-pdf-preview', async (event, { pdfPath }) => {
  const absolutePath = getPdfAbsolutePath(pdfPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return { ok: false, error: 'PDF file not found.' };
  }
  return { ok: true, url: pathToFileURL(absolutePath).toString() };
});
