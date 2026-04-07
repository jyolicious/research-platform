from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, get_read_db
from redis_client import get_redis
from pydantic import BaseModel
from typing import Optional
import uuid, json

router = APIRouter()

class DraftCreate(BaseModel):
    title: Optional[str] = "Untitled Draft"
    content: Optional[dict] = {}

class DraftUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    word_count: Optional[int] = 0

@router.post("/")
def create_draft(
    draft: DraftCreate,
    db: Session = Depends(get_db),
    redis=Depends(get_redis)
):
    draft_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO drafts (id, title, content, status, word_count)
        VALUES (:id, :title, CAST(:content AS jsonb), 'draft', 0)
    """), {
        "id": draft_id,
        "title": draft.title,
        "content": json.dumps(draft.content)
    })
    db.commit()

    # Cache the new draft in Redis
    redis.setex(
        f"draft:active:{draft_id}",
        1800,
        json.dumps({"id": draft_id, "title": draft.title, "content": draft.content})
    )
    return {"id": draft_id, "title": draft.title}

@router.get("/")
def list_drafts(
    user_id: str,
    db: Session = Depends(get_read_db)
):
    result = db.execute(text("""
        SELECT id, title, word_count, status, created_at, updated_at
        FROM drafts
        WHERE user_id = :uid
        ORDER BY updated_at DESC NULLS LAST
    """), {"uid": user_id})
    return {"drafts": [dict(r._mapping) for r in result]}

@router.get("/{draft_id}")
def get_draft(
    draft_id: str,
    db: Session = Depends(get_read_db),
    redis=Depends(get_redis)
):
    # Check Redis first
    cached = redis.get(f"draft:active:{draft_id}")
    if cached:
        return {"source": "cache", "data": json.loads(cached)}

    result = db.execute(text("""
        SELECT id, title, content, word_count, status, created_at, updated_at
        FROM drafts WHERE id = :id
    """), {"id": draft_id}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Draft not found")

    data = dict(result._mapping)
    redis.setex(f"draft:active:{draft_id}", 1800, json.dumps(data, default=str))
    return {"source": "db", "data": data}

@router.put("/{draft_id}")
def update_draft(
    draft_id: str,
    draft: DraftUpdate,
    db: Session = Depends(get_db),
    redis=Depends(get_redis)
):
    # Update draft
    db.execute(text("""
        UPDATE drafts SET
            title = COALESCE(:title, title),
            content = COALESCE(CAST(:content AS jsonb), content),
            word_count = :word_count,
            updated_at = NOW()
        WHERE id = :id
    """), {
        "id": draft_id,
        "title": draft.title,
        "content": json.dumps(draft.content) if draft.content else None,
        "word_count": draft.word_count or 0
    })

    # Save version snapshot — append only
    version_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO draft_versions (id, draft_id, content, word_count)
        VALUES (:id, :draft_id, CAST(:content AS jsonb), :word_count)
    """), {
        "id": version_id,
        "draft_id": draft_id,
        "content": json.dumps(draft.content or {}),
        "word_count": draft.word_count or 0
    })
    db.commit()

    # Invalidate Redis cache so next read is fresh
    redis.delete(f"draft:active:{draft_id}")

    return {"status": "saved", "version_id": version_id}

@router.get("/{draft_id}/versions")
def get_versions(
    draft_id: str,
    db: Session = Depends(get_read_db)
):
    result = db.execute(text("""
        SELECT id, word_count, saved_at
        FROM draft_versions
        WHERE draft_id = :id
        ORDER BY saved_at DESC
        LIMIT 20
    """), {"id": draft_id})
    return {"versions": [dict(r._mapping) for r in result]}

@router.delete("/{draft_id}")
def delete_draft(
    draft_id: str,
    db: Session = Depends(get_db),
    redis=Depends(get_redis)
):
    db.execute(text("DELETE FROM draft_versions WHERE draft_id = :id"), {"id": draft_id})
    db.execute(text("DELETE FROM drafts WHERE id = :id"), {"id": draft_id})
    db.commit()
    redis.delete(f"draft:active:{draft_id}")
    return {"status": "deleted"}