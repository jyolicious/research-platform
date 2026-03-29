from database import test_connection
from redis_client import test_redis

print("Testing connections...")
test_connection()
test_redis()
print("All good. Ready to build.")