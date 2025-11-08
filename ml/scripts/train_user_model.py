# ml/scripts/train_user_model.py

import sys
import os
import pandas as pd
import json
import joblib
from pathlib import Path
from typing import List, Dict, Any, Tuple

# --- Path Setup ---
# This is complex, but necessary.
# It finds the root 'ai-task-manager' directory and adds 'backend' to the path
# so we can import our database models and session.
# ml/scripts/train_user_model.py -> ml/ -> ai-task-manager/
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
BACKEND_ROOT = PROJECT_ROOT / 'backend'
sys.path.append(str(PROJECT_ROOT))
sys.path.append(str(BACKEND_ROOT))
# --------------------

# --- Database & Model Imports ---
# Now we can import from the 'backend' package
try:
    from app.core.database import SessionLocal
    from app.models.user_model import User
    from app.models.task_model import Task
    from app.models.log_model import UserLog
except ImportError:
    print("🚨 FATAL ERROR: Could not import backend modules.")
    print("Please ensure this script is run from the project's root or `ml/scripts` directory.")
    sys.exit(1)
# --------------------------------

# --- ML Imports ---
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.exceptions import NotFittedError
# ------------------

# --- Constants ---
MODEL_PATH = PROJECT_ROOT / 'ml' / 'models'
# Create the directory if it doesn't exist
MODEL_PATH.mkdir(exist_ok=True)
# -----------------


def fetch_data_for_user(db: SessionLocal, user_id: int) -> pd.DataFrame:
    """Fetches all logs for a user and returns them as a pandas DataFrame."""
    print(f"  Fetching log data for user_id: {user_id}...")
    query = db.query(UserLog).filter(UserLog.user_id == user_id)
    df = pd.read_sql(query.statement, db.bind)
    
    if df.empty:
        print(f"  No log data found for user_id: {user_id}.")
        return pd.DataFrame()
        
    print(f"  Found {len(df)} log entries.")
    return df

def train_difficulty_model(logs: pd.DataFrame) -> Pipeline:
    """
    Trains Model A (Difficulty Model).
    Predicts 'completion_time_minutes' from 'title'.
    """
    print("  Training Difficulty Model (A)...")
    # 1. Filter data: only 'completed' logs with valid times
    df = logs[
        (logs['action'].isin(['completed', 'logged_time'])) &
        (logs['task_snapshot'].apply(lambda x: x.get('completion_time_minutes', 0) > 0))
    ].copy()

    if len(df) < 5:
        print("    Not enough 'completed' logs with time (< 5). Skipping.")
        return None

    # 2. Extract features (X) and target (y)
    df['title'] = df['task_snapshot'].apply(lambda x: x.get('title', ''))
    df['completion_time_minutes'] = df['task_snapshot'].apply(lambda x: x.get('completion_time_minutes'))
    
    X = df['title']
    y = df['completion_time_minutes']

    # 3. Create a model pipeline
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=500, stop_words='english')),
        ('regressor', Ridge()) # Ridge regression is robust for this
    ])

    # 4. Train the model
    model.fit(X, y)
    print("    Difficulty Model (A) trained successfully.")
    return model

def train_personalization_model(logs: pd.DataFrame) -> Pipeline:
    """
    Trains Model B (Personalization Model).
    Predicts preferred 'importance' from 'title'.
    """
    print("  Training Personalization Model (B)...")
    # 1. Filter data: only 'edited' logs where importance changed
    def get_importance_diff(snapshot):
        diff = snapshot.get('update_diff', {})
        if 'importance' in diff:
            return diff['importance']['new']
        return None

    df = logs[logs['action'] == 'edited'].copy()
    df['new_importance'] = df['task_snapshot'].apply(get_importance_diff)
    df = df.dropna(subset=['new_importance'])

    if len(df) < 3: # Lower threshold, as edits are rare
        print("    Not enough 'edited importance' logs (< 3). Skipping.")
        return None

    # 2. Extract features (X) and target (y)
    df['title'] = df['task_snapshot'].apply(lambda x: x.get('title', ''))
    X = df['title']
    y = df['new_importance'].astype(int) # Target is 1, 2, 3, 4, or 5

    # 3. Create a model pipeline
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=500, stop_words='english')),
        ('classifier', LogisticRegression(max_iter=1000))
    ])

    # 4. Train the model
    # --- ADD GUARDRAIL for 1-class issue ---
    if len(df['new_importance'].unique()) < 2:
        print(f"    Not enough classes for Personalization Model ({df['new_importance'].unique()}). Skipping.")
        return None
    # ------------------------------------
    model.fit(X, y)
    print("    Personalization Model (B) trained successfully.")
    return model

def train_friction_model(logs: pd.DataFrame) -> Pipeline:
    """
    Trains Model C (Friction Model).
    Predicts if a task is "high friction" (snoozed/deleted).
    """
    print("  Training Friction Model (C)...")
    
    # --- MODIFICATION START ---
    
    # 1. Get "Positive" samples (High-Friction = 1)
    df_positive = logs[logs['action'].isin(['snoozed', 'deleted'])].copy()
    df_positive['is_friction'] = 1
    
    # 2. Get "Negative" samples (Low-Friction = 0)
    df_negative = logs[logs['action'].isin(['completed', 'completed_basic', 'logged_time'])].copy()
    df_negative['is_friction'] = 0
    
    # 3. Combine them
    df = pd.concat([df_positive, df_negative])

    if len(df) < 5:
        print("    Not enough 'completed' or 'snoozed' logs (< 5). Skipping.")
        return None

    # 4. Check if we have both classes (0 and 1)
    if len(df['is_friction'].unique()) < 2:
        print(f"    Not enough classes for Friction Model ({df['is_friction'].unique()}). Skipping.")
        return None
    # --- MODIFICATION END ---

    # 5. Extract features (X) and target (y)
    df['title'] = df['task_snapshot'].apply(lambda x: x.get('title', ''))
    X = df['title']
    y = df['is_friction']

    # 6. Create a model pipeline
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=500, stop_words='english')),
        ('classifier', LogisticRegression())
    ])

    # 7. Train the model
    model.fit(X, y)
    print("    Friction Model (C) trained successfully.")
    return model

def create_productivity_profile(logs: pd.DataFrame) -> Dict[str, Any]:
    """
    Creates Model D (Productivity Profile).
    Analyzes completion timestamps to find peak windows.
    """
    print("  Creating Productivity Profile (D)...")
    # 1. Filter data: 'completed' logs
    df = logs[logs['action'].isin(['completed', 'completed_basic', 'logged_time'])].copy()
    
    if len(df) < 10:
        print("    Not enough 'completed' logs to build a profile (< 10). Skipping.")
        return {"peak_windows": []} # Return empty profile
        
    # 2. Convert timestamp to datetime and extract features
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['hour_of_day'] = df['timestamp'].dt.hour
    
    # 3. Find the most common completion windows (day + hour)
    peak_windows = df.groupby(['day_of_week', 'hour_of_day']).size()
    peak_windows = peak_windows.nlargest(5) # Get top 5 windows
    
    profile_data = [f"{day} {hour}:00" for (day, hour), count in peak_windows.items()]
    
    print(f"    Productivity Profile (D) created. Peak windows: {profile_data}")
    return {"peak_windows": profile_data}

def train_models_for_user(db: SessionLocal, user_id: int):
    """
    Main function to train and save all models for a single user.
    """
    df_logs = fetch_data_for_user(db, user_id)
    if df_logs.empty:
        return

    # Train all 4 models
    model_a = train_difficulty_model(df_logs)
    model_b = train_personalization_model(df_logs)
    model_c = train_friction_model(df_logs)
    profile_d = create_productivity_profile(df_logs)

    # --- Save Models ---
    if model_a:
        joblib.dump(model_a, MODEL_PATH / f"user_{user_id}_difficulty.pkl")
        print(f"  ✅ Saved Difficulty Model for user {user_id}.")
    
    if model_b:
        joblib.dump(model_b, MODEL_PATH / f"user_{user_id}_personalization.pkl")
        print(f"  ✅ Saved Personalization Model for user {user_id}.")
        
    if model_c:
        joblib.dump(model_c, MODEL_PATH / f"user_{user_id}_friction.pkl")
        print(f"  ✅ Saved Friction Model for user {user_id}.")
        
    if profile_d.get("peak_windows"):
        with open(MODEL_PATH / f"user_{user_id}_profile.json", 'w') as f:
            json.dump(profile_d, f, indent=2)
        print(f"  ✅ Saved Productivity Profile for user {user_id}.")

def main():
    """
    Main script entry point.
    Fetches all users and attempts to train models for each one.
    """
    print("--- Starting ML Model Training Script ---")
    db = SessionLocal()
    try:
        # 1. Get all users
        users = db.query(User).all()
        if not users:
            print("No users found in the database.")
            return

        print(f"Found {len(users)} user(s). Starting training loop...")
        
        # 2. Loop and train for each user
        for user in users:
            print(f"\n--- Processing User ID: {user.id} ({user.email}) ---")
            train_models_for_user(db, user.id)
            
        print("\n--- Model Training Script Finished ---")
        
    except Exception as e:
        print(f"\n🚨 An error occurred during training: {e}")
        print("This often happens if there isn't enough varied log data (e.g., only 'snoozed' logs but no 'completed' logs).")
        print("Try creating and completing more tasks to provide data for all classes.")
    finally:
        db.close()

if __name__ == "__main__":
    main()