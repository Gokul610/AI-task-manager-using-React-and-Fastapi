# backend/app/schemas/summary_schema.py

from pydantic import BaseModel, ConfigDict
from typing import Optional
import datetime

class WeeklySummary(BaseModel):
    """
    The main object sent to the frontend with the weekly summary.
    """
    summary_html: str
    generated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)