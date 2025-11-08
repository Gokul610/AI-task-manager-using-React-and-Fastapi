# backend/app/services/summary_service.py

import google.generativeai as genai
import datetime
import json
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional

from ..core.config_loader import settings
from ..models.user_model import User
from ..models.log_model import UserLog
from ..schemas.summary_schema import WeeklySummary
from ..services import insights_service # Import to get heatmap data

# --- Configure Gemini API Client ---
try:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # --- FIX: Use user-requested model ---
    gemini_model = genai.GenerativeModel(
        model_name='gemini-2.5-flash-preview-09-2025'
    )
    # -------------------------------------
    print("✅ Gemini Summary Service configured successfully.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Failed to configure Gemini Summary Service: {e}")
    gemini_model = None

# --- System Prompt for the Summarizer ---
SYSTEM_PROMPT = """
You are a friendly and insightful productivity coach.
Your goal is to provide a concise, encouraging, and HTML-formatted weekly summary for a user based on their task logs.

**RULES:**
1.  **Format:** Use simple HTML (e.g., `<p>`, `<strong>`, `<ul>`, `<li>`). Do NOT include `<html>` or `<body>` tags.
2.  **Tone:** Be positive, encouraging, and insightful. Use emoji where appropriate.
3.  **Content:**
    * Start with a friendly greeting and highlight the total number of tasks completed.
    * Using the log data, identify 2-3 key accomplishments (e.g., "Completed a big task: 'Finalize project'").
    * Using the heatmap data, provide a productivity insight (e.g., "It looks like Tuesday mornings are your most productive time! 🚀").
    * Using the log data, identify a potential bottleneck or habit (e.g., "I noticed you snoozed 5 tasks this week. Try to tackle them first!").
    * End with an encouraging closing statement.
4.  **Brevity:** Keep the entire summary to 3-4 short paragraphs.

**EXAMPLE OUTPUT:**
<p>Here's your weekly summary! 🌟</p>
<p>Great work this week! You crushed a total of <strong>15 tasks</strong>. You were especially focused, completing big items like "Develop new API endpoint" and "Draft Q3 proposal".</p>
<p><strong>Insight:</strong> Your productivity heatmap shows you're on fire on Wednesday mornings! 🔥 That seems to be your peak time for getting things done.</p>
<p><strong>Looking ahead:</strong> I noticed 4 tasks were snoozed, especially "Update documentation". Try to schedule that for your Wednesday morning "focus block"!</p>
<p>Keep up the great momentum! 🚀</p>
"""

CACHE_DURATION_HOURS = 24 # How long to cache the summary for

async def generate_new_summary(heatmap_data: List[Dict[str, Any]], recent_logs: List[UserLog]) -> str:
    """
    Generates a new summary by calling the Gemini API.
    This function is now purely for generation and does no DB access.
    """
    if gemini_model is None:
        raise RuntimeError("Gemini Summary Service is not initialized.")

    # --- Prepare the data payload for the prompt ---
    log_summary = []
    completed_count = 0
    snoozed_count = 0
    
    for log in recent_logs:
        if log.action in ['completed', 'completed_basic', 'logged_time']:
            completed_count += 1
            log_summary.append(f"- COMPLETED: {log.task_snapshot.get('title')}")
        elif log.action == 'snoozed':
            snoozed_count += 1
            log_summary.append(f"- SNOOZED: {log.task_snapshot.get('title')}")

    # Don't send a huge log file, just the key stats
    data_prompt = f"""
    **USER DATA:**
    - Total Tasks Completed (Last 7 Days): {completed_count}
    - Total Tasks Snoozed (Last 7 Days): {snoozed_count}
    
    **PRODUCTIVITY HEATMAP (Tasks completed by day/hour):**
    {json.dumps(heatmap_data, indent=2)}
    
    **RECENT TASK LOGS:**
    {chr(10).join(log_summary[:20])} 
    """ # (Send max 20 log entries)
    
    try:
        # 3. Call the Gemini API
        response = await gemini_model.generate_content_async(
            contents=[
                SYSTEM_PROMPT, # Start with the system prompt
                data_prompt    # Follow with the user data
            ],
            generation_config={
                "response_mime_type": "text/plain", 
            },
            request_options={"timeout": 90}
        )

        return response.text

    except Exception as e:
        print(f"🚨 ERROR: Gemini Summary call failed: {type(e).__name__} - {e}")
        # Return a user-friendly error in HTML format
        error_html = f"""
        <p><strong>Error Generating Summary</strong></p>
        <p>Sorry, I couldn't generate your weekly summary at this time.</p>
        <p><code>{str(e)}</code></p>
        """
        # Return the error HTML to be displayed
        return error_html