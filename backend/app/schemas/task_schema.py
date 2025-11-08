# backend/app/schemas/task_schema.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
import datetime

# --- Task Schemas ---

# Properties for a base task
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    importance: int = Field(default=3, ge=1, le=5)

# To create a task via NLP, you ONLY provide the NLP text.
class TaskCreate(BaseModel):
    nlp_text: str

# Schema for manual task creation
class TaskCreateManual(TaskBase):
    pass 

# Properties for updating an existing task (all optional)
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    importance: Optional[int] = Field(default=None, ge=1, le=5)
    completed: Optional[bool] = None
    task_metadata: Optional[Dict[str, Any]] = None
    
    action_type: Optional[str] = None  # e.g., 'snoozed', 'logged_time', 'completed_basic', 'edited'
    completion_time_minutes: Optional[int] = None # For logging completion time

# Properties to return to the client (output)
class TaskRead(TaskBase):
    id: int
    priority_score: float
    completed: bool
    created_at: datetime.datetime
    owner_id: int
    task_metadata: Optional[Dict[str, Any]] = None # We will use this field
    ask_completion_time: bool
    
    # --- MODIFICATION: REMOVED a non-working field ---
    # smart_suggestion: Optional[Dict[str, Any]] = None
    # -------------------------------------------------

    model_config = ConfigDict(from_attributes=True)