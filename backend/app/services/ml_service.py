# backend/app/services/ml_service.py

import joblib
import json
import datetime 
import dateparser 
from pathlib import Path
from typing import Dict, Any, Optional, List
from sklearn.pipeline import Pipeline
from sklearn.exceptions import NotFittedError
from sklearn.feature_extraction.text import TfidfVectorizer # We need this for type hinting

# --- Constants ---
ML_MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / 'ml' / 'models'
# -----------------

class MLModelService:
    """
    Handles loading and running predictions for a specific user's models.
    """
    
    # --- NEW LOGIC (Step 1 from our plan) ---
    # These thresholds are tunable.
    # 0.4 means "at least 40% of the words in the new task must be known to the model"
    RELEVANCE_THRESHOLD = 0.4
    # 0.75 means "the model must be at least 75% confident in its prediction"
    CONFIDENCE_THRESHOLD = 0.75
    # ---------------------------------------
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.model_a_difficulty: Optional[Pipeline] = None
        self.model_b_personalization: Optional[Pipeline] = None
        self.model_c_friction: Optional[Pipeline] = None
        self.model_d_profile: Dict[str, Any] = {"peak_windows": []}
        
        # --- MODIFIED ---
        # We explicitly type these for clarity
        self.vectorizer_a: Optional[TfidfVectorizer] = None
        self.vectorizer_b: Optional[TfidfVectorizer] = None
        self.vectorizer_c: Optional[TfidfVectorizer] = None
        # ----------------
        
        self._load_models()

    def _load_models(self):
        """Loads all available .pkl and .json models for the user."""
        
        # Load Model A (Difficulty)
        try:
            path_a = ML_MODEL_PATH / f"user_{self.user_id}_difficulty.pkl"
            if path_a.exists():
                self.model_a_difficulty = joblib.load(path_a)
                # --- MODIFIED ---
                # We save the vectorizer step for our relevance check
                self.vectorizer_a = self.model_a_difficulty.named_steps.get('tfidf')
                if self.vectorizer_a:
                     print(f"Loaded Difficulty Model and Vectorizer for user {self.user_id}")
        except Exception as e:
            print(f"Warning: Could not load Difficulty Model for user {self.user_id}: {e}")

        # Load Model B (Personalization)
        try:
            path_b = ML_MODEL_PATH / f"user_{self.user_id}_personalization.pkl"
            if path_b.exists():
                self.model_b_personalization = joblib.load(path_b)
                # --- MODIFIED ---
                self.vectorizer_b = self.model_b_personalization.named_steps.get('tfidf')
                if self.vectorizer_b:
                    print(f"Loaded Personalization Model and Vectorizer for user {self.user_id}")
        except Exception as e:
            print(f"Warning: Could not load Personalization Model for user {self.user_id}: {e}")

        # Load Model C (Friction)
        try:
            path_c = ML_MODEL_PATH / f"user_{self.user_id}_friction.pkl"
            if path_c.exists():
                self.model_c_friction = joblib.load(path_c)
                # --- MODIFIED ---
                self.vectorizer_c = self.model_c_friction.named_steps.get('tfidf')
                if self.vectorizer_c:
                    print(f"Loaded Friction Model and Vectorizer for user {self.user_id}")
        except Exception as e:
            print(f"Warning: Could not load Friction Model for user {self.user_id}: {e}")

        # Load Model D (Profile)
        try:
            path_d = ML_MODEL_PATH / f"user_{self.user_id}_profile.json"
            if path_d.exists():
                with open(path_d, 'r') as f:
                    self.model_d_profile = json.load(f)
                print(f"Loaded Productivity Profile for user {self.user_id}")
        except Exception as e:
            print(f"Warning: Could not load Productivity Profile for user {self.user_id}: {e}")

    # --- NEW LOGIC (Step 2 from our plan) ---
    def _is_task_relevant(self, task_title: str, vectorizer: Optional[TfidfVectorizer]) -> bool:
        """
        Checks if the task title is "relevant" to the model's vocabulary.
        """
        if not vectorizer:
            return False # Model or vectorizer doesn't exist

        try:
            model_vocabulary = vectorizer.vocabulary_
        except AttributeError:
            print("Warning: Vectorizer is not fitted or has no 'vocabulary_' attribute.")
            return False # Vectorizer isn't fitted

        new_task_words = set(task_title.lower().split())
        if not new_task_words:
            return False # Task title is empty

        # Find the intersection of words
        known_words = new_task_words.intersection(model_vocabulary.keys())
        
        relevance_score = len(known_words) / len(new_task_words)
        
        # This print is very useful for debugging:
        # print(f"Relevance for '{task_title}': {relevance_score:.2f}")

        return relevance_score >= self.RELEVANCE_THRESHOLD
    # ---------------------------------------

    def get_personalization(self, task_title: str) -> Dict[str, Any]:
        """
        Runs a new task title through all loaded models to get personalized scores.
        """
        results = {
            "difficulty_boost": 0.0,
            "new_importance": None, # None means "no change"
            "is_high_friction": False,
        }

        # --- NEW LOGIC (Step 3 for Model A) ---
        # 1. Predict Difficulty (Model A) - WITH RELEVANCE CHECK
        if self.model_a_difficulty and self._is_task_relevant(task_title, self.vectorizer_a):
            try:
                predicted_minutes = self.model_a_difficulty.predict([task_title])[0]
                # Ensure prediction is non-negative
                predicted_minutes = max(0, predicted_minutes) 
                
                boost = min( (predicted_minutes / 30) * 5, 20)
                results["difficulty_boost"] = round(boost, 2)
                print(f"Model A (Difficulty): Passed relevance. Predicted {predicted_minutes:.0f} mins.")
            except NotFittedError:
                print(f"Warning: Difficulty Model for user {self.user_id} is not fitted.")
            except Exception as e:
                print(f"Error during difficulty prediction: {e}")
        elif self.model_a_difficulty:
            # This 'else' is important: the model exists, but the task failed the check
            print(f"Model A (Difficulty): Failed relevance check for '{task_title}'. Skipping.")
        # ---------------------------------------

        # --- NEW LOGIC (Step 3 for Model B) ---
        # 2. Predict Importance (Model B) - WITH 2-STEP CHECK
        if self.model_b_personalization and self._is_task_relevant(task_title, self.vectorizer_b):
            try:
                # Check 1: Get probabilities (confidence)
                probabilities = self.model_b_personalization.predict_proba([task_title])[0]
                confidence = probabilities.max()

                # Check 2: Compare to our threshold
                if confidence >= self.CONFIDENCE_THRESHOLD:
                    # Get the class with the highest probability
                    predicted_importance = self.model_b_personalization.classes_[probabilities.argmax()]
                    results["new_importance"] = int(predicted_importance)
                    print(f"Model B (Importance): Passed checks. Predicted '{predicted_importance}' with {confidence:.2f} confidence.")
                else:
                    print(f"Model B (Importance): Passed relevance, but FAILED confidence check ({confidence:.2f}). Skipping.")

            except NotFittedError:
                    print(f"Warning: Personalization Model for user {self.user_id} is not fitted.")
            except Exception as e:
                # This can happen if the model was only trained on one class (e.g., user only ever set "5")
                print(f"Error during importance prediction: {e}")
        elif self.model_b_personalization:
            print(f"Model B (Importance): Failed relevance check for '{task_title}'. Skipping.")
        # ---------------------------------------

        # --- NEW LOGIC (Step 3 for Model C) ---
        # 3. Predict Friction (Model C) - WITH 2-STEP CHECK
        if self.model_c_friction and self._is_task_relevant(task_title, self.vectorizer_c):
            try:
                # Check 1: Get probabilities (confidence)
                probabilities = self.model_c_friction.predict_proba([task_title])[0]
                confidence = probabilities.max()

                # Check 2: Compare to our threshold
                if confidence >= self.CONFIDENCE_THRESHOLD:
                    prediction = self.model_c_friction.classes_[probabilities.argmax()]
                    results["is_high_friction"] = (prediction == 1)
                    
                    if results["is_high_friction"]:
                        print(f"Model C (Friction): Passed checks. Predicted HIGH friction with {confidence:.2f} confidence.")
                    else:
                        print(f"Model C (Friction): Passed checks. Predicted LOW friction with {confidence:.2f} confidence.")
                else:
                    print(f"Model C (Friction): Passed relevance, but FAILED confidence check ({confidence:.2f}). Skipping.")
            except NotFittedError:
                    print(f"Warning: Friction Model for user {self.user_id} is not fitted.")
            except Exception as e:
                print(f"Error during friction prediction: {e}")
        elif self.model_c_friction:
            print(f"Model C (Friction): Failed relevance check for '{task_title}'. Skipping.")
        # ---------------------------------------
        
        return results

    def get_smart_suggestion(
        self, 
        task_id: int,
        is_high_friction: bool, 
        is_hard: bool,
        task_due_date: Optional[datetime.datetime]
    ) -> Optional[Dict[str, Any]]: 
        """
        Generates a smart suggestion object based on ML output and our guardrails.
        (No changes were needed to this function, as Model D is already safe)
        """
        peak_windows = self.model_d_profile.get("peak_windows", [])
        suggestion_text = None
        suggestion_type = None
        suggestion_payload = None 
        
        # --- THIS IS THE NEW LOGIC BLOCK ---

        # 1. Check for "Hard Task" (Schedule) - THIS GETS HIGHEST PRIORITY
        if is_hard and peak_windows:
            try:
                # --- NEW: Iterate through all peak windows ---
                found_suitable_time = False
                for time_str in peak_windows:
                    suggested_time_obj = dateparser.parse(
                        time_str, 
                        settings={'PREFER_DATES_FROM': 'future', 'TIMEZONE': 'UTC', 'RETURN_AS_TIMEZONE_AWARE': True}
                    )
                    
                    if not suggested_time_obj:
                        continue # Try the next time

                    # The Guardrail: Check if the peak time is before the deadline
                    if task_due_date:
                        # Make sure due_date is offset-aware for comparison
                        aware_due_date = task_due_date.astimezone(datetime.timezone.utc) if task_due_date.tzinfo is None else task_due_date
                        if suggested_time_obj > aware_due_date:
                            # This peak time is too late, try the next one
                            continue 
                    
                    # --- Found a valid time! ---
                    suggestion_type = "schedule"
                    suggestion_text = f"This seems like a high-effort task. You do your best work around {time_str}. Would you like to schedule it?"
                    suggestion_payload = suggested_time_obj.isoformat()
                    print(f"Suggestion: Task is Hard. Found valid peak time: {time_str}. Suggesting 'schedule'.")
                    found_suitable_time = True
                    break # Stop searching
                
                if not found_suitable_time:
                    print(f"Guardrail: Task is hard, but no peak productivity times were found before its deadline.")

            except Exception as e:
                print(f"Error during suggestion guardrail: {e}")
                # Don't return, just fail scheduling
                pass 
        
        # 2. If no schedule suggestion was made, AND it's high friction, suggest "Split"
        if not suggestion_type and is_high_friction:
            suggestion_type = "split"
            suggestion_text = "This looks like a task you often avoid. Would you like to break it down into smaller sub-tasks?"
            suggestion_payload = task_id # Payload is the ID of the task to split
            print("Suggestion: Task is High Friction (and not scheduled). Suggesting 'split'.")
        
        # ---------------------------------------------------
        
        if not suggestion_type:
            return None

        # --- Return the structured object ---
        return {
            "type": suggestion_type,
            "text": suggestion_text,
            "payload": suggestion_payload
        }


# --- Global Cache ---
model_cache: Dict[int, MLModelService] = {}

def get_ml_service(user_id: int) -> MLModelService:
    """
    Factory function to get a user's model service, loading or retrieving from cache.
    """
    if user_id not in model_cache:
        print(f"No ML service in cache for user {user_id}. Loading models...")
        model_cache[user_id] = MLModelService(user_id)
    
    return model_cache[user_id]