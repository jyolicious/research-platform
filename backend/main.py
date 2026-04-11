from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import test_connection
from redis_client import test_redis
from routes import papers
from routes import auth
from routes import ai
from routes import stats
from routes import papers, drafts, auth, ai, export, stats


app = FastAPI(title="Research Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
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
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(drafts.router,  prefix="/drafts", tags=["drafts"])
app.include_router(export.router,  prefix="/drafts", tags=["export"])