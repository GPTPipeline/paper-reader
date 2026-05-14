# Phase 2 Design: Paper Exploration and NotebookLM Workflow

## Goal

Improve Paper Bot from a simple paper list into a workflow-oriented research workspace.

The primary user flow is:

1. Explore papers by category, source, published date, downloaded date, and status.
2. Inspect promising papers through abstract and PDF previews.
3. Add selected papers to a notebook queue.
4. Use drag and drop to move queued PDFs into NotebookLM.
5. Switch into a NotebookLM-focused mode for deeper study.

The design should separate discovery from NotebookLM work. Exploration needs room and dense controls; NotebookLM should become prominent only when the user is ready to build or use a notebook.

## Product Model

The app should use three modes:

1. Explore
2. Build Notebook
3. Notebook

The conceptual workflow is:

```text
Library -> Queue -> Notebook
```

## Mode 1: Explore

Explore mode is the default mode and gives most of the screen to the paper library.

NotebookLM should be minimized or hidden in a narrow right rail.

### Layout

```text
┌────────────────────────────────────────────────────────────────────┬──────┐
│ Paper Bot                                      Explore | Queue | LM │  LM  │
├────────────────────────────────────────────────────────────────────┤ Rail │
│ Search papers...                                                   │      │
│                                                                    │  >   │
│ Category: [All v]  Source: [All v]  Status: [Unread v]             │      │
│ Published: [Any v] Downloaded: [Any v] Sort: [Newest published v]  │      │
├────────────────────────────────────────────────────────────────────┤      │
│ □  Title                              Category   Published Status  │      │
│ □  Multi-agent orchestration traces   AI Agents  May 12     UNREAD │      │
│ □  RecursiveMAS                       MAS        May 10     READ   │      │
│ □  AutoGUI-v2                         GUI Agents May 08     UNREAD │      │
│ □  FlashRT                            Security   May 04     READING│      │
│                                                                    │      │
└────────────────────────────────────────────────────────────────────┴──────┘
```

### Paper Detail View

Clicking a paper should open a detail pane or drawer without leaving Explore mode.

```text
┌──────────────────────────────────────────────┬─────────────────────┬──────┐
│ Paper table                                  │ Paper Details       │  LM  │
│                                              │                     │ Rail │
│ □ Title                         Published    │ RecursiveMAS        │      │
│ ■ RecursiveMAS                  May 10       │                     │  >   │
│ □ AutoGUI-v2                    May 08       │ Authors...          │      │
│ □ FlashRT                       May 04       │ Published: May 10   │      │
│                                              │ Downloaded: May 14  │      │
│                                              │ Category: MAS       │      │
│                                              │ Status: UNREAD      │      │
│                                              │                     │      │
│                                              │ Abstract            │      │
│                                              │ ─────────           │      │
│                                              │ Long abstract text  │      │
│                                              │ wraps here...       │      │
│                                              │                     │      │
│                                              │ [Add to Queue]      │      │
│                                              │ [Open PDF]          │      │
└──────────────────────────────────────────────┴─────────────────────┴──────┘
```

### Explore Filters

The first useful filter set should include:

- Search text across title, authors, and abstract.
- Category.
- Source.
- Status.
- Published date range.
- Downloaded date range.
- Sort order.

Recommended sort options:

- Newest published.
- Oldest published.
- Newest downloaded.
- Oldest downloaded.
- Title.
- Status.

### Explore Table Columns

Recommended columns:

- Selection checkbox.
- Title.
- Authors.
- Category.
- Source.
- Published date.
- Downloaded date.
- Status.
- Queue indicator.

## Mode 2: Build Notebook

Build Notebook mode is for preparing and pushing papers into NotebookLM.

NotebookLM should be expanded and the selected paper queue should be the primary drag source.

### Layout

```text
┌──────────────────────────────────────┬─────────────────────────────────────┐
│ Paper Bot       Explore | Queue | LM │ NotebookLM                          │
├──────────────────────────────────────┤                                     │
│ Notebook Queue                       │                                     │
│                                      │                                     │
│ Drag papers into NotebookLM          │                                     │
│                                      │                                     │
│ ⠿ RecursiveMAS                       │                                     │
│   May 10 | MAS | unread              │                                     │
│                                      │                                     │
│ ⠿ AutoGUI-v2                         │                                     │
│   May 08 | GUI Agents | unread       │                                     │
│                                      │                                     │
│ ⠿ FlashRT                            │                                     │
│   May 04 | Security | reading        │                                     │
│                                      │                                     │
│ [Clear Queue] [Back to Explore]      │                                     │
├──────────────────────────────────────┤                                     │
│ Also in current filter               │                                     │
│ □ Other paper                        │                                     │
│ □ Another paper                      │                                     │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### Queue Behavior

The queue should be local UI state at first and can become persisted later.

Queue actions:

- Add selected paper.
- Remove queued paper.
- Clear queue.
- Drag paper PDF to NotebookLM.
- Reveal PDF in Finder.
- Mark paper as added/imported manually.

Queue warnings:

- Missing local PDF.
- Unsupported source without a downloaded file.
- Duplicate queued paper.

## Mode 3: Notebook

Notebook mode gives most of the screen to NotebookLM.

The Paper Bot explorer should collapse into a compact sidebar that keeps queue and recent paper context available.

### Layout

```text
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ Paper Bot    │ NotebookLM                                                   │
│              │                                                              │
│ [Explore]    │                                                              │
│ [Queue]      │                                                              │
│ [Notebook]   │                                                              │
│              │                                                              │
│ Queue        │                                                              │
│ 3 papers     │                                                              │
│              │                                                              │
│ Recent       │                                                              │
│ RecursiveMAS │                                                              │
│ AutoGUI-v2   │                                                              │
│ FlashRT      │                                                              │
│              │                                                              │
│ Search       │                                                              │
│ 🔍           │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

## App Shell

All modes should share stable navigation.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Paper Bot        [Explore] [Build Notebook] [NotebookLM]        Search...  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Mode-specific layout goes here                                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Data Model Direction

The current paper model is too flat for exploration. Phase 2 should move toward richer metadata.

Recommended fields:

- `category`
- `tags`
- `published`
- `downloaded_at`
- `source`
- `status`
- `notebook_status`
- `last_opened_at`
- `notes`

Initial implementation can derive or approximate category:

- For arXiv, store the primary arXiv category if available.
- For Hugging Face daily papers, store a source/category marker if no richer category exists.
- Allow manual overrides later.

Recommended `notebook_status` values:

- `NOT_ADDED`
- `QUEUED`
- `ADDED`

## Implementation Principles

- Keep exploration and NotebookLM interaction separate.
- Keep drag and drop pragmatic; use Electron native drag for local PDFs.
- Make the queue explicit rather than relying on hidden selection state.
- Preserve the current NotebookLM webview approach unless it becomes a hard blocker.
- Favor a dense, work-focused interface over a landing-page style layout.
- Do not automate NotebookLM interactions unless there is a reliable supported path.

