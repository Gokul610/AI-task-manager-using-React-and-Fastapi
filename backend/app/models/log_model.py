# backend/app/models/log_model.py

from __future__ import annotations
import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base

class UserLog(Base):
    """
    Model to track user actions for future ML training.
    Stores a snapshot of the task state at the time of the action.
    """
    __tablename__ = "user_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    action: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    task_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    # --- MODIFIED LINE ---
    # We add nullable=True and ondelete="SET NULL"
    # This tells the database to set task_id to NULL if the parent task is deleted.
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    # ---------------------
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="logs")
    task: Mapped["Task"] = relationship(back_populates="logs")