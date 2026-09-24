import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Client(Base):
    """Client / Patient entity."""
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    specialist_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    pseudonym = Column(String(100), nullable=True)  # Anonymized pseudonym for clinical reports
    contact_info = Column(String(255), nullable=True)
    modality = Column(String(100), default="CBT")   # CBT, Schema, Gestalt, Psychoanalysis, Coaching
    initial_complaint = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="clients")
    specialist = relationship("User", back_populates="clients")
    sessions = relationship("ConsultationSession", back_populates="client", cascade="all, delete-orphan", order_by="ConsultationSession.session_number")
    dossier = relationship("ClientDossier", back_populates="client", uselist=False, cascade="all, delete-orphan")


class ClientDossier(Base):
    """Living Clinical Dossier (Dynamic Memory) - Updated incrementally after each session."""
    __tablename__ = "client_dossiers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Biopsychosocial Case Formulation (Structured JSON)
    case_formulation = Column(JSON, default=dict)
    # Therapeutic Goals & Milestones
    therapeutic_goals = Column(JSON, default=list)
    # Recurring Patterns & Defense Mechanisms
    psychological_patterns = Column(JSON, default=list)
    # Homework Compliance & Resistance Tracker
    homework_tracker = Column(JSON, default=list)
    # Key People & Traumatic/Formative Timeline
    timeline_and_entities = Column(JSON, default=list)
    # Longitudinal Summary & Recommendations
    longitudinal_summary = Column(Text, nullable=True)
    
    version = Column(Integer, default=1)
    last_updated_session_id = Column(String(36), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    client = relationship("Client", back_populates="dossier")
