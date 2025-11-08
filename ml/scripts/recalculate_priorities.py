# ml/scripts/recalculate_priorities.py

import sys
import os
import datetime
from pathlib import Path
from sqlalchemy.orm.attributes import flag_modified

# --- Path Setup ---
# Find the root 'ai-task-manager' directory and add 'backend' to the path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
BACKEND_ROOT = PROJECT_ROOT / 'backend'
sys.path.append(str(PROJECT_ROOT))
sys.path.append(str(BACKEND_ROOT))
# --------------------

# --- Database & Model Imports ---
try:
    from app.core.database import SessionLocal
    from app.models.task_model import Task
    from app.models.user_model import User 
    from app.models.log_model import UserLog # <-- THIS IS THE FIX
    from app.services import priority_service # We import our existing service
except ImportError as e:
    print(f"🚨 FATAL ERROR: Could not import backend modules: {e}")
    print("Please ensure this script is run from the project's root or `ml/scripts` directory.")
    sys.exit(1)
# --------------------------------

def run_priority_recalculation():
    """
    Connects to the DB, finds all active tasks due in the future,
    and recalculates their priority score.
    """
    print("--- Starting Dynamic Priority Recalculation Script ---")
    db = SessionLocal()
    
    # Get the current time with UTC timezone
    now = datetime.datetime.now(datetime.timezone.utc)
    
    try:
        # --- THIS IS YOUR NEW LOGIC ---
        # We only get tasks that are:
        # 1. Not completed
        # 2. Have a due date
        # 3. The due date is in the future (not overdue)
        tasks_to_update = db.query(Task).filter(
            Task.completed == False,
            Task.due_date != None,
            Task.due_date > now 
        ).all()
        # -----------------------------

        if not tasks_to_update:
            print("No active, future-dated tasks found to update.")
            return

        print(f"Found {len(tasks_to_update)} tasks to recalculate...")
        
        updated_count = 0
        for task in tasks_to_update:
            old_score = task.priority_score
            
            # Re-run the priority calculation
            # We don't pass ML parameters because they are for *creation* time.
            # We are only re-calculating based on new *urgency*.
            priority_result = priority_service.calculate_priority_score(
                due_date=task.due_date,
                importance=task.importance
            )
            
            new_score = priority_result["total_score"]
            new_breakdown = priority_result["breakdown"]

            # Only update the DB if the score actually changed
            if old_score != new_score:
                task.priority_score = new_score
                
                if task.task_metadata is None:
                    task.task_metadata = {}
                
                task.task_metadata["priority_breakdown"] = new_breakdown
                flag_modified(task, "task_metadata") # Force save the JSON change
                
                db.add(task)
                updated_count += 1
                print(f"  - Task ID {task.id}: '{task.title[:20]}...' score {old_score} -> {new_score}")

        if updated_count > 0:
            db.commit()
            print(f"\n✅ Successfully updated priority for {updated_count} tasks.")
        else:
            print("\nNo task priorities needed updating.")

    except Exception as e:
        print(f"\n🚨 An error occurred during recalculation:")
        print(e)
        db.rollback()
    finally:
        db.close()
        print("--- Recalculation Script Finished ---")

if __name__ == "__main__":
    run_priority_recalculation()