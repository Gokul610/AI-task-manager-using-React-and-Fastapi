# backend/app/services/ai_tools_service.py

import google.generativeai as genai
import json
from typing import List, Dict, Any
from ..core.config_loader import settings
from ..models.task_model import Task

# --- Define the JSON Schema for the Splitter Output ---
SPLITTER_JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "sub_tasks": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "A list of 3-5 concise, actionable sub-task titles."
        }
    },
    "required": ["sub_tasks"]
}

# --- System Prompt for the Task Splitter ---
SYSTEM_PROMPT = """
You are an expert project manager. Your job is to take a large, complex, or high-friction task and break it down into 3-5 small, actionable, and achievable sub-tasks.

The user is providing you with a task they are struggling with. You must help them by providing a list of sub-tasks.

- Focus on clear, single-action titles.
- Do not number the tasks.
- Respond ONLY with the valid JSON object matching the schema. Do not add any extra text or explanations.

Example Task: "Research Q4 marketing plan"
Example Output:
{
  "sub_tasks": [
    "Analyze competitor marketing from last Q4",
    "Identify key upcoming holidays and events",
    "Brainstorm 3-5 potential campaign themes",
    "Draft initial budget outline",
    "Schedule planning meeting with team"
  ]
}
"""

# --- Configure Gemini API Client ---
# We configure a new client here for this specific tool
try:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    gemini_model = genai.GenerativeModel(
        model_name='gemini-2.5-flash-preview-09-2025',
        system_instruction=SYSTEM_PROMPT  # <-- THE FIX IS HERE
    )
    print("✅ Gemini AI Tools Service configured successfully.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Failed to configure Gemini AI Tools Service: {e}")
    gemini_model = None


async def split_task_into_subtasks(task: Task) -> List[str]:
    """
    Uses the Gemini API to split a parent task into a list of sub-task titles.
    """
    if gemini_model is None:
        raise RuntimeError("Gemini AI Tools Service is not initialized.")

    # Combine title and description for full context
    full_task_text = f"Title: {task.title}\nDescription: {task.description or ''}"
    
    print(f"--- Sending to Task Splitter AI: '{full_task_text}' ---")
    
    try:
        response = await gemini_model.generate_content_async(
            contents=full_task_text,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": SPLITTER_JSON_SCHEMA
            },
            # <-- IT HAS BEEN REMOVED FROM HERE
            request_options={"timeout": 60}
        )
        
        json_text = response.candidates[0].content.parts[0].text
        parsed_json = json.loads(json_text)
        
        sub_tasks = parsed_json.get("sub_tasks", [])
        
        if not sub_tasks:
            raise ValueError("AI failed to generate any sub-tasks.")
            
        print(f"--- Received {len(sub_tasks)} sub-tasks from AI ---")
        return sub_tasks

    except Exception as e:
        print(f"🚨 ERROR: Gemini Task Splitter call failed: {type(e).__name__} - {e}")
        raise RuntimeError(f"AI Task Splitter request failed: {e}")