# Phase 2 Tasks

## Phase 2.1: Explorer Upgrade

Goal: make the paper library useful for discovery before touching NotebookLM behavior.

Tasks:

- [ ] Add an app mode state with `Explore` as the default mode.
- [ ] Create a stable app shell with mode navigation.
- [ ] Expand the paper table columns:
  - [ ] Selection checkbox.
  - [ ] Title.
  - [ ] Authors.
  - [ ] Category.
  - [ ] Source.
  - [ ] Published date.
  - [ ] Downloaded date.
  - [ ] Status.
  - [ ] Queue indicator.
- [ ] Add filter controls:
  - [ ] Search text.
  - [ ] Category.
  - [ ] Source.
  - [ ] Status.
  - [ ] Published date range.
  - [ ] Downloaded date range.
- [ ] Add sort controls:
  - [ ] Newest published.
  - [ ] Oldest published.
  - [ ] Newest downloaded.
  - [ ] Oldest downloaded.
  - [ ] Title.
  - [ ] Status.
- [ ] Add an empty state for no matching papers.
- [ ] Add tests for filtering and sorting behavior.

Acceptance criteria:

- The user can find papers by category/source/status/date without opening NotebookLM.
- The table remains readable at normal desktop sizes.
- Existing status updates and drag behavior still work.

## Phase 2.2: Paper Detail Pane

Goal: let the user inspect a paper before deciding whether it belongs in a notebook.

Tasks:

- [ ] Add selected paper state.
- [ ] Open a detail pane/drawer when clicking a paper row.
- [ ] Show metadata:
  - [ ] Title.
  - [ ] Authors.
  - [ ] Category.
  - [ ] Source.
  - [ ] Published date.
  - [ ] Downloaded date.
  - [ ] Status.
- [ ] Show the abstract/summary.
- [ ] Add actions:
  - [ ] Add to queue.
  - [ ] Open/reveal PDF.
  - [ ] Update status.
- [ ] Add a missing-PDF warning when `local_path` is absent or invalid.
- [ ] Add tests for selecting a paper and rendering detail content.

Acceptance criteria:

- A paper can be inspected without losing the current filter context.
- The abstract is readable in the app.
- The user can add a paper to the queue from the detail pane.

## Phase 2.3: Notebook Queue

Goal: create an explicit staging area for papers before NotebookLM upload.

Tasks:

- [ ] Add queue state in the renderer.
- [ ] Add checkbox-based multi-select in Explore mode.
- [ ] Add selected papers to queue.
- [ ] Prevent duplicate queue entries.
- [ ] Show queued state in the table.
- [ ] Build a queue panel/list.
- [ ] Add queue item actions:
  - [ ] Remove from queue.
  - [ ] Clear queue.
  - [ ] Reveal PDF in Finder.
  - [ ] Drag PDF handle.
  - [ ] Mark as added/imported.
- [ ] Add queue warnings:
  - [ ] Missing local PDF.
  - [ ] Unsupported source without a downloaded file.
- [ ] Add tests for queue add/remove/duplicate behavior.

Acceptance criteria:

- The user can build a batch of papers before opening a large NotebookLM pane.
- Queue state is visible and explicit.
- Drag handles remain reliable for local PDFs.

## Phase 2.4: Mode Layouts

Goal: reshape the app based on the user's current task.

Tasks:

- [ ] Implement Explore mode layout:
  - [ ] Paper library gets most of the screen.
  - [ ] NotebookLM rail is minimized or hidden.
- [ ] Implement Build Notebook mode layout:
  - [ ] Queue is the primary left-side panel.
  - [ ] NotebookLM is expanded for drag/drop.
  - [ ] Filtered paper list remains available in a secondary area.
- [ ] Implement Notebook mode layout:
  - [ ] NotebookLM gets most of the screen.
  - [ ] Paper Bot sidebar collapses to queue/recent/search context.
- [ ] Preserve mode state while filtering, selecting, and queueing papers.
- [ ] Add tests for mode switching.

Acceptance criteria:

- Explore mode is not cramped by NotebookLM.
- Build Notebook mode makes drag/drop obvious.
- Notebook mode gives NotebookLM enough room for real study.

## Phase 2.5: Data Model Enrichment

Goal: support category/date exploration with durable metadata.

Tasks:

- [ ] Add a SQLite migration strategy.
- [ ] Add `category` to `papers`.
- [ ] Add `tags` to `papers` or introduce a tags table.
- [ ] Add `notebook_status`.
- [ ] Add `last_opened_at`.
- [ ] Add `notes`.
- [ ] Update `fetch_papers.py` to store category when available.
- [ ] Update `migrate_to_sqlite.py`.
- [ ] Update tests for new schema fields.

Acceptance criteria:

- Existing databases can be upgraded without data loss.
- New paper fetches include category where available.
- The UI can filter on stored category and notebook status.

## Phase 2.6: PDF Preview

Goal: make paper inspection richer inside Explore mode.

Tasks:

- [ ] Decide preview strategy:
  - [ ] Browser PDF embed.
  - [ ] Electron shell open.
  - [ ] Local file preview route.
- [ ] Add a PDF preview action in the detail pane.
- [ ] Keep a fallback to reveal/open in Finder.
- [ ] Handle missing PDFs clearly.
- [ ] Test UI behavior for papers with and without `local_path`.

Acceptance criteria:

- The user can quickly inspect the PDF or open it externally.
- Missing files fail gracefully.

## Phase 2.7: Persistence and Polish

Goal: make the workflow feel stable across sessions.

Tasks:

- [ ] Persist queue state locally or in SQLite.
- [ ] Persist active filters locally.
- [ ] Persist last selected mode locally.
- [ ] Add recent papers.
- [ ] Improve visual states:
  - [ ] Selected.
  - [ ] Queued.
  - [ ] Added to NotebookLM.
  - [ ] Missing PDF.
- [ ] Add keyboard-friendly interactions for search and mode switching.

Acceptance criteria:

- The user can restart the app without losing their working context.
- The interface clearly shows what stage each paper is in.

## Open Questions

- Should queue state be session-only first, or persisted from the start?
- Should `category` be fully automated from source metadata or user-editable immediately?
- Should `notebook_status` be manually set only, or inferred from drag/drop actions?
- Should PDF preview be embedded in-app or left to the operating system initially?
- Should tags be a simple JSON field first or normalized into separate tables?

