# backend/app/services/log_service.py

import json
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

# Import models and schemas
from ..models.task_model import Task
from ..models.log_model import UserLog
from ..schemas.log_schema import LogCreate

def create_log_entry(
    db: Session,
    task: Task,
    user_id: int,
    action: str,
    action_data: Optional[Dict[str, Any]] = None,
) -> UserLog:
    """
    Creates a new log entry by taking a snapshot of the Task and merging it
    with action-specific data.

    :param db: The SQLAlchemy database session.
    :param task: The Task object the action was performed on.
    :param user_id: The ID of the user performing the action.
    :param action: The name of the action (e.g., 'completed', 'snoozed', 'deleted').
    :param action_data: Optional dictionary with additional, action-specific data.
    :return: The created UserLog object.
    """
    # 1. Serialize the current Task object state (the snapshot)
    # This ensures we capture all fields including metadata.
    task_snapshot = {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "importance": task.importance,
        "priority_score": task.priority_score,
        "completed": task.completed,
        "created_at": task.created_at.isoformat(),
        "task_metadata": task.task_metadata,
        "ask_completion_time": task.ask_completion_time,
    }

    # 2. Merge action-specific data into the snapshot
    if action_data:
        task_snapshot.update(action_data)
        
    # Log details
    log_data = LogCreate(
        user_id=user_id,
        task_id=task.id,
        action=action,
        task_snapshot=task_snapshot,
    )

    # 3. Create and save the new UserLog entry
    db_log = UserLog(**log_data.model_dump())
    db.add(db_log)
    # NOTE: We do not commit here. We rely on the router function 
    # (task_router.py) to commit the transaction after the task is updated/deleted.
    
    return db_log