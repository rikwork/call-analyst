import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class SessionStatus(str, enum.Enum):
    RECORDING = "recording"
    UPLOADED = "uploaded"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class ConsultationSession(Base):
    """Individual recorded consultation session."""
    __tablename__ = "consultation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    specialist_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("analysis_templates.id", ondelete="SET NULL"), nullable=True)
    
    session_number = Column(Integer, default=1)
    status = Column(Enum(SessionStatus), default=SessionStatus.COMPLETED, nullable=False)
    
    # Audio metadata
    audio_file_path = Column(String(500), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    channel_count = Column(Integer, default=2)  # 2 = separate mic & system loopback
    
    title = Column(String(255), default="Консультация")
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    client = relationship("Client", back_populates="sessions")
    specialist = relationship("User", back_populates="sessions")
    template = relationship("AnalysisTemplate", back_populates="sessions")
    notes = relationship("SessionNote", back_populates="session", cascade="all, delete-orphan", order_by="SessionNote.timestamp_seconds")
    utterances = relationship("TranscriptUtterance", back_populates="session", cascade="all, delete-orphan", order_by="TranscriptUtterance.start_time")
    analysis = relationship("SessionAnalysis", back_populates="session", uselist=False, cascade="all, delete-orphan")


class SessionNote(Base):
    """Timestamped notes taken by specialist during or after call."""
    __tablename__ = "session_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("consultation_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timestamp_seconds = Column(Float, default=0.0)  # Second in audio recording
    content = Column(Text, nullable=False)
    category = Column(String(50), default="observation")  # observation, intervention, emotion, homework
    is_private = Column(String(10), default="false")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ConsultationSession", back_populates="notes")


class TranscriptUtterance(Base):
    """Diarized speech segment with speaker identification."""
    __tablename__ = "transcript_utterances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("consultation_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    speaker = Column(String(50), nullable=False)  # "psychologist", "client", "speaker_0", etc.
    start_time = Column(Float, nullable=False)   # Seconds from start
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    confidence = Column(Float, default=0.95)
    
    # Psychological annotations (extracted by AI)
    sentiment = Column(String(50), nullable=True)
    tags = Column(JSON, default=list)  # ["resistance", "cognitive_distortion", "insight"]

    session = relationship("ConsultationSession", back_populates="utterances")


class SessionAnalysis(Base):
    """Comprehensive AI supervision report produced by Gemini 3.7 Flash."""
    __tablename__ = "session_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("consultation_sessions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Structured Rubric Evaluation
    strengths = Column(JSON, default=list)            # What went exceptionally well
    growth_areas = Column(JSON, default=list)         # Where to improve & missed cues
    active_listening_score = Column(Float, default=8.5) # 1-10 rating
    therapeutic_alliance_score = Column(Float, default=8.0)
    
    # Extracted Insights
    key_themes = Column(JSON, default=list)
    cognitive_distortions = Column(JSON, default=list)
    recommended_interventions = Column(JSON, default=list) # Recommendations with protocol links
    suggested_homework = Column(JSON, default=list)
    risk_assessment = Column(JSON, default=dict)      # Suicide / self-harm / clinical alerts
    
    # Raw / formatted text summary
    executive_summary = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ConsultationSession", back_populates="analysis")
