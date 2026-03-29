# Research Platform — DBMS Project

A real-time research paper platform built with Apache Spark, PostgreSQL, Redis, pgvector, and FastAPI.

## Tech Stack

- **Apache Spark (PySpark)** — batch ETL pipeline loading 999,064 papers from DBLP dataset
- **PostgreSQL + pgvector** — primary database with full-text search and vector similarity search
- **Redis** — caching layer (write-behind cache pattern, sub-millisecond reads)
- **FastAPI** — REST API backend
- **Docker** — containerized Postgres and Redis

## DBMS Features Implemented

- B-Tree indexes on `user_id`, `published_date`, composite `(category, date)`
- GIN index for full-text search on title + abstract
- Partial index on published papers only
- IVFFlat vector index for semantic search (pgvector)
- Redis write-behind cache with TTL
- Version history for drafts (append-only pattern)
- EXPLAIN ANALYZE proof of index usage vs sequential scan

## Project Structure
```
research-platform/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # SQLAlchemy + Postgres connection
│   ├── redis_client.py      # Redis connection
│   ├── schema.sql           # All tables + indexes
│   ├── models/              # SQLAlchemy models
│   ├── routes/              # API route handlers
│   │   ├── papers.py        # List, search, detail endpoints
│   │   └── drafts.py        # Draft CRUD + version history
│   └── spark_jobs/
│       └── batch_load.py    # PySpark ETL — CSV to Postgres
├── frontend/                # React app (coming soon)
├── docker-compose.yml       # Postgres + Redis containers
└── requirements.txt
```

## Setup Instructions

### Prerequisites
- Docker Desktop
- Python 3.10+
- Java 17 (Eclipse Temurin)
- Hadoop winutils (Windows only)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/research-platform.git
cd research-platform
```

### 2. Create `.env` file in root
```
DATABASE_URL=postgresql://admin:secret@localhost:5432/research_db
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_api_key
```

### 3. Start Docker containers
```bash
docker compose up -d
```

### 4. Load database schema
```bash
docker exec -i research_postgres psql -U admin -d research_db < backend/schema.sql
```

### 5. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 6. Run Spark batch job (loads DBLP dataset)
```bash
cd backend/spark_jobs
python batch_load.py
```

### 7. Start the API server
```bash
cd backend
uvicorn main:app --reload
```

API runs at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/papers` | List papers with Redis cache |
| GET | `/papers/search?q=` | Full-text search via GIN index |
| GET | `/papers/:id` | Paper detail with cache |
| POST | `/drafts` | Create new draft |
| PUT | `/drafts/:id` | Autosave draft + version snapshot |
| GET | `/drafts/:id/versions` | Version history |
| GET | `/drafts/:id/download` | Export as .docx |

## Key DBMS Concepts Demonstrated

**Indexing** — GIN index for full-text search proven with EXPLAIN ANALYZE showing Bitmap Index Scan vs sequential scan on 999,064 rows.

**Polyglot persistence** — Postgres for relational data, Redis for cache, pgvector for embeddings. Each chosen for specific access patterns.

**Batch processing** — PySpark ETL with parallel partitioning, deduplication, null byte cleaning on 1M row dataset.

**Caching strategy** — Write-behind cache pattern. Hot paper metadata served from Redis in <1ms vs ~50ms from Postgres.

**Version control in DB** — Append-only `draft_versions` table stores every save as an immutable snapshot.