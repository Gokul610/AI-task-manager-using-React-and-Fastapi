# backend/app/services/priority_service.py

import datetime
from typing import Optional, Dict, Any # <-- Import Dict and Any

# --- Define Weights for our Algorithm ---\
# These can be tuned later
WEIGHTS = {
    "urgency": 50,      # Max score for how soon it's due
    "importance": 30,   # Max score for user-defined importance
    "dependency": 20    # Max score for blocking other tasks (Future feature)
}

# Define the user's importance scale (1-5)
IMPORTANCE_MAP = {
    1: 0,    # Low
    2: 7.5,  # Medium-Low
    3: 15,   # Medium
    4: 22.5, # High
    5: 30    # Critical
}

def calculate_priority_score(
    due_date: Optional[datetime.datetime],
    importance: int, # User-defined, 1-5
    
    # --- NEW ML PARAMETERS ---\
    personal_multiplier: float = 1.0, # From Model B
    difficulty_boost: float = 0.0,    # From Model A
    # -------------------------\
    
    blocks_task_count: int = 0 # For future dependency feature
) -> Dict[str, Any]: # <-- 1. MODIFIED RETURN TYPE
    """
    Calculates a dynamic priority score based on weighted factors.
    Now incorporates personalized ML-driven multipliers and boosts.
    
    Returns a dict with the total score and the breakdown for explainability.
    """
    
    # --- 2. MODIFICATION: Initialize breakdown dictionary ---
    breakdown = {
        "urgency_score": 0.0,
        "importance_score": 0.0,
        "difficulty_boost": round(difficulty_boost, 1), # Add this from the start
        "dependency_score": 0.0
    }
    # ----------------------------------------------------
    
    urgency_score = 0.0
    
    # 1. Calculate Urgency Score (Max 50 pts)
    if due_date:
        # Ensure due_date is offset-aware for correct comparison
        if due_date.tzinfo is None:
             now = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
             due_date = due_date.replace(tzinfo=datetime.timezone.utc)
        else:
             now = datetime.datetime.now(datetime.timezone.utc)
             
        days_until_due = (due_date - now).total_seconds() / (60 * 60 * 24)

        if days_until_due <= 0:
            urgency_score = WEIGHTS["urgency"] # Overdue
        elif days_until_due <= 1:
            urgency_score = WEIGHTS["urgency"] * 0.9 # Due in 24 hours
        elif days_until_due <= 3:
            urgency_score = WEIGHTS["urgency"] * 0.6 # Due in 3 days
        elif days_until_due <= 7:
            urgency_score = WEIGHTS["urgency"] * 0.3 # Due this week
        elif days_until_due <= 14:
            urgency_score = WEIGHTS["urgency"] * 0.1 # Due in 2 weeks
        
        breakdown["urgency_score"] = round(urgency_score, 1) # Save to breakdown
            
    
    # 2. Calculate Importance Score (Max 30 pts)
    base_importance_score = IMPORTANCE_MAP.get(importance, 0)
    importance_score = base_importance_score * personal_multiplier
    breakdown["importance_score"] = round(importance_score, 1) # Save to breakdown
    
    
    # 3. Calculate Dependency Score (Max 20 pts)
    dependency_score = 0
    if blocks_task_count > 0:
        dependency_score = min(blocks_task_count * 10, WEIGHTS["dependency"])
        breakdown["dependency_score"] = round(dependency_score, 1)
        
    
    # 4. Calculate Total Score
    total_score = (
        urgency_score + 
        importance_score + 
        dependency_score +
        difficulty_boost # Add Model A's boost
    )
    
    # Ensure score is within 0-100 range
    total_score = max(0, min(total_score, 100))
    
    # --- 3. MODIFICATION: Return the full dictionary ---
    return {
        "total_score": round(total_score, 1),
        "breakdown": breakdown
    }
    # -------------------------------------------------