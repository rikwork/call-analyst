from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class ClinicalProtocolBase(BaseModel):
    code: str
    title: str
    modality: str
    target_symptoms: List[str] = []
    algorithm_steps: List[str] = []
    contraindications: List[str] = []
    evidence_base: List[Dict[str, Any]] = []
    description: Optional[str] = None


class ClinicalProtocolCreate(ClinicalProtocolBase):
    pass


class ClinicalProtocolOut(ClinicalProtocolBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
