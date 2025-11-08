# backend/app/models/user_model.py

from __future__ import annotations
from typing import List, Optional
import datetime
from sqlalchemy import Column, Integer, String, Boolean, Date, JSON, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base 

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, index=True)
    
    # --- This is now gone, as planned ---
    # hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # --- We're keeping is_active, but adding a new flag ---
    is_active: Mapped[bool] = mapped_column(default=True)
    
    # --- NEW FLAG FOR YOUR SIGNUP FLOW ---
    has_finalized_signup: Mapped[bool] = mapped_column(default=False, nullable=False, server_default='false')
    # -----------------------------------

    # --- GOOGLE AUTH FIELDS (from last time) ---
    google_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    google_oauth_refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # --- PERSISTENT LOGIN FIELD (from last time) ---
    our_app_refresh_token: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    
    # --- GAMIFICATION FIELDS (Unchanged) ---
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default='0')
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default='0')
    last_active_day: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    achievements: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    
    # --- SUMMARY CACHE FIELDS (Unchanged) ---
    last_summary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_summary_generated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # --------------------------------

    # Relationships (Unchanged)
    tasks: Mapped[List["Task"]] = relationship(back_populates="owner")
    logs: Mapped[List["UserLog"]] = relationship(back_populates="user")