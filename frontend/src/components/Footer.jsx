import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-icon">◈</span> PaperLens
          <p>A real-time research platform built with Apache Spark, PostgreSQL, Redis, and FastAPI.</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Platform</h4>
            <a href="/papers">Browse Papers</a>
            <a href="/editor">Write</a>
            <a href="/login">Sign in</a>
          </div>
          <div>
            <h4>Tech Stack</h4>
            <span>Apache Spark</span>
            <span>PostgreSQL</span>
            <span>Redis</span>
            <span>pgvector</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 PaperLens — DBMS Project</span>
        <span style={{fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--gray-500)'}}>
          999,064 papers indexed
        </span>
      </div>
    </footer>
  )
}