# Phase 2 Tasks

## Phase 2.1: Explorer Upgrade

Goal: make the paper library useful for discovery before touching NotebookLM behavior.

Tasks:

- [ ] Add an app mode state with `Explore` as the default mode. _(pending validation)_
- [ ] Create a stable app shell with mode navigation. _(pending validation)_
- [ ] Expand the paper table columns. _(pending validation)_
  - [ ] Selection checkbox. _(pending validation)_
  - [ ] Title. _(pending validation)_
  - [ ] Authors. _(pending validation)_
  - [ ] Category. _(pending validation)_
  - [ ] Source. _(pending validation)_
  - [ ] Published date. _(pending validation)_
  - [ ] Downloaded date. _(pending validation)_
  - [ ] Status. _(pending validation)_
  - [ ] Queue indicator. _(pending validation)_
- [ ] Add filter controls. _(pending validation)_
  - [ ] Search text. _(pending validation)_
  - [ ] Category. _(pending validation)_
  - [ ] Source. _(pending validation)_
  - [ ] Status. _(pending validation)_
  - [ ] Published date range. _(pending validation)_
  - [ ] Downloaded date range. _(pending validation)_
- [ ] Add sort controls. _(pending validation)_
  - [ ] Newest published. _(pending validation)_
  - [ ] Oldest published. _(pending validation)_
  - [ ] Newest downloaded. _(pending validation)_
  - [ ] Oldest downloaded. _(pending validation)_
  - [ ] Title. _(pending validation)_
  - [ ] Status. _(pending validation)_
- [ ] Add an empty state for no matching papers. _(pending validation)_
- [ ] Add tests for filtering and sorting behavior. _(pending validation)_

Acceptance criteria:

- The user can find papers by category/source/status/date without opening NotebookLM. _(pending validation)_
- The table remains readable at normal desktop sizes. _(pending validation)_
- Existing status updates and drag behavior still work. _(pending validation)_

## Phase 2.2: Paper Detail Pane

Goal: let the user inspect a paper before deciding whether it belongs in a notebook.

Tasks:

- [ ] Add selected paper state. _(pending validation)_
- [ ] Open a detail pane/drawer when clicking a paper row. _(pending validation)_
- [ ] Show metadata. _(pending validation)_
  - [ ] Title. _(pending validation)_
  - [ ] Authors. _(pending validation)_
  - [ ] Category. _(pending validation)_
  - [ ] Source. _(pending validation)_
  - [ ] Published date. _(pending validation)_
  - [ ] Downloaded date. _(pending validation)_
  - [ ] Status. _(pending validation)_
- [ ] Show the abstract/summary. _(pending validation)_
- [ ] Add actions. _(pending validation)_
  - [ ] Add to queue. _(pending validation)_
  - [ ] Open/reveal PDF. _(pending validation)_
  - [ ] Update status. _(pending validation)_
- [ ] Add a missing-PDF warning when `local_path` is absent or invalid. _(pending validation)_
- [ ] Add tests for selecting a paper and rendering detail content. _(pending validation)_

Acceptance criteria:

- A paper can be inspected without losing the current filter context. _(pending validation)_
- The abstract is readable in the app. _(pending validation)_
- The user can add a paper to the queue from the detail pane. _(pending validation)_

## Phase 2.3: Notebook Queue

Goal: create an explicit staging area for papers before NotebookLM upload.

Tasks:

- [ ] Add queue state in the renderer. _(pending validation)_
- [ ] Add checkbox-based multi-select in Explore mode. _(pending validation)_
- [ ] Add selected papers to queue. _(pending validation)_
- [ ] Prevent duplicate queue entries. _(pending validation)_
- [ ] Show queued state in the table. _(pending validation)_
- [ ] Build a queue panel/list. _(pending validation)_
- [ ] Add queue item actions. _(pending validation)_
  - [ ] Remove from queue. _(pending validation)_
  - [ ] Clear queue. _(pending validation)_
  - [ ] Reveal PDF in Finder. _(pending validation)_
  - [ ] Drag PDF handle. _(pending validation)_
  - [ ] Mark as added/imported. _(pending validation)_
- [ ] Add queue warnings. _(pending validation)_
  - [ ] Missing local PDF. _(pending validation)_
  - [ ] Unsupported source without a downloaded file. _(pending validation)_
- [ ] Add tests for queue add/remove/duplicate behavior. _(pending validation)_

Acceptance criteria:

- The user can build a batch of papers before opening a large NotebookLM pane. _(pending validation)_
- Queue state is visible and explicit. _(pending validation)_
- Drag handles remain reliable for local PDFs. _(pending validation)_

## Phase 2.4: Mode Layouts

Goal: reshape the app based on the user's current task.

Tasks:

- [ ] Implement Explore mode layout. _(pending validation)_
  - [ ] Paper library gets most of the screen. _(pending validation)_
  - [ ] NotebookLM rail is minimized or hidden. _(pending validation)_
- [ ] Implement Build Notebook mode layout. _(pending validation)_
  - [ ] Queue is the primary left-side panel. _(pending validation)_
  - [ ] NotebookLM is expanded for drag/drop. _(pending validation)_
  - [ ] Filtered paper list remains available in a secondary area. _(pending validation)_
- [ ] Implement Notebook mode layout. _(pending validation)_
  - [ ] NotebookLM gets most of the screen. _(pending validation)_
  - [ ] Paper Bot sidebar collapses to queue/recent/search context. _(pending validation)_
- [ ] Preserve mode state while filtering, selecting, and queueing papers. _(pending validation)_
- [ ] Add tests for mode switching. _(pending validation)_

Acceptance criteria:

- Explore mode is not cramped by NotebookLM. _(pending validation)_
- Build Notebook mode makes drag/drop obvious. _(pending validation)_
- Notebook mode gives NotebookLM enough room for real study. _(pending validation)_

## Phase 2.5: Data Model Enrichment

Goal: support category/date exploration with durable metadata.

Tasks:

- [ ] Add a SQLite migration strategy. _(pending validation)_
- [ ] Add `category` to `papers`. _(pending validation)_
- [ ] Add `tags` to `papers` or introduce a tags table. _(pending validation)_
- [ ] Add `notebook_status`. _(pending validation)_
- [ ] Add `last_opened_at`. _(pending validation)_
- [ ] Add `notes`. _(pending validation)_
- [ ] Update `fetch_papers.py` to store category when available. _(pending validation)_
- [ ] Update `migrate_to_sqlite.py`. _(pending validation)_
- [ ] Update tests for new schema fields. _(pending validation)_

Acceptance criteria:

- Existing databases can be upgraded without data loss. _(pending validation)_
- New paper fetches include category where available. _(pending validation)_
- The UI can filter on stored category and notebook status. _(pending validation)_

## Phase 2.6: PDF Preview

Goal: make paper inspection richer inside Explore mode.

Tasks:

- [ ] Decide preview strategy. _(pending validation: local file preview route with Finder fallback)_
  - [ ] Browser PDF embed. _(not selected)_
  - [ ] Electron shell open. _(fallback, pending validation)_
  - [ ] Local file preview route. _(pending validation)_
- [ ] Add a PDF preview action in the detail pane. _(pending validation)_
- [ ] Keep a fallback to reveal/open in Finder. _(pending validation)_
- [ ] Handle missing PDFs clearly. _(pending validation)_
- [ ] Test UI behavior for papers with and without `local_path`. _(pending validation)_

Acceptance criteria:

- The user can quickly inspect the PDF or open it externally. _(pending validation)_
- Missing files fail gracefully. _(pending validation)_

## Phase 2.7: Persistence and Polish

Goal: make the workflow feel stable across sessions.

Tasks:

- [ ] Persist queue state locally or in SQLite. _(pending validation: local storage)_
- [ ] Persist active filters locally. _(pending validation)_
- [ ] Persist last selected mode locally. _(pending validation)_
- [ ] Add recent papers. _(pending validation)_
- [ ] Improve visual states. _(pending validation)_
  - [ ] Selected. _(pending validation)_
  - [ ] Queued. _(pending validation)_
  - [ ] Added to NotebookLM. _(pending validation)_
  - [ ] Missing PDF. _(pending validation)_
- [ ] Add keyboard-friendly interactions for search and mode switching. _(pending validation)_

Acceptance criteria:

- The user can restart the app without losing their working context. _(pending validation)_
- The interface clearly shows what stage each paper is in. _(pending validation)_

## Open Questions

- Should queue state be session-only first, or persisted from the start? Decision pending validation: persisted locally first.
- Should `category` be fully automated from source metadata or user-editable immediately? Decision pending validation: automated from source metadata first.
- Should `notebook_status` be manually set only, or inferred from drag/drop actions? Decision pending validation: manually set after import.
- Should PDF preview be embedded in-app or left to the operating system initially? Decision pending validation: in-app file preview with Finder fallback.
- Should tags be a simple JSON field first or normalized into separate tables? Decision pending validation: JSON field first.

