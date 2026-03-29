import { useState } from 'react'
import './FAQ.css'

const faqs = [
  {
    q: "What is PaperLens?",
    a: "PaperLens is a research paper platform backed by a real-time data pipeline. It indexes nearly 1 million papers from the DBLP dataset and provides full-text search, semantic recommendations, and AI-assisted writing."
  },
  {
    q: "How does the search work?",
    a: "Search uses a GIN (Generalized Inverted Index) in PostgreSQL for full-text search across titles and abstracts. Results are ranked by relevance using ts_rank and cached in Redis for sub-millisecond repeat queries."
  },
  {
    q: "What is the AI writing assistant?",
    a: "While writing a draft, PaperLens suggests the next sentence or paragraph using the Claude API. Suggestions are cached in Redis so similar prompts return instantly."
  },
  {
    q: "How is my data stored?",
    a: "Drafts are stored in PostgreSQL with full version history — every save creates an immutable snapshot. You can download any version as a Word document (.docx)."
  },
  {
    q: "Why Google sign-in only?",
    a: "We use Google OAuth to eliminate password management complexity and ensure secure authentication. Your Google account identity is verified and a JWT is issued for all subsequent requests."
  },
  {
    q: "What technologies power PaperLens?",
    a: "Apache Spark for batch ETL, PostgreSQL with pgvector for storage and vector search, Redis for caching, FastAPI for the backend, and React for the frontend."
  }
]

export default function FAQs() {
  const [open, setOpen] = useState(null)

  return (
    <section className="faqs">
      <div className="section-container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="faqs-list">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`faq-item ${open === i ? 'open' : ''}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className="faq-icon">{open === i ? '−' : '+'}</span>
              </div>
              {open === i && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}