# backend/app/services/nlp_service.py

import datetime
import dateparser
import google.generativeai as genai
import json
import re
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import HTTPException

# --- Import settings ---
from ..core.config_loader import settings

# --- Configure Gemini API Client ---
try:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    # --- Using your correct, preferred model ---
    gemini_model = genai.GenerativeModel(
        model_name='gemini-2.5-flash-preview-09-2025'
    )
    # ------------------------------------
    print("✅ Gemini API configured successfully.")
except ValueError as e:
    print(f"❌ CONFIGURATION ERROR: {e}")
    gemini_model = None
except Exception as e:
    print(f"❌ CRITICAL ERROR: Failed to configure Gemini API: {e}")
    gemini_model = None

# --- Define the JSON Schema for Gemini's Output ---
# This tells the model EXACTLY what structure we expect.
GEMINI_JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING", "description": "The concise main title or action of the task."},
        "description": {"type": "STRING", "description": "Any additional details or context about the task."},
        # --- YOUR IMPROVED SCHEMA DESCRIPTION ---
        "due_date_description": {"type": "STRING", "description": "The date and/or time mentioned. Simplify ambiguous phrases that must have only one time related component am,pm or morning,evening to mention time . (e.g., 'next Friday 4pm', 'tomorrow 9am', 'today 5pm'). If no date/time is mentioned, this should be null."},
        # ----------------------------------------
        "tags": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Keywords explicitly marked with '#' or inferred project/topic tags."},
        "people": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Names of people or roles mentioned (e.g., 'Alex', 'manager', 'client')."},
        "locations": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Places mentioned (e.g., 'office', 'home', 'downtown')."},
        "apps": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Applications or tools mentioned (e.g., 'Zoom', 'Figma', 'Slack')."},
        "importance": {"type": "INTEGER", "description": "Estimated importance score from 1 (Very Low) to 5 (Critical) based on keywords and context. Default to 3 if unsure."},
        "ask_completion_time": {"type": "BOOLEAN", "description": "Set to true if this is a task where tracking time is useful (e.g., 'finish report', 'debug issue'), false for simple errands (e.g., 'buy milk'). Default to false."}
    },
    "required": ["title", "importance", "ask_completion_time"] # Ensure all three are returned
}

# --- System Prompt for Gemini (MODIFIED) ---
SYSTEM_PROMPT = """
You are an expert task parsing assistant. Analyze the user's input text for creating a task.
Extract the key details according to the provided JSON schema.
- Identify the main action as the 'title'.
- Capture any extra context as the 'description'.

- **CRITICAL: Determine 'importance' on a scale of 1 (Low) to 5 (Critical) based on your understanding of the context.**
- **RULE 1:** If the text contains strong urgency keywords like 'urgent', 'asap', 'critical', or 'immediately', you **MUST** set 'importance' to 5.
- **RULE 2:** Use your contextual understanding. If the task implies high importance (e.g., 'client meeting', 'final exam', 'project deadline'), set 'importance' to 4.
- **RULE 3:** Otherwise, default to 3 if neutral or unclear.

- **CRITICAL: Handle 'due_date_description'.**
- **RULE 1:** Extract date/time phrases.
- **RULE 2:** You **MUST** follow the schema description: Simplify ambiguous phrases. The output must have only one time component (e.g., 'tomorrow 9 am' or 'friday 3pm', NOT 'tomorrow morning at 9 am').
- **RULE 3:** If no date/time is mentioned, this field **MUST** be null.

- Find explicit #tags and infer relevant people, locations, apps, or project names.
- Determine if 'ask_completion_time' should be true. Set it to true for tasks that imply significant effort or duration (like reports, projects, debugging, studying). Set it to false for simple, quick tasks (like calls, buying items, quick reminders). Default to false if uncertain.

Respond ONLY with the valid JSON object matching the schema. Do not add any extra text, explanations, or markdown formatting.
"""

# --- Main Parsing Function (Now Async) ---
async def parse_task_from_text(text: str) -> Dict[str, Any]:
    """
    Parses a raw text string using the Gemini API (Flash model) with JSON mode.
    Extracts title, description, date description, metadata, and importance.
    Parses the date description into a datetime object.
    """
    if gemini_model is None:
        raise RuntimeError("Gemini API client is not initialized.")

    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")

    print(f"--- Sending to Gemini: '{text}' ---")

    try:
        # Make the asynchronous API call using JSON mode
        response = await gemini_model.generate_content_async(
            contents=text, # Pass the user text directly
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": GEMINI_JSON_SCHEMA
            },
             request_options={"timeout": 60} # Set a timeout (in seconds)
        )

        # Extract and parse the JSON response
        if not response.candidates or not response.candidates[0].content.parts:
             raise ValueError("Gemini API returned an empty response.")

        json_text = response.candidates[0].content.parts[0].text
        print(f"--- Received from Gemini: {json_text} ---")
        parsed_json = json.loads(json_text)

        # --- Post-process the extracted data ---

        # 1. Parse the date using dateparser
        parsed_date: Optional[datetime.datetime] = None
        due_date_desc = parsed_json.get("due_date_description")
        
        # --- MODIFICATION START ---
        pre_processed_text = due_date_desc
        
        if pre_processed_text:
            desc_lower = pre_processed_text.lower()
            
            # --- FIX 0: Handle "immediately" and "asap" (Your suggestion) ---
            if re.search(r'\b(immediately|asap)\b', desc_lower):
                # Set due date to 30 minutes from now (using local time)
                parsed_date = datetime.datetime.now() + datetime.timedelta(minutes=30)
                # Ensure it's timezone-aware
                if parsed_date.tzinfo is None:
                     parsed_date = parsed_date.astimezone()
                print(f"--- 'ASAP/Immediately' detected. Setting due date to: {parsed_date} ---")
                
            # --- FIX 1: Handle "EOD" (End of Day) ---
            elif 'eod' in desc_lower:
                # Replace "EOD" with "5:00 PM" and let the parser handle the rest
                pre_processed_text = re.sub(r'eod', '5:00 PM', pre_processed_text, flags=re.IGNORECASE)
                print(f"--- 'EOD' detected. Parsing: '{pre_processed_text}' ---")
                desc_lower = pre_processed_text.lower() # Update the lowercase version

            # --- FIX 2: Handle "time-only" strings (Your suggestion) ---
            time_only_regex = r'^(at\s*)?\d{1,2}(:\d{2})?(\s*(am|pm))?\s*$'
            day_words_regex = r'monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next week'
            
            if parsed_date is None and re.match(time_only_regex, desc_lower) and not re.search(day_words_regex, desc_lower):
                pre_processed_text = f"today {pre_processed_text}"
                print(f"--- 'Time-only' detected. Parsing: '{pre_processed_text}' ---")

            # --- FIX 3: Handle "ambiguous" strings (e.g., "tomorrow morning at 9 am") ---
            time_of_day_words = r'morning|afternoon|evening'
            am_pm_time = r'\d(\s*am|\s*pm|:\d{2})'
            
            if parsed_date is None and re.search(time_of_day_words, desc_lower) and re.search(am_pm_time, desc_lower):
                pre_processed_text = re.sub(time_of_day_words, '', pre_processed_text, flags=re.IGNORECASE).strip()
                print(f"--- Ambiguous time detected. Parsing: '{pre_processed_text}' ---")
            
            # --- Main Dateparser Call ---
            if parsed_date is None:
                try:
                    # --- THIS IS THE FIX ---
                    # We REMOVED 'TO_TIMEZONE': 'UTC'.
                    # This makes dateparser return a datetime object that is
                    # "aware" of the user's local timezone.
                    parsed_date = dateparser.parse(
                        pre_processed_text,
                        settings={
                            'PREFER_DATES_FROM': 'future',
                            'RETURN_AS_TIMEZONE_AWARE': True,
                            # 'TO_TIMEZONE': 'UTC',  <-- THIS WAS THE BUG
                            'STRICT_PARSING': False 
                        }
                    )
                    # -----------------------

                    # --- FIX 4: Handle "day-only" strings (e.g., "tomorrow", "Friday", "Monday morning") ---
                    if parsed_date and parsed_date.hour == 0 and parsed_date.minute == 0:
                        original_desc_lower = due_date_desc.lower() if due_date_desc else ""
                        has_explicit_time = re.search(r'\d{1,2}(\s*am|\s*pm|\s*o\'clock|:\d{2})', original_desc_lower)
                        was_eod = "eod" in original_desc_lower

                        if not has_explicit_time and not was_eod:
                            if "morning" in original_desc_lower: 
                                parsed_date = parsed_date.replace(hour=9)
                            elif "noon" in original_desc_lower: 
                                parsed_date = parsed_date.replace(hour=12)
                            elif "afternoon" in original_desc_lower: 
                                parsed_date = parsed_date.replace(hour=14)
                            elif "evening" in original_desc_lower or "night" in original_desc_lower: 
                                parsed_date = parsed_date.replace(hour=18)
                            else:
                                # --- THIS IS THE CHANGE ---
                                # Default to 5 PM (17:00) instead of 9 AM
                                parsed_date = parsed_date.replace(hour=17)
                                # --------------------------
                    # --- MODIFICATION END ---

                except Exception as date_e:
                    print(f"Warning: dateparser failed for '{due_date_desc}': {date_e}")
                    parsed_date = None

        # --- THIS IS THE NEW DEFAULT DATE LOGIC ---
        if parsed_date is None:
            print("--- No date/time found. Defaulting to today 5 PM. ---")
            # Get today in local timezone
            parsed_date = datetime.datetime.now().replace(hour=17, minute=0, second=0, microsecond=0)
            # Ensure it's timezone-aware
            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.astimezone()
        # --- END NEW DEFAULT DATE LOGIC ---

        # 2. Assemble Metadata Dictionary
        final_metadata = {}
        for key in ["people", "locations", "apps", "tags"]:
            values = parsed_json.get(key)
            if values and isinstance(values, list):
                # Simple cleaning and deduplication
                unique_values = []
                seen_lower = set()
                for v in values:
                     if isinstance(v, str):
                        v_strip = v.strip()
                        v_lower = v_strip.lower()
                        if v_strip and v_lower not in seen_lower:
                            unique_values.append(v_strip)
                            seen_lower.add(v_lower)
                if unique_values:
                    final_metadata[key] = unique_values

        # 3. Get other fields, providing defaults
        final_title = parsed_json.get("title", "New Task").strip()
        if not final_title: # Ensure title isn't empty after stripping
            final_title = "New Task"

        final_description = parsed_json.get("description")
        if final_description:
            final_description = final_description.strip()
            if not final_description: # Handle empty string case
                 final_description = None

        final_importance = parsed_json.get("importance", 3)
        # Validate importance is within range
        if not isinstance(final_importance, int) or not (1 <= final_importance <= 5):
            print(f"Warning: Received invalid importance '{final_importance}', defaulting to 3.")
            final_importance = 3
        
        ask_completion_time = parsed_json.get("ask_completion_time", False)
        if not isinstance(ask_completion_time, bool):
            print(f"Warning: Received invalid ask_completion_time '{ask_completion_time}', defaulting to False.")
            ask_completion_time = False
            
        # --- Return the dictionary expected by task_router ---
        return {
            "title": final_title,
            "description": final_description,
            "due_date": parsed_date, # The parsed datetime object
            
            # --- THIS IS THE FIX ---
            # Ensure we always return a dictionary, even if it's empty,
            # not None.
            "task_metadata": final_metadata if final_metadata is not None else {},
            # ---------------------

            "importance": final_importance,
            "ask_completion_time": ask_completion_time
        }

    except json.JSONDecodeError as json_e:
        print(f"🚨 ERROR: Failed to parse JSON response from Gemini: {json_e}")
        print(f"Raw response text: {json_text if 'json_text' in locals() else 'N/A'}")
        raise RuntimeError(f"AI service returned invalid JSON: {json_e}")
    except Exception as e:
        # Catch other potential errors from the API call (network, authentication, rate limits etc.)
        print(f"🚨 ERROR: Gemini API call failed: {type(e).__name__} - {e}")
        # Consider more specific error handling based on google.api_core.exceptions if needed
        raise RuntimeError(f"AI service request failed: {e}")

# --- Example Testing (Async) ---
async def run_tests():
    """Runs async tests for the Gemini NLP service."""
    if gemini_model:
        test_texts = [
            "saturday evening i have meeting with clients at 4pm",
            "thursday evening i have meeting with clients at 4oclock",
            "call mom about the weekend plans tomorrow night",
            "Finish the urgent API documentation for #ProjectAtlas with the design team on Slack 5pm", # Removed 'before'
            "Review the new mockups with Alex for #ProjectPhoenix next Wednesday at 3pm",
            "My client meeting is at 4pm on Friday at the office",
            "Report due 5pm #urgent",
            "Need to study for my final exam on Zoom",
            "Pick up milk at the gym",
            "Tomorrow I have a meeting on 11:00 p.m. with the manager",
            "please fix the bug asap",
            "buying milk",
            "Get groceries after work",
            "Submit expenses by Friday",
            "Server deployment EOD",
            "debug frontend issue reported by QA on Jira",
            "Optional: Clean up logs sometime next week"
        ]

        print(f"\n--- Gemini API NLP Service Test Runner ---")
        for t in test_texts:
            print(f"\nIN:  '{t}'")
            try:
                parsed = await parse_task_from_text(t)
                print(f"OUT: {parsed}")
            except Exception as e:
                print(f"OUT: 🚨 ERROR: {type(e).__name__} - {e}")
    else:
        print("\n--- NLP Service Test Runner ---")
        print("Cannot run tests: Gemini API model not loaded.")

if __name__ == "__main__":
    # To run the async tests directly:
    try:
        asyncio.run(run_tests())
    except RuntimeError as e:
         if "cannot schedule new futures after shutdown" not in str(e):
              raise # Reraise unexpected errors