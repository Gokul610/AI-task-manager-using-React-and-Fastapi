# backend/app/services/gamification_service.py

import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional # <-- IMPORT 'List' HERE

from ..models.user_model import User
from ..models.log_model import UserLog
from ..schemas.gamification_schema import GamificationStatus, Achievement

# --- 1. Define All Possible Achievements ---
# We store this as a master dictionary. The user's model will
# just store the keys (e.g., "tasks_1", "streak_5").

ALL_ACHIEVEMENTS: dict[str, Achievement] = {
    "tasks_1": Achievement(
        id="tasks_1",
        name="First Step",
        description="Completed your first task",
        emoji="🎉"
    ),
    "tasks_5": Achievement(
        id="tasks_5",
        name="Task Novice",
        description="Completed 5 tasks",
        emoji="👍"
    ),
    "tasks_10": Achievement(
        id="tasks_10",
        name="Task Apprentice",
        description="Completed 10 tasks",
        emoji="🔥"
    ),
    "tasks_25": Achievement(
        id="tasks_25",
        name="Task Journeyman",
        description="Completed 25 tasks",
        emoji="🚀"
    ),
    "tasks_50": Achievement(
        id="tasks_50",
        name="Task Master",
        description="Completed 50 tasks",
        emoji="🏆"
    ),
    "streak_3": Achievement(
        id="streak_3",
        name="On a Roll",
        description="Maintained a 3-day streak",
        emoji="📈"
    ),
    "streak_7": Achievement(
        id="streak_7",
        name="Week Warrior",
        description="Maintained a 7-day streak",
        emoji="📅"
    ),
    "streak_14": Achievement(
        id="streak_14",
        name="Unstoppable",
        description="Maintained a 14-day streak",
        emoji="🌟"
    ),
}

# --- 2. Main Service Function to Update Stats ---

def update_gamification_stats(db: Session, user: User) -> List[Achievement]:
    """
    Updates the user's streak and checks for new achievements.
    This is called *after* a task is successfully marked as complete.
    Returns a list of any *newly* unlocked achievements.
    """
    
    # --- Part A: Update Streak ---
    today = datetime.date.today()
    newly_unlocked_ids = []

    if user.last_active_day != today:
        if user.last_active_day == (today - datetime.timedelta(days=1)):
            # It was yesterday, so continue the streak
            user.current_streak += 1
        else:
            # It was before yesterday or never, reset the streak
            user.current_streak = 1
        
        # Update last active day
        user.last_active_day = today

        # Update longest streak if needed
        if user.current_streak > user.longest_streak:
            user.longest_streak = user.current_streak
    
    # --- Part B: Check for New Achievements ---
    
    # Ensure achievements list exists
    if user.achievements is None:
        user.achievements = []

    # Get total completed tasks from the log table
    completed_task_count = db.query(func.count(UserLog.id)).filter(
        UserLog.user_id == user.id,
        UserLog.action.in_(['completed', 'completed_basic', 'logged_time'])
    ).scalar() or 0

    # Define the checks in a structured way
    achievement_checks = {
        "tasks_1": completed_task_count >= 1,
        "tasks_5": completed_task_count >= 5,
        "tasks_10": completed_task_count >= 10,
        "tasks_25": completed_task_count >= 25,
        "tasks_50": completed_task_count >= 50,
        "streak_3": user.current_streak >= 3,
        "streak_7": user.current_streak >= 7,
        "streak_14": user.current_streak >= 14,
    }

    # Loop through all possible achievements
    for achievement_id, is_unlocked in achievement_checks.items():
        if is_unlocked and (achievement_id not in user.achievements):
            # This is a new achievement!
            user.achievements.append(achievement_id)
            newly_unlocked_ids.append(achievement_id)
            
    # Mark the 'achievements' field as modified for JSONB
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user, "achievements")
    
    # Return the full objects for any newly unlocked achievements
    return [ALL_ACHIEVEMENTS[id] for id in newly_unlocked_ids]


# --- 3. Main Service Function to Get Status ---

def get_gamification_status(user: User) -> GamificationStatus:
    """
    Gets the user's current gamification status.
    """
    unlocked_achievements = []
    if user.achievements:
        for achievement_id in user.achievements:
            if achievement_id in ALL_ACHIEVEMENTS:
                unlocked_achievements.append(ALL_ACHIEVEMENTS[achievement_id])

    return GamificationStatus(
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        achievements=unlocked_achievements
    )