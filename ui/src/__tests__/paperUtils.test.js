import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  filterAndSortPapers,
  formatDate,
  getNotebookStatus,
  getPaperCategory,
  parseAuthors,
  toDateInputValue,
} from '../paperUtils'

const papers = [
  {
    id: 'a',
    title: 'RecursiveMAS',
    authors: JSON.stringify(['Ada', 'Grace']),
    summary: 'recursive multi-agent systems',
    category: 'MAS',
    source: 'arxiv',
    status: 'UNREAD',
    notebook_status: 'NOT_ADDED',
    published: '2026-05-10',
    downloaded_at: '2026-05-14T12:00:00.000Z',
  },
  {
    id: 'b',
    title: 'AutoGUI-v2',
    authors: 'Linus',
    summary: 'gui benchmark',
    category: 'GUI Agents',
    source: 'hf_trending',
    status: 'READING',
    notebook_status: 'ADDED',
    published: '2026-05-08',
    downloaded_at: '2026-05-13T12:00:00.000Z',
  },
]

describe('paperUtils', () => {
  it('parses authors from arrays, JSON strings, and plain strings', () => {
    expect(parseAuthors(['A', 'B'])).toEqual(['A', 'B'])
    expect(parseAuthors(JSON.stringify(['A', 'B']))).toEqual(['A', 'B'])
    expect(parseAuthors('Plain Author')).toEqual(['Plain Author'])
    expect(parseAuthors()).toEqual([])
  })

  it('formats date-only strings without timezone day drift', () => {
    expect(formatDate('2026-05-10')).toMatch(/May 10, 2026|10 May 2026/)
    expect(toDateInputValue('2026-05-14T12:00:00.000Z')).toBe('2026-05-14')
    expect(formatDate('not-a-date')).toBeNull()
  })

  it('returns category and notebook status fallbacks', () => {
    expect(getPaperCategory({ primary_category: 'cs.AI' })).toBe('cs.AI')
    expect(getPaperCategory({})).toBe('Uncategorized')
    expect(getNotebookStatus({ id: 'a', notebook_status: 'NOT_ADDED' }, ['a'])).toBe('QUEUED')
    expect(getNotebookStatus({ id: 'b', notebook_status: 'ADDED' }, ['b'])).toBe('ADDED')
  })

  it('filters by search, category, source, status, and date ranges', () => {
    const result = filterAndSortPapers(papers, {
      ...DEFAULT_FILTERS,
      search: 'benchmark',
      category: 'GUI Agents',
      source: 'hf_trending',
      status: 'READING',
      publishedFrom: '2026-05-01',
      publishedTo: '2026-05-09',
      downloadedFrom: '2026-05-13',
      downloadedTo: '2026-05-13',
    })

    expect(result.map((paper) => paper.id)).toEqual(['b'])
  })

  it('sorts by published, downloaded, title, and status', () => {
    expect(filterAndSortPapers(papers, { ...DEFAULT_FILTERS, sort: 'published-asc' }).map((paper) => paper.id)).toEqual(['b', 'a'])
    expect(filterAndSortPapers(papers, { ...DEFAULT_FILTERS, sort: 'downloaded-desc' }).map((paper) => paper.id)).toEqual(['a', 'b'])
    expect(filterAndSortPapers(papers, { ...DEFAULT_FILTERS, sort: 'title-asc' }).map((paper) => paper.id)).toEqual(['b', 'a'])
    expect(filterAndSortPapers(papers, { ...DEFAULT_FILTERS, sort: 'status-asc' }).map((paper) => paper.id)).toEqual(['b', 'a'])
  })
})
