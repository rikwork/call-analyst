from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class ClientDossierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    case_formulation: Dict[str, Any]
    therapeutic_goals: List[Dict[str, Any]]
    psychological_patterns: List[Dict[str, Any]]
    homework_tracker: List[Dict[str, Any]]
    timeline_and_entities: List[Dict[str, Any]]
    longitudinal_summary: Optional[str] = None
    version: int
    updated_at: datetime


class ClientBase(BaseModel):
    first_name: str
    last_name: str
    pseudonym: Optional[str] = None
    contact_info: Optional[str] = None
    modality: str = "CBT"
    initial_complaint: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    pseudonym: Optional[str] = None
    contact_info: Optional[str] = None
    modality: Optional[str] = None
    initial_complaint: Optional[str] = None


class ClientOut(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    specialist_id: str
    created_at: datetime
    updated_at: datetime
    session_count: Optional[int] = 0
    last_session_at: Optional[datetime] = None
    dossier: Optional[ClientDossierOut] = None
