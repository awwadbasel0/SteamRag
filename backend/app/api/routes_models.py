from fastapi import APIRouter
from app.core.ollama_client import ollama_client

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
async def get_installed_models():
    """Lists live canary-verified Google Gemini Cloud models."""
    models = await ollama_client.list_models()
    return {"models": models}


@router.get("/hardware")
async def get_hardware_info():
    """Cloud-only server mode does not use local GPU hardware."""
    return {
        "gpu": {"has_gpu": False, "name": "Google Gemini Cloud", "vram_total_mb": 0, "vram_free_mb": 0, "driver": "Cloud"},
        "ram": {"total_mb": 0, "available_mb": 0},
    }


@router.get("/catalog")
async def get_catalog():
    """Cloud-only server mode discovers models dynamically from Google Gemini API."""
    return {"catalog": []}
