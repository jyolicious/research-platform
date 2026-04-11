from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from redis_client import get_redis
from routes.auth import decode_jwt_token
import json

router = APIRouter()


def get_authenticated_user_id(authorization: str = Header(None)):
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    payload = decode_jwt_token(parts[1])
    return payload.get('sub') if payload else None

@router.get("/")
def list_papers(
    page: int = 1,
    limit: int = 20,
    category: str = None,
    db: Session = Depends(get_db),
    redis=Depends(get_redis)
):
    cache_key = f"papers:list:{page}:{limit}:{category}"
    cached = redis.get(cache_key)
    if cached:
        return {"source": "cache", "data": json.loads(cached)}

    offset = (page - 1) * limit
    if category:
        result = db.execute(text("""
            SELECT id, title, abstract, authors, category, citation_count
            FROM papers WHERE category ILIKE :cat
            ORDER BY citation_count DESC
            LIMIT :limit OFFSET :offset
        """), {"cat": f"%{category}%", "limit": limit, "offset": offset})
    else:
        result = db.execute(text("""
            SELECT id, title, abstract, authors, category, citation_count
            FROM papers
            ORDER BY citation_count DESC
            LIMIT :limit OFFSET :offset
        """), {"limit": limit, "offset": offset})

    papers = [dict(row._mapping) for row in result]
    redis.setex(cache_key, 300, json.dumps(papers, default=str))
    return {"source": "db", "data": papers}


@router.get("/search")
def search_papers(
    q: str = Query(..., min_length=2),
    limit: int = 20,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    authorization: str = Header(None)
):
    cache_key = f"papers:search:{q}:{limit}"
    user_id = get_authenticated_user_id(authorization)
    if user_id:
        try:
            db.execute(text(
                "INSERT INTO user_events (user_id, event_type) VALUES (:uid, 'search')"
            ), {"uid": user_id})
            db.commit()
        except Exception:
            pass

    redis.incr('search:total')
    redis.zincrby('search:queries', 1, q.lower())

    cached = redis.get(cache_key)
    if cached:
        return {"source": "cache", "data": json.loads(cached)}

    result = db.execute(text("""
        SELECT id, title, abstract, authors, category, citation_count,
            ts_rank(
                to_tsvector('english', title || ' ' || COALESCE(abstract, '')),
                plainto_tsquery('english', :q)
            ) AS rank
        FROM papers
        WHERE to_tsvector('english', title || ' ' || COALESCE(abstract, ''))
              @@ plainto_tsquery('english', :q)
        ORDER BY rank DESC
        LIMIT :limit
    """), {"q": q, "limit": limit})

    papers = [dict(row._mapping) for row in result]
    redis.incr('search:total')
    redis.zincrby('search:queries', 1, q.lower())
    redis.setex(cache_key, 600, json.dumps(papers, default=str))
    return {"source": "cache" if cached else "db", "data": papers}


@router.get("/{paper_id}")
def get_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    authorization: str = Header(None)
):
    cache_key = f"papers:detail:{paper_id}"
    cached = redis.get(cache_key)
    if cached:
        return {"source": "cache", "data": json.loads(cached)}

    user_id = get_authenticated_user_id(authorization)
    result = db.execute(text("""
        SELECT id, title, abstract, authors, category, citation_count
        FROM papers WHERE id = :id
    """), {"id": paper_id}).fetchone()

    if user_id and result:
        try:
            db.execute(text(
                "INSERT INTO user_events (user_id, paper_id, event_type) VALUES (:uid, :pid, 'view')"
            ), {"uid": user_id, "pid": paper_id})
            db.commit()
        except Exception:
            pass

    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Paper not found")

    paper = dict(result._mapping)
    redis.setex(cache_key, 3600, json.dumps(paper, default=str))
    return {"source": "db", "data": paper}