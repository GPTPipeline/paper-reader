# Paper Bot: Project Documentation & Handoff Guide

## Project Overview
Paper Bot is an automated research assistant that fetches daily papers from arXiv and Hugging Face, stores them in a local SQLite database, and provides an Electron + React desktop interface for management and study.

### Key Features
*   **Automated Fetching**: Python script (`fetch_papers.py`) runs via `launchd` to find papers based on keywords.
*   **Robust Storage**: SQLite database (`papers.db`) tracking metadata and study status.
*   **Integrated UI**: Electron app with a split-pane layout.
*   **NotebookLM Integration**: Embedded browser view with native OS drag-and-drop for seamless PDF uploading.

## System Architecture

### 1. Data Layer
*   **SQLite (`papers.db`)**:
    *   `papers` table stores IDs, titles, authors, summaries, URLs, and local file paths.
    *   `status` column: `UNREAD`, `READING`, `READ`, `ARCHIVED`.
*   **Migration**: Data originally resided in `downloaded_papers.json`. Use `migrate_to_sqlite.py` for any re-syncs.

### 2. Backend Logic (Python)
*   **`fetch_papers.py`**:
    *   Uses `arxiv` and `requests` libraries.
    *   Resolves all paths (config, db, papers) relative to its own script location for robustness.
    *   **Keywords**: Managed in `config.yaml`.
*   **Automation**: `com.paperbot.fetch.plist` (macOS launchd) runs `run_fetch.sh` daily at 10:00 AM.

### 3. Frontend (Electron + React)
*   **Main Process (`ui/main.js`)**:
    *   Manages `better-sqlite3` connection.
    *   Implements `start-drag` IPC using `event.sender.startDrag` for native OS file handling.
    *   Enables `<webview>` for the NotebookLM integration.
*   **Renderer (`ui/src/App.jsx`)**:
    *   React-based split layout.
    *   Left side: Table with draggable handles (`⠿`).
    *   Right side: `<webview>` pointing to Google NotebookLM.

## Directory Structure
```text
paper_bot/
├── fetch_papers.py       # Main ingestion script
├── config.yaml           # Keywords and directory settings
├── papers.db             # SQLite database
├── run_fetch.sh          # Wrapper for automation
├── ui/                   # Electron + React project
│   ├── main.js           # Electron main process (DB & Drag logic)
│   ├── preload.js        # IPC Bridge
│   └── src/App.jsx       # React Dashboard
└── ../papers/            # Folder containing actual PDF files
```

## Setup & Development Commands

### Prerequisites
*   Node.js & npm
*   Python 3.11+ (with `.venv` containing `arxiv`, `pyyaml`, `requests`, `pypdf`)

### Running the UI
1. `cd ui`
2. `npm install`
3. `npm run dev` (starts Vite)
4. `npm run electron:dev` (starts Electron in a separate terminal)

### Native Modules
If you encounter a `NODE_MODULE_VERSION` mismatch for `better-sqlite3`, run:
```bash
cd ui
npx @electron/rebuild -f -w better-sqlite3
```

## Implementation Notes for Future Agents
*   **Path Resolution**: The `papers/` directory is located one level *above* the `paper_bot` project root. `ui/main.js` and `fetch_papers.py` both handle this using relative path resolution.
*   **Drag-and-Drop**: The `onDragStart` in `App.jsx` must not call `e.preventDefault()` completely, or it must set `e.dataTransfer.setData` to allow the OS to recognize the drag start before Electron's `startDrag` takes over.
*   **NotebookLM**: Google uses strict security headers. Use the `<webview>` tag with `webviewTag: true` enabled in `webPreferences`.

## Future Roadmap
*   Add a "Summary" view inside the UI using Gemini API for quick skimming.
*   Implement full-text search across the PDF collection using SQLite FTS5.
*   Add tagging/categorization for better organization beyond the basic status.
