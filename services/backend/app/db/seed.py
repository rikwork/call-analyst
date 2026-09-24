import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.tenant import Tenant, User, UserRole
from app.models.client import Client, ClientDossier
from app.models.session import ConsultationSession, SessionNote, TranscriptUtterance, SessionAnalysis, SessionStatus
from app.models.protocol import ClinicalProtocol
from app.models.template import AnalysisTemplate
from app.services.protocol_service import DEFAULT_CLINICAL_PROTOCOLS
from app.services.templates_data import DEFAULT_DOMAIN_TEMPLATES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_database():
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        user_check = await db.execute(select(User))
        if user_check.scalars().first():
            logger.info("Database already seeded. Skipping.")
            return

        logger.info("Seeding Default Tenant & Admin / Specialist User...")
        tenant = Tenant(
            id="tenant-demo-01",
            name="Клинический психологический центр 'Ресурс'",
            slug="resource-clinic",
        )
        db.add(tenant)
        await db.flush()

        specialist = User(
            id="user-specialist-01",
            tenant_id=tenant.id,
            email="psychologist@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Д-р Алексей Воронов",
            specialty="Клинический психолог, КПТ / Схема-терапевт",
            role=UserRole.SPECIALIST,
        )
        admin = User(
            id="user-admin-01",
            tenant_id=tenant.id,
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Екатерина Смирнова (Главный супервизор)",
            specialty="Руководитель практики & Супервизор",
            role=UserRole.SUPER_ADMIN,
        )
        db.add_all([specialist, admin])
        await db.flush()

        logger.info("Seeding Clinical Protocols...")
        for p in DEFAULT_CLINICAL_PROTOCOLS:
            protocol = ClinicalProtocol(
                code=p["code"],
                title=p["title"],
                modality=p["modality"],
                target_symptoms=p["target_symptoms"],
                algorithm_steps=p["algorithm_steps"],
                contraindications=p["contraindications"],
                evidence_base=p["evidence_base"],
                description=p["description"],
            )
            db.add(protocol)

        logger.info("Seeding Domain Analysis Templates...")
        for t in DEFAULT_DOMAIN_TEMPLATES:
            tmpl = AnalysisTemplate(
                tenant_id=tenant.id if not t["is_default"] else None,
                slug=t["slug"],
                name=t["name"],
                domain=t["domain"],
                is_default=t["is_default"],
                system_prompt=t["system_prompt"],
                session_analysis_prompt=t["session_analysis_prompt"],
                longitudinal_prompt=t["longitudinal_prompt"],
                extraction_schema=t["extraction_schema"],
                scoring_rubrics=t["scoring_rubrics"],
            )
            db.add(tmpl)
        await db.flush()

        logger.info("Seeding Demo Clients & Living Dossiers...")
        client1 = Client(
            id="client-01",
            tenant_id=tenant.id,
            specialist_id=specialist.id,
            first_name="Анна",
            last_name="Смирнова",
            pseudonym="Анна С.",
            contact_info="+7 (999) 123-45-67",
            modality="CBT",
            initial_complaint="Панические атаки в общественном транспорте, тахикардия, избегание метро, ношение с собой бутылки воды.",
        )
        client2 = Client(
            id="client-02",
            tenant_id=tenant.id,
            specialist_id=specialist.id,
            first_name="Михаил",
            last_name="Васильев",
            pseudonym="Михаил В.",
            contact_info="+7 (999) 765-43-21",
            modality="Schema",
            initial_complaint="Эмоциональное выгорание, синдром самозванца, перфекционизм и страх критики от руководства.",
        )
        db.add_all([client1, client2])
        await db.flush()

        # Dossier for Client 1
        dossier1 = ClientDossier(
            id="dossier-01",
            client_id=client1.id,
            case_formulation={
                "predisposing_factors": "Повышенная интероцептивная тревожность, гиперопека в семье.",
                "precipitating_factors": "Эпизод духоты на кольцевой линии метро 3 месяца назад.",
                "perpetuating_factors": "Охранительные ритуалы (бутылка воды), избегание часа пик.",
                "protective_factors": "Высокая мотивация, поддержка мужа, когнитивная гибкость."
            },
            therapeutic_goals=[
                {"goal": "Снижение паники при спуске в метро", "status": "active", "progress": 40},
                {"goal": "Отказ от охранительного ношения воды", "status": "active", "progress": 25},
                {"goal": "Экспозиция к телесным ощущениям тахикардии", "status": "planned", "progress": 0}
            ],
            psychological_patterns=[
                {"pattern": "Охранительное поведение (бутылка воды как ложная опора)", "frequency": "каждая поездка", "impact": "поддержание страха"},
                {"pattern": "Катастрофизация телесных симптомов ('упаду в обморок')", "frequency": "при духоте", "impact": "выброс адреналина"}
            ],
            homework_tracker=[
                {"task": "Заполнение дневника мыслей СМЭР при входе на станцию", "status": "completed", "assigned_session_id": "session-01"},
                {"task": "Подождать 2 минуты перед тем, как достать воду при тревоге", "status": "in_progress", "assigned_session_id": "session-01"}
            ],
            timeline_and_entities=[
                {"entity": "Мать", "relation": "Тревожная гиперопека", "influence": "Фоновая неуверенность в телесных ресурсах"},
                {"entity": "Метро (Кольцевая линия)", "relation": "Локация первичного криза", "influence": "Сформированный условный рефлекс"}
            ],
            longitudinal_summary="Динамика положительная. Клиентка осознала деструктивную функцию охранительного поведения. Намечен переход к интероцептивной экспозиции по протоколу Кларка.",
            version=1,
        )
        db.add(dossier1)

        # Dossier for Client 2
        dossier2 = ClientDossier(
            id="dossier-02",
            client_id=client2.id,
            case_formulation={
                "predisposing_factors": "Схема жестких стандартов и схема дефективности.",
                "precipitating_factors": "Повышение до тимлида с возросшей ответственностью.",
                "perpetuating_factors": "Гиперкомпенсация в виде 14-часового рабочего дня.",
                "protective_factors": "Профессиональная компетентность, рефлексия."
            },
            therapeutic_goals=[
                {"goal": "Снижение синдрома самозванца", "status": "active", "progress": 30},
                {"goal": "Установление границ рабочего дня", "status": "active", "progress": 20},
            ],
            psychological_patterns=[
                {"pattern": "Перфекционизм (страх ошибки)", "frequency": "ежедневно", "impact": "выгорание"}
            ],
            homework_tracker=[],
            timeline_and_entities=[],
            longitudinal_summary="Работа с режимом Требовательного Критика в рамках схема-терапии.",
            version=1,
        )
        db.add(dossier2)

        # Create Session 1 for Client 1
        session1 = ConsultationSession(
            id="session-01",
            client_id=client1.id,
            specialist_id=specialist.id,
            session_number=1,
            title="Сессия #1: Концептуализация паники и охранительного поведения",
            status=SessionStatus.COMPLETED,
            duration_seconds=115.0,
            channel_count=2,
        )
        db.add(session1)
        await db.flush()

        # Add notes
        notes = [
            SessionNote(session_id=session1.id, timestamp_seconds=12.0, content="Клиентка описывает приступ в метро в среду. Выраженная телесная фиксация.", category="observation"),
            SessionNote(session_id=session1.id, timestamp_seconds=42.0, content="Маркер охранительного поведения: носит с собой воду. Важно разобрать функцию.", category="intervention"),
            SessionNote(session_id=session1.id, timestamp_seconds=95.0, content="Д/З: дневник СМЭР + поведенческий эксперимент по протоколу Кларка.", category="homework"),
        ]
        db.add_all(notes)

        # Add utterances
        from app.services.stt_service import STTService
        utterances_data = await STTService.transcribe("demo.wav", channel_count=2)
        for u in utterances_data:
            db.add(TranscriptUtterance(
                session_id=session1.id,
                speaker=u["speaker"],
                start_time=u["start_time"],
                end_time=u["end_time"],
                text=u["text"],
                sentiment=u.get("sentiment"),
                tags=u.get("tags", []),
            ))

        # Add Analysis
        from app.services.gemini_service import GeminiService
        analysis_data = await GeminiService.analyze_session("demo", "demo")
        db.add(SessionAnalysis(
            session_id=session1.id,
            strengths=analysis_data.get("strengths", []),
            growth_areas=analysis_data.get("growth_areas", []),
            active_listening_score=analysis_data.get("active_listening_score", 9.0),
            therapeutic_alliance_score=analysis_data.get("therapeutic_alliance_score", 8.8),
            key_themes=analysis_data.get("key_themes", []),
            cognitive_distortions=analysis_data.get("cognitive_distortions", []),
            recommended_interventions=analysis_data.get("recommended_interventions", []),
            suggested_homework=analysis_data.get("suggested_homework", []),
            risk_assessment=analysis_data.get("risk_assessment", {}),
            executive_summary=analysis_data.get("executive_summary"),
        ))

        await db.commit()
        logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    asyncio.run(seed_database())
