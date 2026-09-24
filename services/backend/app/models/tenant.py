import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    SPECIALIST = "specialist"      # Psychologist, Coach, Doctor, Sales Rep
    SUPERVISOR = "supervisor"      # Clinical Supervisor / Lead


class Tenant(Base):
    """Organization / Clinic / Team workspace."""
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="tenant", cascade="all, delete-orphan")
    templates = relationship("AnalysisTemplate", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    """Practitioner or Admin user."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.SPECIALIST, nullable=False)
    specialty = Column(String(255), default="Клинический психолог / КПТ-терапевт")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    clients = relationship("Client", back_populates="specialist", cascade="all, delete-orphan")
    sessions = relationship("ConsultationSession", back_populates="specialist", cascade="all, delete-orphan")
