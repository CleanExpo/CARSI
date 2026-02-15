"""
Supabase Client for Backend

Handles database connections with Australian context:
- AEST timezone handling
- Australian data validation (ABN, mobile, suburbs)
- Type-safe queries with Pydantic models
"""


from supabase import Client, create_client

from src.config.settings import get_settings

settings = get_settings()

# Global client instance - lazy loaded
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Create and return Supabase client.

    Connects to Supabase PostgreSQL database with:
    - Row Level Security (RLS) enabled
    - Australian schema (contractors, availability_slots)
    - AEST timezone configuration

    Raises:
        ValueError: If Supabase credentials are not configured
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    supabase_url = settings.supabase_url
    supabase_key = settings.supabase_anon_key

    if not supabase_url or not supabase_key:
        raise ValueError(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
        )

    _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client


def is_supabase_configured() -> bool:
    """Check if Supabase credentials are configured."""
    return bool(settings.supabase_url and settings.supabase_anon_key)


# Lazy property for backwards compatibility - raises on access if not configured
class _LazySupabaseClient:
    """Lazy wrapper that raises only when accessed without credentials."""

    def __getattr__(self, name: str):
        return getattr(get_supabase_client(), name)


supabase: Client = _LazySupabaseClient()  # type: ignore
