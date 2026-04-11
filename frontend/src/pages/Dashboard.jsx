import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts'
import './Dashboard.css'

const BLUE = '#42a5f5'
const GOLD = '#c9a84c'
const TEAL = '#1d9e75'
const CORAL = '#d85a30'
const PURPLE = '#7f77dd'

const PIE_COLORS = [BLUE, GOLD, TEAL, CORAL, PURPLE, '#85b7eb', '#ef9f27', '#5dcaa5']

const fmt = n => n >= 1000000
  ? (n / 1000000).toFixed(1) + 'M'
  : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#112240', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '0.6rem 1rem', fontSize: 13
    }}>
      <p style={{ color: '#9aa3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#f0f4ff', fontFamily: 'monospace' }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/stats')
      .then(res => { setStats(res.data.data); setSource(res.data.source) })
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dash-loading">
        {[...Array(4)].map((_, i) => <div key={i} className="dash-skeleton" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dash-error">{error}</div>
    </div>
  )

  const cacheData = [
    { name: 'Hits', value: stats.redis.cache_hits },
    { name: 'Misses', value: stats.redis.cache_misses },
  ]

  const radialData = [
    { name: 'Cache hit rate', value: stats.redis.hit_rate, fill: TEAL }
  ]

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dash-layout">

        <div className="dash-header">
          <div>
            <span className="dash-tag">Platform analytics</span>
            <h1>PaperLens Dashboard</h1>
            <p className="dash-sub">
              Real-time DBMS metrics — Postgres indexes, Redis cache performance,
              paper distribution and citation analytics.
            </p>
          </div>
          <div className="dash-source-pill">
            {source === 'cache' ? '⚡ Served from Redis cache' : '🗄 Live from PostgreSQL'}
          </div>
        </div>

        {/* Summary cards */}
        <div className="dash-summary">
          {[
            { label: 'Total papers', value: fmt(stats.counts.papers), note: 'DBLP dataset loaded via PySpark' },
            { label: 'Registered users', value: fmt(stats.counts.users), note: 'Google OAuth accounts' },
            { label: 'Drafts created', value: fmt(stats.counts.drafts), note: 'With full version history' },
            { label: 'Avg citations', value: stats.avg_citations.toLocaleString(), note: 'Per paper across corpus' },
          ].map((c, i) => (
            <div key={i} className="dash-card summary-card">
              <span className="card-label">{c.label}</span>
              <span className="card-big">{c.value}</span>
              <span className="card-note">{c.note}</span>
            </div>
          ))}
        </div>

        {/* Row 1: Top cited + Citation distribution */}
        <div className="dash-row">
          <div className="dash-card wide">
            <h3>Top cited papers</h3>
            <p className="chart-sub">Highest citation counts in the DBLP corpus</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.top_cited}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#9aa3b8', fontSize: 11 }} tickFormatter={fmt} />
                <YAxis
                  type="category" dataKey="title"
                  tick={{ fill: '#9aa3b8', fontSize: 10 }}
                  width={200}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="citations" name="Citations" fill={BLUE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card">
            <h3>Citation distribution</h3>
            <p className="chart-sub">Papers grouped by citation count range</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.citation_ranges} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" tick={{ fill: '#9aa3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9aa3b8', fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Papers" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Category pie + Redis radial + Index table */}
        <div className="dash-row">
          <div className="dash-card">
            <h3>Papers by category</h3>
            <p className="chart-sub">Top 8 research areas in the corpus</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.top_categories}
                  dataKey="count"
                  nameKey="category"
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {stats.top_categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [fmt(v), n]}
                  contentStyle={{
                    background: '#112240',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Legend
                  formatter={v => <span style={{ color: '#9aa3b8', fontSize: 11 }}>{v}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card">
            <h3>Redis cache performance</h3>
            <p className="chart-sub">Cache hit rate and request volume</p>
            <div className="redis-radial-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart
                  innerRadius="55%" outerRadius="90%"
                  data={radialData} startAngle={180} endAngle={0}
                >
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.04)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="radial-center">
                <span className="radial-pct">{stats.redis.hit_rate}%</span>
                <span className="radial-label">hit rate</span>
              </div>
            </div>
            <div className="redis-row-list">
              {[
                { k: 'Cache hits', v: fmt(stats.redis.cache_hits), color: TEAL },
                { k: 'Cache misses', v: fmt(stats.redis.cache_misses), color: CORAL },
              ].map((r, i) => (
                <div key={i} className="redis-row">
                  <span style={{ color: r.color }}>●</span>
                  <span className="redis-k">{r.k}</span>
                  <span className="redis-v">{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-card">
            <h3>Index usage</h3>
            <p className="chart-sub">Postgres index scans — proof of optimization</p>
            <div className="index-table">
              <div className="index-head">
                <span>Index</span>
                <span>Scans</span>
                <span>Rows read</span>
              </div>
              {stats.indexes.map((idx, i) => (
                <div key={i} className="index-row">
                  <span className="idx-name">{idx.name}</span>
                  <span className="idx-val">{fmt(idx.times_used)}</span>
                  <span className="idx-val">{fmt(idx.rows_read)}</span>
                </div>
              ))}
              {stats.indexes.length === 0 && (
                <div className="idx-empty">Run some searches to populate index stats</div>
              )}
            </div>
          </div>
        </div>

        {/* DBMS architecture note */}
        <div className="dash-card arch-card">
          <h3>Architecture overview</h3>
          <div className="arch-grid">
            {[
              { tech: 'Apache Spark', role: 'Batch ETL', detail: `Loaded ${fmt(stats.counts.papers)} papers from DBLP CSV in parallel partitions` },
              { tech: 'PostgreSQL', role: 'Primary store', detail: '8 indexes — B-Tree, GIN full-text, IVFFlat vector, composite, partial' },
              { tech: 'Redis', role: 'Cache layer', detail: `${stats.redis.hit_rate}% hit rate — write-behind pattern, TTL-based expiry` },
              { tech: 'pgvector', role: 'Vector search', detail: 'IVFFlat index on 384-dim embeddings for semantic similarity' },
              { tech: 'distilgpt2', role: 'AI suggestions', detail: 'Fine-tuned on DBLP abstracts for academic next-sentence prediction' },
              { tech: 'FastAPI', role: 'API layer', detail: 'Read/write split — reads to replica, writes to primary' },
            ].map((a, i) => (
              <div key={i} className="arch-item">
                <div className="arch-top">
                  <span className="arch-tech">{a.tech}</span>
                  <span className="arch-role">{a.role}</span>
                </div>
                <p className="arch-detail">{a.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}