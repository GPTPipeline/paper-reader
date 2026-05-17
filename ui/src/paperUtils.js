export const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  source: 'all',
  status: 'all',
  publishedFrom: '',
  publishedTo: '',
  downloadedFrom: '',
  downloadedTo: '',
  sort: 'published-desc',
}

export const parseAuthors = (authors) => {
  if (Array.isArray(authors)) return authors
  if (!authors) return []
  try {
    const parsed = JSON.parse(authors)
    return Array.isArray(parsed) ? parsed : [String(parsed)]
  } catch {
    return [String(authors)]
  }
}

export const toDateInputValue = (value) => {
  if (!value) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match ? match[1] : ''
}

export const formatDate = (value) => {
  if (!value) return null
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const getPublishedDateLabel = (paper) => formatDate(paper.published) || 'N/A'
export const getDownloadedDateLabel = (paper) => formatDate(paper.downloaded_at) || 'N/A'
export const getPaperCategory = (paper) => paper.category || paper.primary_category || 'Uncategorized'

export const getNotebookStatus = (paper, queueIds) => {
  if (paper.notebook_status === 'ADDED') return 'ADDED'
  return queueIds.includes(paper.id) ? 'QUEUED' : (paper.notebook_status || 'NOT_ADDED')
}

export const filterAndSortPapers = (papers, filters) => {
  const search = filters.search.trim().toLowerCase()
  const inRange = (value, from, to) => {
    const dateValue = toDateInputValue(value)
    if (from && (!dateValue || dateValue < from)) return false
    if (to && (!dateValue || dateValue > to)) return false
    return true
  }

  const items = papers.filter((paper) => {
    const authors = parseAuthors(paper.authors).join(', ')
    const category = getPaperCategory(paper)
    const source = paper.source || 'unknown'

    if (search) {
      const haystack = `${paper.title || ''} ${authors} ${paper.summary || ''}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    if (filters.category !== 'all' && category !== filters.category) return false
    if (filters.source !== 'all' && source !== filters.source) return false
    if (filters.status !== 'all' && paper.status !== filters.status) return false
    if (!inRange(paper.published, filters.publishedFrom, filters.publishedTo)) return false
    if (!inRange(paper.downloaded_at, filters.downloadedFrom, filters.downloadedTo)) return false
    return true
  })

  const [sortKey, direction] = filters.sort.split('-')
  items.sort((a, b) => {
    const values = {
      published: [a.published || '', b.published || ''],
      downloaded: [a.downloaded_at || '', b.downloaded_at || ''],
      title: [a.title || '', b.title || ''],
      status: [a.status || '', b.status || ''],
    }[sortKey] || ['', '']

    const [aValue, bValue] = values
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })

  return items
}
