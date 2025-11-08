# backend/app/api/summary_router.py

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import datetime # <-- Import datetime

from ..core.database import get_db
from ..models import user_model, log_model # <-- Import log_model
from ..schemas import summary_schema
from ..services import auth_service, summary_service, insights_service # <-- Import insights_service

router = APIRouter(
    prefix="/summary",
    tags=["Summary"],
    dependencies=[Depends(auth_service.get_current_user)]
)

@router.get("/weekly", response_model=summary_schema.WeeklySummary)
async def get_weekly_summary(
    force_regenerate: bool = Query(False, description="Force a new summary to be generated, ignoring the cache."),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Retrieves the user's weekly AI-generated summary.
    
    By default, this endpoint returns a cached summary if one was
    generated within the last 24 hours.
    
    Use ?force_regenerate=true to bypass the cache and generate a new one.
    """
    
    # 1. Check if a valid cache exists
    if (
        not force_regenerate and
        current_user.last_summary_generated_at and
        current_user.last_summary_text and
        current_user.last_summary_generated_at > (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=summary_service.CACHE_DURATION_HOURS))
    ):
        print(f"User {current_user.id}: Returning cached summary.")
        return summary_schema.WeeklySummary(
            summary_html=current_user.last_summary_text,
            generated_at=current_user.last_summary_generated_at
        )

    # 2. If no valid cache, generate a new one
    print(f"User {current_user.id}: Generating new summary (Force: {force_regenerate}).")

    try:
        # --- FIX: Perform all DB queries BEFORE awaiting ---
        
        # A. Get heatmap data
        heatmap_data = insights_service.get_productivity_heatmap_data(db, current_user.id)
        
        # B. Get logs from the last 7 days
        seven_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
        recent_logs = db.query(log_model.UserLog).filter(
            log_model.UserLog.user_id == current_user.id,
            log_model.UserLog.timestamp >= seven_days_ago
        ).order_by(log_model.UserLog.timestamp.desc()).all()
        # --------------------------------------------------

        # Now, call the async service with the data (no db session)
        summary_html = await summary_service.generate_new_summary(
            heatmap_data=heatmap_data, 
            recent_logs=recent_logs
        )
        
        # --- After await, use the db session again ---
        generated_at_time = datetime.datetime.now(datetime.timezone.utc)
        current_user.last_summary_text = summary_html
        current_user.last_summary_generated_at = generated_at_time
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        return summary_schema.WeeklySummary(
            summary_html=summary_html,
            generated_at=generated_at_time
        )
        
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        # Print the full error to the console for debugging
        print(f"🚨 UNEXPECTED ERROR in /summary/weekly: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")