from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class AnalysisTemplateBase(BaseModel):
    slug: str
    name: str
    domain: str = "psychology"
    is_default: bool = False
    system_prompt: str
    session_analysis_prompt: str
    longitudinal_prompt: str
    extraction_schema: Dict[str, Any] = {}
    scoring_rubrics: List[Dict[str, Any]] = []


class AnalysisTemplateCreate(AnalysisTemplateBase):
    pass


class AnalysisTemplateUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    is_default: Optional[bool] = None
    system_prompt: Optional[str] = None
    session_analysis_prompt: Optional[str] = None
    longitudinal_prompt: Optional[str] = None
    extraction_schema: Optional[Dict[str, Any]] = None
    scoring_rubrics: Optional[List[Dict[str, Any]]] = None


class AnalysisTemplateOut(AnalysisTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
