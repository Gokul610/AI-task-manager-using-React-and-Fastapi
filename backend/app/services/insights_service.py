# backend/app/services/insights_service.py

import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, extract, Boolean
from typing import List, Dict, Any
import json
from zoneinfo import ZoneInfo # <-- NEW IMPORT

from ..models.task_model import Task
from ..models.user_model import User
from ..models.log_model import UserLog
from ..schemas import insights_schema # <-- NEW IMPORT

# --- Configuration Constants ---
BURNDOWN_PERIOD_DAYS = 15 # The default projection period for the burndown chart
HIGH_PRIORITY_THRESHOLD = 70 # Score >= 70 is 'High'
try:
    # Use 'Asia/Kolkata' for IST
    USER_TIMEZONE = ZoneInfo("Asia/Kolkata") 
except Exception:
    # Fallback if zoneinfo fails
    USER_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
# -------------------------------


def get_burndown_data(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Calculates the data for the Predictive Progress (Burndown) Chart
    using real velocity calculations.
    """
    
    # --- 1. Get Current Remaining Work ---
    # This is the sum of priority scores for all *active* tasks.
    current_remaining_work = db.query(func.sum(Task.priority_score)).filter(
        Task.owner_id == user_id,
        Task.completed == False
    ).scalar() or 0.0

    # --- 2. Calculate Average Daily Velocity ---
    today = datetime.datetime.now(datetime.timezone.utc).date()
    
    # Find the timestamp of the first-ever completed task for this user
    first_completion_time = db.query(func.min(UserLog.timestamp)).filter(
        UserLog.user_id == user_id,
        UserLog.action.in_(['completed', 'completed_basic', 'logged_time'])
    ).scalar()

    velocity = 0.0
    if first_completion_time:
        # Calculate the number of days the user has been active
        days_of_activity = (today - first_completion_time.date()).days
        # Ensure at least 1 day to avoid division by zero
        days_of_activity = max(1, days_of_activity) 
        
        # Find the total priority score of all *completed* tasks
        # We query the Task table, not the log, to get the final score
        total_completed_work = db.query(func.sum(Task.priority_score)).filter(
            Task.owner_id == user_id,
            Task.completed == True
        ).scalar() or 0.0
        
        # Velocity = Total completed work / days of activity
        velocity = total_completed_work / days_of_activity
        
    print(f"--- Burndown Calc: User {user_id} ---")
    print(f"  Current Remaining Work: {current_remaining_work}")
    print(f"  First Completion: {first_completion_time}")
    print(f"  Daily Velocity: {velocity}")
    print("-----------------------------------")


    # --- 3. Define the Ideal Burndown ---
    # A simple linear decay from current work to zero
    daily_ideal_burn = 0.0
    if BURNDOWN_PERIOD_DAYS > 0:
         daily_ideal_burn = current_remaining_work / BURNDOWN_PERIOD_DAYS
    
    # --- 4. Generate the data series ---
    data = []
    
    # Initial point (Day 0)
    data.append({
        "name": "Start",
        "ideal": round(current_remaining_work, 1),
        "remaining": round(current_remaining_work, 1), # Predicted line also starts here
    })

    # Generate daily points
    for i in range(1, BURNDOWN_PERIOD_DAYS + 1):
        day_name = f"Day {i}"
        
        # Ideal line calculation
        ideal_remaining = max(0.0, current_remaining_work - (daily_ideal_burn * i))
        
        # Predicted Remaining (using real velocity)
        # If velocity is 0, this line will be flat, which is correct.
        predicted_remaining = max(0.0, current_remaining_work - (velocity * i))

        data.append({
            "name": day_name,
            "ideal": round(ideal_remaining, 1),
            "remaining": round(predicted_remaining, 1),
        })

    return data


def get_productivity_heatmap_data(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Calculates the data for the Productivity Heatmap.
    Analyzes completed tasks logged in user_logs to count completions by day/hour.
    """
    
    # --- FIX: Use timezone-aware datetime for comparison ---
    sixty_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=60)
    # -----------------------------------------------------

    # Use the UserLog table for accurate action timestamps
    heatmap_data_query = db.query(
        extract('dow', UserLog.timestamp).label('day_of_week'), # 0=Sunday, 6=Saturday
        extract('hour', UserLog.timestamp).label('hour_of_day'),
        func.count(UserLog.id).label('task_count')
    ).filter(
        UserLog.user_id == user_id,
        UserLog.action.in_(['completed', 'completed_basic', 'logged_time']), # Actions indicating completion
        # Filter for data from the last 60 days to keep it relevant
        UserLog.timestamp >= sixty_days_ago # <-- Use the new variable here
    ).group_by(
        'day_of_week',
        'hour_of_day'
    ).order_by(
        'day_of_week',
        'hour_of_day'
    ).all()

    # Mapping of DOW (0-6) to label (for easy frontend use)
    day_map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    # Format the data for the frontend
    formatted_data = []
    for row in heatmap_data_query:
        # Day: Use frontend friendly label
        # Hour: Use 0-23 integer
        # Value: Use the count
        formatted_data.append({
            'day': day_map[int(row.day_of_week)],
            'hour': int(row.hour_of_day),
            'value': row.task_count
        })

    return formatted_data

# --- NEW FUNCTION ---
def get_dashboard_progress(db: Session, user_id: int) -> insights_schema.DashboardProgressSummary:
    """
    Calculates the progress stats for the main dashboard.
    """
    
    # --- 1. Today's Progress ---
    # Get the current time *in the user's local timezone*
    now_local = datetime.datetime.now(USER_TIMEZONE)
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)
    
    today_tasks_query = db.query(Task).filter(
        Task.owner_id == user_id,
        Task.due_date != None,
        Task.due_date >= today_start,
        Task.due_date < today_end
    )
    
    today_total = today_tasks_query.count()
    today_completed = today_tasks_query.filter(Task.completed == True).count()
    
    # --- 2. Weekly Progress ---
    # Use 'today_start' from above
    week_end = today_start + datetime.timedelta(days=7)
    
    week_tasks_query = db.query(Task).filter(
        Task.owner_id == user_id,
        Task.due_date != None,
        Task.due_date >= today_start, # From start of today
        Task.due_date < week_end      # Until 7 days from now
    )
    
    week_total = week_tasks_query.count()
    week_completed = week_tasks_query.filter(Task.completed == True).count()

    # --- 3. High Priority Progress ---
    # Get ALL high priority tasks (completed and uncompleted)
    high_priority_query = db.query(Task).filter(
        Task.owner_id == user_id,
        Task.priority_score >= HIGH_PRIORITY_THRESHOLD
    )
    
    high_priority_total = high_priority_query.count()
    high_priority_completed = high_priority_query.filter(Task.completed == True).count()
    
    # --- 4. Assemble Response ---
    return insights_schema.DashboardProgressSummary(
        today=insights_schema.ProgressStat(
            completed=today_completed,
            total=today_total,
            label="Today's Tasks"
        ),
        week=insights_schema.ProgressStat(
            completed=week_completed,
            total=week_total,
            label="This Week's Tasks"
        ),
        high_priority=insights_schema.ProgressStat(
            completed=high_priority_completed,
            total=high_priority_total,
            label="High Priority"
        )
    )
# --- END OF NEW FUNCTION ---