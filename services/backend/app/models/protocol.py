import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON, DateTime
from app.core.database import Base


class ClinicalProtocol(Base):
    """Standardized evidence-based clinical protocols (CBT, Schema, Gestalt, ACT, etc.)."""
    __tablename__ = "clinical_protocols"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(100), unique=True, nullable=False, index=True) # e.g. "CBT-PANIC-CLARK"
    title = Column(String(255), nullable=False)                         # e.g. "Протокол работы с паническим расстройством (Дэвид Кларк)"
    modality = Column(String(100), nullable=False, index=True)          # CBT, Schema, Gestalt, ACT
    target_symptoms = Column(JSON, default=list)                        # ["паника", "агорафобия", "охранительное поведение"]
    
    # Step-by-step clinical algorithm
    algorithm_steps = Column(JSON, default=list)
    contraindications = Column(JSON, default=list)
    
    # Validated citations & research links
    evidence_base = Column(JSON, default=list)                          # [{"citation": "Clark, D.M., 1994, Lancet", "doi": "...", "summary": "..."}]
    
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
