from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    MODEL_PATH: str = r"C:\Manju\repos\Model teachablemachine"
    OCR_MODEL_PATH: str = r"C:\Manju\repos\OCR"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    MAX_FILE_SIZE_MB: int = 10
    CONFIDENCE_THRESHOLD: float = 0.5

    # Redis cache settings (for dictionary lookups)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_TTL_SECONDS: int = 604800  # 7 days

    # Translation default language
    DEFAULT_TRANSLATION_LANG: str = "en"

    class Config:
        env_file = ".env"

settings = Settings()
