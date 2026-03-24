"""Application settings and configuration."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_UNSAFE_JWT_DEFAULTS = {
    "your-secret-key-change-in-production",
    "your-secret-key-change-in-production-use-long-random-string",
    "changeme",
    "secret",
}


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project
    project_name: str = Field(default="AI Agent Orchestration")
    environment: Literal["development", "staging", "production"] = Field(
        default="development"
    )
    debug: bool = Field(default=False)

    # API
    backend_api_key: str = Field(default="")
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3009"],
        description="Allowed CORS origins. Override in production via CORS_ORIGINS env var.",
    )

    # Database (PostgreSQL)
    database_url: str = Field(
        default="postgresql://starter_user:local_dev_password@localhost:5433/starter_db",
        description="PostgreSQL connection URL"
    )

    # JWT Authentication
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    jwt_expire_minutes: int = Field(default=60, description="JWT token expiration in minutes")

    # Webhook
    webhook_secret: str = Field(
        default="",
        description="HMAC secret for verifying webhook signatures"
    )

    @model_validator(mode="after")
    def _reject_unsafe_defaults_in_production(self) -> "Settings":
        """Reject insecure default secrets when running in production."""
        if self.environment == "production":
            if self.jwt_secret_key in _UNSAFE_JWT_DEFAULTS:
                raise ValueError(
                    "JWT_SECRET_KEY must be changed from the default value "
                    "before running in production."
                )
            if len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must be at least 32 characters in production."
                )
        return self

    @model_validator(mode="after")
    def _reject_missing_secrets_in_production(self) -> "Settings":
        """Reject missing critical secrets when running in production."""
        if self.environment == "production":
            missing = []
            if not self.stripe_secret_key:
                missing.append("STRIPE_SECRET_KEY")
            if not self.stripe_webhook_secret:
                missing.append("STRIPE_WEBHOOK_SECRET")
            if missing:
                raise ValueError(
                    f"Required secrets not set in production: {', '.join(missing)}"
                )
        return self

    # AI Provider Configuration
    ai_provider: str = Field(
        default="ollama",
        description="AI provider: 'ollama' (local) or 'anthropic' (cloud)"
    )

    # Ollama (Local AI - No API key required)
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Ollama server URL"
    )
    ollama_model: str = Field(
        default="llama3.1:8b",
        description="Ollama model for generation"
    )
    ollama_embedding_model: str = Field(
        default="nomic-embed-text",
        description="Ollama model for embeddings"
    )

    # Cloud AI Models (Optional)
    anthropic_api_key: str = Field(default="", description="Anthropic API key (optional)")
    google_ai_api_key: str = Field(default="", description="Google AI API key (optional)")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key (optional)")

    # Google Drive Integration (OAuth2 user credentials)
    google_client_id: str = Field(default="", description="Google OAuth2 Client ID")
    google_client_secret: str = Field(default="", description="Google OAuth2 Client Secret")
    google_drive_redirect_uri: str = Field(
        default="http://localhost:8000/api/lms/drive/auth/callback",
        description="OAuth2 redirect URI for Drive admin auth flow",
    )
    google_drive_folder_id: str = Field(
        default="",
        description="Root Google Drive folder ID for CARSI course content",
    )
    feature_google_drive: bool = Field(
        default=False,
        description="Enable Google Drive integration (requires OAuth2 token stored via /auth/connect)",
    )

    # Redis & Celery
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL (used for Celery broker and cache)",
    )
    celery_broker_url: str = Field(default="", description="Celery broker URL (defaults to redis_url/1)")
    celery_result_backend: str = Field(default="", description="Celery result backend URL (defaults to redis_url/2)")

    @property
    def effective_celery_broker(self) -> str:
        return self.celery_broker_url or self.redis_url.rstrip("/") + "/1"

    @property
    def effective_celery_backend(self) -> str:
        return self.celery_result_backend or self.redis_url.rstrip("/") + "/2"

    # Stripe Payments
    stripe_secret_key: str = Field(default="", description="Stripe secret API key")
    stripe_webhook_secret: str = Field(default="", description="Stripe webhook signing secret")
    stripe_yearly_price_id: str = Field(default="", description="Stripe yearly subscription price ID")
    stripe_foundation_price_id: str = Field(default="", description="Stripe Foundation plan monthly price ID ($44/mo)")
    stripe_growth_price_id: str = Field(default="", description="Stripe Growth plan monthly price ID ($99/mo)")
    frontend_url: str = Field(
        default="http://localhost:3009",
        description="Frontend URL for Stripe redirects",
    )

    # Unite-Hub Nexus Integration
    unite_hub_api_url: str = Field(
        default="https://api.unite-hub.com/v1/events",
        description="Unite-Hub Nexus API endpoint for event push",
    )
    unite_hub_api_key: str = Field(
        default="",
        description="API key for Unite-Hub Nexus (leave empty to disable)",
    )

    # Synthex Marketing Automation Integration
    synthex_api_url: str = Field(
        default="https://synthex.unite-group.com.au/api/webhooks/carsi",
        description="Synthex API endpoint for marketing automation events",
    )
    synthex_api_key: str = Field(
        default="",
        description="API key for Synthex integration (leave empty to disable)",
    )
    synthex_data_sync_enabled: bool = Field(
        default=True,
        description="Enable Synthex data sync endpoints for full LMS visibility",
    )

    # YouTube Data API (UNI-71 — YouTube Channel Directory)
    youtube_api_key: str = Field(
        default="",
        description="YouTube Data API v3 key for channel stats sync (leave empty to disable sync)",
    )

    # MCP Tools
    exa_api_key: str = Field(default="")
    ref_tools_api_key: str = Field(default="")

    # Model defaults
    default_model: str = Field(default="claude-sonnet-4-5-20250929")
    max_tokens: int = Field(default=4096)
    temperature: float = Field(default=0.7)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
