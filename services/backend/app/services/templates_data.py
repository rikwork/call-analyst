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
