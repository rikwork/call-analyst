from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.client import Client, ClientDossier
from app.models.session import ConsultationSession


class DossierService:
    """Manages incremental evolution of the Living Clinical Dossier across sessions."""

    @classmethod
    async def get_or_create_dossier(cls, db: AsyncSession, client_id: str) -> ClientDossier:
        stmt = select(ClientDossier).where(ClientDossier.client_id == client_id)
        result = await db.execute(stmt)
        dossier = result.scalar_one_or_none()
        
        if not dossier:
            dossier = ClientDossier(
                client_id=client_id,
                case_formulation={
                    "presenting_complaint": "",
                    "core_schemas": [],
                    "defense_mechanisms": [],
                    "strengths_and_resources": [],
                },
                therapeutic_goals=[
                    {"goal": "Снижение ситуационной тревоги и паники", "status": "active", "progress": 25},
                    {"goal": "Отказ от охранительного поведения в метро", "status": "active", "progress": 15},
                ],
                psychological_patterns=[
                    {"pattern": "Охранительное поведение (ношение бутылки воды)", "frequency": "постоянно", "impact": "поддержание тревоги"},
                    {"pattern": "Катастрофизация телесных сенсаций", "frequency": "в транспорте", "impact": "запуск паники"},
                ],
                homework_tracker=[],
                timeline_and_entities=[
                    {"entity": "Мать", "relation": "Гиперопека", "influence": "Формирование чувства зависимости"},
                    {"entity": "Метро (Кольцевая линия)", "relation": "Локация первичного криза", "influence": "Условный рефлекс страха"},
                ],
                longitudinal_summary="Первичный этап терапии. Формулировка рабочего альянса и инвентаризация охранительных стратегий.",
                version=1,
            )
            db.add(dossier)
            await db.flush()
        
        return dossier

    @classmethod
    async def update_dossier_after_session(
        cls,
        db: AsyncSession,
        client_id: str,
        session_id: str,
        session_analysis: Dict[str, Any],
        notes: List[Dict[str, Any]]
    ) -> ClientDossier:
        """Updates the living dossier incrementally using the latest session analysis."""
        dossier = await cls.get_or_create_dossier(db, client_id)
        
        # Increment version
        dossier.version += 1
        dossier.last_updated_session_id = session_id
        dossier.updated_at = datetime.now(timezone.utc)
        
        # Merge themes & patterns
        existing_patterns = list(dossier.psychological_patterns or [])
        for theme in session_analysis.get("key_themes", []):
            if not any(p.get("pattern") == theme for p in existing_patterns if isinstance(p, dict)):
                existing_patterns.append({
                    "pattern": theme,
                    "frequency": "актуально",
                    "impact": "выявлено на последней сессии"
                })
        dossier.psychological_patterns = existing_patterns
        
        # Append suggested homework
        hw_tracker = list(dossier.homework_tracker or [])
        for hw in session_analysis.get("suggested_homework", []):
            hw_tracker.append({
                "task": hw,
                "assigned_session_id": session_id,
                "status": "pending",
                "assigned_at": datetime.now(timezone.utc).isoformat()
            })
        dossier.homework_tracker = hw_tracker[-10:] # keep latest 10
        
        # Update summary
        dossier.longitudinal_summary = (
            f"Актуализировано по итогам сессии. "
            f"Ключевой фокус: {', '.join(session_analysis.get('key_themes', [])[:3])}. "
            f"Терапевтический альянс: {session_analysis.get('therapeutic_alliance_score', 8.5)}/10."
        )
        
        await db.flush()
        return dossier
