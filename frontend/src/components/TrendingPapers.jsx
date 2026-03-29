import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import './TrendingPapers.css'

export default function TrendingPapers() {
  const [papers, setPapers] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/papers?limit=6')
      .then(res => setPapers(res.data.data || []))
      .catch(() => {})
  }, [])

  return (
    <section className="trending">
      <div className="trending-container">
        <div className="section-label">Trending</div>
        <h2 className="section-title">Most cited papers</h2>
        <div className="papers-grid">
          {papers.map((paper, i) => (
            <div key={i} className="paper-card" onClick={() => navigate('/login')}>
              <div className="paper-category">{paper.category?.slice(0,40) || 'Research'}</div>
              <h3 className="paper-title">{paper.title?.slice(0, 80)}...</h3>
              <div className="paper-meta">
                <span className="paper-citations">{paper.citation_count} citations</span>
              </div>
            </div>
          ))}
        </div>
        <button className="see-all" onClick={() => navigate('/login')}>
          Browse all 999,064 papers →
        </button>
      </div>
    </section>
  )
}