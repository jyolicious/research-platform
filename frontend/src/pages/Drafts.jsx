import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/client'
import './Drafts.css'

function timeAgo(dateStr) {
  if (!dateStr) return 'just now'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function Drafts() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  const fetchDrafts = async () => {
    try {
      const res = await api.get('/drafts')
      setDrafts(res.data.drafts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrafts() }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this draft? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/drafts/${id}`)
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (e, id, title) => {
    e.stopPropagation()
    try {
      const res = await api.get(`/drafts/${id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${(title || 'draft').replace(/\s+/g, '_')}.docx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const handleNew = async () => {
    try {
      const res = await api.post('/drafts', { title: 'Untitled Draft', content: {} })
      navigate(`/editor/${res.data.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="drafts-page">
      <Navbar />
      <main className="drafts-layout">
        <div className="drafts-header">
          <div>
            <span className="drafts-tag">My workspace</span>
            <h1>Your drafts</h1>
            <p className="drafts-sub">
              All your research papers — autosaved every 5 seconds, full version history preserved.
            </p>
          </div>
          <button className="new-draft-btn" onClick={handleNew}>
            + New draft
          </button>
        </div>

        {loading ? (
          <div className="drafts-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="draft-skeleton" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="drafts-empty">
            <div className="empty-icon">◈</div>
            <h3>No drafts yet</h3>
            <p>Start writing your first research paper.</p>
            <button className="new-draft-btn" onClick={handleNew}>
              + Create first draft
            </button>
          </div>
        ) : (
          <div className="drafts-grid">
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="draft-card"
                onClick={() => navigate(`/editor/${draft.id}`)}
              >
                <div className="draft-card-top">
                  <div className="draft-icon">◈</div>
                  <div className="draft-actions-row">
                    <button
                      className="draft-action-btn download"
                      onClick={e => handleDownload(e, draft.id, draft.title)}
                      title="Download as .docx"
                    >
                      ↓
                    </button>
                    <button
                      className="draft-action-btn delete"
                      onClick={e => handleDelete(e, draft.id)}
                      disabled={deleting === draft.id}
                      title="Delete draft"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <h3 className="draft-title">
                  {draft.title || 'Untitled Draft'}
                </h3>

                <div className="draft-meta-row">
                  <span className="draft-words">
                    {draft.word_count || 0} words
                  </span>
                  <span className="draft-status">
                    {draft.status || 'draft'}
                  </span>
                </div>

                <div className="draft-footer">
                  <span className="draft-time">
                    Edited {timeAgo(draft.updated_at || draft.created_at)}
                  </span>
                  <span className="draft-open">Open →</span>
                </div>
              </div>
            ))}

            {/* New draft card */}
            <div className="draft-card new-card" onClick={handleNew}>
              <div className="new-card-inner">
                <span className="new-plus">+</span>
                <span>New draft</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}