from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.protocol import ClinicalProtocol


DEFAULT_CLINICAL_PROTOCOLS = [
    {
        "code": "CBT-PANIC-CLARK",
        "title": "Когнитивно-поведенческий протокол при паническом расстройстве (Дэвид Кларк)",
        "modality": "CBT",
        "target_symptoms": ["паника", "панические атаки", "страх смерти", "тахикардия", "охранительное поведение", "агорафобия"],
        "algorithm_steps": [
            "1. Психообразование: порочный круг паники (телесная сенсация -> катастрофическая интерпретация -> выброс адреналина -> усиление симптома).",
            "2. Выявление и инвентаризация охранительного поведения (ношение бутылки воды, валидол, поиск выходов).",
            "3. Интероцептивная экспозиция (гипервентиляция, вращение на стуле для воспроизведения симптомов в безопасной обстановке).",
            "4. Поведенческий эксперимент: отказ от охранительного поведения при входе в триггерную ситуацию."
        ],
        "contraindications": ["Некомпенсированные сердечно-сосудистые заболевания (для интероцептивной экспозиции)"],
        "evidence_base": [
            {
                "citation": "Clark, D. M., Salkovskis, P. M., Hackmann, A., et al. (1994). A comparison of cognitive therapy, applied relaxation and imipramine in the treatment of panic disorder. The British Journal of Psychiatry, 164(6), 759-769.",
                "doi": "10.1192/bjp.164.6.759",
                "summary": "Когнитивная терапия Кларка превосходит фармакотерапию имипрамином и релаксацию по долгосрочной ремиссии (до 85% ремиссии через 1 год)."
            },
            {
                "citation": "NICE Clinical Guidelines CG113: Generalised anxiety disorder and panic disorder in adults (2019 update).",
                "doi": "NICE-CG113",
                "summary": "КПТ первой линии выбора с высшим уровнем доказательности (Level 1A)."
            }
        ],
        "description": "Золотой стандарт доказательной психотерапии панических атак и агорафобии."
    },
    {
        "code": "SCHEMA-VULNERABILITY-YOUNG",
        "title": "Схема-терапия: Режим Уязвимого Ребенка и Схема Уязвимости (Джеффри Янг)",
        "modality": "Schema",
        "target_symptoms": ["уязвимость", "катастрофизация", "тревога за здоровье", "детский страх", "покинутость"],
        "algorithm_steps": [
            "1. Идентификация схемы: опросник YSQ-S3 + отслеживание телесного маркера беспомощности на сессии.",
            "2. Ограниченное родительство (Limited Reparenting): терапевт валидирует базовые неудовлетворенные потребности в безопасности.",
            "3. Рескриптинг в воображении (Imagery Rescripting): возврат в детскую травмирующую ситуацию и переписывание сценария со Взрослым Защитником.",
            "4. Укрепление режима Здорового Взрослого: диалог с Критиком на стульях."
        ],
        "contraindications": ["Острый психоз, активная химическая зависимость в стадии интоксикации"],
        "evidence_base": [
            {
                "citation": "Arntz, A., & Jacob, G. (2013). Schema Therapy in Practice: An Introductory Guide to the Schema Mode Approach. Wiley-Blackwell.",
                "doi": "10.1002/9781118512395",
                "summary": "Мета-анализы подтверждают высокую эффективность рескриптинга и схема-терапии при хронических тревожных и личностных расстройствах."
            }
        ],
        "description": "Глубинная проработка детских триггеров и эмоциональных дефицитов через рескриптинг."
    },
    {
        "code": "CBT-DEPRESSION-BECK",
        "title": "Протокол когнитивной терапии депрессии (Аарон Бек)",
        "modality": "CBT",
        "target_symptoms": ["депрессия", "апатия", "ангедония", "самобичевание", "безнадежность", "прокрастинация"],
        "algorithm_steps": [
            "1. Поведенческая активация (Activity Scheduling) с градуированием мастерства и удовольствия (Mastery & Pleasure 1..10).",
            "2. Ведение дневника автоматических мыслей (СМЭР: Ситуация -> Мысль -> Эмоция -> Реакция).",
            "3. Сократический диалог и когнитивное диспутирование (техники 'Каковы доказательства ЗА и ПРОТИВ?', 'Что самое худшее может случиться?').",
            "4. Выявление глубинных убеждений (Core Beliefs) техникой 'Падающей стрелы' (Down Arrow Technique)."
        ],
        "contraindications": ["Высокий непосредственный суицидальный риск без фармакологической поддержки и госпитализации"],
        "evidence_base": [
            {
                "citation": "Beck, A. T., Rush, A. J., Shaw, B. F., & Emery, G. (1979). Cognitive Therapy of Depression. Guilford Press.",
                "doi": "10.1002/9781118512395",
                "summary": "Классический рандомизированный протокол с подтвержденным снижением рецидивов депрессии."
            },
            {
                "citation": "Cuijpers, P., et al. (2020). The effects of psychotherapies for adult depression: Comprehensive meta-analyses. World Psychiatry, 19(1), 92-107.",
                "doi": "10.1002/wps.20701",
                "summary": "КПТ демонстрирует эквивалентную антидепрессантам эффективность на этапе лечения и превосходящую при предотвращении рецидивов."
            }
        ],
        "description": "Базовый протокол преодоления депрессивных состояний и когнитивной триады Бека."
    },
    {
        "code": "GESTALT-EMPTY-CHAIR",
        "title": "Гештальт-эксперимент: Техника двух стульев при незавершенных ситуациях (Фриц Перлз, Лесли Гринберг)",
        "modality": "Gestalt",
        "target_symptoms": ["чувство вины", "невыраженный гнев", "обида на родителей", "внутренний конфликт", "незавершенный гештальт"],
        "algorithm_steps": [
            "1. Фокусировка на феноменологии: осознавание телесных зажимов и прерывания контакта (ретрофлексия/интроекция).",
            "2. Размещение значимой фигуры на пустом стуле перед клиентом.",
            "3. Прямое выражение подавленного аффекта от первого лица в настоящем времени ('Я злюсь на тебя за то, что...').",
            "4. Пересаживание на противоположный стул (идентификация с интроектом) и последующая интеграция."
        ],
        "contraindications": ["Слабая эго-структура, риск диссоциации без заземления"],
        "evidence_base": [
            {
                "citation": "Greenberg, L. S., & Malcolm, W. (2002). Resolving unfinished business: Relating process to outcome. Journal of Consulting and Clinical Psychology, 70(2), 406-416.",
                "doi": "10.1037/0022-006X.70.2.406",
                "summary": "Эмоционально-фокусированная работа с двумя стульями приводит к статистически значимому снижению симптоматики незавершенного горя и обиды."
            }
        ],
        "description": "Эмоционально-экспрессивная интервенция для завершения эмоционального груза прошлого."
    }
]


class ProtocolService:
    @staticmethod
    async def match_protocols(db: AsyncSession, text_query: str, modality: Optional[str] = None) -> List[Dict[str, Any]]:
        """Finds matching clinical protocols based on keywords and modality."""
        stmt = select(ClinicalProtocol)
        if modality:
            stmt = stmt.where(ClinicalProtocol.modality == modality)
        
        result = await db.execute(stmt)
        protocols = result.scalars().all()
        
        if not protocols:
            # Fallback to defaults
            matched = []
            lower_query = text_query.lower()
            for p in DEFAULT_CLINICAL_PROTOCOLS:
                score = 0
                if modality and p["modality"].lower() == modality.lower():
                    score += 2
                for s in p["target_symptoms"]:
                    if s.lower() in lower_query:
                        score += 3
                if score > 0 or not matched:
                    matched.append({"protocol": p, "relevance_score": score})
            matched.sort(key=lambda x: x["relevance_score"], reverse=True)
            return [m["protocol"] for m in matched[:3]]
        
        matched_protocols = []
        lower_query = text_query.lower()
        for p in protocols:
            score = 0
            for s in (p.target_symptoms or []):
                if s.lower() in lower_query:
                    score += 3
            if score > 0:
                matched_protocols.append({
                    "id": p.id,
                    "code": p.code,
                    "title": p.title,
                    "modality": p.modality,
                    "target_symptoms": p.target_symptoms,
                    "algorithm_steps": p.algorithm_steps,
                    "evidence_base": p.evidence_base,
                    "relevance_score": score
                })
        
        matched_protocols.sort(key=lambda x: x["relevance_score"], reverse=True)
        return matched_protocols[:3]
