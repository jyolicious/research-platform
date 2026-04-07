from fastapi import APIRouter, Depends
from redis_client import get_redis
import hashlib, os, httpx
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

MODEL_AVAILABLE = os.path.exists(
    os.path.join(os.path.dirname(__file__), '../../data/paperlens_model/config.json')
)

if MODEL_AVAILABLE:
    from ml.inference import predict_next
    print("✅ Using fine-tuned PaperLens model")
else:
    print("⚠️  Fine-tuned model not found, using Claude API")

@router.post("/suggest")
async def suggest(data: dict, redis=Depends(get_redis)):
    text = data.get("text", "")
    if not text or len(text) < 30:
        return {"suggestion": "", "source": "none"}

    cache_key = "suggest:" + hashlib.md5(text[-200:].encode()).hexdigest()
    cached = redis.get(cache_key)
    if cached:
        return {"suggestion": cached, "source": "cache"}

    # Try fine-tuned model first
    if MODEL_AVAILABLE:
        try:
            suggestion = predict_next(text)
            if suggestion and len(suggestion) > 10:
                redis.setex(cache_key, 3600, suggestion)
                return {"suggestion": suggestion, "source": "paperlens_model"}
        except Exception as e:
            print(f"Model inference failed: {e}")

    # Fallback to Claude API
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
                        "content": f"Continue this academic text with 1-2 sentences. Be precise and scholarly. Text: {text[-300:]}"
                    }]
                }
            )
        suggestion = res.json()["content"][0]["text"].strip()
        redis.setex(cache_key, 3600, suggestion)
        return {"suggestion": suggestion, "source": "claude"}
    except Exception as e:
        return {"suggestion": "", "source": "error"}