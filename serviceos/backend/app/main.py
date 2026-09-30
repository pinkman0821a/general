from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router


app = FastAPI(
    title="ServiceOS API",
    version="0.0.3",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)


@app.get("/")
def root():
    return {
        "app": "ServiceOS",
        "version": "0.0.3",
        "status": "running",
    }