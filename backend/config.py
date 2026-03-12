from pydantic_settings import BaseSettings
from pathlib import Path
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

    model_config = {"env_prefix": "PCAP_", "env_file": ".env"}


settings = Settings()

Path(settings.upload_folder).mkdir(parents=True, exist_ok=True)
