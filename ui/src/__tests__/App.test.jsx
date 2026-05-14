import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import React from 'react';

const mockGetPapers = vi.fn();
const mockUpdatePaperStatus = vi.fn();
const mockUpdateNotebookStatus = vi.fn();
const mockStartDrag = vi.fn();
const mockOpenNotebook = vi.fn();
const mockGetPdfPreview = vi.fn();
const mockUpdateLastOpened = vi.fn();

window.electronAPI = {
  getPapers: mockGetPapers,
  updatePaperStatus: mockUpdatePaperStatus,
  updateNotebookStatus: mockUpdateNotebookStatus,
  startDrag: mockStartDrag,
  openNotebook: mockOpenNotebook,
  getPdfPreview: mockGetPdfPreview,
  updateLastOpened: mockUpdateLastOpened,
};

const storage = new Map();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key) => storage.get(key) ?? null),
    setItem: vi.fn((key, value) => storage.set(key, value)),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  },
  configurable: true,
});

const mockPapers = [
  {
    id: '1',
    title: 'RecursiveMAS',
    authors: JSON.stringify(['Author 1']),
    published: '2026-05-10',
    downloaded_at: '2026-05-14',
    category: 'MAS',
    source: 'arxiv',
    summary: 'A recursive multi-agent systems paper.',
    status: 'UNREAD',
    notebook_status: 'NOT_ADDED',
    local_path: '../papers/recursive.pdf',
  },
  {
    id: '2',
    title: 'AutoGUI-v2',
    authors: JSON.stringify(['Author 2']),
    published: '2026-05-08',
    downloaded_at: '2026-05-13',
    category: 'GUI Agents',
    source: 'hf_trending',
    summary: 'A GUI agents benchmark.',
    status: 'READING',
    notebook_status: 'NOT_ADDED',
    local_path: '',
  },
];

const renderLoadedApp = async (papers = mockPapers) => {
  mockGetPapers.mockResolvedValue(papers);
  render(<App />);
  await waitFor(() => {
    expect(screen.queryByText(/Loading papers.../i)).toBeNull();
  });
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUpdatePaperStatus.mockResolvedValue(true);
    mockUpdateNotebookStatus.mockResolvedValue(true);
    mockUpdateLastOpened.mockResolvedValue(true);
    mockGetPdfPreview.mockResolvedValue({ ok: true, url: 'file:///tmp/recursive.pdf' });
  });

  it('renders loading state initially', async () => {
    mockGetPapers.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/Loading papers.../i)).toBeDefined();
  });

  it('defaults to explore mode after loading', async () => {
    await renderLoadedApp([]);

    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('explore');
  });

  it('renders expanded paper columns after loading', async () => {
    await renderLoadedApp();

    expect(screen.getByText('RecursiveMAS')).toBeDefined();
    expect(screen.getByText('Author 1')).toBeDefined();
    expect(screen.getAllByText('Category').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Source').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Downloaded').length).toBeGreaterThan(0);
    expect(screen.getByText('Notebook')).toBeDefined();
    expect(screen.getByText(/May 10, 2026|10 May 2026/)).toBeDefined();
  });

  it('filters by category and search text', async () => {
    await renderLoadedApp();

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'GUI Agents' } });
    expect(screen.queryByText('RecursiveMAS')).toBeNull();
    expect(screen.getByText('AutoGUI-v2')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Search papers'), { target: { value: 'recursive' } });
    expect(screen.getByText('No papers found matching your search.')).toBeDefined();
  });

  it('sorts by oldest published', async () => {
    await renderLoadedApp();

    fireEvent.change(screen.getByLabelText('Sort papers'), { target: { value: 'published-asc' } });
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('AutoGUI-v2')).toBeDefined();
    expect(within(rows[2]).getByText('RecursiveMAS')).toBeDefined();
  });

  it('opens paper details and supports preview and queue actions', async () => {
    await renderLoadedApp();

    fireEvent.click(screen.getByText('RecursiveMAS'));
    expect(screen.getByText('A recursive multi-agent systems paper.')).toBeDefined();
    expect(mockUpdateLastOpened).toHaveBeenCalledWith('1');

    fireEvent.click(screen.getByText('Preview PDF'));
    await waitFor(() => {
      expect(screen.getByTitle('PDF preview')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add to Queue'));
    expect(screen.getByText('1 queued')).toBeDefined();
  });

  it('adds selected papers to the queue and prevents duplicate visible entries', async () => {
    await renderLoadedApp();

    const addSelectedButton = screen.getByRole('button', { name: 'Add Selected to Queue' });
    expect(addSelectedButton.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Select RecursiveMAS'));
    expect(screen.getByText(/1 selected/)).toBeDefined();
    expect(addSelectedButton.disabled).toBe(false);
    fireEvent.click(addSelectedButton);
    expect(screen.getByText('1 queued')).toBeDefined();
    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('build-notebook');
    expect(screen.getByText('Notebook Queue')).toBeDefined();
    expect(screen.getByText('QUEUED')).toBeDefined();

    fireEvent.click(screen.getByText('Explore'));
    fireEvent.click(screen.getByLabelText('Select RecursiveMAS'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Selected to Queue' }));
    expect(screen.getByText('1 queued')).toBeDefined();

    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('build-notebook');
    expect(screen.getAllByText('RecursiveMAS')).toHaveLength(2);
    expect(screen.getAllByTitle('Drag PDF to NotebookLM').length).toBeGreaterThan(0);
  });

  it('queues a single paper from the row action and shows explore queue feedback', async () => {
    await renderLoadedApp();

    fireEvent.click(screen.getAllByText('+ Queue')[0]);

    expect(screen.getByText('1 queued')).toBeDefined();
    expect(screen.getByLabelText('Explore queue summary')).toBeDefined();
    expect(screen.getByText(/1 queued:/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'View Queue' })).toBeDefined();
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0);
  });

  it('marks queued papers as added', async () => {
    await renderLoadedApp();

    fireEvent.click(screen.getByLabelText('Select RecursiveMAS'));
    fireEvent.click(screen.getByText('Add Selected to Queue'));
    fireEvent.click(screen.getByText('Build Notebook'));
    fireEvent.click(screen.getByText('Mark Added'));

    await waitFor(() => {
      expect(mockUpdateNotebookStatus).toHaveBeenCalledWith('1', 'ADDED');
    });
  });

  it('switches to NotebookLM mode and keeps recent paper context', async () => {
    await renderLoadedApp();

    fireEvent.click(screen.getByText('RecursiveMAS'));
    fireEvent.click(screen.getByText('NotebookLM'));

    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('notebook');
    expect(screen.getByText('Recent')).toBeDefined();
    expect(screen.getByText('RecursiveMAS')).toBeDefined();
  });

  it('supports keyboard shortcuts for modes and search focus', async () => {
    await renderLoadedApp();

    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('build-notebook');

    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('notebook');

    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getByTestId('app-shell').getAttribute('data-app-mode')).toBe('explore');
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Search papers'));
    });
  });

  it('shows missing PDF warnings in the detail pane and queue', async () => {
    await renderLoadedApp();

    fireEvent.click(screen.getByText('AutoGUI-v2'));
    expect(screen.getByText(/Missing local PDF/)).toBeDefined();
    fireEvent.click(screen.getByText('Add to Queue'));
    fireEvent.click(screen.getByText('Build Notebook'));
    expect(screen.getAllByText(/Missing local PDF/).length).toBeGreaterThan(0);
  });
});
