# backend/app/services/calendar_service.py

import datetime
from typing import Optional, Dict, Any

# --- Google API Imports ---
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build, Resource
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request as GoogleAuthRequest
# --------------------------

from sqlalchemy.orm import Session
from ..core.config_loader import settings
from ..models.user_model import User
from ..models.task_model import Task

# This is the scope our tokens will have
CALENDAR_SCOPE = ['https://www.googleapis.com/auth/calendar.events']

def _get_google_creds(user: User) -> Optional[Credentials]:
    """
    Helper function to build Google Credentials from a user's stored
    refresh token. Returns None if the user has no token.
    """
    if not user.google_oauth_refresh_token:
        print(f"User {user.id} has no Google refresh token. Skipping calendar sync.")
        return None
        
    try:
        creds = Credentials(
            token=None,  # No access token, we will use the refresh token
            refresh_token=user.google_oauth_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=CALENDAR_SCOPE
        )
        
        # We must "refresh" the credentials to get a new, short-lived access token
        if not creds.valid or creds.expired:
            creds.refresh(GoogleAuthRequest())
            
        return creds
    except Exception as e:
        print(f"🚨 Error refreshing Google credentials for user {user.id}: {e}")
        # This can happen if the user revoked access.
        return None

def _get_calendar_service(creds: Credentials) -> Resource:
    """Builds the Google Calendar API service object."""
    # cache_discovery=False is recommended in production environments
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)

def _create_event_body(task: Task) -> Dict[str, Any]:
    """
    Creates the JSON body for a Google Calendar event from one of our tasks.
    """
    if not task.due_date:
        raise ValueError("Task must have a due date to be synced.")
        
    # --- THIS IS THE FIX ---
    # The due_date is now timezone-aware from nlp_service.
    
    # 1. Get the IANA timezone name (e.g., "Asia/Kolkata" or "America/New_York")
    # If it's UTC, tzname() might be "UTC" or None, so we default to "UTC"
    tz_name = task.due_date.tzname() or "UTC"

    # 2. Get the end time in the correct format
    end_time = task.due_date.isoformat()
    
    # 3. Calculate start time (30 mins before) and format it
    start_time = (task.due_date - datetime.timedelta(minutes=30)).isoformat()
    
    print(f"--- Creating event body with timezone: {tz_name} ---")
    
    event_body = {
        'summary': task.title,
        'description': task.description or "Created by AI Task Manager",
        'start': {
            'dateTime': start_time,
            'timeZone': tz_name, # Use the dynamic timezone
        },
        'end': {
            'dateTime': end_time,
            'timeZone': tz_name, # Use the dynamic timezone
        },
        'reminders': {
            'useDefault': True, 
        },
    }
    return event_body
    # -----------------------

# --- PUBLIC SERVICE FUNCTIONS ---

def create_calendar_event(db: Session, user: User, task: Task) -> Optional[str]:
    """
    Creates a new Google Calendar event for a task.
    Returns the new event_id if successful.
    """
    if not task.due_date:
        return None # Can't sync a task with no due date
        
    creds = _get_google_creds(user)
    if not creds:
        return None # User has no token or it failed to refresh

    try:
        service = _get_calendar_service(creds)
        event_body = _create_event_body(task)
        
        # 'primary' is the user's main calendar
        event = service.events().insert(calendarId='primary', body=event_body).execute()
        
        event_id = event.get('id')
        print(f"✅ User {user.id}: Created Google Calendar event {event_id} for task {task.id}")
        return event_id
        
    except HttpError as e:
        print(f"🚨 User {user.id}: Failed to create calendar event for task {task.id}. Error: {e}")
    except Exception as e:
        print(f"🚨 User {user.id}: An unexpected error occurred in create_calendar_event: {e}")
    
    return None

def update_calendar_event(db: Session, user: User, task: Task) -> Optional[str]:
    """
    Updates an existing Google Calendar event.
    If no event ID exists, it tries to create one.
    """
    if not task.due_date:
        # If the user *removes* a due date, we should delete the calendar event
        if task.google_calendar_event_id:
            # We return None to signal the event was deleted
            return delete_calendar_event(db, user, task.google_calendar_event_id)
        return None
        
    creds = _get_google_creds(user)
    if not creds:
        return None
        
    # If the task doesn't have an event ID, create a new event
    if not task.google_calendar_event_id:
        print(f"User {user.id}: Task {task.id} has no event_id. Calling create_calendar_event.")
        return create_calendar_event(db, user, task)

    try:
        service = _get_calendar_service(creds)
        event_body = _create_event_body(task)
        
        event = service.events().update(
            calendarId='primary', 
            eventId=task.google_calendar_event_id, 
            body=event_body
        ).execute()
        
        event_id = event.get('id')
        print(f"✅ User {user.id}: Updated Google Calendar event {event_id} for task {task.id}")
        return event_id

    except HttpError as e:
        if e.resp.status == 404:
            # The event was deleted in Google Calendar. Create a new one.
            print(f"User {user.id}: Event {task.google_calendar_event_id} not found. Creating a new one.")
            return create_calendar_event(db, user, task)
        print(f"🚨 User {user.id}: Failed to update calendar event for task {task.id}. Error: {e}")
    except Exception as e:
        print(f"🚨 User {user.id}: An unexpected error occurred in update_calendar_event: {e}")
    
    return task.google_calendar_event_id # Return the old ID if update failed

def delete_calendar_event(db: Session, user: User, google_calendar_event_id: str) -> None:
    """
    Deletes an event from the user's Google Calendar.
    Returns None.
    """
    if not google_calendar_event_id:
        return

    creds = _get_google_creds(user)
    if not creds:
        return

    try:
        service = _get_calendar_service(creds)
        
        service.events().delete(
            calendarId='primary', 
            eventId=google_calendar_event_id
        ).execute()
        
        print(f"✅ User {user.id}: Deleted Google Calendar event {google_calendar_event_id}")
        
    except HttpError as e:
        if e.resp.status == 404:
            # Event is already gone, which is fine
            print(f"User {user.id}: Event {google_calendar_event_id} was already deleted.")
        else:
            print(f"🚨 User {user.id}: Failed to delete calendar event. Error: {e}")
    except Exception as e:
        print(f"🚨 User {user.id}: An unexpected error occurred in delete_calendar_event: {e}")