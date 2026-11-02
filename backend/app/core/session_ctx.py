import uuid
from contextvars import ContextVar

visitor_id_var: ContextVar[str] = ContextVar("visitor_id", default="default")

COOKIE_NAME = "steamrag_sid"


def get_visitor_id() -> str:
    """Returns the current request's isolated visitor session ID."""
    vid = visitor_id_var.get()
    return vid if vid else "default"


def set_visitor_id(vid: str) -> str:
    """Sets and sanitizes the current request's visitor session ID."""
    clean = (vid or "").strip()
    if not clean or len(clean) > 128:
        clean = uuid.uuid4().hex
    visitor_id_var.set(clean)
    return clean
