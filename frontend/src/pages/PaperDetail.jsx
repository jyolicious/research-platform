import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Navbar from '../components/Navbar'
import './PaperDetail.css'

export default function PaperDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('')

  useEffect(() => {
    api.get(`/papers/${id}`)
      .then(res => {
        setPaper(res.data.data)
        setSource(res.data.source)
      })
      .catch(() => navigate('/papers'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return (
    <div className="detail-page">
      <Navbar />
      <div className="detail-loading">
        <div className="skeleton-title" />
        <div className="skeleton-meta" />
        <div className="skeleton-body" />
      </div>
    </div>
  )

  if (!paper) return null

  const authors = paper.authors
    ? paper.authors.replace(/[\[\]']/g, '').split(',').map(a => a.trim()).filter(Boolean)
    : []

  const wordCount = paper.abstract?.split(/\s+/).length || 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="detail-page">
      <Navbar />

      <div className="detail-layout">
        <aside className="detail-toc">
          <button className="back-btn" onClick={() => navigate('/papers')}>
            ← Back to papers
          </button>
          <div className="toc-section">
            <div className="toc-label">On this page</div>
            <a href="#abstract" className="toc-link">Abstract</a>
            <a href="#authors" className="toc-link">Authors</a>
            <a href="#metadata" className="toc-link">Metadata</a>
          </div>
          <div className="toc-meta">
            <div className="toc-stat">
              <span className="toc-stat-val">{paper.citation_count?.toLocaleString()}</span>
              <span className="toc-stat-key">citations</span>
            </div>
            <div className="toc-stat">
              <span className="toc-stat-val">{readTime} min</span>
              <span className="toc-stat-key">read time</span>
            </div>
            <div className="toc-stat">
              <span className={`cache-pill ${source}`}>
                {source === 'cache' ? '⚡ cached' : '🗄 db'}
              </span>
              <span className="toc-stat-key">source</span>
            </div>
          </div>
        </aside>

        <main className="detail-main">
          <div className="detail-header">
            <div className="detail-category">{paper.category}</div>
            <h1 className="detail-title">{paper.title}</h1>
            <div className="detail-byline">
              {authors.slice(0, 5).map((author, i) => (
                <span key={i} className="author-chip">{author}</span>
              ))}
              {authors.length > 5 && (
                <span className="author-more">+{authors.length - 5} more</span>
              )}
            </div>
            <div className="detail-divider" />
          </div>

          <article className="detail-content">
            <section id="abstract">
              <h2 className="section-heading">Abstract</h2>
              <div className="abstract-body">
                {paper.abstract?.split('. ').map((sentence, i) => {
                  if (!sentence.trim()) return null
                  const isFirst = i === 0
                  return (
                    <p key={i} className={isFirst ? 'abstract-lead' : 'abstract-para'}>
                      {sentence.trim()}{sentence.endsWith('.') ? '' : '.'}
                    </p>
                  )
                })}
              </div>
            </section>

            <div className="detail-divider" id="authors" />

            <section>
              <h2 className="section-heading">Authors</h2>
              <div className="authors-grid">
                {authors.map((author, i) => (
                  <div key={i} className="author-card">
                    <div className="author-avatar">
                      {author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="author-name">{author}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="detail-divider" id="metadata" />

            <section>
              <h2 className="section-heading">Metadata</h2>
              <div className="metadata-table">
                <div className="meta-row">
                  <span className="meta-key">Venue / Journal</span>
                  <span className="meta-val">{paper.category || '—'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Citations</span>
                  <span className="meta-val citation-count">
                    {paper.citation_count?.toLocaleString()}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Paper ID</span>
                  <span className="meta-val mono">{paper.id}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Abstract length</span>
                  <span className="meta-val">{wordCount} words</span>
                </div>
              </div>
            </section>

            <div className="detail-cta">
              <p>Want to write a paper on this topic?</p>
              <button
                className="cta-write-btn"
                onClick={() => navigate('/editor')}
              >
                Start writing in PaperLens →
              </button>
            </div>
          </article>
        </main>
      </div>
    </div>
  )
}