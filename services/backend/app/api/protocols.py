from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.protocol import ClinicalProtocol
from app.schemas.protocol import ClinicalProtocolOut, ClinicalProtocolCreate
from app.services.protocol_service import DEFAULT_CLINICAL_PROTOCOLS, ProtocolService

router = APIRouter(prefix="/protocols", tags=["protocols"])


@router.get("", response_model=List[ClinicalProtocolOut])
async def list_protocols(
    modality: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ClinicalProtocol)
    if modality:
        stmt = stmt.where(ClinicalProtocol.modality == modality)
    result = await db.execute(stmt)
    protocols = result.scalars().all()

    if not protocols:
        # Return default protocols if db empty
        return [
            ClinicalProtocolOut(
                id=f"proto-{i}",
                code=p["code"],
                title=p["title"],
                modality=p["modality"],
                target_symptoms=p["target_symptoms"],
                algorithm_steps=p["algorithm_steps"],
                contraindications=p["contraindications"],
                evidence_base=p["evidence_base"],
                description=p["description"],
                created_at="2026-08-27T12:00:00Z"
            )
            for i, p in enumerate(DEFAULT_CLINICAL_PROTOCOLS)
        ]

    return protocols


@router.post("", response_model=ClinicalProtocolOut)
async def create_protocol(
    protocol_in: ClinicalProtocolCreate,
    db: AsyncSession = Depends(get_db)
):
    protocol = ClinicalProtocol(**protocol_in.model_dump())
    db.add(protocol)
    await db.flush()
    return protocol
