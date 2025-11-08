# backend/app/schemas/nlp_schema.py

from pydantic import BaseModel
from typing import Optional, List
import datetime

# This is the input our API will expect
class NlpParseRequest(BaseModel):
    text: str

# This is the output our nlp_service will provide
class NlpParseResponse(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    tags: List[str] = []