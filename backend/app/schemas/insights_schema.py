# backend/app/schemas/insights_schema.py

from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# --- NEW SCHEMAS FOR DASHBOARD PROGRESS ---

class ProgressStat(BaseModel):
    """
    Represents the data for a single progress bar.
    """
    completed: int
    total: int
    label: str # e.g., "Today", "This Week", "High Priority"

class DashboardProgressSummary(BaseModel):
    """
    The complete response model for the dashboard progress summary.
    """
    today: ProgressStat
    week: ProgressStat
    high_priority: ProgressStat

    model_config = ConfigDict(from_attributes=True)