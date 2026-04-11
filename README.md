# PaperLens — DBMS Project

A real-time research paper platform built with Apache Spark, PostgreSQL, Redis,
pgvector, FastAPI, and React. Fine-tuned distilgpt2 model for AI-assisted academic writing.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Batch ETL | Apache Spark (PySpark) | Load 999,064 papers from DBLP CSV |
| Primary DB | PostgreSQL + pgvector | Relational store + vector similarity search |
| Cache | Redis | Write-behind cache, pub-sub events |
| API | FastAPI (Python) | REST endpoints with JWT auth |
| Frontend | React + Vite | SPA with routing and live editor |
| Auth | Google OAuth 2.0 + JWT | Secure authentication |
| AI | distilgpt2 (fine-tuned) | Next-sentence prediction on academic text |
| Export | python-docx | Draft export as Word document |
| Container | Docker Compose | Postgres + Redis orchestration |

---

## DBMS Features Implemented

### Indexing (4 types)
- **B-Tree** — `user_id`, `published_date DESC`, composite `(category, published_date)`
- **GIN** — full-text search on `title || abstract` (proven with EXPLAIN ANALYZE)
- **Partial** — index on published papers only (`WHERE status = 'published'`)
- **IVFFlat** — vector index on 384-dim embeddings for semantic search

### Caching
- **Write-behind cache** — draft saves go to Redis first, Postgres second
- **TTL-based expiry** — paper cache 5min, draft cache 30min, AI suggestions 1hr
- **Cache hit/miss tracking** — visible on dashboard with hit rate %

### Data Patterns
- **Append-only versioning** — every draft save creates immutable snapshot in `draft_versions`
- **Polyglot persistence** — Postgres (relational), Redis (cache), pgvector (vectors)
- **Read/write split** — reads → replica session, writes → primary session

### Processing
- **Spark batch ETL** — parallel partitions, deduplication, null byte cleaning on 1M rows
- **Full-text ranking** — `ts_rank` on GIN index, results cached in Redis

---

## Project Structure

```bash
research-platform/
├── backend/
│   ├── main.py                  # FastAPI app — all routers registered
│   ├── database.py              # SQLAlchemy — primary + replica sessions
│   ├── redis_client.py          # Redis connection
│   ├── schema.sql               # All tables + 8 indexes
│   ├── test_connection.py       # DB + Redis connectivity check
│   ├── models/
│   │   ├── paper.py
│   │   ├── draft.py
│   │   └── user.py
│   ├── routes/
│   │   ├── auth.py              # Google OAuth + JWT issue
│   │   ├── papers.py            # List, search (GIN), detail — Redis cached
│   │   ├── drafts.py            # CRUD + version history + auth guard
│   │   ├── export.py            # DOCX download via python-docx
│   │   ├── ai.py                # Next-sentence prediction + Claude fallback
│   │   └── stats.py             # Dashboard analytics from Postgres + Redis
│   ├── spark_jobs/
│   │   ├── batch_load.py        # PySpark ETL — DBLP CSV → Postgres
│   │   └── extract_training_data.py  # Pull abstracts for model training
│   └── ml/
│       ├── train.py             # Fine-tune distilgpt2 on DBLP abstracts
│       └── inference.py         # Load model + generate suggestions
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.js        # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx  # Google auth state + localStorage
│       ├── components/
│       │   ├── Navbar.jsx/css
│       │   ├── Hero.jsx/css
│       │   ├── TrendingPapers.jsx/css
│       │   ├── HowItWorks.jsx/css
│       │   ├── FAQs.jsx/css
│       │   ├── Footer.jsx/css
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Landing.jsx      # Public landing page
│           ├── Login.jsx/css    # Google OAuth sign-in
│           ├── Papers.jsx/css   # Browse + search + category filter
│           ├── PaperDetail.jsx/css  # Full paper view (Medium-style)
│           ├── Editor.jsx/css   # Writing editor + AI suggestions + autosave
│           ├── Drafts.jsx/css   # Google Docs-style drafts grid
│           └── Dashboard.jsx/css    # DBMS analytics with Recharts
│
├── data/
│   ├── dblp-v10.csv             # Kaggle DBLP dataset (not in git)
│   ├── training_text.txt        # Extracted abstracts for training (not in git)
│   └── paperlens_model/         # Fine-tuned distilgpt2 (not in git)
│
├── docker-compose.yml           # Postgres (primary + replica) + Redis
├── init-replication.sh          # Creates replicator user on startup
├── requirements.txt
└── .env                         # Never committed

## Setup Instructions

### Prerequisites
- Docker Desktop (running)
- Python 3.10+
- Java 17 — [Eclipse Temurin](https://adoptium.net)
- Node.js 18+
- Windows: Hadoop winutils in `C:\hadoop\bin\`

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/research-platform.git
cd research-platform
```

### 2. Create `.env` in `backend/` folder
DATABASE_URL=postgresql://admin:secret@localhost:5433/research_db
REPLICA_URL=postgresql://admin:secret@localhost:5434/research_db
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_long_random_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_key

### 3. Start Docker containers

```bash
docker compose up -d
docker compose ps   # verify postgres + redis are running
```

### 4. Load schema into Postgres

```bash
# Windows PowerShell
Get-Content backend/schema.sql | docker compose exec -T postgres psql -U admin -d research_db
```

### 5. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 6. Run Spark batch job (loads DBLP dataset)

Set Java 17 and Hadoop first (Windows):
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:HADOOP_HOME = "C:\hadoop"
```

Then run:
```bash
cd backend/spark_jobs
python batch_load.py
# Loads 999,064 papers into Postgres (~2 minutes)
```

### 7. Start the backend API

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API: `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 8. Set up and start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Update `frontend/src/main.jsx` with your Google Client ID:
```jsx
<GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
```

### 9. (Optional) Train the AI model

```bash
# Extract training data from Postgres
cd backend/spark_jobs
python extract_training_data.py

# Fine-tune distilgpt2 on DBLP abstracts (requires GPU, ~1 hour)
cd backend/ml
python train.py
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/google` | Verify Google token, issue JWT |

### Papers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/papers` | List papers — paginated, Redis cached |
| GET | `/papers/search?q=` | Full-text search via GIN index |
| GET | `/papers/{id}` | Paper detail — Redis cached |

### Drafts (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/drafts` | List current user's drafts |
| POST | `/drafts` | Create new draft |
| GET | `/drafts/{id}` | Get draft — Redis cached |
| PUT | `/drafts/{id}` | Autosave + version snapshot |
| DELETE | `/drafts/{id}` | Delete draft + all versions |
| GET | `/drafts/{id}/versions` | Full version history |
| GET | `/drafts/{id}/download` | Export as .docx |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/suggest` | Next-sentence prediction (model → Claude fallback) |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Dashboard analytics — cached 5min |

---

## Frontend Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page — hero, trending, how it works, FAQs |
| `/login` | Public | Google OAuth sign-in |
| `/papers` | Auth | Browse + search 999k papers, category filter |
| `/papers/:id` | Auth | Full paper detail — Medium-style layout |
| `/editor` | Auth | New draft — AI suggestions, autosave |
| `/editor/:id` | Auth | Edit existing draft |
| `/drafts` | Auth | All drafts — Google Docs style grid |
| `/dashboard` | Auth | DBMS analytics with Recharts charts |

---

## Key DBMS Concepts Demonstrated

### Indexing proof
```sql
-- With GIN index: Bitmap Index Scan, 1165ms
-- Without index: Seq Scan on 999,064 rows, 12376ms
EXPLAIN ANALYZE
SELECT id, title FROM papers
WHERE to_tsvector('english', title || ' ' || abstract)
      @@ plainto_tsquery('english', 'neural networks');
```

### Polyglot persistence rationale
- **Postgres** — chosen for relational integrity (drafts reference users, citations reference papers), ACID transactions, and SQL expressiveness
- **Redis** — chosen for sub-millisecond cache reads on hot paper data; write-behind pattern so editor saves don't block the UI
- **pgvector** — chosen over separate Qdrant for transactional consistency — vector search and relational queries in one SQL statement

### Write-behind cache pattern (drafts)
User keystroke → debounce 5s → POST /drafts
↓
Write to Redis (instant)
↓
Write to Postgres (async)
↓
Invalidate cache key

### Version history (append-only)
Every PUT to `/drafts/{id}` creates a new row in `draft_versions` — never updates. This gives full audit trail and point-in-time recovery. Immutable snapshots are a standard pattern in event-sourced systems.

---

## Screenshots

| Page | Description |
|------|-------------|
| Landing | Hero with search, trending papers, FAQs |
| Papers browser | Full-text search with Redis cache badge |
| Paper detail | Medium-style layout with authors, metadata |
| Editor | AI suggestions panel, autosave, export |
| Drafts | Google Docs-style card grid |
| Dashboard | Recharts analytics — citations, categories, Redis metrics |