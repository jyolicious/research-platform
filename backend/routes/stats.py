from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from redis_client import get_redis
import json

router = APIRouter()

@router.get("/")
def get_stats(db: Session = Depends(get_db), redis=Depends(get_redis)):

    cached = redis.get("dashboard:stats")
    if cached:
        return {"source": "cache", "data": json.loads(cached)}

    papers_count = db.execute(text("SELECT COUNT(*) FROM papers")).scalar()
    users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    drafts_count = db.execute(text("SELECT COUNT(*) FROM drafts")).scalar()
    versions_count = db.execute(text("SELECT COUNT(*) FROM draft_versions")).scalar()

    categories = db.execute(text("""
        SELECT category, COUNT(*) as count
        FROM papers
        WHERE category IS NOT NULL AND category != '' AND category != 'General'
        GROUP BY category
        ORDER BY count DESC
        LIMIT 8
    """)).fetchall()

    top_cited = db.execute(text("""
        SELECT title, citation_count, category
        FROM papers
        WHERE citation_count > 0
        ORDER BY citation_count DESC
        LIMIT 10
    """)).fetchall()

    avg_citations = db.execute(text(
        "SELECT ROUND(AVG(citation_count)::numeric, 2) FROM papers WHERE citation_count > 0"
    )).scalar()

    citation_ranges = db.execute(text("""
        SELECT
            CASE
                WHEN citation_count = 0 THEN '0'
                WHEN citation_count BETWEEN 1 AND 10 THEN '1-10'
                WHEN citation_count BETWEEN 11 AND 100 THEN '11-100'
                WHEN citation_count BETWEEN 101 AND 1000 THEN '101-1000'
                ELSE '1000+'
            END as range,
            COUNT(*) as count
        FROM papers
        GROUP BY 1
        ORDER BY MIN(citation_count)
    """)).fetchall()

    index_stats = db.execute(text("""
        SELECT
            indexrelname as index_name,
            idx_scan as times_used,
            idx_tup_read as rows_read
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public' AND idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 8
    """)).fetchall()

    redis_info = redis.info()
    cache_hits = redis_info.get("keyspace_hits", 0)
    cache_misses = redis_info.get("keyspace_misses", 0)
    total = cache_hits + cache_misses
    hit_rate = round((cache_hits / total * 100), 1) if total > 0 else 0

    data = {
        "counts": {
            "papers": papers_count,
            "users": users_count,
            "drafts": drafts_count,
            "versions": versions_count,
        },
        "avg_citations": float(avg_citations or 0),
        "top_categories": [
            {"category": r.category[:35], "count": r.count}
            for r in categories
        ],
        "top_cited": [
            {"title": r.title[:55], "citations": r.citation_count}
            for r in top_cited
        ],
        "citation_ranges": [
            {"range": r.range, "count": r.count}
            for r in citation_ranges
        ],
        "redis": {
            "hit_rate": hit_rate,
            "cache_hits": cache_hits,
            "cache_misses": cache_misses,
        },
        "indexes": [
            {
                "name": r.index_name.replace("idx_papers_", "").replace("idx_", ""),
                "times_used": r.times_used,
                "rows_read": r.rows_read
            }
            for r in index_stats
        ]
    }

    redis.setex("dashboard:stats", 300, json.dumps(data, default=str))
    return {"source": "db", "data": data}