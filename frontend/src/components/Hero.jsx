import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './Hero.css'

export default function Hero() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    navigate('/login')
  }

  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-grid" />
        <div className="hero-glow" />
      </div>
      <div className="hero-content">
        <div className="hero-badge">999,064 Research Papers Indexed</div>
        <h1 className="hero-title">
          Discover. Read.<br />
          <span className="hero-title-accent">Write with Intelligence.</span>
        </h1>
        <p className="hero-subtitle">
          PaperLens is a scholarly platform powered by real-time data pipelines,
          semantic search, and AI-assisted writing. Built for researchers who
          demand precision.
        </p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search neural networks, distributed systems..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit">Search Papers</button>
        </form>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-num">999K+</span>
            <span className="stat-label">Papers</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-num">GIN</span>
            <span className="stat-label">Full-text Index</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-num">Redis</span>
            <span className="stat-label">Cached Results</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-num">AI</span>
            <span className="stat-label">Writing Assist</span>
          </div>
        </div>
      </div>
    </section>
  )
}