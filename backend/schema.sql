CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT,
    category TEXT,
    citation_count INT,
    published_date DATE,
    status TEXT DEFAULT 'published',
    embedding vector(384),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT,
    content JSONB,
    status TEXT DEFAULT 'draft',
    word_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID REFERENCES drafts(id),
    content JSONB,
    word_count INT,
    saved_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    paper_id UUID REFERENCES papers(id),
    event_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trending_papers (
    paper_id UUID REFERENCES papers(id),
    view_count INT DEFAULT 0,
    period TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (paper_id, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_date ON papers(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_category_date ON papers(category, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_papers_fulltext ON papers
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(abstract, '')));
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published_date DESC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_paper ON user_events(paper_id);