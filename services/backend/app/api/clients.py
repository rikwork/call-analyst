from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.models.tenant import User
from app.models.client import Client, ClientDossier
from app.models.session import ConsultationSession
from app.schemas.client import ClientCreate, ClientUpdate, ClientOut, ClientDossierOut
from app.schemas.analysis import LongitudinalAnalysisResponse
from app.api.deps import get_current_user
from app.services.dossier_service import DossierService
from app.services.gemini_service import GeminiService
from app.services.protocol_service import ProtocolService

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientOut])
async def list_clients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Client)
        .where(Client.specialist_id == current_user.id)
        .options(selectinload(Client.dossier), selectinload(Client.sessions))
        .order_by(Client.created_at.desc())
    )
    result = await db.execute(stmt)
    clients = result.scalars().all()

    out = []
    for c in clients:
        c_dict = ClientOut.model_validate(c)
        c_dict.session_count = len(c.sessions)
        if c.sessions:
            c_dict.last_session_at = c.sessions[-1].created_at
        out.append(c_dict)
    return out


@router.post("", response_model=ClientOut)
async def create_client(
    client_in: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client = Client(
        tenant_id=current_user.tenant_id,
        specialist_id=current_user.id,
        first_name=client_in.first_name,
        last_name=client_in.last_name,
        pseudonym=client_in.pseudonym or f"Клиент {client_in.first_name[0]}.",
        contact_info=client_in.contact_info,
        modality=client_in.modality,
        initial_complaint=client_in.initial_complaint,
    )
    db.add(client)
    await db.flush()

    # Initialize living dossier
    dossier = await DossierService.get_or_create_dossier(db, client.id)
    
    # Reload client with relationships
    stmt = select(Client).where(Client.id == client.id).options(selectinload(Client.dossier), selectinload(Client.sessions))
    res = await db.execute(stmt)
    created_client = res.scalar_one()

    c_out = ClientOut.model_validate(created_client)
    c_out.session_count = 0
    return c_out


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Client)
        .where(Client.id == client_id, Client.specialist_id == current_user.id)
        .options(selectinload(Client.dossier), selectinload(Client.sessions))
    )
    result = await db.execute(stmt)
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден.")

    if not client.dossier:
        await DossierService.get_or_create_dossier(db, client.id)
        res = await db.execute(stmt)
        client = res.scalar_one()

    c_out = ClientOut.model_validate(client)
    c_out.session_count = len(client.sessions)
    if client.sessions:
        c_out.last_session_at = client.sessions[-1].created_at
    return c_out


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Client).where(Client.id == client_id, Client.specialist_id == current_user.id)
    result = await db.execute(stmt)
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден.")

    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.flush()
    return await get_client(client_id, current_user, db)


@router.post("/{client_id}/longitudinal-analysis", response_model=LongitudinalAnalysisResponse)
async def generate_longitudinal_analysis(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Triggers multi-session longitudinal clinical reasoning by Gemini 3.7 Flash."""
    stmt = (
        select(Client)
        .where(Client.id == client_id, Client.specialist_id == current_user.id)
        .options(selectinload(Client.dossier), selectinload(Client.sessions))
    )
    result = await db.execute(stmt)
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден.")

    dossier = await DossierService.get_or_create_dossier(db, client.id)
    
    # Match clinical protocols
    matched_protocols = await ProtocolService.match_protocols(
        db,
        text_query=f"{client.initial_complaint or ''} {dossier.longitudinal_summary or ''}",
        modality=client.modality
    )

    # Call Gemini 3.7 Flash for longitudinal case formulation
    analysis = await GeminiService.analyze_longitudinal(
        client_name=f"{client.first_name} {client.last_name}",
        dossier={
            "case_formulation": dossier.case_formulation,
            "patterns": dossier.psychological_patterns,
            "goals": dossier.therapeutic_goals,
        },
        session_history=[{"id": s.id, "session_number": s.session_number} for s in client.sessions],
        matched_protocols=matched_protocols
    )

    return LongitudinalAnalysisResponse(
        client_id=client.id,
        client_name=f"{client.first_name} {client.last_name}",
        total_sessions_analyzed=len(client.sessions),
        case_formulation=analysis.get("case_formulation", {}),
        core_hypotheses=analysis.get("core_hypotheses", []),
        therapeutic_progress=analysis.get("therapeutic_progress", []),
        recommended_interventions=analysis.get("recommended_interventions", []),
        risk_profile=analysis.get("risk_profile", {}),
        full_supervision_report_markdown=analysis.get("full_supervision_report_markdown", "")
    )
