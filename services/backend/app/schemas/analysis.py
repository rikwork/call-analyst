from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class SessionAnalysisRequest(BaseModel):
    session_id: str
    template_id: Optional[str] = None


class LongitudinalAnalysisRequest(BaseModel):
    client_id: str
    template_id: Optional[str] = None
    focus_areas: Optional[List[str]] = None


class LongitudinalAnalysisResponse(BaseModel):
    client_id: str
    client_name: str
    total_sessions_analyzed: int
    case_formulation: Dict[str, Any]
    core_hypotheses: List[str]
    therapeutic_progress: List[Dict[str, Any]]
    recommended_interventions: List[Dict[str, Any]] # With research citations
    risk_profile: Dict[str, Any]
    full_supervision_report_markdown: str


class QuickNoteCreate(BaseModel):
    session_id: str
    timestamp_seconds: float
    content: str
    category: Optional[str] = "observation"
