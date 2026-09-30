from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": "ServiceOS",
        "version": "0.0.4",
    }