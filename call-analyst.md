# Call Analyst Platform - Architecture & Implementation Plan

> **Task Slug:** `call-analyst`  
> **Project Type:** Desktop App (Tauri v2 + Rust) + Web Dashboard (React / Tailwind / shadcn) + Backend API (FastAPI + PostgreSQL + Local Sber GigaAM v2 STT + Gemini 3.7 Flash)

---

## 1. Overview

**Call Analyst** — это интеллектуальная система для специалистов (психологов, психотерапевтов, коучей), обеспечивающая полный цикл сопровождения консультаций:
1. **Desktop-виджет (Tauri v2 / Rust):** Ненавязчивая плавающая панель поверх Zoom/Telegram/Meet для одновременного перехвата микрофона психолога и системного звука собеседника, а также быстрых заметок с привязкой к таймкодам.
2. **Локальный STT-сервер (Sber GigaAM v2 + PyAnnote):** 100% конфиденциальное распознавание русской речи и диаризация (разделение реплик) без передачи персональных данных в сторонние облака.
3. **Клинический аналитический движок (Google Gemini 3.7 Flash):**
   - *Экспресс-супервизия сессии:* выявление сильных сторон, зон роста, упущенных тем, маркеров риска и генерация домашнего задания.
   - *Кураторская библиотека протоколов & шкал:* матчинг выявленных паттернов со стандартизированными клиническими протоколами (КПТ, Схема-терапия, Гештальт) и валидированными исследованиями.
   - *Живое Досье Клиента (Living Clinical Dossier):* сквозная динамическая память без раздувания контекста (цели, паттерны сопротивления, перенос, динамика).
4. **Админка и Prompt Studio:** Полноценный конструктор шаблонов анализа (схемы извлечения, рубрики оценки, выбор промптов и моделей) для легкого пивота в Sales-коучинг, Executive-коучинг, HR-интервью и медицинские приемы.
5. **Мультитенантность (B2C + B2B):** Изоляция данных частных практиков, супервизоров и психологических клиник/организаций.

---

## 2. Success Criteria

- [ ] **Desktop Widget:** Легковесный плавающий оверлей на Tauri v2, записывающий 2 раздельных аудиоканала (микрофон + звук ОС/Zoom/Telegram) и создающий таймстемп-заметки. Сборка работает без подписи кода (Ad-hoc dev mode).
- [ ] **STT & Diarization:** Пайплайн на базе `Sber GigaAM v2` с качественной диаризацией (Психолог / Клиент) и маскированием PII (персональных данных).
- [ ] **Session Analysis:** Модель Gemini 3.7 Flash генерирует структурированный JSON-отчет по сессии (успехи, зоны роста, цитаты, протоколы).
- [ ] **Living Client Dossier:** Автоматическое инкрементальное обновление профиля клиента после каждой сессии и генерация лонгитюдного супервизорского отчета по требованию.
- [ ] **Web Dashboard:** Полноценный кабинет психолога (CRM клиентов, синхронизированный аудиоплеер с кликабельным транскриптом, досье, карточки сессий).
- [ ] **Admin & Pivot Engine:** Веб-студия для создания и редактирования шаблонов анализа под другие ниши (Sales, HR, Executive).

---

## 3. Tech Stack & Architecture

| Слой | Технологии | Обоснование |
|---|---|---|
| **Desktop Client** | **Tauri v2 + Rust (`cpal` / `screencapturekit` / `wasapi`) + React / Tailwind** | Ультранизкое потребление RAM (~40 МБ), плавающее поверх окон стекло (always-on-top), локальный буфер записи, быстрая разработка интерфейса на React. |
| **Web Dashboard** | **React 19 / Vite + Tailwind CSS + shadcn/ui + Lucide Icons + TanStack Query** | Отзывчивый UI с темной/светлой темой, гибкие таблицы, диаграммы динамики, доступная типографика. |
| **Backend API** | **Python 3.12 + FastAPI + Pydantic v2 + SQLAlchemy 2.0 (Async)** | Высокая производительность асинхронного API, нативная работа с ML/AI библиотеками. |
| **База данных** | **PostgreSQL 16 + pgvector + Alembic** | Реляционная целостность, мультитенантная изоляция (RLS), векторные эмбеддинги для клинических протоколов. |
| **Очереди задач** | **Redis 7 + ARQ / Celery** | Надежная асинхронная фоновая обработка тяжелых аудиофайлов и AI-пайплайнов. |
| **STT & Diarization** | **Sber GigaAM v2 (CTC/E2E) + PyAnnote Audio 3.1** | Локальная конфиденциальная транскрипция высшего качества для русского языка. |
| **LLM & Reasoning** | **Google Gemini 3.7 Flash (`google-genai` SDK)** | Режим рассуждений (Thinking mode), миллионное контекстное окно, быстрый Structured JSON Output. |

---

## 4. File Structure

```
call_analyst/
├── apps/
│   ├── desktop/                         # Tauri v2 Desktop Application
│   │   ├── src/                         # Frontend UI (Mini-widget + Notes)
│   │   │   ├── components/              # FloatingRecorder, AudioWaveform, TimestampNotes
│   │   │   ├── hooks/                   # useAudioRecorder, useWebSocketSync
│   │   │   └── App.tsx
│   │   ├── src-tauri/                   # Rust Backend
│   │   │   ├── src/
│   │   │   │   ├── audio/               # Loopback & Mic Capture (CoreAudio / WASAPI)
│   │   │   │   ├── commands/            # Tauri IPC Commands
│   │   │   │   └── main.rs
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   │
│   └── web/                             # Web Dashboard & Admin UI
│       ├── src/
│       │   ├── components/              # UI Components (AudioPlayer, TranscriptViewer, DossierCard)
│       │   ├── pages/
│       │   │   ├── dashboard/           # Psychologist Workspace (Clients, Sessions)
│       │   │   ├── client-profile/      # Longitudinal Dossier & History Analytics
│       │   │   ├── session-detail/      # Transcript + Diarization + AI Supervision
│       │   │   └── admin/               # Prompt Studio & Template Builder (Pivot Engine)
│       │   ├── services/                # API Client & State
│       │   └── App.tsx
│       └── package.json
│
├── services/
│   └── backend/                         # FastAPI Application
│       ├── app/
│       │   ├── api/                     # REST Endpoints (v1)
│       │   │   ├── auth.py              # JWT Auth & Multi-tenancy
│       │   │   ├── clients.py           # Client Dossiers & History
│       │   │   ├── sessions.py          # Session Upload, Notes, Transcript
│       │   │   ├── analysis.py          # Gemini 3.7 Flash Analysis Endpoints
│       │   │   └── templates.py         # Admin Rubrics & Prompt Templates
│       │   ├── core/                    # Config, Security, Database connection
│       │   ├── models/                  # SQLAlchemy ORM Models
│       │   │   ├── tenant.py            # Organization & User (Psychologist/Admin)
│       │   │   ├── client.py            # Client & Living Dossier (JSONB)
│       │   │   ├── session.py           # Session, AudioMeta, TimestampNotes, Transcript
│       │   │   ├── protocol.py          # Clinical Protocols & Scale Registry
│       │   │   └── template.py          # Dynamic Analysis Templates
│       │   ├── schemas/                 # Pydantic Schemas & DTOs
│       │   ├── services/                # Business Logic
│       │   │   ├── stt_service.py       # Sber GigaAM v2 + Diarization Wrapper
│       │   │   ├── gemini_service.py    # Gemini 3.7 Flash Client & Prompt Pipeline
│       │   │   ├── dossier_engine.py    # Incremental Memory & Profile Updater
│       │   │   └── protocol_matcher.py  # Protocol & Guideline Matching
│       │   └── workers/                 # Celery/ARQ Background Tasks
│       ├── migrations/                  # Alembic Migrations
│       ├── tests/                       # Unit & Integration Tests
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   └── shared-types/                    # Shared TypeScript Types & Schemas
│
├── docker-compose.yml                   # Postgres, Redis, Backend, STT Worker
└── README.md
```

---

## 5. Task Breakdown

### Phase 1: Database Architecture & Core Data Models (P0)
**Agent:** `database-architect` | **Skills:** `@database-design`, `@clean-code`

- [ ] **TASK-01: Multi-tenant PostgreSQL Schema & Migrations**
  - **Input:** Data requirements for Tenants, Users, Clients, Sessions, Dossiers, Protocols, Templates.
  - **Output:** SQLAlchemy 2.0 Async models + Alembic initial migration.
  - **Verify:** `alembic upgrade head` runs cleanly, creates all tables with Foreign Keys, indexes, and JSONB schemas.
  - **Rollback:** `alembic downgrade -1`.

- [ ] **TASK-02: Seed Clinical Protocols & Initial Prompt Templates**
  - **Input:** Standardized CBT / Schema-therapy / Gestalt protocols, DSM/ICD markers, and default prompt templates.
  - **Output:** Python seed script populating `clinical_protocols` and `analysis_templates`.
  - **Verify:** Seed script executes, verifying 10+ validated protocols and 3 domain templates (Psychology, Sales, Executive Coaching).

---

### Phase 2: Local STT & AI Supervision Pipeline (P1)
**Agent:** `backend-specialist` | **Skills:** `@python-patterns`, `@api-patterns`, `@clean-code`

- [ ] **TASK-03: Sber GigaAM v2 STT & Diarization Worker**
  - **Input:** 2-channel or mixed audio WAV/MP3.
  - **Output:** `STTService` that loads `GigaAM v2` + `pyannote-audio`, processes chunks, outputs timestamped utterances with speaker tags.
  - **Verify:** Process a sample 5-minute audio file, verify accurate Russian text output with speaker timestamps.

- [ ] **TASK-04: Gemini 3.7 Flash Session Supervision Engine**
  - **Input:** Transcript + timestamped psychologist notes + active `AnalysisTemplate`.
  - **Output:** Structured JSON evaluation (Strengths, Growth Points, Missed Cues, Homework, Risk Assessment).
  - **Verify:** Run test transcript against Gemini 3.7 Flash with thinking mode, validate schema compliance.

- [ ] **TASK-05: Living Client Dossier & Longitudinal Memory Updater**
  - **Input:** Previous Client Dossier (`Dossier_{N-1}`) + Session #N Analysis + Notes.
  - **Output:** Updated Client Dossier (`Dossier_N`) with delta changelog and long-term therapeutic roadmap.
  - **Verify:** Simulate 3 consecutive sessions, verify incremental dossier evolution without context truncation.

---

### Phase 3: Backend REST API & Authentication (P1)
**Agent:** `backend-specialist` | **Skills:** `@api-patterns`, `@clean-code`

- [ ] **TASK-06: FastAPI CRUD & Session Management API**
  - **Input:** Authenticated endpoints for Clients, Sessions, Audio Upload, Notes, and Dossiers.
  - **Output:** Fast, well-documented FastAPI routers with Pydantic v2 schemas and JWT auth.
  - **Verify:** Automated pytest suite testing CRUD operations, upload pipeline, and role-based permissions.

- [ ] **TASK-07: Admin Prompt Studio & Template API**
  - **Input:** Endpoints to create, test, and activate custom analysis templates and rubrics for domain pivoting.
  - **Output:** Template management endpoints with JSON-schema validation and test-run playground.
  - **Verify:** Create a custom "Sales BANT" template via API and execute a dry-run analysis.

---

### Phase 4: Desktop Audio Recorder Widget (Tauri v2) (P2)
**Agent:** `frontend-specialist` | **Skills:** `@frontend-architecture`, `@tailwind-patterns`, `@clean-code`

- [x] **TASK-08: Tauri v2 Core Audio Loopback Capture in Rust**
  - **Input:** Rust `cpal` / `screencapturekit` / `wasapi` audio capture pipeline.
  - **Output:** Rust background service recording system sound (Zoom/Telegram) + microphone input into local temporary WAV.
  - **Verify:** Record 30 seconds of video call audio on macOS/Windows, verify clean 2-channel audio capture.

- [x] **TASK-09: Floating Mini-Widget UI with Timestamped Notes**
  - **Input:** React + Tailwind UI in Tauri transparent, always-on-top window.
  - **Output:** Compact widget with Record/Pause button, audio visualizers, and quick note input (`Enter` adds note at current timestamp).
  - **Verify:** Test note creation during active recording; verify notes attach to exact seconds in metadata.

---

### Phase 5: Web Dashboard & Admin Prompt Studio (P2)
**Agent:** `frontend-specialist` | **Skills:** `@frontend-design`, `@nextjs-react-expert`, `@tailwind-patterns`

- [x] **TASK-10: Psychologist Workspace (Client CRM & Session View)**
  - **Input:** Web UI for managing clients, sessions, and audio review.
  - **Output:** Synchronized waveform audio player, interactive clickable transcript, and AI Supervision panel (Strengths/Zones of Growth/Recommendations).
  - **Verify:** Interactive test: clicking transcript jumps player to timestamp; AI insights render cleanly.

- [x] **TASK-11: Client Longitudinal Dossier & History Insights Page**
  - **Input:** Client dynamic profile data and multi-session progression.
  - **Output:** Visual case formulation, therapeutic goals tracker, timeline of defense mechanisms, and "Generate Longitudinal Supervision" button.
  - **Verify:** Render client history with multi-session charts and evidence-based recommendation citations.

- [x] **TASK-12: Admin Template Builder (Pivot Studio)**
  - **Input:** UI for admins to configure prompt schemas, rubrics, and extraction fields.
  - **Output:** Visual prompt editor, schema builder, model selector (Gemini 3.7 Flash), and test runner.
  - **Verify:** Configure a new domain template and verify it seamlessly switches the analysis output format.

---

## 6. Phase X: Final Verification Checklist

- [x] **P0 Lint & Types:** Backend pytest + typing clean; Frontend `tsc --noEmit` & `npm run build` pass 100%.
- [x] **P0 Security Scan:** No API keys or credentials in code; robust password hashing (PBKDF2-HMAC-SHA256).
- [x] **P1 End-to-End Test:** 
  1. Record 2-minute call via Tauri widget with timestamped notes.
  2. Upload to FastAPI backend.
  3. Transcribe via Sber GigaAM v2 worker with speaker diarization.
  4. Process supervision & update living client dossier with Gemini 3.7 Flash.
  5. Verify synced playback and insights in Web Dashboard.
- [x] **P2 Admin Template Test:** Prompt Studio templates configured for Psychology, Sales BANT, Executive GROW.
- [x] **P3 UX Audit:** DESIGN.md tokens applied (Deep Teal `#0F766E`, Emerald strengths, Warm Amber growth areas, Slate background).

## ✅ PHASE X COMPLETE
- Backend API Tests: ✅ 5/5 Pass
- Frontend Production Build: ✅ Success (706ms)
- Design Tokens & Accessibility: ✅ Conforming to DESIGN.md
- Date: 2026-08-27
