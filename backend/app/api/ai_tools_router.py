# backend/app/api/ai_tools_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..core.database import get_db
from ..models import user_model, task_model
from ..schemas import task_schema
from ..services import auth_service, ai_tools_service, priority_service

router = APIRouter(
    prefix="/ai-tools",
    tags=["AI Tools"],
    dependencies=[Depends(auth_service.get_current_user)]
)

@router.post("/split-task/{task_id}", response_model=List[task_schema.TaskRead], status_code=status.HTTP_201_CREATED)
async def split_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Uses the AI Task Splitter service to break a parent task into new sub-tasks.
    """
    
    # 1. Get the parent task
    parent_task = db.query(task_model.Task).filter(task_model.Task.id == task_id).first()
    if not parent_task:
        raise HTTPException(status_code=404, detail="Parent task not found")
    if parent_task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to split this task")

    try:
        # 2. Call the AI service to get sub-task titles
        sub_task_titles = await ai_tools_service.split_task_into_subtasks(parent_task)
        
        new_tasks = []
        
        # 3. Create the new tasks
        for title in sub_task_titles:
            # Get a default priority score for the new sub-task
            priority_result = priority_service.calculate_priority_score(
                due_date=parent_task.due_date, # Inherit parent's due date
                importance=parent_task.importance # Inherit parent's importance
            )
            
            # Create a new sub-task
            # We add a prefix to show it's a sub-task
            db_sub_task = task_model.Task(
                title=f"[Sub-task] {title}",
                description=f"Sub-task of: {parent_task.title}",
                due_date=parent_task.due_date,
                importance=parent_task.importance,
                priority_score=float(priority_result["total_score"]),
                ask_completion_time=True, # Sub-tasks are good to track
                owner_id=current_user.id
            )
            db.add(db_sub_task)
            new_tasks.append(db_sub_task)
            
        # 4. Mark the parent task as complete (it's been broken down)
        parent_task.completed = True
        db.add(parent_task)
        
        db.commit()
        
        # Refresh all new tasks to get their IDs
        for task in new_tasks:
            db.refresh(task)
            
        return new_tasks

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create sub-tasks: {e}")