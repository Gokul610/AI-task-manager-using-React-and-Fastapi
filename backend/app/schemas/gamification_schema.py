# backend/app/schemas/gamification_schema.py

from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class Achievement(BaseModel):
    """
    Represents a single unlocked achievement.
    """
    id: str           # e.g., "tasks_10"
    name: str         # e.g., "Task Master"
    description: str  # e.g., "Completed 10 tasks"
    emoji: str        # e.g., "🏆"

class GamificationStatus(BaseModel):
    """
    The main object sent to the frontend with all gamification data.
    """
    current_streak: int
    longest_streak: int
    achievements: List[Achievement] = []

    model_config = ConfigDict(from_attributes=True)