from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from redis_client import get_redis
from pydantic import BaseModel
from typing import Optional
from jose import jwt
from dotenv import load_dotenv
import uuid, json, os

load_dotenv()
router = APIRouter()
JWT_SECRET = os.getenv("JWT_SECRET")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

class DraftCreate(BaseModel):
    title: Optional[str] = "Untitled Draft"
    content: Optional[dict] = {}

class DraftUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    word_count: Optional[int] = 0

@router.get("/")
def list_my_drafts(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    result = db.execute(text("""
        SELECT id, title, word_count, status, created_at, updated_at
        FROM drafts
        WHERE user_id = :uid
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
    """), {"uid": user["sub"]})
    return {"drafts": [dict(r._mapping) for r in result]}

@router.post("/")
def create_draft(
    draft: DraftCreate,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    user=Depends(get_current_user)
):
    draft_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO drafts (id, user_id, title, content, status, word_count)
        VALUES (:id, :uid, :title, CAST(:content AS jsonb), 'draft', 0)
    """), {
        "id": draft_id,
        "uid": user["sub"],
        "title": draft.title,
        "content": json.dumps(draft.content)
    })
    db.commit()
    redis.setex(
        f"draft:active:{draft_id}",
        1800,
        json.dumps({"id": draft_id, "title": draft.title, "content": draft.content})
    )
    return {"id": draft_id, "title": draft.title}

@router.get("/{draft_id}")
def get_draft(
    draft_id: str,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    user=Depends(get_current_user)
):
    cached = redis.get(f"draft:active:{draft_id}")
    if cached:
        data = json.loads(cached)
        return {"source": "cache", "data": data}

    result = db.execute(text("""
        SELECT id, title, content, word_count, status, created_at, updated_at
        FROM drafts WHERE id = :id AND user_id = :uid
    """), {"id": draft_id, "uid": user["sub"]}).fetchone()

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
    redis=Depends(get_redis),
    user=Depends(get_current_user)
):
    db.execute(text("""
        UPDATE drafts SET
            title = COALESCE(:title, title),
            content = COALESCE(CAST(:content AS jsonb), content),
            word_count = :word_count,
            updated_at = NOW()
        WHERE id = :id AND user_id = :uid
    """), {
        "id": draft_id,
        "uid": user["sub"],
        "title": draft.title,
        "content": json.dumps(draft.content) if draft.content else None,
        "word_count": draft.word_count or 0
    })

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
    redis.delete(f"draft:active:{draft_id}")
    return {"status": "saved", "version_id": version_id}

@router.delete("/{draft_id}")
def delete_draft(
    draft_id: str,
    db: Session = Depends(get_db),
    redis=Depends(get_redis),
    user=Depends(get_current_user)
):
    db.execute(text("DELETE FROM draft_versions WHERE draft_id = :id"), {"id": draft_id})
    db.execute(text("DELETE FROM drafts WHERE id = :id AND user_id = :uid"), {
        "id": draft_id, "uid": user["sub"]
    })
    db.commit()
    redis.delete(f"draft:active:{draft_id}")
    return {"status": "deleted"}

@router.get("/{draft_id}/versions")
def get_versions(
    draft_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    result = db.execute(text("""
        SELECT id, word_count, saved_at
        FROM draft_versions WHERE draft_id = :id
        ORDER BY saved_at DESC LIMIT 20
    """), {"id": draft_id})
    return {"versions": [dict(r._mapping) for r in result]}