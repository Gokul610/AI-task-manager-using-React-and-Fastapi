# backend/app/api/gamification_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models import user_model
from ..schemas import gamification_schema
from ..services import auth_service, gamification_service

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"],
    dependencies=[Depends(auth_service.get_current_user)]
)

@router.get("/status", response_model=gamification_schema.GamificationStatus)
def get_user_gamification_status(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Retrieves the current user's gamification status,
    including streaks and unlocked achievements.
    """
    
    # The service function handles all the logic of
    # mapping the user's saved IDs to the full achievement objects.
    status = gamification_service.get_gamification_status(current_user)
    
    return status