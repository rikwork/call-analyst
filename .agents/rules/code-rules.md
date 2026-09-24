---
name: code-rules
version: 1.0.0
priority: P0
trigger: model_decision
description: Apply when writing, building, refactoring, or fixing code — project-type agent routing, the Socratic Gate, Plan Mode phases, and the final checklist/scripts. Skip for pure questions or text-only responses.
---

# Code Rules (TIER 1) - AG Kit

> Loaded when the request involves writing or modifying code.

---

## 📱 Project Type Routing

| Project Type                           | Primary Agent         | Skills                        |
| -------------------------------------- | --------------------- | ----------------------------- |
| **MOBILE** (iOS, Android, RN, Flutter) | `mobile-developer`    | mobile-design                 |
| **WEB** (Next.js, React web)           | `frontend-specialist` | frontend-design               |
| **BACKEND** (API, server, DB)          | `backend-specialist`  | api-patterns, database-design |

> 🔴 **Mobile + frontend-specialist = WRONG.** Mobile = mobile-developer ONLY.

---

## 🛑 GLOBAL SOCRATIC GATE

**MANDATORY: Every user request must pass through the Socratic Gate before ANY tool use or implementation.**

| Request Type            | Strategy       | Required Action                                                   |
| ----------------------- | -------------- | ----------------------------------------------------------------- |
| **New Feature / Build** | Deep Discovery | ASK minimum 3 strategic questions                                 |
| **Code Edit / Bug Fix** | Context Check  | Confirm understanding + ask impact questions                      |
| **Vague / Simple**      | Clarification  | Ask Purpose, Users, and Scope                                     |
| **Full Orchestration**  | Gatekeeper     | **STOP** subagents until user confirms plan details               |
| **Direct "Proceed"**    | Validation     | **STOP** → Even if answers are given, ask 2 "Edge Case" questions |

**Protocol:**

1. **Never Assume:** If even 1% is unclear, ASK.
2. **Handle Spec-heavy Requests:** When user gives a list (Answers 1, 2, 3...), do NOT skip the gate. Instead, ask about **Trade-offs** or **Edge Cases** (e.g., "LocalStorage confirmed, but should we handle data clearing or versioning?") before starting.
3. **Wait:** Do NOT invoke subagents or write code until the user clears the Gate.
4. **Reference:** Full protocol in `@[skills/brainstorming]`.

---

## 🏁 Plan Mode (5-Phase)

1. ANALYSIS → Research, questions
2. PLANNING → `{task-slug}.md`, task breakdown
3. SOLUTIONING → Architecture, design (NO CODE!)
4. IMPLEMENTATION → Code + unit/integration tests
5. QUALITY GATE & REVIEW → Automated pre-checks + 4-Stage Quality Gate (Code: Backend & Frontend ➔ QA Automation & Capture ➔ Design Sign-off) with `review_gate.py`

---

## 🛡️ Mandatory Review Quality Gate (Exit Gate)

**Trigger:** After implementation is complete or when `/review` is invoked.

> 🔴 **STRICT EXIT GATE:** No feature, refactor, or complex task can be marked complete without passing the 4-Stage Quality Gate (`python .agents/scripts/review_gate.py evaluate`).

**Execution Protocol:**
1. **Stage 1 (Pre-check):** `python .agents/scripts/review_gate.py init && python .agents/scripts/review_gate.py pre-check`
2. **Stage 2 (Code Review - Parallel):**
   - **Backend Reviewer:** API contracts, DB queries, security, error handling.
   - **Frontend Reviewer:** Component hierarchy, state, reactivity, clean props.
   - Record verdicts: `python .agents/scripts/review_gate.py record --reviewer backend ...` / `frontend`.
   - *Fail-Fast:* If code review fails, halt immediately and fix blockers before QA/Design!
3. **Stage 3 (QA Verification & Visual Capture):**
   - **QA Automation:** Run preview server, test suite, and visual capture: `python .agents/scripts/qa_capture.py`.
   - Record verdict: `python .agents/scripts/review_gate.py record --reviewer qa ...`.
   - *Fail-Fast:* If QA fails (runtime crashes, broken navigation), halt before Design review!
4. **Stage 4 (Design & Visual UX Sign-off):**
   - **Design Reviewer:** Inspect captured screenshots (`desktop_1440.png`, `mobile_375.png`) + `DESIGN.md`.
   - Record verdict: `python .agents/scripts/review_gate.py record --reviewer design ...`.
5. **Evaluate & Loop:** Run `python .agents/scripts/review_gate.py evaluate`.
   - **Exit 0 (PASSED):** `REVIEW_VERDICT.md` generated. Task complete.
   - **Exit 2 (NEED_FIXES):** `REVIEW_FIX_LIST.md` generated. Fix blockers and re-review (iteration 2 of 2).
   - **Exit 3 (CIRCUIT_BREAKER):** Max 2 iterations reached. Stop loop, present escalation to user via `ask_question`.

---

## 🏁 Final Checklist Protocol

**Trigger:** When the user says "run the final checks", "final checks", "run all the tests", or similar phrases.

| Task Stage       | Command                                            | Purpose                        |
| ---------------- | -------------------------------------------------- | ------------------------------ |
| **Review Gate**  | `python .agents/scripts/review_gate.py evaluate`   | 3-Perspective Quality Gate     |
| **Manual Audit** | `python .agents/scripts/checklist.py .`             | Priority-based project audit   |
| **Pre-Deploy**   | `python .agents/scripts/checklist.py . --url <URL>` | Full Suite + Performance + E2E |

**Priority Execution Order:**

1. **Security** → 2. **Lint** → 3. **Schema** → 4. **Tests** → 5. **UX** → 6. **Seo** → 7. **Lighthouse/E2E** → 8. **Quality Gate**

**Rules:**

- **Completion:** A task is NOT finished until `checklist.py` and `review_gate.py` return success.
- **Reporting:** If it fails, fix the **Critical** blockers first (Security/Lint).

**Available Scripts (11 total):**

| Script                     | Skill                 | When to Use            |
| -------------------------- | --------------------- | ---------------------- |
| `review_gate.py`           | code-review-checklist | Mandatory Quality Gate |
| `security_scan.py`         | vulnerability-scanner | Always on deploy       |
| `lint_runner.py`           | lint-and-validate     | Every code change      |
| `test_runner.py`           | testing-patterns      | After logic change     |
| `schema_validator.py`      | database-design       | After DB change        |
| `ux_audit.py`              | frontend-design       | After UI change        |
| `accessibility_checker.py` | frontend-design       | After UI change        |
| `seo_checker.py`           | seo-fundamentals      | After page change      |
| `mobile_audit.py`          | mobile-design         | After mobile change    |
| `lighthouse_audit.py`      | performance-profiling | Before deploy          |
| `playwright_runner.py`     | webapp-testing        | Before deploy          |

> 🔴 **Agents & Skills can invoke ANY script** via `python .agents/skills/<skill>/scripts/<script>.py` or `python .agents/scripts/<script>.py`

---
