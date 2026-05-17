import { useState, useEffect, useMemo, useRef } from 'react'
import {
  DEFAULT_FILTERS,
  filterAndSortPapers,
  formatDate,
  getDownloadedDateLabel,
  getNotebookStatus,
  getPaperCategory,
  getPublishedDateLabel,
  parseAuthors,
} from './paperUtils'

const APP_MODES = {
  EXPLORE: 'explore',
  BUILD_NOTEBOOK: 'build-notebook',
  NOTEBOOK: 'notebook',
}

const STORAGE_KEYS = {
  MODE: 'paperBot.activeMode',
  FILTERS: 'paperBot.filters',
  QUEUE: 'paperBot.queueIds',
  RECENTS: 'paperBot.recentPaperIds',
}

const colors = {
  page: '#0f0f0f',
  pane: '#0f0f0f',
  paneAlt: '#171717',
  paneBorder: '#2a2a2a',
  header: '#171717',
  text: '#f1f3f4',
  muted: '#bdc1c6',
  subtle: '#8f8f8f',
  tableBorder: '#2f2f2f',
  rowBorder: '#242424',
  card: '#1b1b1b',
  cardActive: '#202124',
  cardBorder: '#303030',
  cardShadow: '0 1px 3px rgba(0,0,0,0.35)',
  control: '#181818',
  controlBorder: '#3c4043',
  controlText: '#f1f3f4',
  handle: '#2a2a2a',
  handleBorder: '#3c4043',
  primary: '#8ab4f8',
  primaryHover: '#a8c7fa',
  primaryText: '#0f0f0f',
  danger: '#f28b82',
  unreadBg: '#2a2a2a',
  unreadText: '#f1f3f4',
  readingBg: '#12395f',
  readingText: '#bfdbfe',
  readBg: '#14532d',
  readText: '#bbf7d0',
  archivedBg: '#3c4043',
  archivedText: '#dadce0',
}

const readStorage = (key, fallback) => {
  try {
    const value = window.localStorage?.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const writeStorage = (key, value) => {
  try {
    window.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures; the app remains usable for the current session.
  }
}

const getStatusStyle = (status) => {
  if (status === 'READING') return { backgroundColor: colors.readingBg, color: colors.readingText }
  if (status === 'READ') return { backgroundColor: colors.readBg, color: colors.readText }
  if (status === 'ARCHIVED') return { backgroundColor: colors.archivedBg, color: colors.archivedText }
  return { backgroundColor: colors.unreadBg, color: colors.unreadText }
}

const getNotebookStatusStyle = (status) => {
  if (status === 'ADDED') return { backgroundColor: colors.readBg, color: colors.readText }
  if (status === 'QUEUED') return { backgroundColor: colors.readingBg, color: colors.readingText }
  return { backgroundColor: colors.unreadBg, color: colors.unreadText }
}

const controlStyle = {
  padding: '8px',
  borderRadius: '6px',
  border: `1px solid ${colors.controlBorder}`,
  backgroundColor: colors.control,
  color: colors.controlText,
  boxSizing: 'border-box',
}

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: colors.primary,
  color: colors.primaryText,
  fontWeight: 600,
}

const ghostButtonStyle = {
  ...buttonStyle,
  border: `1px solid ${colors.controlBorder}`,
  backgroundColor: colors.control,
  color: colors.controlText,
  fontWeight: 500,
}

function App() {
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...readStorage(STORAGE_KEYS.FILTERS, {}) }))
  const [selectedPaperId, setSelectedPaperId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [queueIds, setQueueIds] = useState(() => readStorage(STORAGE_KEYS.QUEUE, []))
  const [recentPaperIds, setRecentPaperIds] = useState(() => readStorage(STORAGE_KEYS.RECENTS, []))
  const [activeMode, setActiveMode] = useState(() => readStorage(STORAGE_KEYS.MODE, APP_MODES.EXPLORE))
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    fetchPapers()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isEditable = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement

      if ((event.metaKey || event.ctrlKey) && event.key === '1') {
        event.preventDefault()
        setActiveMode(APP_MODES.EXPLORE)
      } else if ((event.metaKey || event.ctrlKey) && event.key === '2') {
        event.preventDefault()
        setActiveMode(APP_MODES.BUILD_NOTEBOOK)
      } else if ((event.metaKey || event.ctrlKey) && event.key === '3') {
        event.preventDefault()
        setActiveMode(APP_MODES.NOTEBOOK)
      } else if (!isEditable && event.key === '/') {
        event.preventDefault()
        setActiveMode(APP_MODES.EXPLORE)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.FILTERS, filters)
  }, [filters])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.MODE, activeMode)
  }, [activeMode])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.QUEUE, queueIds)
  }, [queueIds])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.RECENTS, recentPaperIds)
  }, [recentPaperIds])

  const paperById = useMemo(() => {
    return new Map(papers.map((paper) => [paper.id, paper]))
  }, [papers])

  const selectedPaper = selectedPaperId ? paperById.get(selectedPaperId) : null
  const queuedPapers = queueIds.map((id) => paperById.get(id)).filter(Boolean)
  const recentPapers = recentPaperIds.map((id) => paperById.get(id)).filter(Boolean)

  const categories = useMemo(() => {
    return Array.from(new Set(papers.map(getPaperCategory))).sort()
  }, [papers])

  const sources = useMemo(() => {
    return Array.from(new Set(papers.map((paper) => paper.source || 'unknown'))).sort()
  }, [papers])

  const fetchPapers = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getPapers()
      setPapers(data)
    } catch (error) {
      console.error('Failed to fetch papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const success = await window.electronAPI.updatePaperStatus(id, newStatus)
      if (success) {
        setPapers((current) => current.map((paper) => paper.id === id ? { ...paper, status: newStatus } : paper))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleNotebookStatusChange = async (id, newStatus) => {
    try {
      const success = await window.electronAPI.updateNotebookStatus?.(id, newStatus)
      if (success) {
        setPapers((current) => current.map((paper) => paper.id === id ? { ...paper, notebook_status: newStatus } : paper))
        if (newStatus === 'ADDED') {
          setQueueIds((current) => current.filter((queuedId) => queuedId !== id))
        }
      }
    } catch (error) {
      console.error('Failed to update notebook status:', error)
    }
  }

  const rememberRecentPaper = (id) => {
    setRecentPaperIds((current) => [id, ...current.filter((paperId) => paperId !== id)].slice(0, 5))
  }

  const openPaperDetails = (paper) => {
    setSelectedPaperId(paper.id)
    setPreviewUrl(null)
    setPreviewError('')
    rememberRecentPaper(paper.id)
    window.electronAPI.updateLastOpened?.(paper.id)
  }

  const toggleSelectedPaper = (paperId) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(paperId)) next.delete(paperId)
      else next.add(paperId)
      return next
    })
  }

  const addToQueue = (ids) => {
    const idsToAdd = Array.isArray(ids) ? ids : [ids]
    const validIds = idsToAdd.filter((id) => paperById.has(id))
    if (validIds.length === 0) return
    setQueueIds((current) => {
      const next = [...current]
      validIds.forEach((id) => {
        if (!next.includes(id)) next.push(id)
      })
      return next
    })
  }

  const addSelectedToQueue = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    addToQueue(ids)
    setSelectedIds(new Set())
    setActiveMode(APP_MODES.BUILD_NOTEBOOK)
  }

  const addSingleToQueue = (paperId) => {
    addToQueue(paperId)
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(paperId)
      return next
    })
  }

  const removeFromQueue = (id) => {
    setQueueIds((current) => current.filter((queuedId) => queuedId !== id))
  }

  const clearQueue = () => {
    setQueueIds([])
  }

  const handleDragStart = (e, paper) => {
    if (!paper.local_path) return
    window.electronAPI.startDrag(paper.local_path, paper.title)
    e.preventDefault()
    setTimeout(() => {
      handleStatusChange(paper.id, 'READING')
    }, 100)
  }

  const revealPdf = (paper) => {
    if (!paper.local_path) return
    window.electronAPI.openNotebook(paper.local_path)
    handleStatusChange(paper.id, 'READING')
    rememberRecentPaper(paper.id)
    window.electronAPI.updateLastOpened?.(paper.id)
  }

  const previewPdf = async (paper) => {
    setPreviewError('')
    setPreviewUrl(null)
    if (!paper.local_path) {
      setPreviewError('No downloaded PDF is available for this paper.')
      return
    }
    try {
      const result = await window.electronAPI.getPdfPreview?.(paper.local_path)
      if (result?.ok && result.url) {
        setPreviewUrl(result.url)
      } else {
        setPreviewError(result?.error || 'PDF preview is not available.')
      }
    } catch {
      setPreviewError('PDF preview is not available.')
    }
  }

  const filteredPapers = useMemo(() => filterAndSortPapers(papers, filters), [papers, filters])

  if (loading) return <div style={{
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.page,
    color: colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }}>Loading papers...</div>

  const renderModeButton = (mode, label) => (
    <button
      type="button"
      onClick={() => setActiveMode(mode)}
      aria-pressed={activeMode === mode}
      style={{
        ...ghostButtonStyle,
        backgroundColor: activeMode === mode ? colors.primary : colors.control,
        color: activeMode === mode ? colors.primaryText : colors.controlText,
      }}
    >
      {label}
    </button>
  )

  const renderFilters = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(6, minmax(120px, 1fr)) auto', gap: '8px', alignItems: 'end' }}>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Search
        <input
          ref={searchInputRef}
          type="search"
          aria-label="Search papers"
          placeholder="Titles, authors, abstracts"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          style={controlStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Category
        <select aria-label="Category" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} style={controlStyle}>
          <option value="all">All</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Source
        <select aria-label="Source" value={filters.source} onChange={(e) => updateFilter('source', e.target.value)} style={controlStyle}>
          <option value="all">All</option>
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Status
        <select aria-label="Status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} style={controlStyle}>
          <option value="all">All</option>
          <option value="UNREAD">UNREAD</option>
          <option value="READING">READING</option>
          <option value="READ">READ</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Published From
        <input aria-label="Published from" type="date" value={filters.publishedFrom} onChange={(e) => updateFilter('publishedFrom', e.target.value)} style={controlStyle} />
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Downloaded From
        <input aria-label="Downloaded from" type="date" value={filters.downloadedFrom} onChange={(e) => updateFilter('downloadedFrom', e.target.value)} style={controlStyle} />
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Sort
        <select aria-label="Sort papers" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} style={controlStyle}>
          <option value="published-desc">Newest published</option>
          <option value="published-asc">Oldest published</option>
          <option value="downloaded-desc">Newest downloaded</option>
          <option value="downloaded-asc">Oldest downloaded</option>
          <option value="title-asc">Title</option>
          <option value="status-asc">Status</option>
        </select>
      </label>
      <button type="button" onClick={resetFilters} style={ghostButtonStyle}>Reset</button>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Published To
        <input aria-label="Published to" type="date" value={filters.publishedTo} onChange={(e) => updateFilter('publishedTo', e.target.value)} style={controlStyle} />
      </label>
      <label style={{ display: 'grid', gap: '4px', color: colors.muted, fontSize: '0.8em' }}>
        Downloaded To
        <input aria-label="Downloaded to" type="date" value={filters.downloadedTo} onChange={(e) => updateFilter('downloadedTo', e.target.value)} style={controlStyle} />
      </label>
    </div>
  )

  const renderStatusBadge = (status) => (
    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.78em', whiteSpace: 'nowrap', ...getStatusStyle(status) }}>{status || 'UNREAD'}</span>
  )

  const renderNotebookBadge = (status) => (
    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.78em', whiteSpace: 'nowrap', ...getNotebookStatusStyle(status) }}>{status}</span>
  )

  const renderPaperTable = ({ compact = false } = {}) => (
    <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
      <table style={{ width: '100%', minWidth: compact ? '760px' : '1140px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left' }}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: compact ? '29%' : '25%' }} />
          {!compact && <col style={{ width: '16%' }} />}
          <col style={{ width: '12%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '11%' }} />
          {!compact && <col style={{ width: '11%' }} />}
          <col style={{ width: compact ? '13%' : '9%' }} />
          <col style={{ width: compact ? '14%' : '8%' }} />
          <col style={{ width: compact ? '16%' : '8%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `2px solid ${colors.tableBorder}`, position: 'sticky', top: 0, backgroundColor: colors.header, zIndex: 1 }}>
            <th style={{ padding: '10px', color: colors.text }}>Pick</th>
            <th style={{ padding: '10px', color: colors.text }}>Title</th>
            {!compact && <th style={{ padding: '10px', color: colors.text }}>Authors</th>}
            <th style={{ padding: '10px', color: colors.text }}>Category</th>
            <th style={{ padding: '10px', color: colors.text }}>Source</th>
            <th style={{ padding: '10px', color: colors.text }}>Published</th>
            {!compact && <th style={{ padding: '10px', color: colors.text }}>Downloaded</th>}
            <th style={{ padding: '10px', color: colors.text }}>Status</th>
            <th style={{ padding: '10px', color: colors.text }}>Notebook</th>
            <th style={{ padding: '10px', color: colors.text }}>Queue</th>
          </tr>
        </thead>
        <tbody>
          {filteredPapers.map((paper) => {
            const authors = parseAuthors(paper.authors).join(', ')
            const category = getPaperCategory(paper)
            const notebookStatus = getNotebookStatus(paper, queueIds)
            const isSelected = selectedPaperId === paper.id
            return (
              <tr
                key={paper.id}
                onClick={() => {
                  openPaperDetails(paper)
                  toggleSelectedPaper(paper.id)
                }}
                style={{ borderBottom: `1px solid ${colors.rowBorder}`, backgroundColor: isSelected ? colors.cardActive : 'transparent', cursor: 'pointer' }}
              >
                <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${paper.title}`}
                    checked={selectedIds.has(paper.id)}
                    onChange={() => toggleSelectedPaper(paper.id)}
                  />
                </td>
                <td style={{ padding: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      draggable={Boolean(paper.local_path)}
                      onDragStart={(e) => handleDragStart(e, paper)}
                      style={{ cursor: paper.local_path ? 'grab' : 'not-allowed', padding: '2px 6px', backgroundColor: colors.handle, border: `1px solid ${colors.handleBorder}`, borderRadius: '4px' }}
                      title={paper.local_path ? 'Drag PDF to NotebookLM' : 'Missing local PDF'}
                    >
                      ⠿
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div title={paper.title} style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paper.title}</div>
                      {compact && <div title={authors} style={{ color: colors.muted, fontSize: '0.82em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authors || 'Unknown authors'}</div>}
                    </div>
                  </div>
                </td>
                {!compact && <td title={authors} style={{ padding: '10px', color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authors || 'Unknown'}</td>}
                <td style={{ padding: '10px', color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{category}</td>
                <td style={{ padding: '10px', color: colors.muted, whiteSpace: 'nowrap' }}>{paper.source || 'unknown'}</td>
                <td style={{ padding: '10px', color: colors.muted, whiteSpace: 'nowrap' }}>{getPublishedDateLabel(paper)}</td>
                {!compact && <td style={{ padding: '10px', color: colors.muted, whiteSpace: 'nowrap' }}>{getDownloadedDateLabel(paper)}</td>}
                <td style={{ padding: '10px' }}>{renderStatusBadge(paper.status)}</td>
                <td style={{ padding: '10px' }}>{renderNotebookBadge(notebookStatus)}</td>
                <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => addSingleToQueue(paper.id)}
                    disabled={queueIds.includes(paper.id)}
                    style={{ ...ghostButtonStyle, padding: '5px 8px', whiteSpace: 'nowrap' }}
                  >
                    {queueIds.includes(paper.id) ? 'Queued' : '+ Queue'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {filteredPapers.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.subtle }}>
          No papers found matching your search.
        </div>
      )}
    </div>
  )

  const renderDetailPane = () => (
    <aside style={{ width: '340px', minWidth: '280px', borderLeft: `1px solid ${colors.paneBorder}`, padding: '16px', overflow: 'auto', backgroundColor: colors.paneAlt }}>
      {selectedPaper ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
            <h2 style={{ margin: 0, fontSize: '1.1em' }}>{selectedPaper.title}</h2>
            <button type="button" onClick={() => setSelectedPaperId(null)} style={ghostButtonStyle}>Close</button>
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', color: colors.muted, fontSize: '0.9em' }}>
            <dt>Authors</dt><dd style={{ margin: 0 }}>{parseAuthors(selectedPaper.authors).join(', ') || 'Unknown'}</dd>
            <dt>Category</dt><dd style={{ margin: 0 }}>{getPaperCategory(selectedPaper)}</dd>
            <dt>Source</dt><dd style={{ margin: 0 }}>{selectedPaper.source || 'unknown'}</dd>
            <dt>Published</dt><dd style={{ margin: 0 }}>{getPublishedDateLabel(selectedPaper)}</dd>
            <dt>Downloaded</dt><dd style={{ margin: 0 }}>{getDownloadedDateLabel(selectedPaper)}</dd>
            <dt>Status</dt><dd style={{ margin: 0 }}>{renderStatusBadge(selectedPaper.status)}</dd>
          </dl>
          <label style={{ display: 'grid', gap: '4px', marginTop: '12px', color: colors.muted, fontSize: '0.85em' }}>
            Update Status
            <select value={selectedPaper.status || 'UNREAD'} onChange={(e) => handleStatusChange(selectedPaper.id, e.target.value)} style={controlStyle}>
              <option value="UNREAD">UNREAD</option>
              <option value="READING">READING</option>
              <option value="READ">READ</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
          {!selectedPaper.local_path && <p role="alert" style={{ color: colors.danger }}>Missing local PDF. This source does not have a downloaded file available for drag and drop.</p>}
          <h3>Abstract</h3>
          <p style={{ color: colors.muted, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selectedPaper.summary || 'No abstract available.'}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={() => addToQueue(selectedPaper.id)} style={buttonStyle}>Add to Queue</button>
            <button type="button" onClick={() => revealPdf(selectedPaper)} disabled={!selectedPaper.local_path} style={ghostButtonStyle}>Open PDF</button>
            <button type="button" onClick={() => previewPdf(selectedPaper)} disabled={!selectedPaper.local_path} style={ghostButtonStyle}>Preview PDF</button>
          </div>
          {previewError && <p role="alert" style={{ color: colors.danger }}>{previewError}</p>}
          {previewUrl && (
            <iframe title="PDF preview" src={previewUrl} style={{ width: '100%', height: '420px', marginTop: '16px', border: `1px solid ${colors.paneBorder}`, borderRadius: '6px' }} />
          )}
        </>
      ) : (
        <div style={{ color: colors.subtle }}>Select a paper to inspect its abstract, metadata, and PDF actions.</div>
      )}
    </aside>
  )

  const renderQueuePanel = ({ compact = false } = {}) => (
    <section style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: compact ? '1em' : '1.2em' }}>Notebook Queue</h2>
        <button type="button" onClick={clearQueue} disabled={queueIds.length === 0} style={ghostButtonStyle}>Clear Queue</button>
      </div>
      {queuedPapers.length === 0 ? (
        <div style={{ color: colors.subtle, padding: '16px', border: `1px dashed ${colors.paneBorder}`, borderRadius: '6px' }}>
          No queued papers yet.
        </div>
      ) : queuedPapers.map((paper) => (
        <article key={paper.id} style={{ padding: '12px', border: `1px solid ${colors.cardBorder}`, borderRadius: '6px', backgroundColor: colors.card }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
            <span
              draggable={Boolean(paper.local_path)}
              onDragStart={(e) => handleDragStart(e, paper)}
              style={{ cursor: paper.local_path ? 'grab' : 'not-allowed', padding: '4px 8px', backgroundColor: colors.handle, border: `1px solid ${colors.handleBorder}`, borderRadius: '4px' }}
              title={paper.local_path ? 'Drag PDF to NotebookLM' : 'Missing local PDF'}
            >
              ⠿
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paper.title}</strong>
              <div style={{ color: colors.muted, fontSize: '0.85em' }}>{getPublishedDateLabel(paper)} | {getPaperCategory(paper)} | {paper.status || 'UNREAD'}</div>
              {!paper.local_path && <div role="alert" style={{ color: colors.danger, fontSize: '0.85em' }}>Missing local PDF or unsupported source without a downloaded file.</div>}
            </div>
          </div>
          {!compact && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => revealPdf(paper)} disabled={!paper.local_path} style={ghostButtonStyle}>Reveal PDF</button>
              <button type="button" onClick={() => handleNotebookStatusChange(paper.id, 'ADDED')} style={ghostButtonStyle}>Mark Added</button>
              <button type="button" onClick={() => removeFromQueue(paper.id)} style={ghostButtonStyle}>Remove</button>
            </div>
          )}
        </article>
      ))}
    </section>
  )

  const renderNotebook = () => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: colors.page }}>
      <webview src="https://notebooklm.google.com/" style={{ flex: '1', width: '100%', height: '100%', backgroundColor: colors.page }} />
    </div>
  )

  const renderExploreMode = () => (
    <>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', overflow: 'hidden' }}>
        {renderFilters()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ color: colors.muted }}>{filteredPapers.length} papers found | {selectedIds.size} selected | {queueIds.length} queued</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {queuedPapers.length > 0 && <button type="button" onClick={() => setActiveMode(APP_MODES.BUILD_NOTEBOOK)} style={ghostButtonStyle}>View Queue</button>}
            <button type="button" onClick={addSelectedToQueue} disabled={selectedIds.size === 0} style={buttonStyle}>Add Selected to Queue</button>
          </div>
        </div>
        {queuedPapers.length > 0 && (
          <section aria-label="Explore queue summary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: `1px solid ${colors.cardBorder}`, borderRadius: '6px', backgroundColor: colors.card }}>
            <strong>{queuedPapers.length} queued:</strong>
            <span style={{ color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {queuedPapers.map((paper) => paper.title).join(', ')}
            </span>
          </section>
        )}
        {renderPaperTable()}
      </main>
      {renderDetailPane()}
      <aside style={{ width: '72px', borderLeft: `1px solid ${colors.paneBorder}`, display: 'grid', placeItems: 'center', color: colors.muted, backgroundColor: colors.paneAlt }}>
        <button type="button" onClick={() => setActiveMode(APP_MODES.BUILD_NOTEBOOK)} style={ghostButtonStyle}>LM</button>
      </aside>
    </>
  )

  const renderBuildNotebookMode = () => (
    <>
      <main style={{ width: '42%', minWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflow: 'auto', borderRight: `1px solid ${colors.paneBorder}` }}>
        {renderQueuePanel()}
        <section style={{ display: 'grid', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1em' }}>Also in Current Filter</h2>
          {renderFilters()}
          {renderPaperTable({ compact: true })}
        </section>
      </main>
      {renderNotebook()}
    </>
  )

  const renderNotebookMode = () => (
    <>
      <aside style={{ width: '220px', padding: '16px', overflow: 'auto', borderRight: `1px solid ${colors.paneBorder}`, backgroundColor: colors.paneAlt }}>
        <h2 style={{ marginTop: 0, fontSize: '1em' }}>Paper Bot</h2>
        {renderQueuePanel({ compact: true })}
        <section style={{ marginTop: '20px' }}>
          <h3>Recent</h3>
          {recentPapers.length === 0 ? <div style={{ color: colors.subtle }}>No recent papers.</div> : recentPapers.map((paper) => (
            <button key={paper.id} type="button" onClick={() => { openPaperDetails(paper); setActiveMode(APP_MODES.EXPLORE) }} style={{ ...ghostButtonStyle, width: '100%', marginBottom: '8px', textAlign: 'left' }}>
              {paper.title}
            </button>
          ))}
        </section>
      </aside>
      {renderNotebook()}
    </>
  )

  return (
    <div
      data-testid="app-shell"
      data-app-mode={activeMode}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minWidth: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: colors.page,
        color: colors.text,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${colors.paneBorder}`, backgroundColor: colors.header }}>
        <h1 style={{ margin: 0, fontSize: '1.15em' }}>Paper Bot</h1>
        <nav aria-label="App mode" style={{ display: 'flex', gap: '8px' }}>
          {renderModeButton(APP_MODES.EXPLORE, 'Explore')}
          {renderModeButton(APP_MODES.BUILD_NOTEBOOK, 'Build Notebook')}
          {renderModeButton(APP_MODES.NOTEBOOK, 'NotebookLM')}
        </nav>
        <div style={{ marginLeft: 'auto', color: colors.muted }}>{queueIds.length} queued</div>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
        {activeMode === APP_MODES.EXPLORE && renderExploreMode()}
        {activeMode === APP_MODES.BUILD_NOTEBOOK && renderBuildNotebookMode()}
        {activeMode === APP_MODES.NOTEBOOK && renderNotebookMode()}
      </div>
    </div>
  )
}

export default App
