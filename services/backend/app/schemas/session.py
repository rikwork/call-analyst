from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.session import SessionStatus


class SessionNoteBase(BaseModel):
    timestamp_seconds: float
    content: str
    category: Optional[str] = "observation"
    is_private: Optional[str] = "false"


class SessionNoteCreate(SessionNoteBase):
    pass


class SessionNoteOut(SessionNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    created_at: datetime


class TranscriptUtteranceBase(BaseModel):
    speaker: str
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = 0.95
    sentiment: Optional[str] = None
    tags: Optional[List[str]] = []


class TranscriptUtteranceCreate(TranscriptUtteranceBase):
    pass


class TranscriptUtteranceOut(TranscriptUtteranceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str


class SessionAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    strengths: List[Dict[str, Any]]
    growth_areas: List[Dict[str, Any]]
    active_listening_score: float
    therapeutic_alliance_score: float
    key_themes: List[str]
    cognitive_distortions: List[Dict[str, Any]]
    recommended_interventions: List[Dict[str, Any]]
    suggested_homework: List[str]
    risk_assessment: Dict[str, Any]
    executive_summary: Optional[str] = None
    generated_at: datetime


class SessionBase(BaseModel):
    client_id: str
    template_id: Optional[str] = None
    title: Optional[str] = "Консультация"
    session_number: Optional[int] = 1


class SessionCreate(SessionBase):
    pass


class SessionOut(SessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    specialist_id: str
    status: SessionStatus
    duration_seconds: float
    channel_count: int
    audio_file_path: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    created_at: datetime
    notes: List[SessionNoteOut] = []
    utterances: List[TranscriptUtteranceOut] = []
    analysis: Optional[SessionAnalysisOut] = None
