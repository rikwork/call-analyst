# Call Analyst Platform 🎙️🧠

> **Интеллектуальная система записи, транскрибации и клинического ИИ-анализа консультаций**  
> Спроектировано для психологов, психотерапевтов и коучей с возможностью мгновенного пивота в Sales, HR и медицину.

---

## 🌟 Ключевые возможности

1. **Запись звонков без ботов (Zoom, Telegram, Meet):**
   - 2-канальный аудиозахват (Микрофон специалиста + Звук системы/собеседника).
   - Плавающий виджет поверх окон с быстрыми заметками по кнопке `Enter` с точной фиксацией секунд.
2. **Локальный STT высшего качества (Sber GigaAM v2 + Diarization):**
   - 100% приватность и врачебная тайна (голос не отправляется во внешние облака).
   - Точное распознавание русской спонтанной речи и разделение спикеров.
3. **Клинический ИИ-анализ на базе Google Gemini 3.7 Flash:**
   - **Экспресс-супервизия сессии:** оценка терапевтического альянса (1..10), сильные стороны с цитатами, зоны роста, упущенные маркеры, когнитивные искажения и готовое ДЗ.
   - **Кураторская библиотека доказательных протоколов:** сопоставление паттернов с валидированными алгоритмами (КПТ Кларка, Схема-терапия Янга, Депрессия Бека, Гештальт) и ссылками на исследования (Lancet, NICE Guidelines, APA).
   - **Живое Досье Клиента (Living Clinical Dossier):** динамическая память (5P Case Formulation) с самообновлением после каждой сессии и кнопкой генерации лонгитюдного отчета по всей истории.
4. **Админка и Prompt Studio (Pivot Engine):**
   - Конструктор шаблонов анализа, системных промптов и рубрик оценки для работы с отделами продаж (BANT/SPIN), Executive-коучингом (GROW) и первичными медицинскими приемами (SOAP).

---

## 🏗️ Архитектура проекта

```
call_analyst/
├── apps/
│   ├── web/                     # Web Dashboard & Psychologist Workspace (React + Vite + Tailwind)
│   └── desktop/                 # Desktop Mini-Recorder (Tauri v2 + Rust Loopback Audio)
├── services/
│   └── backend/                 # FastAPI REST API, SQLAlchemy 2.0, GigaAM STT & Gemini 3.7 Engine
│       ├── app/
│       │   ├── api/             # Routers: auth, clients, sessions, protocols, templates
│       │   ├── models/          # SQLAlchemy ORM Models (RLS Multi-tenancy)
│       │   ├── schemas/         # Pydantic v2 DTOs
│       │   └── services/        # STTService, GeminiService, DossierService, ProtocolService
│       └── tests/               # Pytest async test suite (100% pass)
└── DESIGN.md                    # Single Source of Truth для дизайн-токенов
```

---

## 🚀 Быстрый запуск

### 1. Запуск Backend API

```bash
# Активация виртуального окружения
source .venv/bin/activate

# Запуск сервера FastAPI с авто-сидингом базы данных
PYTHONPATH=services/backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- Swagger API Документация: `http://127.0.0.1:8000/docs`
- Healthcheck: `http://127.0.0.1:8000/health`

### 2. Запуск Web Dashboard (Веб-кабинет)

```bash
cd apps/web
npm run dev
```

- Откройте браузер по адресу: `http://localhost:3050`

### 3. Запуск Standalone Desktop Mini-Recorder (Нативный плавающий виджет)

```bash
cd apps/desktop
npm run electron:dev
# или в веб-режиме:
npm run dev
```

- Виджет запускается в плавающем окне `always-on-top`, ведет 2-канальную запись звука (микрофон + loopback Zoom/Telegram) и отправляет данные в бэкенд на анализ.

---

## 🧪 Запуск автоматических тестов

```bash
source .venv/bin/activate
PYTHONPATH=services/backend pytest services/backend/tests -v
```

Все 6 комплексных интеграционных тестов (Health, Protocols, Templates, Living Dossiers, Full Session Finish Lifecycle, Real Audio Upload & HTTP Range Streaming) проходят успешно (100% pass).

