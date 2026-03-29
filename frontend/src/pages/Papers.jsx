import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import Navbar from '../components/Navbar'
import './Papers.css'

const CATEGORIES = [
  'Machine Learning', 'Computer Vision', 'Natural Language Processing',
  'Distributed Systems', 'Database', 'Networking', 'Security',
  'Algorithms', 'Bioinformatics', 'Robotics'
]

export default function Papers() {
  const [papers, setPapers] = useState([])
  const [inputVal, setInputVal] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchPapers = useCallback(async () => {
    setLoading(true)
    try {
      let res
      if (query.trim().length > 1) {
        res = await api.get(`/papers/search?q=${encodeURIComponent(query)}&limit=20`)
      } else {
        res = await api.get(`/papers?page=${page}&limit=20${category ? `&category=${encodeURIComponent(category)}` : ''}`)
      }
      setPapers(res.data.data || [])
      setSource(res.data.source || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, page, category])

  useEffect(() => { fetchPapers() }, [fetchPapers])

  const handleSearch = () => {
    setQuery(inputVal.trim())
    setPage(1)
  }

  const handleClear = () => {
    setInputVal('')
    setQuery('')
    setCategory('')
    setYearFrom('')
    setPage(1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="papers-page">
      <Navbar />
      <div className="papers-layout">
        <aside className="papers-sidebar">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Topic / Category</label>
            <div className="category-chips">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`cat-chip ${category === cat ? 'active' : ''}`}
                  onClick={() => { setCategory(category === cat ? '' : cat); setPage(1) }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Year (from)</label>
            <input
              type="number"
              placeholder="e.g. 2018"
              min="1990"
              max="2024"
              value={yearFrom}
              onChange={e => { setYearFrom(e.target.value); setPage(1) }}
            />
          </div>

          {(category || yearFrom || query) && (
            <button className="clear-all-btn" onClick={handleClear}>
              ✕ Clear all filters
            </button>
          )}

          <button className="write-btn" onClick={() => navigate('/editor')}>
            + New Draft
          </button>

          {user && (
            <div className="user-card">
              <div className="user-avatar">{user.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}
        </aside>

        <main className="papers-main">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search across 999,064 papers..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="search-btn" onClick={handleSearch}>Search</button>
            {(inputVal || query) && (
              <button className="clear-btn" onClick={handleClear}>Clear</button>
            )}
            {source && (
              <span className={`source-badge ${source}`}>
                {source === 'cache' ? '⚡ Redis cache' : '🗄 PostgreSQL'}
              </span>
            )}
          </div>

          {(category || yearFrom) && (
            <div className="active-filters">
              {category && (
                <span className="filter-tag">
                  {category}
                  <button onClick={() => setCategory('')}>✕</button>
                </span>
              )}
              {yearFrom && (
                <span className="filter-tag">
                  From {yearFrom}
                  <button onClick={() => setYearFrom('')}>✕</button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <>
              <div className="results-count">
                {papers.length} results {query && `for "${query}"`}
              </div>
              <div className="papers-list">
                {papers.map((paper, i) => (
                  <div key={i} className="paper-row" onClick={() => navigate(`/papers/${paper.id}`)}>
                    <div className="paper-row-category">
                      {paper.category?.slice(0, 50) || 'Research'}
                    </div>
                    <h3 className="paper-row-title">{paper.title}</h3>
                    <p className="paper-row-abstract">
                      {paper.abstract?.slice(0, 220)}...
                    </p>
                    <div className="paper-row-meta">
                      <span className="paper-row-citations">{paper.citation_count} citations</span>
                      {paper.rank && (
                        <span className="paper-row-rank">
                          relevance: {parseFloat(paper.rank).toFixed(4)}
                        </span>
                      )}
                      <span className="read-more">Read more →</span>
                    </div>
                  </div>
                ))}
              </div>

              {!query && (
                <div className="pagination">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span>Page {page}</span>
                  <button onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}