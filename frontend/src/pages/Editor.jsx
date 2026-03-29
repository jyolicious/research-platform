import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Navbar from '../components/Navbar'
import './Editor.css'

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [draftId, setDraftId] = useState(id || null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [suggestion, setSuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [versions, setVersions] = useState([])
  const [showVersions, setShowVersions] = useState(false)
  const suggestTimer = useRef(null)
  const saveTimer = useRef(null)
  const textareaRef = useRef(null)

  // Auto-save every 5 seconds
  const saveDraft = useCallback(async (t, c) => {
    setSaveStatus('saving...')
    try {
      const words = c.trim().split(/\s+/).filter(Boolean).length
      if (!draftId) {
        const res = await api.post('/drafts', { title: t, content: { text: c } })
        setDraftId(res.data.id)
        navigate(`/editor/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/drafts/${draftId}`, {
          title: t,
          content: { text: c },
          word_count: words
        })
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error saving')
    }
  }, [draftId, navigate])

  // Debounced save
  useEffect(() => {
    if (!content && !title) return
    clearTimeout(saveTimer.current)
    setSaveStatus('unsaved')
    saveTimer.current = setTimeout(() => saveDraft(title, content), 5000)
    return () => clearTimeout(saveTimer.current)
  }, [content, title, saveDraft])

  // Word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    setWordCount(content.trim() ? words : 0)
  }, [content])

  // AI suggestion after 800ms pause
  useEffect(() => {
    if (content.length < 50) { setSuggestion(''); return }
    clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      setLoadingSuggestion(true)
      try {
        const last = content.slice(-300)
        const res = await api.post('/ai/suggest', { text: last })
        setSuggestion(res.data.suggestion || '')
      } catch {
        setSuggestion('')
      } finally {
        setLoadingSuggestion(false)
      }
    }, 800)
    return () => clearTimeout(suggestTimer.current)
  }, [content])

  const acceptSuggestion = () => {
    setContent(prev => prev + ' ' + suggestion)
    setSuggestion('')
  }

  const downloadDocx = async () => {
    if (!draftId) return
    await saveDraft(title, content)
    window.open(`http://localhost:8000/drafts/${draftId}/download`, '_blank')
  }

  const loadVersions = async () => {
    if (!draftId) return
    const res = await api.get(`/drafts/${draftId}/versions`)
    setVersions(res.data.versions || [])
    setShowVersions(true)
  }

  return (
    <div className="editor-page">
      <Navbar />
      <div className="editor-layout">
        <div className="editor-topbar">
          <input
            className="editor-title-input"
            placeholder="Untitled Draft"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="editor-actions">
            <span className={`save-status ${saveStatus === 'saved' ? 'saved' : 'pending'}`}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus}
            </span>
            <button className="editor-btn" onClick={loadVersions}>
              History
            </button>
            <button className="editor-btn primary" onClick={downloadDocx}>
              ↓ Export .docx
            </button>
          </div>
        </div>

        <div className="editor-body">
          <div className="editor-main">
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              placeholder="Start writing your research paper...&#10;&#10;PaperLens will suggest the next sentence as you write."
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            {suggestion && (
              <div className="suggestion-box">
                <div className="suggestion-label">
                  {loadingSuggestion ? 'AI thinking...' : '✦ AI suggestion'}
                </div>
                <p className="suggestion-text">{suggestion}</p>
                <div className="suggestion-actions">
                  <button className="accept-btn" onClick={acceptSuggestion}>
                    Accept (Tab)
                  </button>
                  <button className="dismiss-btn" onClick={() => setSuggestion('')}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {loadingSuggestion && !suggestion && (
              <div className="suggestion-loading">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            )}
          </div>

          <aside className="editor-sidebar">
            <div className="editor-stats">
              <div className="stat-row">
                <span className="stat-key">Words</span>
                <span className="stat-val">{wordCount}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Characters</span>
                <span className="stat-val">{content.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Est. read time</span>
                <span className="stat-val">{Math.max(1, Math.ceil(wordCount / 200))} min</span>
              </div>
              <div className="stat-row">
                <span className="stat-key">Draft ID</span>
                <span className="stat-val mono">{draftId ? draftId.slice(0, 8) + '...' : 'unsaved'}</span>
              </div>
            </div>

            <div className="editor-tips">
              <h4>Tips</h4>
              <p>Write at least 50 characters to get AI suggestions.</p>
              <p>Drafts auto-save every 5 seconds.</p>
              <p>Export your paper as a Word document anytime.</p>
            </div>
          </aside>
        </div>
      </div>

      {showVersions && (
        <div className="versions-overlay" onClick={() => setShowVersions(false)}>
          <div className="versions-panel" onClick={e => e.stopPropagation()}>
            <div className="versions-header">
              <h3>Version History</h3>
              <button onClick={() => setShowVersions(false)}>✕</button>
            </div>
            {versions.length === 0 ? (
              <p style={{color:'var(--gray-500)', padding:'1rem'}}>No versions saved yet.</p>
            ) : (
              <div className="versions-list">
                {versions.map((v, i) => (
                  <div key={i} className="version-item">
                    <span className="version-date">
                      {new Date(v.saved_at).toLocaleString()}
                    </span>
                    <span className="version-words">{v.word_count} words</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}