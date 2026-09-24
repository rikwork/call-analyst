---
name: Call Analyst Design System
colors:
  primary: "#0F766E"         # Deep Teal (Clinical clarity, calm authority)
  primary-hover: "#115E59"   # Darker Teal for hover states
  secondary: "#0284C7"       # Ocean Blue for informative / analytical highlights
  accent: "#D97706"          # Warm Amber for growth points & attention areas
  success: "#059669"         # Emerald Green for strengths & validated insights
  danger: "#DC2626"          # Crimson Red for clinical risks & critical alerts
  neutral-bg: "#F8FAFC"      # Slate 50 clean calm canvas
  neutral-surface: "#FFFFFF" # Pure White cards & surfaces
  neutral-border: "#E2E8F0"  # Subtle borders
  text-primary: "#0F172A"    # Slate 900 high contrast readable text
  text-secondary: "#475569"  # Slate 600 explanatory text
  text-muted: "#94A3B8"      # Slate 400 timestamps & metadata
  recording-red: "#EF4444"   # Active recording pulse indicator
typography:
  headline-display:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  mono-code:
    fontFamily: "JetBrains Mono", Fira Code, monospace
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  widget-floating:
    backgroundColor: "rgba(15, 23, 42, 0.92)"
    textColor: "#F8FAFC"
    rounded: "{rounded.lg}"
    padding: 12px
  card-clinical:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 20px
  badge-strength:
    backgroundColor: "#ECFDF5"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  badge-growth:
    backgroundColor: "#FEF3C7"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: 4px 10px
---

# Call Analyst - Design System & UI Specification

## 1. Overview
**Call Analyst** — это профессиональное рабочее пространство для клинических психологов, коучей и супервизоров.
Дизайн сочетает медицинскую строгость, спокойствие и предельную информационную плотность без визуального шума.

- **Эмоциональный тон:** Доверие, концентрация, конфиденциальность, клиническая точность.
- **Главный цвет действия:** Deep Teal (`#0F766E`) — ассоциируется со стабильностью, вдумчивостью и заботой.
- **Цветовые маркеры анализа:**
  - 🟢 **Изумрудный (`#059669`):** Сильные стороны интервенций, соблюдение протокола, подтвержденные гипотезы.
  - 🟡 **Теплый янтарь (`#D97706`):** Зоны роста, упущенные паттерны, сопротивление, требующее внимания.
  - 🔴 **Красный пульс (`#EF4444`):** Индикатор активной записи и клинические риски.

## 2. Layout & Anatomy

### 2.1 Desktop Floating Widget (Плавающая панель записи)
- **Габариты:** 380px × 64px в свернутом виде; раскрывается до 380px × 240px при ведении заметок.
- **Свойства:** `always-on-top`, полупрозрачный темный фон (`rgba(15, 23, 42, 0.92)` с `backdrop-blur: 12px`), тонкая рамка (`1px solid rgba(255,255,255,0.1)`).
- **Элементы:**
  - Кнопка Record/Pause с мягкой пульсацией.
  - Двойной аудио-индикатор (VU-meter): отдельно Микрофон (Психолог), отдельно Система (Zoom/Telegram).
  - Поле быстрого ввода заметки: нажатие `Enter` фиксирует мысль с точным таймкодом текущей секунды записи.

### 2.2 Web Dashboard & Workspace
- **Левый сайдбар (260px):** Навигация (Клиенты, Сессии, База протоколов, Анализ истории, Админка шаблонов).
- **Центральная рабочая зона:**
  - **Синхронизированный плеер + транскрипт:** Волновой плеер, реплики спикеров с временными метками, подсветка ключевых психологических сущностей (эмоции, когниции, защитные механизмы).
  - **Панель ИИ-супервизии:** Структурированный разбор встречи по выбранной рубрике (КПТ, Схема-терапия, Sales BANT).
- **Вкладка Досье Клиента:** Дорожная карта терапии, статус целей, динамика симптоматики и кнопка генерации лонгитюдного анализа со ссылками на доказательные протоколы.

## 3. Accessibility & Principles
- Строгое соответствие WCAG AA (контраст текста не менее 4.5:1).
- Моментальный отклик интерфейса (Optimistic UI updates).
- Никаких дефолтных фиолетовых градиентов или кислотных цветов.
