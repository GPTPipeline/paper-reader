import { useState, useEffect, useMemo } from 'react'

const colors = {
  page: '#0f0f0f',
  pane: '#0f0f0f',
  paneBorder: '#2a2a2a',
  header: '#171717',
  text: '#f1f3f4',
  muted: '#bdc1c6',
  subtle: '#8f8f8f',
  tableBorder: '#2f2f2f',
  rowBorder: '#242424',
  card: '#1b1b1b',
  cardBorder: '#303030',
  cardShadow: '0 1px 3px rgba(0,0,0,0.35)',
  control: '#181818',
  controlBorder: '#3c4043',
  controlText: '#f1f3f4',
  handle: '#2a2a2a',
  handleBorder: '#3c4043',
  primary: '#8ab4f8',
  primaryText: '#0f0f0f',
  unreadBg: '#2a2a2a',
  unreadText: '#f1f3f4',
  readingBg: '#12395f',
  readingText: '#bfdbfe',
  readBg: '#14532d',
  readText: '#bbf7d0',
}

const formatDate = (value) => {
  if (!value) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const getPublishedDateLabel = (paper) => (
  formatDate(paper.published) || 'N/A'
)

const getStatusStyle = (status) => {
  if (status === 'READING') {
    return { backgroundColor: colors.readingBg, color: colors.readingText };
  }
  if (status === 'READ') {
    return { backgroundColor: colors.readBg, color: colors.readText };
  }
  return { backgroundColor: colors.unreadBg, color: colors.unreadText };
}

function App() {
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'published', direction: 'desc' })

  useEffect(() => {
    fetchPapers()
  }, [])

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

  const handleStatusChange = async (id, newStatus) => {
    try {
      const success = await window.electronAPI.updatePaperStatus(id, newStatus)
      if (success) {
        setPapers(papers.map(p => p.id === id ? { ...p, status: newStatus } : p))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDragStart = (e, paper) => {
    console.log('UI: Requesting start-drag for:', paper.title);
    
    // Initiate native drag
    window.electronAPI.startDrag(paper.local_path, paper.title);
    
    // Prevent the default HTML drag ghost AFTER initiating native
    e.preventDefault();
    
    // Update status in the background
    setTimeout(() => {
      handleStatusChange(paper.id, 'READING');
    }, 100);
  }

  const handleStudyClick = (paper) => {
    window.electronAPI.openNotebook(paper.local_path);
    handleStatusChange(paper.id, 'READING');
  }

  const requestSort = (key) => {

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  const sortedAndFilteredPapers = useMemo(() => {
    let items = [...papers];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(paper => 
        paper.title.toLowerCase().includes(lowerSearch) ||
        paper.summary?.toLowerCase().includes(lowerSearch) ||
        paper.authors.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    items.sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'published') {
        aValue = a.published || a.downloaded_at || '';
        bValue = b.published || b.downloaded_at || '';
      } else {
        aValue = a[sortConfig.key] || '';
        bValue = b[sortConfig.key] || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return items;
  }, [papers, searchTerm, sortConfig]);

  if (loading) return <div style={{
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.page,
    color: colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }}>Loading papers...</div>

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      minWidth: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: colors.page,
      color: colors.text
    }}>
      {/* Left Pane: Paper List */}
      <div style={{ 
        flex: '1', 
        minWidth: '560px', 
        padding: '20px', 
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${colors.paneBorder}`,
        backgroundColor: colors.pane,
        position: 'relative',
        zIndex: 2,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <header style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>📚 Paper Bot</h1>
          <p style={{ color: colors.muted, fontSize: '0.9em' }}>Drag a paper handle ⠿ to NotebookLM on the right.</p>
          
          <input 
            type="text" 
            placeholder="Search titles, authors, summaries..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '10px',
              borderRadius: '6px',
              border: `1px solid ${colors.controlBorder}`,
              fontSize: '1em',
              backgroundColor: colors.control,
              color: colors.controlText,
              outlineColor: colors.primary,
              boxSizing: 'border-box'
            }}
          />
        </header>

        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <table style={{ width: '100%', minWidth: '760px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left' }}>
            <colgroup>
              <col style={{ width: '46%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.tableBorder}`, position: 'sticky', top: 0, backgroundColor: colors.header, zIndex: 1 }}>
                <th 
                  onClick={() => requestSort('title')}
                  style={{ padding: '12px', cursor: 'pointer', userSelect: 'none', color: colors.text }}
                >
                  Paper {getSortIndicator('title')}
                </th>
                <th 
                  onClick={() => requestSort('published')}
                  style={{ padding: '12px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: colors.text }}
                >
                  Published {getSortIndicator('published')}
                </th>
                <th 
                  onClick={() => requestSort('status')}
                  style={{ padding: '12px', cursor: 'pointer', userSelect: 'none', color: colors.text }}
                >
                  Status {getSortIndicator('status')}
                </th>
                <th style={{ padding: '12px', color: colors.text }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredPapers.map(paper => (
                <tr key={paper.id} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                  <td style={{ padding: '12px' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px', 
                        border: `1px solid ${colors.cardBorder}`, 
                        borderRadius: '6px',
                        backgroundColor: colors.card,
                        boxShadow: colors.cardShadow
                      }}
                    >
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, paper)}
                        style={{ 
                          cursor: 'grab', 
                          fontSize: '1.2em',
                          padding: '4px 8px',
                          backgroundColor: colors.handle,
                          borderRadius: '4px',
                          border: `1px solid ${colors.handleBorder}`,
                          userSelect: 'none'
                        }}
                        title="Drag this icon to NotebookLM on the right"
                      >
                        ⠿
                      </div>
                      <div style={{ overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={paper.title}>
                          {paper.title}
                        </div>
                        <div style={{ fontSize: '0.85em', color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {JSON.parse(paper.authors).join(', ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.85em', color: colors.muted, whiteSpace: 'nowrap' }}>
                    {getPublishedDateLabel(paper)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.8em',
                      ...getStatusStyle(paper.status),
                      whiteSpace: 'nowrap'
                    }}>
                      {paper.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <select 
                      value={paper.status} 
                      onChange={(e) => handleStatusChange(paper.id, e.target.value)}
                      style={{ padding: '4px', fontSize: '0.9em', borderRadius: '4px', border: `1px solid ${colors.controlBorder}`, marginRight: '8px', backgroundColor: colors.control, color: colors.controlText }}
                    >
                      <option value="UNREAD">UNREAD</option>
                      <option value="READING">READING</option>
                      <option value="READ">READ</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                    <button 
                      onClick={() => handleStudyClick(paper)}
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.85em', 
                        cursor: 'pointer',
                        backgroundColor: colors.primary,
                        color: colors.primaryText,
                        border: 'none',
                        borderRadius: '4px'
                      }}
                    >
                      Locate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedAndFilteredPapers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.subtle }}>
              No papers found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Embedded NotebookLM */}
      <div style={{ flex: '1.2', minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: colors.page, position: 'relative', zIndex: 1 }}>
        <webview 
          src="https://notebooklm.google.com/" 
          style={{ flex: '1', width: '100%', height: '100%', backgroundColor: colors.page }}
        />
      </div>
    </div>
  )
}

export default App
