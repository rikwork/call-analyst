# Production-Ready Desktop Audio Recorder: Plan & Architecture

> **Task Slug:** `desktop-recorder`  
> **Target:** Native Standalone Desktop Application (macOS) for Call Analyst  
> **Core Objective:** Effortless, 100% reliable 2-channel audio capture (Psychologist Mic + Native Zoom/Telegram System Audio) with real-time timestamped notes and automated pipeline execution (FastAPI -> Local Sber GigaAM STT -> Gemini 3.7 Flash Analysis).

---

## 1. System Architecture & Audio Capture Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP MINI-RECORDER                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Always-On-Top Floating Widget (React + Tailwind + Native Shell)       │  │
│  │  - Live Timer & VU-Meters (Mic & System levels)                       │  │
│  │  - Instant timestamped notes on [Enter]                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│         │ (Mic Audio)                           │ (System Audio)            │
│         ▼                                       ▼                           │
│  ┌─────────────────────────┐             ┌───────────────────────────────┐  │
│  │ CoreAudio / Mic Stream  │             │ ScreenCaptureKit Audio Stream │  │
│  │ (Psychologist channel)  │             │ (Zoom / Telegram / Client)    │  │
│  └─────────────────────────┘             └───────────────────────────────┘  │
│         │                                       │                           │
│         └───────────────────┬───────────────────┘                           │
│                             ▼                                               │
│                 ┌────────────────────────┐                                  │
│                 │ 2-Channel WAV Encoder  │                                  │
│                 │ (16kHz / 16-bit Mono*2)│                                  │
│                 └────────────────────────┘                                  │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │ HTTP POST (Multipart / Chunked Binary)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND & AI ENGINES                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. /api/sessions/upload-audio (Storage & Metadata Association)        │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. Sber GigaAM v2 Worker (Local STT & Speaker Diarization)            │  │
│  │    Outputs timestamps, speaker labels ("Психолог" / "Клиент"), tags   │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 3. Gemini 3.7 Flash Engine (Longitudinal Memory & Supervision)        │  │
│  │    Active listening scores, quotes, growth areas, NICE/Lancet protocols│  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 4. Client Living Dossier Update (5P Formulation & Goal Progress)       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Decision Rationale

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Desktop Shell** | **Electron Native Shell** (with macOS ScreenCaptureKit bindings) | No Rust toolchain dependency on user machine; native support for transparent, frameless, draggable `always-on-top` floating widget; direct access to macOS system audio streams. |
| **System Loopback** | **macOS ScreenCaptureKit Audio API** | Official Apple zero-driver API for capturing audio from other running processes (Zoom, Telegram, Google Chrome). |
| **Audio Mixing** | **Web Audio API + AudioWorklet (16kHz PCM)** | Clean separation of Left (Psychologist) and Right (Client) channels into broadcast-quality 16kHz WAV format optimized for Sber GigaAM STT. |
| **Backend Ingestion** | **FastAPI Async Streaming Upload** | Handles long 50-60 minute audio files smoothly without RAM spikes; persists audio file to disk and links with session metadata. |
| **STT Engine** | **Sber GigaAM v2 Pipeline** | Local offline transcription with pyannote diarization. |
| **Analysis Engine** | **Google Gemini 3.7 Flash** | Fast structured clinical supervision and 5P formulation. |

---

## 3. Phase-by-Phase Task Breakdown

### Phase 1: Native Desktop Application Framework (`apps/desktop`)
**Agent:** `frontend-specialist` | **Skills:** `@clean-code`, `@frontend-architecture`

- [x] **TASK-D01: Setup Standalone Desktop Shell**
  - Create native Electron / standalone desktop runner in `apps/desktop`.
  - Configure frameless, transparent, `alwaysOnTop: true`, draggable mini-window with close/minimize controls.
  - Implement IPC bridge (`preload.ts`) for system audio device enumeration and file writing.

- [x] **TASK-D02: 2-Channel Audio Engine (Mic + System ScreenCaptureKit)**
  - Implement audio capture engine in `apps/desktop/src/audioEngine.ts`.
  - Capture microphone track (`navigator.mediaDevices.getUserMedia`).
  - Capture native macOS system audio loopback (`desktopCapturer` / `ScreenCaptureKit` stream).
  - Mix both tracks with real-time level metering (RMS) to power the dual VU visualizers.

---

### Phase 2: Mini-Widget UI & Interactive Note Taker
**Agent:** `frontend-specialist` | **Skills:** `@design-spec`, `@tailwind-patterns`

- [x] **TASK-D03: Floating Recorder Mini-Widget UI**
  - Implement compact widget adhering to `DESIGN.md` (Deep Teal `#0F766E`, Dark slate `#0F172A`).
  - Client selector dropdown linked to backend `/api/v1/clients`.
  - Live timer (`00:00:00`), dual VU-meters with active green/amber thresholds.
  - Fast note-taking input: pressing `Enter` creates timestamped notes (`observation`, `technique`, `emotion`, `homework`).

- [x] **TASK-D04: Session State & Offline Cache**
  - Save audio chunks and notes locally in temporary cache during recording to prevent data loss on unexpected network dropouts.

---

### Phase 3: Backend Ingestion & Audio Streaming Endpoint
**Agent:** `backend-specialist` | **Skills:** `@api-patterns`, `@python-patterns`

- [x] **TASK-D05: Multipart Audio Upload Router**
  - Implement `POST /api/v1/sessions/{session_id}/audio` in `services/backend/app/api/sessions.py`.
  - Save received `.wav` / `.webm` file in `services/backend/storage/audio/`.
  - Add streaming endpoint `GET /api/v1/sessions/{session_id}/audio` with `Range` header support for seeking in the web player.

- [x] **TASK-D06: Automated Post-Processing Orchestration**
  - Trigger async background task upon upload:
    1. STT Diarization via `STTService.transcribe()`.
    2. AI Supervision via `GeminiService.analyze_session()`.
    3. Incremental Dossier update via `DossierService.update_dossier()`.

---

### Phase 4: Local Sber GigaAM v2 & Gemini 3.7 Flash Integration
**Agent:** `backend-specialist` | **Skills:** `@clean-code`, `@testing-patterns`

- [x] **TASK-D07: Real-File Audio Processing Pipeline**
  - Connect `STTService` with real audio decoding and speaker diarization.
  - Pass diarized utterances to `GeminiService` with active prompt template.

---

## 4. Phase X: Verification & Acceptance Criteria

- [x] **Desktop Launch Test:** Launched standalone app window on `http://localhost:3055` and Electron runner.
- [x] **Audio Capture Test:** 2-channel audio capture engine verified with real-time RMS VU-meter analysis.
- [x] **Note Taker Test:** Added timestamped notes (`00:14`, `00:47`) with category tags and verified database persistence.
- [x] **Upload & Process Test:** Verified `.webm`/`.wav` upload to `/api/v1/sessions/{id}/finish`, Sber GigaAM transcription, Gemini 3.7 Flash clinical analysis, and Living Dossier update.
- [x] **Web Player Verification:** Verified audio waveform player synchronization with clickable dialogue balloons and clinical supervision dashboard.

