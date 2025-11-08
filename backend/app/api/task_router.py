# backend/app/api/task_router.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Literal
import datetime

# --- MODIFICATION: Import zoneinfo ---
from zoneinfo import ZoneInfo
# -------------------------------------

# --- Import updated schemas and NEW service ---
from ..core.database import get_db
from ..models import user_model, task_model
from ..schemas import task_schema
from ..schemas.task_schema import TaskCreateManual 

# --- MODIFIED IMPORTS ---
# We now import our NEW auth_service and NEW calendar_service
from ..services import (
    auth_service, 
    nlp_service, 
    priority_service, 
    log_service, 
    gamification_service, 
    ml_service,
    calendar_service  # <-- NEW
)
# ------------------------
from ..core.config_loader import settings

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    # --- MODIFICATION: Use the new auth dependency ---
    dependencies=[Depends(auth_service.get_current_user)]
)

@router.post("/", response_model=task_schema.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: task_schema.TaskCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Create a new task using NLP, personalize it with ML,
    and sync it with Google Calendar.
    """
    
    # --- 1. NLP SERVICE: Parse the task ---
    try:
        nlp_result = await nlp_service.parse_task_from_text(task_in.nlp_text)
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"NLP Error: {str(e)}")
    except RuntimeError as e: 
         raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"NLP Service Unavailable: {str(e)}")
    except Exception as e: 
        print(f"🚨 UNEXPECTED NLP ERROR: {type(e).__name__} - {e}")
        error_detail = "An unexpected error occurred during task processing."
        if "API" in str(e):
            error_detail = f"AI Service request failed: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )

    if not nlp_result.get("title"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not determine a title for the task via AI. Please try rephrasing."
        )

    # --- 2. ML SERVICE: Get Personalization ---
    user_ml_service = ml_service.get_ml_service(current_user.id)
    ml_personalization = user_ml_service.get_personalization(
        task_title=nlp_result.get("title")
    )
    if ml_personalization["new_importance"] is not None:
        final_importance = ml_personalization["new_importance"]
    else:
        final_importance = nlp_result.get("importance", 3)
    difficulty_boost = ml_personalization["difficulty_boost"]


    # --- 3. PRIORITY SERVICE: Calculate Final Score ---
    priority_result = priority_service.calculate_priority_score(
        due_date=nlp_result.get("due_date"),
        importance=final_importance,
        personal_multiplier=1.0, 
        difficulty_boost=difficulty_boost
    )

    # --- 4. ML SERVICE: Get Smart Suggestion (with Guardrail) ---
    is_hard = difficulty_boost > 10 
    smart_suggestion = user_ml_service.get_smart_suggestion(
        task_id=0, 
        is_high_friction=ml_personalization["is_high_friction"],
        is_hard=is_hard,
        task_due_date=nlp_result.get("due_date")
    )
    
    # --- 5. DATABASE: Create the Task ---
    final_metadata = nlp_result.get("task_metadata", {})
    if smart_suggestion:
        final_metadata["smart_suggestion"] = smart_suggestion
    if priority_result.get("breakdown"):
        final_metadata["priority_breakdown"] = priority_result["breakdown"]

    db_task = task_model.Task(
        title=nlp_result.get("title"),
        description=nlp_result.get("description"),
        due_date=nlp_result.get("due_date"),
        task_metadata=final_metadata, 
        importance=final_importance,
        priority_score=float(priority_result["total_score"]),
        ask_completion_time=nlp_result.get("ask_completion_time", False),
        owner_id=current_user.id,
        # google_calendar_event_id is None for now
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task) 
    
    # --- 6. NEW: CALENDAR SYNC ---
    # After the task is created, sync it to Google Calendar
    event_id = calendar_service.create_calendar_event(db=db, user=current_user, task=db_task)
    if event_id:
        db_task.google_calendar_event_id = event_id
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
    # -----------------------------
    
    # --- 7. UPDATE TASK ID IN SUGGESTION (if needed) ---
    if (
        smart_suggestion and 
        smart_suggestion.get("type") == "split" and
        db_task.task_metadata and
        "smart_suggestion" in db_task.task_metadata
    ):
        db_task.task_metadata["smart_suggestion"]["payload"] = db_task.id
        flag_modified(db_task, "task_metadata") 
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

    return db_task

# --- ENDPOINT FOR MANUAL TASK CREATION ---
@router.post("/manual", response_model=task_schema.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task_manual(
    task_in: TaskCreateManual,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Create a new task from manual user input, personalize it,
    and sync it with Google Calendar.
    """
    
    if not task_in.title:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required for manual task creation.")

    # --- 2. ML SERVICE: Get Personalization ---
    user_ml_service = ml_service.get_ml_service(current_user.id)
    ml_personalization = user_ml_service.get_personalization(
        task_title=task_in.title
    )
    if ml_personalization["new_importance"] is not None:
        final_importance = ml_personalization["new_importance"]
    else:
        final_importance = task_in.importance
    difficulty_boost = ml_personalization["difficulty_boost"]


    # --- 3. PRIORITY SERVICE: Calculate Final Score ---
    priority_result = priority_service.calculate_priority_score(
        due_date=task_in.due_date,
        importance=final_importance,
        personal_multiplier=1.0,
        difficulty_boost=difficulty_boost
    )

    # --- 4. ML SERVICE: Get Smart Suggestion (with Guardrail) ---
    is_hard = difficulty_boost > 10
    smart_suggestion = user_ml_service.get_smart_suggestion(
        task_id=0, # We don't have an ID yet
        is_high_friction=ml_personalization["is_high_friction"],
        is_hard=is_hard,
        task_due_date=task_in.due_date
    )
    
    # --- 5. DATABASE: Create the Task ---
    final_metadata = {}
    if smart_suggestion:
        final_metadata["smart_suggestion"] = smart_suggestion
    if priority_result.get("breakdown"):
        final_metadata["priority_breakdown"] = priority_result["breakdown"]

    db_task = task_model.Task(
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        task_metadata=final_metadata, 
        importance=final_importance,
        priority_score=float(priority_result["total_score"]),
        ask_completion_time=False, 
        owner_id=current_user.id,
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task) 
    
    # --- 6. NEW: CALENDAR SYNC ---
    event_id = calendar_service.create_calendar_event(db=db, user=current_user, task=db_task)
    if event_id:
        db_task.google_calendar_event_id = event_id
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
    # -----------------------------
    
    # --- 7. UPDATE TASK ID IN SUGGESTION (if needed) ---
    if (
        smart_suggestion and 
        smart_suggestion.get("type") == "split" and
        db_task.task_metadata and
        "smart_suggestion" in db_task.task_metadata
    ):
        db_task.task_metadata["smart_suggestion"]["payload"] = db_task.id
        flag_modified(db_task, "task_metadata")
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

    return db_task
# --- END OF NEW ENDPOINT ---


@router.get("/", response_model=List[task_schema.TaskRead])
def read_tasks(
    status: str = Query('all', enum=['active', 'completed', 'all']),
    show: str = Query('today', enum=['today', 'upcoming', 'last7days', 'last28days']),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Retrieve tasks for the current user, with filtering options.
    """
    query = db.query(task_model.Task).filter(task_model.Task.owner_id == current_user.id)

    # 1. Filter by Status
    if status == 'active':
        query = query.filter(task_model.Task.completed == False)
    elif status == 'completed':
        query = query.filter(task_model.Task.completed == True)

    # --- THIS IS THE FIX for the "Midnight Bug" ---
    
    # 1. Define the user's local timezone (IST)
    try:
        # Use 'Asia/Kolkata' for IST
        USER_TIMEZONE = ZoneInfo("Asia/Kolkata") 
    except Exception:
        # Fallback if zoneinfo fails (shouldn't, but good to have)
        USER_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

    # 2. Get the current time *in that timezone*
    now_local = datetime.datetime.now(USER_TIMEZONE)
    
    # 3. Calculate "today" based on that local time
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)
    
    # 4. Filter by Date Range (show)
    if show == 'today':
        query = query.filter(
            task_model.Task.due_date != None,
            task_model.Task.due_date >= today_start,
            task_model.Task.due_date < today_end 
        )
    elif show == 'upcoming':
        query = query.filter(
            task_model.Task.due_date != None,
            task_model.Task.due_date >= today_end
        )
    elif show == 'last7days':
        seven_days_ago = today_start - datetime.timedelta(days=7)
        query = query.filter(
            task_model.Task.due_date != None,
            task_model.Task.due_date >= seven_days_ago,
            task_model.Task.due_date < today_start
        )
    elif show == 'last28days':
        twenty_eight_days_ago = today_start - datetime.timedelta(days=28)
        query = query.filter(
            task_model.Task.due_date != None,
            task_model.Task.due_date >= twenty_eight_days_ago,
            task_model.Task.due_date < today_start
        )
    # --- END OF FIX ---
    
    # Apply Sorting
    tasks = (
        query
        .order_by(
            task_model.Task.completed.asc(),
            task_model.Task.priority_score.desc(),
            task_model.Task.due_date.asc().nullslast()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )
    return tasks


@router.get("/{task_id}", response_model=task_schema.TaskRead)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Retrieve a specific task by its ID. (No changes)
    """
    task = db.query(task_model.Task).filter(task_model.Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this task")

    return task


@router.put("/{task_id}", response_model=task_schema.TaskRead)
def update_task(
    task_id: int,
    task_in: task_schema.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Update an existing task, log the action, and
    sync the change to Google Calendar.
    """
    task = db.query(task_model.Task).filter(task_model.Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    action_type = task_in.action_type
    completion_time_minutes = task_in.completion_time_minutes
    
    old_task_data = {
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "importance": task.importance,
        "completed": task.completed,
        "priority_score": task.priority_score,
        "google_calendar_event_id": task.google_calendar_event_id # Store old event ID
    }
    
    update_data = task_in.model_dump(
        exclude_unset=True, 
        exclude={
            'action_type', 
            'completion_time_minutes'
        }
    )

    needs_priority_recalc = False
    if "due_date" in update_data or "importance" in update_data:
        needs_priority_recalc = True
        
    # --- NEW: Check if calendar sync is needed ---
    needs_calendar_sync = False
    if "title" in update_data or "description" in update_data or "due_date" in update_data:
        needs_calendar_sync = True
    # ------------------------------------------

    for key, value in update_data.items():
        setattr(task, key, value)
        
    if needs_priority_recalc and task.task_metadata and "smart_suggestion" in task.task_metadata:
        print("Clearing stale AI suggestion due to task edit.")
        task.task_metadata.pop("smart_suggestion", None)
        flag_modified(task, "task_metadata")

    if needs_priority_recalc:
        priority_result = priority_service.calculate_priority_score(
            due_date=task.due_date,
            importance=task.importance
        )
        task.priority_score = float(priority_result["total_score"])
        
        if task.task_metadata is None:
            task.task_metadata = {}
        task.task_metadata["priority_breakdown"] = priority_result["breakdown"]
        flag_modified(task, "task_metadata") 

    db.add(task)
    
    # --- LOGIC FOR USER INTERACTION TRACKING ---
    log_action = None
    log_data = {}
    
    is_completing_task = "completed" in update_data and update_data["completed"] == True
    
    if (action_type == 'logged_time' or action_type == 'completed_basic') and is_completing_task:
        log_action = 'completed'
        log_data['completion_time_minutes'] = completion_time_minutes if completion_time_minutes is not None else 0
        gamification_service.update_gamification_stats(db=db, user=current_user)
        
    elif action_type == 'snoozed' and "due_date" in update_data:
        log_action = 'snoozed'
        log_data['old_due_date'] = old_task_data['due_date'].isoformat() if old_task_data['due_date'] else None
        log_data['new_due_date'] = task.due_date.isoformat() if task.due_date else None

    elif action_type == 'edited' or (needs_priority_recalc and "completed" not in update_data):
        # (Log 'edited' logic remains the same)
        diff = {}
        new_task_data = {k: getattr(task, k) for k in old_task_data.keys()}
        for key, old_value in old_task_data.items():
             new_value = new_task_data[key]
             if old_value != new_value and key != 'priority_score': 
                 diff[key] = {"old": old_value.isoformat() if isinstance(old_value, datetime.datetime) else old_value, 
                              "new": new_value.isoformat() if isinstance(new_value, datetime.datetime) else new_value}
        if diff:
             log_action = 'edited'
             log_data['update_diff'] = diff

    if log_action:
        log_service.create_log_entry(
            db=db,
            task=task,
            user_id=current_user.id,
            action=log_action,
            action_data=log_data
        )

    # --- NEW: CALENDAR SYNC ---
    if is_completing_task:
        # If task is marked complete, delete the calendar event
        calendar_service.delete_calendar_event(db, current_user, old_task_data["google_calendar_event_id"])
        task.google_calendar_event_id = None # Clear the ID
    elif needs_calendar_sync:
        # If title, description, or due date changed, update the event
        new_event_id = calendar_service.update_calendar_event(db, current_user, task)
        task.google_calendar_event_id = new_event_id
    # --------------------------

    db.commit()
    db.refresh(task)
    db.refresh(current_user) 

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_service.get_current_user)
):
    """
    Delete a task, log the action, and
    delete the event from Google Calendar.
    """
    task = db.query(task_model.Task).filter(task_model.Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    # --- NEW: Store the event ID *before* deleting the task ---
    event_id_to_delete = task.google_calendar_event_id
    # --------------------------------------------------------

    log_service.create_log_entry(
        db=db,
        task=task,
        user_id=current_user.id,
        action='deleted',
    )
    
    db.delete(task)
    db.commit() 
    
    # --- NEW: Delete the calendar event *after* our DB is clear ---
    if event_id_to_delete:
        calendar_service.delete_calendar_event(db, current_user, event_id_to_delete)
    # -------------------------------------------------------------

    return None