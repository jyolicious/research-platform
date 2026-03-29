from fastapi import APIRouter, Depends
from redis_client import get_redis
import httpx, hashlib, os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

@router.post("/suggest")
async def suggest(data: dict, redis=Depends(get_redis)):
    text = data.get("text", "")
    if not text or len(text) < 30:
        return {"suggestion": ""}

    cache_key = "suggest:" + hashlib.md5(text[-200:].encode()).hexdigest()
    cached = redis.get(cache_key)
    if cached:
        return {"suggestion": cached}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 80,
                    "messages": [{
                        "role": "user",
                        "content": f"Continue this research paper text with exactly 1-2 sentences. Be academic and precise. Text: {text[-300:]}"
                    }]
                }
            )
        suggestion = res.json()["content"][0]["text"].strip()
        redis.setex(cache_key, 3600, suggestion)
        return {"suggestion": suggestion}
    except Exception as e:
        return {"suggestion": ""}