# backend/app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Annotated, Any, Literal
from pathlib import Path

from pydantic import (
    AnyUrl,
    BeforeValidator,
    computed_field,
    PostgresDsn,
    Field
)

from pydantic_core import MultiHostUrl

# --- Calculate the path to the .env file ---
ENV_PATH = Path(__file__).resolve().parent.parent.parent / '.env'
# ---------------------------------------------


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding='utf-8',
        extra="ignore",
        env_ignore_empty=True,
    )
    DOMAIN: str = 'localhost'
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    
    # --- MODIFIED: JWT & Auth Settings ---
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 # Short-lived token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 90   # Long-lived persistent token
    # -------------------------------------
    
    # --- NEW: Google OAuth Credentials ---
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    # ---------------------------------

    @computed_field
    @property
    def server_host(self) -> str:
        # Use HTTPS for anything other than local development
        if self.ENVIRONMENT == "local":
            return f"http://{self.DOMAIN}"
        return f"https://{self.DOMAIN}"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = Field(default_factory=list)

    # --- Database & AI Settings (Unchanged) ---
    POSTGRESQL_USERNAME: str
    POSTGRESQL_PASSWORD: str
    POSTGRESQL_SERVER: str
    POSTGRESQL_PORT: int
    POSTGRESQL_DATABASE: str
    GEMINI_API_KEY: str

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return MultiHostUrl.build(
            scheme="postgresql+psycopg2",
            username=self.POSTGRESQL_USERNAME,
            password=self.POSTGRESQL_PASSWORD,
            host=self.POSTGRESQL_SERVER,
            port=self.POSTGRESQL_PORT,
            path=self.POSTGRESQL_DATABASE,
        )

# (This file correctly does NOT create the settings instance)