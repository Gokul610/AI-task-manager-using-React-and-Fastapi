# backend/app/models/task_model.py

from __future__ import annotations
from typing import Optional, List
import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base 

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # --- Ensuring all datetimes are timezone-aware ---
    due_date: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    # --------------------------------------------------

    completed: Mapped[bool] = mapped_column(default=False)
    task_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=3) 
    ask_completion_time: Mapped[bool] = mapped_column(default=False, server_default='false')
    
    # --- NEW: GOOGLE CALENDAR SYNC FIELD ---
    google_calendar_event_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    # -------------------------------------
    
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    # Relationships
    owner: Mapped["User"] = relationship(back_populates="tasks")
    logs: Mapped[List["UserLog"]] = relationship(back_populates="task")