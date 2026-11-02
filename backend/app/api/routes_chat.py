import json
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.agent import agent
from app.core.session_ctx import get_visitor_id, set_visitor_id

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []

@router.post("")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Server-Sent Events (SSE) streaming endpoint for 2-step Agentic RAG.
    Streams events (planning, tool calls, dynamic embeddings) and generation tokens.
    """
    vid = get_visitor_id()

    async def event_generator():
        set_visitor_id(vid)
        try:
            async for chunk in agent.execute_rag_pipeline(
                user_message=req.message,
                chat_history=req.history or [],
                model_name=req.model
            ):
                payload = json.dumps(chunk)
                yield f"data: {payload}\n\n"
        except Exception as e:
            err_payload = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
