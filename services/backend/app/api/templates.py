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

DEFAULT_DOMAIN_TEMPLATES = [
    {
        "slug": "psychology-cbt-schema",
        "name": "Клиническая супервизия (КПТ / Схема-терапия)",
        "domain": "psychology",
        "is_default": True,
        "system_prompt": "Вы — клинический супервизор и эксперт доказательной психотерапии. Оценивайте эмпатию, соблюдение протоколов, когнитивные искажения и терапевтический альянс.",
        "session_analysis_prompt": "Проанализируйте диалог психолога и клиента. Выделите успехи, зоны внимания, когнитивные ошибки и сформируйте ДЗ.",
        "longitudinal_prompt": "Составьте динамическое досье клиента по биопсихосоциальной модели (5P), оцените прогресс по целям и дайте рекомендации со ссылками на исследования.",
        "extraction_schema": {
            "fields": ["strengths", "growth_areas", "cognitive_distortions", "interventions", "homework", "risk_level"]
        },
        "scoring_rubrics": [
            {"metric": "Активное слушание & Эмпатия", "weight": 0.35, "scale_max": 10},
            {"metric": "Концептуализация проблемы", "weight": 0.35, "scale_max": 10},
            {"metric": "Сократический диалог & Интервенции", "weight": 0.30, "scale_max": 10},
        ]
    },
    {
        "slug": "sales-coaching-bant-spin",
        "name": "Sales Coaching (BANT / SPIN / Обработка возражений)",
        "domain": "sales",
        "is_default": False,
        "system_prompt": "Вы — топ-тренер по B2B/B2C продажам. Анализируйте звонок менеджера по методологиям SPIN и BANT. Оценивайте выявление болей, квалификацию бюджета, ЛПР и закрытие сделки.",
        "session_analysis_prompt": "Оцените звонок менеджера: квалификация лида, отработка возражений по цене, назначение следующего шага.",
        "longitudinal_prompt": "Сформируйте динамику клиента в воронке продаж, готовность к покупке (LTV) и рекомендации менеджеру по дожиму сделки.",
        "extraction_schema": {
            "fields": ["budget", "authority_decision_maker", "need_pain_points", "timeline", "objections_handled", "next_steps"]
        },
        "scoring_rubrics": [
            {"metric": "Выявление болей и потребностей (SPIN)", "weight": 0.4, "scale_max": 10},
            {"metric": "Отработка возражений", "weight": 0.3, "scale_max": 10},
            {"metric": "Четкость следующего шага & Closing", "weight": 0.3, "scale_max": 10},
        ]
    },
    {
        "slug": "executive-coaching-grow",
        "name": "Executive Coaching (GROW / ICF Standards)",
        "domain": "executive",
        "is_default": False,
        "system_prompt": "Вы — Master Certified Coach (MCC ICF). Анализируйте сессию коучинга руководителей по модели GROW (Goal, Reality, Options, Will).",
        "session_analysis_prompt": "Оцените продвижение клиента к цели, сильные открытые вопросы коуча, безоценочность и фокус на ответственности клиента.",
        "longitudinal_prompt": "Отследите лидерскую трансформацию клиента, преодоление ментальных ограничений и динамику внедрения решений в бизнес.",
        "extraction_schema": {
            "fields": ["goal_clarity", "reality_awareness", "options_generated", "action_commitments", "growth_mindset"]
        },
        "scoring_rubrics": [
            {"metric": "Глубина открытых вопросов", "weight": 0.4, "scale_max": 10},
            {"metric": "Соблюдение модели GROW", "weight": 0.3, "scale_max": 10},
            {"metric": "Фокус на ответственности клиента", "weight": 0.3, "scale_max": 10},
        ]
    }
]


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
