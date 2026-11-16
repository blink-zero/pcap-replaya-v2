from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Literal
from pydantic import Field, SecretStr
import os


class Settings(BaseSettings):
    app_name: str = "PCAP Replaya v2"
    app_version: str = "2.0.0"
    debug: bool = False

    upload_folder: str = os.path.expanduser("~/pcap-replaya-uploads")
    max_file_size: int = 1024 * 1024 * 1024  # 1GB
    db_path: str = os.path.expanduser("~/pcap-replaya-v2.db")

    api_key: str | None = None
    cors_origins: str = "*"
    host: str = "0.0.0.0"
    port: int = 8000

    analysis_packet_limit: int = 500_000

    pcaphub_api_key: SecretStr | None = None
    pcaphub_auth_mode: Literal["api-key", "bearer"] = "api-key"
    pcaphub_max_download_bytes: int = Field(default=256 * 1024 * 1024, ge=24)
    pcaphub_timeout_seconds: float = Field(default=120, gt=0, le=600)

    model_config = {"env_prefix": "PCAP_", "env_file": ".env"}


settings = Settings()

Path(settings.upload_folder).mkdir(parents=True, exist_ok=True)
