from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import test_connection
from redis_client import test_redis
from routes import papers
from routes import auth


app = FastAPI(title="Research Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    test_connection()
    test_redis()

@app.get("/")
def root():
    return {"status": "running"}
app.include_router(papers.router, prefix="/papers", tags=["papers"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])