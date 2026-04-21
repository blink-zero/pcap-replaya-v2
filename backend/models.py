from pydantic import BaseModel, Field
from typing import Optional


# --- Files ---

class FileInfo(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_format: str = "unknown"
    packet_count: int = 0
    duration: float = 0
    uploaded_at: str
    updated_at: str


class FilterRequest(BaseModel):
    bpf_filter: str = Field(min_length=1, max_length=1024)
    name: Optional[str] = Field(default=None, max_length=255)


class FileAnalysis(BaseModel):
    file_id: str
    filename: str
    file_size: int
    file_format: str
    packet_count: int
    duration: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    data_rate: float = 0
    protocols: list[dict] = []
    top_talkers: list[dict] = []
    packet_size_distribution: dict = {}
    analysis_limited: bool = False


# --- Replay ---

class ReplayStartRequest(BaseModel):
    file_id: str
    interface: str
    speed: float = Field(default=1.0, gt=0)
    speed_unit: str = Field(default="multiplier", pattern="^(multiplier|pps)$")
    continuous: bool = False


class ReplayStatus(BaseModel):
    replay_id: Optional[str] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
    interface: Optional[str] = None
    speed: float = 1.0
    speed_unit: str = "multiplier"
    continuous: bool = False
    status: str = "idle"
    packets_sent: int = 0
    bytes_sent: int = 0
    total_packets: int = 0
    progress_percent: float = 0
    elapsed_time: float = 0
    loop_count: int = 0
    error: Optional[str] = None
    started_at: Optional[str] = None


# --- History ---

class HistoryEntry(BaseModel):
    id: str
    file_id: str
    filename: str
    interface: str
    speed: float
    speed_unit: str
    continuous: bool
    status: str
    packets_sent: int
    bytes_sent: int
    duration: float
    loop_count: int
    error: Optional[str] = None
    started_at: str
    finished_at: Optional[str] = None


class HistoryList(BaseModel):
    items: list[HistoryEntry]
    total: int
    limit: int
    offset: int


# --- Profiles ---

class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    interface: str
    speed: float = Field(default=1.0, gt=0)
    speed_unit: str = Field(default="multiplier", pattern="^(multiplier|pps)$")
    continuous: bool = False


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    interface: Optional[str] = None
    speed: Optional[float] = Field(default=None, gt=0)
    speed_unit: Optional[str] = Field(default=None, pattern="^(multiplier|pps)$")
    continuous: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    description: str
    interface: str
    speed: float
    speed_unit: str
    continuous: bool
    created_at: str
    updated_at: str


# --- System ---

class SystemStatus(BaseModel):
    cpu_percent: float
    memory_total: int
    memory_used: int
    memory_percent: float
    disk_total: int
    disk_used: int
    disk_percent: float
    uptime: float


class InterfaceInfo(BaseModel):
    name: str
    addresses: list[dict] = []
    is_up: bool = True
