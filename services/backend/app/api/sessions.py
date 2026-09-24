import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import User
from app.models.client import Client
from app.models.session import (
    ConsultationSession,
    SessionNote,
    TranscriptUtterance,
    SessionAnalysis,
    SessionStatus,
)
from app.schemas.session import SessionCreate, SessionOut, SessionNoteCreate, SessionNoteOut
from app.schemas.analysis import QuickNoteCreate
from app.api.deps import get_current_user
from app.services.stt_service import STTService
from app.services.gemini_service import GeminiService
from app.services.dossier_service import DossierService
from app.services.protocol_service import ProtocolService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=List[SessionOut])
async def list_sessions(
    client_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ConsultationSession)
        .where(ConsultationSession.specialist_id == current_user.id)
        .options(
            selectinload(ConsultationSession.notes),
            selectinload(ConsultationSession.utterances),
            selectinload(ConsultationSession.analysis),
        )
        .order_by(ConsultationSession.created_at.desc())
    )
    if client_id:
        stmt = stmt.where(ConsultationSession.client_id == client_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=SessionOut)
async def create_session(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify client ownership
    stmt = select(Client).where(Client.id == session_in.client_id, Client.specialist_id == current_user.id)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден.")

    # Calculate session number
    session_count_stmt = select(ConsultationSession).where(ConsultationSession.client_id == client.id)
    count_res = await db.execute(session_count_stmt)
    count = len(count_res.scalars().all())

    session = ConsultationSession(
        client_id=client.id,
        specialist_id=current_user.id,
        template_id=session_in.template_id,
        session_number=count + 1,
        title=session_in.title or f"Консультация #{count + 1}",
        status=SessionStatus.RECORDING,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()

    return await get_session_by_id(session.id, current_user, db)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await get_session_by_id(session_id, current_user, db)


async def get_session_by_id(session_id: str, current_user: User, db: AsyncSession) -> ConsultationSession:
    stmt = (
        select(ConsultationSession)
        .where(ConsultationSession.id == session_id, ConsultationSession.specialist_id == current_user.id)
        .options(
            selectinload(ConsultationSession.notes),
            selectinload(ConsultationSession.utterances),
            selectinload(ConsultationSession.analysis),
        )
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена.")
    return session


@router.post("/{session_id}/notes", response_model=SessionNoteOut)
async def add_session_note(
    session_id: str,
    note_in: SessionNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await get_session_by_id(session_id, current_user, db)

    note = SessionNote(
        session_id=session.id,
        timestamp_seconds=note_in.timestamp_seconds,
        content=note_in.content,
        category=note_in.category or "observation",
        is_private=note_in.is_private or "false",
    )
    db.add(note)
    await db.flush()
    return note


@router.post("/{session_id}/finish", response_model=SessionOut)
async def finish_and_analyze_session(
    session_id: str,
    audio_file: Optional[UploadFile] = File(None),
    duration_seconds: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Finalizes recorded call, runs Sber GigaAM STT transcription,
    matches clinical protocols, and triggers Gemini 3.7 Flash supervision & living dossier update.
    """
    session = await get_session_by_id(session_id, current_user, db)
    
    session.status = SessionStatus.ANALYZING
    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    session.ended_at = now_dt
    
    if duration_seconds is not None and duration_seconds > 0:
        session.duration_seconds = round(float(duration_seconds), 1)
    elif session.started_at and session.ended_at:
        start_naive = session.started_at.replace(tzinfo=None) if session.started_at.tzinfo else session.started_at
        end_naive = session.ended_at.replace(tzinfo=None) if session.ended_at.tzinfo else session.ended_at
        diff = (end_naive - start_naive).total_seconds()
        session.duration_seconds = max(1.0, round(diff, 1))
    elif not session.duration_seconds or session.duration_seconds == 0:
        session.duration_seconds = 60.0

    # Save audio if uploaded
    if audio_file:
        os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(settings.AUDIO_UPLOAD_DIR, f"{session.id}_{audio_file.filename}")
        with open(file_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        session.audio_file_path = file_path


    # Step 1: Run STT & Diarization
    utterance_data = await STTService.transcribe(
        file_path=session.audio_file_path or "mock_audio.wav",
        channel_count=session.channel_count
    )
    
    for u in utterance_data:
        utterance = TranscriptUtterance(
            session_id=session.id,
            speaker=u["speaker"],
            start_time=u["start_time"],
            end_time=u["end_time"],
            text=u["text"],
            sentiment=u.get("sentiment"),
            tags=u.get("tags", []),
        )
        db.add(utterance)
    await db.flush()

    # Step 2: Prepare context for Gemini 3.7 Flash
    transcript_text = "\n".join([f"[{u['speaker']} {u['start_time']:.1f}s]: {u['text']}" for u in utterance_data])
    notes_text = "\n".join([f"[{n.timestamp_seconds:.1f}s]: {n.content}" for n in session.notes])

    # Step 3: Match clinical protocols
    matched_protocols = await ProtocolService.match_protocols(db, text_query=transcript_text)

    # Step 4: Run Gemini Supervision Analysis
    analysis_dict = await GeminiService.analyze_session(
        transcript_text=transcript_text,
        notes_text=notes_text,
        matched_protocols=matched_protocols
    )

    analysis = SessionAnalysis(
        session_id=session.id,
        strengths=analysis_dict.get("strengths", []),
        growth_areas=analysis_dict.get("growth_areas", []),
        active_listening_score=analysis_dict.get("active_listening_score", 8.5),
        therapeutic_alliance_score=analysis_dict.get("therapeutic_alliance_score", 8.0),
        key_themes=analysis_dict.get("key_themes", []),
        cognitive_distortions=analysis_dict.get("cognitive_distortions", []),
        recommended_interventions=analysis_dict.get("recommended_interventions", []),
        suggested_homework=analysis_dict.get("suggested_homework", []),
        risk_assessment=analysis_dict.get("risk_assessment", {}),
        executive_summary=analysis_dict.get("executive_summary"),
    )
    db.add(analysis)
    await db.flush()

    # Step 5: Update Living Client Dossier
    await DossierService.update_dossier_after_session(
        db=db,
        client_id=session.client_id,
        session_id=session.id,
        session_analysis=analysis_dict,
        notes=[{"timestamp": n.timestamp_seconds, "content": n.content} for n in session.notes]
    )

    session_id_val = str(session.id)
    session.status = SessionStatus.COMPLETED
    await db.flush()

    stmt = (
        select(ConsultationSession)
        .where(ConsultationSession.id == session_id_val)
        .options(
            selectinload(ConsultationSession.notes),
            selectinload(ConsultationSession.utterances),
            selectinload(ConsultationSession.analysis),
        )
        .execution_options(populate_existing=True)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/{session_id}/audio")
async def stream_session_audio(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams the raw recorded audio file with Range header support for seeking in web player.
    """
    from fastapi.responses import FileResponse
    session = await get_session_by_id(session_id, current_user, db)
    if not session.audio_file_path or not os.path.exists(session.audio_file_path):
        raise HTTPException(status_code=404, detail="Аудиофайл для данной сессии не найден.")

    media_type = "audio/wav" if session.audio_file_path.endswith(".wav") else "audio/webm"
    return FileResponse(
        path=session.audio_file_path,
        media_type=media_type,
        filename=f"session_{session.id}_audio.wav"
    )

