# backend/app/schemas/user_schema.py

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from .task_schema import TaskRead  # This relative import is correct

# --- User Schemas ---

# Base properties shared by all user-related schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

# Properties to return to the client (output)
class UserRead(UserBase):
    id: int
    is_active: bool
    # --- NEW FIELD ---
    has_finalized_signup: bool
    # -----------------
    
    model_config = ConfigDict(from_attributes=True)


# Schema for the data returned by /auth/me
class UserReadWithStatus(UserRead):
    pass
    
    model_config = ConfigDict(from_attributes=True)


# --- Token Schemas ---

# Schema for the data hidden inside the JWT
class TokenData(BaseModel):
    user_id: int

# Schema for the JWT token response
class Token(BaseModel):
    access_token: str
    token_type: str

# --- NEW SCHEMA FOR FINALIZE STEP ---
class FinalizeSignup(BaseModel):
    accepts_terms: bool = Field(..., description="User accepts Terms and Conditions")