from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.tenant import User
from app.models.template import AnalysisTemplate
from app.schemas.template import (
    AnalysisTemplateOut,
    AnalysisTemplateCreate,
    AnalysisTemplateUpdate,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])

from app.services.templates_data import DEFAULT_DOMAIN_TEMPLATES



@router.get("", response_model=List[AnalysisTemplateOut])
async def list_templates(
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AnalysisTemplate)
    if domain:
        stmt = stmt.where(AnalysisTemplate.domain == domain)
    result = await db.execute(stmt)
    templates = result.scalars().all()

    if not templates:
        return [
            AnalysisTemplateOut(
                id=f"tmpl-{i}",
                slug=t["slug"],
                name=t["name"],
                domain=t["domain"],
                is_default=t["is_default"],
                system_prompt=t["system_prompt"],
                session_analysis_prompt=t["session_analysis_prompt"],
                longitudinal_prompt=t["longitudinal_prompt"],
                extraction_schema=t["extraction_schema"],
                scoring_rubrics=t["scoring_rubrics"],
                created_at="2026-08-27T12:00:00Z",
                updated_at="2026-08-27T12:00:00Z",
            )
            for i, t in enumerate(DEFAULT_DOMAIN_TEMPLATES)
        ]

    return templates


@router.post("", response_model=AnalysisTemplateOut)
async def create_template(
    template_in: AnalysisTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    template = AnalysisTemplate(
        tenant_id=current_user.tenant_id,
        **template_in.model_dump()
    )
    db.add(template)
    await db.flush()
    return template


@router.put("/{template_id}", response_model=AnalysisTemplateOut)
async def update_template(
    template_id: str,
    template_in: AnalysisTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AnalysisTemplate).where(AnalysisTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон анализа не найден.")

    for field, val in template_in.model_dump(exclude_unset=True).items():
        setattr(template, field, val)

    await db.flush()
    return template
