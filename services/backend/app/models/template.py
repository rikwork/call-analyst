import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class AnalysisTemplate(Base):
    """Configurable prompt & evaluation rubric for domain pivoting."""
    __tablename__ = "analysis_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True) # Null for global system templates
    
    slug = Column(String(100), nullable=False, index=True) # "psychology-cbt", "sales-bant", "executive-grow", "medical-soap"
    name = Column(String(255), nullable=False)             # "Клиническая супервизия (КПТ / Схема-терапия)"
    domain = Column(String(100), default="psychology")     # psychology, sales, executive, medical, hr
    is_default = Column(Boolean, default=False)
    
    # Prompt Configuration
    system_prompt = Column(Text, nullable=False)
    session_analysis_prompt = Column(Text, nullable=False)
    longitudinal_prompt = Column(Text, nullable=False)
    
    # Extraction Schema (JSON fields to extract)
    extraction_schema = Column(JSON, default=dict)
    
    # Scoring Rubrics & Criteria
    scoring_rubrics = Column(JSON, default=list) # [{"metric": "Активное слушание", "weight": 0.3, "scale_max": 10}]
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="templates")
    sessions = relationship("ConsultationSession", back_populates="template")
