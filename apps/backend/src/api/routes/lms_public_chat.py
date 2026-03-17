"""Public AI chatbot — Phase C2 (GP-Phase-C)."""

import os
import time
import uuid
from collections import defaultdict

from anthropic import Anthropic
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/lms/public", tags=["lms-public-chat"])

_anthropic: Anthropic | None = None


def _get_client() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
    return _anthropic


# In-memory rate limiting: {ip: [timestamp, ...]}
_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_WINDOW = 3600  # 1 hour
_RATE_LIMIT = 10  # messages per window

SYSTEM_PROMPT = """You are the CARSI virtual assistant. CARSI (Continuing and Restoration Sciences Institute) is an Australian online training platform for the building restoration industry — covering water damage restoration (WRT), carpet cleaning, odour control, applied structural drying, and related IICRC disciplines.

You help potential students and professionals with:
- Course information and requirements
- IICRC certification pathways and CECs (Continuing Education Credits)
- Pricing and subscription plans (Foundation plan at $795 AUD/year with 7-day free trial)
- Career outcomes and industry context
- How to get started on CARSI

Keep responses under 3 sentences. Be helpful, direct, and professional. Use Australian English.
If asked something outside your scope (account issues, technical problems, specific student data), say "For that, please contact us at admin@carsi.com.au or use the contact form."

Do NOT invent specific course names, prices other than $795/year, or make promises about certification outcomes."""


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str


@router.post("/chat", response_model=ChatResponse)
async def public_chat(body: ChatRequest, request: Request) -> ChatResponse:
    """Public chatbot endpoint — no auth required."""
    ip = request.client.host if request.client else "unknown"

    # Rate limit check
    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < _RATE_WINDOW]
    if len(_rate_store[ip]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
        )
    _rate_store[ip].append(now)

    conversation_id = body.conversation_id or str(uuid.uuid4())

    # Check ANTHROPIC_API_KEY is configured
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Graceful degradation — return a helpful fallback
        return ChatResponse(
            reply="I'm not available right now. Please contact us at admin@carsi.com.au or use the contact form on our website.",
            conversation_id=conversation_id,
        )

    try:
        client = _get_client()
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": body.message}],
        )
        reply = (
            response.content[0].text
            if response.content
            else "I couldn't process that. Please try again."
        )
    except Exception:
        reply = "I'm having trouble right now. Please contact us at admin@carsi.com.au"

    return ChatResponse(reply=reply, conversation_id=conversation_id)
