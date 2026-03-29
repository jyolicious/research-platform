import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import Navbar from '../components/Navbar'
import './Papers.css'

export default function Papers() {
  const [papers, setPapers] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchPapers = useCallback(async () => {
    setLoading(true)
    try {
      let res
      if (query.trim().length > 1) {
        res = await api.get(`/papers/search?q=${encodeURIComponent(query)}&limit=20`)
      } else {
        res = await api.get(`/papers?page=${page}&limit=20${category ? `&category=${category}` : ''}`)
      }
      setPapers(res.data.data || [])
      setSource(res.data.source || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, page, category])

  useEffect(() => {
    const delay = setTimeout(fetchPapers, 400)
    return () => clearTimeout(delay)
  }, [fetchPapers])

  return (
    <div className="papers-page">
      <Navbar />

      <div className="papers-layout">
        <aside className="papers-sidebar">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Category</label>
            <input
              type="text"
              placeholder="e.g. Machine Learning"
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1) }}
            />
          </div>

          <button className="write-btn" onClick={() => navigate('/editor')}>
            + New Draft
          </button>

          {user && (
            <div className="user-card">
              <div className="user-avatar">
                {user.name?.[0]?.toUpperCase()}
              </div>
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
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
            />

            {source && (
              <span className={`source-badge ${source}`}>
                {source === 'cache' ? '⚡ Redis cache' : '🗄 PostgreSQL'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : (
            <>
              <div className="results-count">
                {papers.length} results {query && `for "${query}"`}
              </div>

              <div className="papers-list">
                {papers.map((paper, i) => (
                  <div
                    key={i}
                    className="paper-row"
                    onClick={() => navigate(`/papers/${paper.id}`)}
                  >
                    <div className="paper-row-category">
                      {paper.category?.slice(0, 50) || 'Research'}
                    </div>

                    <h3 className="paper-row-title">
                      {paper.title}
                    </h3>

                    <p className="paper-row-abstract">
                      {paper.abstract?.slice(0, 220)}...
                    </p>

                    <div className="paper-row-meta">
                      <span className="paper-row-citations">
                        {paper.citation_count} citations
                      </span>

                      {paper.rank && (
                        <span className="paper-row-rank">
                          relevance: {parseFloat(paper.rank).toFixed(4)}
                        </span>
                      )}

                      <span className="read-more">
                        Read more →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {!query && (
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ← Prev
                  </button>

                  <span>Page {page}</span>

                  <button onClick={() => setPage(p => p + 1)}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}