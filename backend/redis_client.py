import redis
from dotenv import load_dotenv
import os

load_dotenv()

r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)

def get_redis():
    return r

def test_redis():
    r.set("ping", "pong")
    print("Redis connected:", r.get("ping"))