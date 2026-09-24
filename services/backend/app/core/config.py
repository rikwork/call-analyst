from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Call Analyst API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./call_analyst.db"
    
    # Security
    SECRET_KEY: str = "call-analyst-super-secure-dev-secret-key-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # AI & STT Providers
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"  # or gemini-2.5-flash / gemini-3.7-flash
    
    # STT Mode: "sber_gigaam", "mock", or "api"
    STT_PROVIDER: str = "sber_gigaam"
    
    # Audio Storage
    AUDIO_UPLOAD_DIR: str = "./storage/audio"
    AUDIO_RETENTION_DAYS: int = 14
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
