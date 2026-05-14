import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import React from 'react';

// Mock the electronAPI
const mockGetPapers = vi.fn();
const mockUpdatePaperStatus = vi.fn();
const mockStartDrag = vi.fn();

window.electronAPI = {
  getPapers: mockGetPapers,
  updatePaperStatus: mockUpdatePaperStatus,
  startDrag: mockStartDrag,
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    mockGetPapers.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<App />);
    expect(screen.getByText(/Loading papers.../i)).toBeDefined();
  });

  it('renders papers after loading', async () => {
    const mockPapers = [
      {
        id: '1',
        title: 'Test Paper 1',
        authors: JSON.stringify(['Author 1']),
        published: '2023-01-01',
        status: 'UNREAD',
        local_path: '../papers/test1.pdf'
      }
    ];
    mockGetPapers.mockResolvedValue(mockPapers);
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading papers.../i)).toBeNull();
    });

    expect(screen.getByText('Test Paper 1')).toBeDefined();
    expect(screen.getByText('Author 1')).toBeDefined();
    expect(screen.getByText(/Published/)).toBeDefined();
    expect(screen.getByText(/Jan 1, 2023|Jan 01, 2023|1 Jan 2023/)).toBeDefined();
  });
});
