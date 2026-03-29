from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from google.oauth2 import id_token
from google.auth.transport import requests
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import uuid
import httpx

load_dotenv()

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

def create_jwt(user_id: str, email: str, name: str):
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@router.post("/google")
async def google_login(data: dict, db: Session = Depends(get_db)):
    try:
        access_token = data.get("token")
        # Get user info from Google using access token
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        info = resp.json()
        google_id = info["id"]
        email = info["email"]
        name = info.get("name", email.split("@")[0])

        # Check if user exists
        existing = db.execute(text(
            "SELECT id, name, email FROM users WHERE google_id = :gid"
        ), {"gid": google_id}).fetchone()

        if existing:
            user_id = str(existing.id)
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            db.execute(text("""
                INSERT INTO users (id, email, name, google_id)
                VALUES (:id, :email, :name, :gid)
            """), {"id": user_id, "email": email,
                   "name": name, "gid": google_id})
            db.commit()

        token = create_jwt(user_id, email, name)
        return {
            "token": token,
            "user": {"id": user_id, "email": email, "name": name}
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@router.get("/me")
def get_me(db: Session = Depends(get_db)):
    return {"message": "auth working"}