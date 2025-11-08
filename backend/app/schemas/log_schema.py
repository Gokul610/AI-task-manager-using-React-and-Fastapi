# backend/app/schemas/log_schema.py

from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
import datetime

# Schema for creating a log entry (used internally by the log_service)
class LogCreate(BaseModel):
    user_id: int
    task_id: int
    action: str
    task_snapshot: Dict[str, Any]

# Schema for reading a log entry (for API output, if needed later)
class LogRead(BaseModel):
    id: int
    user_id: int
    task_id: int
    action: str
    task_snapshot: Dict[str, Any]
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)