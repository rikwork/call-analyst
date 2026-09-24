#!/usr/bin/env python3
"""Review Gatekeeper: Deterministic multi-perspective review state controller.

Manages review state, enforces pre-checks, tracks Backend, Frontend, and Design
reviewer verdicts, and implements the 2-iteration circuit breaker to prevent infinite loops.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

# Return codes for gatekeeper
EXIT_PASSED = 0
EXIT_PRECHECK_FAILED = 1
EXIT_NEED_FIXES = 2
EXIT_CIRCUIT_BREAKER = 3
EXIT_INCOMPLETE = 4
EXIT_ERROR = 5

REVIEWERS = ("backend", "frontend", "qa", "design")
STAGE_CODE = ("backend", "frontend")
STAGE_QA = ("qa",)
STAGE_DESIGN = ("design",)
STATE_FILENAME = ".review_state.json"


class Color:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty() and "NO_COLOR" not in os.environ
        self.bold = "\033[1m" if enabled else ""
        self.cyan = "\033[96m" if enabled else ""
        self.green = "\033[92m" if enabled else ""
        self.yellow = "\033[93m" if enabled else ""
        self.red = "\033[91m" if enabled else ""
        self.magenta = "\033[95m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""

    def info(self, msg: str) -> None:
        print(f"{self.cyan}ℹ {msg}{self.reset}")

    def success(self, msg: str) -> None:
        print(f"{self.green}✔ {msg}{self.reset}")

    def warn(self, msg: str) -> None:
        print(f"{self.yellow}⚠ {msg}{self.reset}")

    def error(self, msg: str) -> None:
        print(f"{self.red}✖ {msg}{self.reset}")

    def header(self, title: str) -> None:
        line = "=" * 64
        print(f"\n{self.bold}{self.magenta}{line}\n{title.center(64)}\n{line}{self.reset}\n")


C = Color()


def locate_toolkit_root(project: Path) -> Path:
    """Find the toolkit root (.agents or embedded)."""
    for candidate in (project / ".agents", project / ".agent"):
        if candidate.is_dir() and (candidate / "scripts").is_dir():
            return candidate
    caller_root = Path(__file__).resolve().parents[1]
    if (caller_root / "scripts").is_dir():
        return caller_root
    return project


def get_state_path(project: Path) -> Path:
    target_agents = project / ".agents"
    if target_agents.is_dir():
        return target_agents / STATE_FILENAME
    target_agent = project / ".agent"
    if target_agent.is_dir():
        return target_agent / STATE_FILENAME
    return project / STATE_FILENAME


def get_current_git_branch(project: Path) -> str:
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=project,
            capture_output=True,
            text=True,
            check=True,
        )
        return res.stdout.strip() or "main"
    except Exception:
        return "current-task"


def default_state(task_id: str, max_iterations: int = 2) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "version": "1.0.0",
        "task_id": task_id,
        "iteration": 1,
        "max_iterations": max_iterations,
        "status": "IN_REVIEW",
        "created_at": now,
        "updated_at": now,
        "pre_checks": {
            "status": "PENDING",
            "passed": False,
            "results": [],
        },
        "verdicts": {
            r: {
                "verdict": "PENDING",
                "summary": "",
                "blockers": [],
                "suggestions": [],
                "timestamp": None,
            }
            for r in REVIEWERS
        },
        "history": [],
    }


def load_state(project: Path) -> Optional[Dict[str, Any]]:
    path = get_state_path(project)
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        C.error(f"Failed to read state file at {path}: {e}")
        return None


def save_state(project: Path, state: Dict[str, Any]) -> None:
    path = get_state_path(project)
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


# --- Commands ---


def cmd_init(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state_path = get_state_path(project)
    if state_path.is_file() and not args.force:
        C.warn(f"Review session already exists for this project at {state_path}.")
        C.info("Use --force to overwrite or run 'status' to inspect.")
        return 0

    task_id = args.task_id or get_current_git_branch(project)
    state = default_state(task_id, max_iterations=args.max_iterations)
    save_state(project, state)

    C.header("REVIEW GATE INITIALIZED")
    C.success(f"Task ID: {task_id}")
    C.info(f"Iteration: 1 / {args.max_iterations}")
    C.info(f"Target Reviewers: {', '.join(REVIEWERS)}")
    C.info(f"State saved to: {state_path}")
    return 0


def cmd_pre_check(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state = load_state(project)
    if not state:
        C.error(f"No active review state found. Run 'init' first.")
        return EXIT_ERROR

    toolkit = locate_toolkit_root(project)
    C.header(f"RUNNING PRE-CHECKS (Iteration {state['iteration']})")

    check_specs = [
        ("Security Scan", toolkit / "skills/vulnerability-scanner/scripts/security_scan.py", ["--output", "summary", "--fail-on", "high"]),
        ("Lint Check", toolkit / "skills/lint-and-validate/scripts/lint_runner.py", []),
    ]

    all_passed = True
    results = []

    for name, script_path, extra_args in check_specs:
        if not script_path.is_file():
            C.info(f"[SKIP] {name}: Script not found ({script_path.name})")
            results.append({"name": name, "status": "SKIPPED", "reason": "script not found"})
            continue

        cmd = [sys.executable, str(script_path), str(project)] + extra_args
        try:
            proc = subprocess.run(cmd, cwd=project, capture_output=True, text=True, timeout=120)
            if proc.returncode == 0:
                C.success(f"{name}: PASSED")
                results.append({"name": name, "status": "PASSED"})
            else:
                C.error(f"{name}: FAILED (exit code {proc.returncode})")
                if proc.stdout.strip():
                    print(proc.stdout.strip()[:400])
                if proc.stderr.strip():
                    print(proc.stderr.strip()[:400])
                results.append({"name": name, "status": "FAILED", "code": proc.returncode})
                all_passed = False
        except Exception as exc:
            C.error(f"{name}: ERROR ({exc})")
            results.append({"name": name, "status": "ERROR", "reason": str(exc)})
            all_passed = False

    state["pre_checks"] = {
        "status": "PASSED" if all_passed else "FAILED",
        "passed": all_passed,
        "results": results,
    }
    save_state(project, state)

    if not all_passed:
        C.error("Pre-checks failed. Fix automated issues before proceeding to LLM reviewers.")
        return EXIT_PRECHECK_FAILED

    C.success("All automated pre-checks passed! Ready for Subagent Reviews.")
    return EXIT_PASSED


def cmd_record(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state = load_state(project)
    if not state:
        C.error("No active review state found. Run 'init' first.")
        return EXIT_ERROR

    reviewer = args.reviewer.lower()
    if reviewer not in REVIEWERS:
        C.error(f"Unknown reviewer '{reviewer}'. Must be one of: {', '.join(REVIEWERS)}")
        return EXIT_ERROR

    verdict = args.verdict.upper()
    if verdict not in ("APPROVED", "CHANGES_REQUESTED"):
        C.error("Verdict must be either 'APPROVED' or 'CHANGES_REQUESTED'")
        return EXIT_ERROR

    blockers = args.blocker or []
    suggestions = args.suggestion or []

    if verdict == "CHANGES_REQUESTED" and not blockers:
        C.warn("CHANGES_REQUESTED recorded without specific blockers. Consider providing at least one blocker.")

    state["verdicts"][reviewer] = {
        "verdict": verdict,
        "summary": args.summary,
        "blockers": blockers,
        "suggestions": suggestions,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    save_state(project, state)

    icon = "✔" if verdict == "APPROVED" else "❌"
    color_fn = C.success if verdict == "APPROVED" else C.warn
    color_fn(f"{icon} Recorded {reviewer.upper()} verdict: {verdict}")
    if blockers:
        for b in blockers:
            print(f"   🔴 Blocker: {b}")
    if suggestions:
        for s in suggestions:
            print(f"   💡 Nit: {s}")

    return EXIT_PASSED


def _handle_rejection(
    project: Path,
    state: Dict[str, Any],
    rejected_stage_name: str,
    blockers: List[str],
    current_iter: int,
    max_iter: int,
) -> int:
    """Helper to process changes requested or circuit breaker."""
    if current_iter >= max_iter:
        state["status"] = "CIRCUIT_BREAKER"
        state["history"].append({
            "iteration": current_iter,
            "verdicts": state["verdicts"],
        })
        save_state(project, state)

        escalation_path = project / "REVIEW_ESCALATION.md"
        _write_escalation_report(escalation_path, state)

        C.header("⚠️ CIRCUIT BREAKER TRIGGERED ⚠️")
        C.error(f"Maximum review iterations ({max_iter}) reached without approval at {rejected_stage_name}.")
        C.warn(f"Remaining blockers: {len(blockers)}")
        for b in blockers:
            print(f"   {b}")
        C.info(f"Escalation report generated: {escalation_path}")
        C.info("STOP: Escalate to human user via Socratic decision prompt (ask_question).")
        return EXIT_CIRCUIT_BREAKER

    # Iteration limit not exceeded -> Loop to next iteration
    state["history"].append({
        "iteration": current_iter,
        "verdicts": state["verdicts"],
    })
    state["iteration"] += 1
    state["status"] = "NEED_FIXES"
    # Reset verdicts for the next iteration
    for r in REVIEWERS:
        state["verdicts"][r] = {
            "verdict": "PENDING",
            "summary": "",
            "blockers": [],
            "suggestions": [],
            "timestamp": None,
        }
    save_state(project, state)

    fix_list_path = project / "REVIEW_FIX_LIST.md"
    _write_fix_list(fix_list_path, state, current_iter, blockers)

    C.warn(f"❌ Review iteration {current_iter} rejected at {rejected_stage_name} with {len(blockers)} blocker(s).")
    C.info(f"Fix list written to: {fix_list_path}")
    C.info(f"Advancing to Iteration {state['iteration']} of {max_iter} after fixes are applied.")
    return EXIT_NEED_FIXES


def cmd_evaluate(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state = load_state(project)
    if not state:
        C.error("No active review state found. Run 'init' first.")
        return EXIT_ERROR

    current_iter = state["iteration"]
    max_iter = state["max_iterations"]
    C.header(f"EVALUATING QUALITY GATE (Iteration {current_iter}/{max_iter})")

    # --- STAGE 2: Code Review (Backend & Frontend) ---
    stage_code_rejections = [
        r for r in STAGE_CODE if state["verdicts"].get(r, {}).get("verdict") == "CHANGES_REQUESTED"
    ]
    if stage_code_rejections:
        blockers = []
        for r in stage_code_rejections:
            for b in state["verdicts"][r].get("blockers", []):
                blockers.append(f"[{r.upper()}] {b}")
        return _handle_rejection(
            project, state, "Stage 2: Code Review (Backend/Frontend)", blockers, current_iter, max_iter
        )

    stage_code_pending = [
        r for r in STAGE_CODE if state["verdicts"].get(r, {}).get("verdict") == "PENDING"
    ]
    if stage_code_pending:
        C.warn(f"Stage 2 (Code Review) incomplete! Awaiting verdicts from: {', '.join(stage_code_pending).upper()}")
        return EXIT_INCOMPLETE

    # Stage 2 Passed!
    C.success("✔ Stage 2 (Code Review) PASSED! Backend & Frontend approved.")

    # --- STAGE 3: QA Verification & Visual Capture ---
    qa_verdict = state["verdicts"].get("qa", {}).get("verdict", "PENDING")
    if qa_verdict == "CHANGES_REQUESTED":
        blockers = [f"[QA] {b}" for b in state["verdicts"]["qa"].get("blockers", [])]
        return _handle_rejection(
            project, state, "Stage 3: QA Verification", blockers, current_iter, max_iter
        )
    elif qa_verdict == "PENDING":
        C.warn("⏳ Stage 3 (QA Verification) PENDING. Run QA testing and visual capture before Design review.")
        return EXIT_INCOMPLETE

    # Stage 3 Passed!
    C.success("✔ Stage 3 (QA Verification) PASSED! Runtime and screenshots confirmed.")

    # --- STAGE 4: Design & Visual UX Review ---
    design_verdict = state["verdicts"].get("design", {}).get("verdict", "PENDING")
    if design_verdict == "CHANGES_REQUESTED":
        blockers = [f"[DESIGN] {b}" for b in state["verdicts"]["design"].get("blockers", [])]
        return _handle_rejection(
            project, state, "Stage 4: Design Review", blockers, current_iter, max_iter
        )
    elif design_verdict == "PENDING":
        C.warn("⏳ Stage 4 (Design Review) PENDING. Awaiting Design Reviewer visual evaluation.")
        return EXIT_INCOMPLETE

    # All Approved!
    state["status"] = "PASSED"
    save_state(project, state)

    # Generate REVIEW_VERDICT.md
    report_path = project / "REVIEW_VERDICT.md"
    _write_verdict_report(report_path, state)

    C.success(f"🎉 QUALITY GATE PASSED! All 4 stages & reviewers ({', '.join(REVIEWERS)}) approved the changes.")
    C.info(f"Final report generated: {report_path}")
    return EXIT_PASSED


def cmd_status(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state = load_state(project)
    if not state:
        C.info("No review state file found.")
        return 0

    if getattr(args, "json", False):
        print(json.dumps(state, indent=2, ensure_ascii=False))
        return 0

    C.header(f"REVIEW GATE STATUS: {state['status']}")
    print(f"Task ID:          {state['task_id']}")
    print(f"Iteration:        {state['iteration']} / {state['max_iterations']}")
    print(f"Pre-checks:       {state['pre_checks']['status']}")
    print("-" * 64)

    def _render_role(role: str) -> None:
        v = state["verdicts"].get(role, {})
        verdict = v.get("verdict", "PENDING")
        icon = "✔" if verdict == "APPROVED" else ("❌" if verdict == "CHANGES_REQUESTED" else "⏳")
        blocker_count = len(v.get("blockers", []))
        summary = v.get("summary", "")
        summary_snippet = f" - {summary[:40]}..." if summary else ""
        print(f"  {icon} {role.upper():<10}: {verdict:<18} (Blockers: {blocker_count}){summary_snippet}")

    print("Stage 2: Code Review (Backend & Frontend)")
    for r in STAGE_CODE:
        _render_role(r)

    print("\nStage 3: QA Verification & Visual Capture")
    for r in STAGE_QA:
        _render_role(r)

    print("\nStage 4: Design & Visual UX Review")
    for r in STAGE_DESIGN:
        _render_role(r)

    print("-" * 64)
    if state["history"]:
        print(f"Previous Iterations Completed: {len(state['history'])}")
    return 0


def cmd_reset(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    state_path = get_state_path(project)
    removed = []
    if state_path.is_file():
        state_path.unlink()
        removed.append(str(state_path.name))
    for f in ("REVIEW_FIX_LIST.md", "REVIEW_VERDICT.md", "REVIEW_ESCALATION.md"):
        target = project / f
        if target.is_file():
            target.unlink()
            removed.append(f)
    if removed:
        C.success(f"Reset review gate. Cleaned: {', '.join(removed)}")
    else:
        C.info("Review gate was already clean.")
    return 0


# --- Report Writers ---


def _format_reviewer(role: str) -> str:
    return "QA Automation" if role == "qa" else role.capitalize()


def _write_verdict_report(path: Path, state: Dict[str, Any]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        "# ✅ Review Quality Gate: PASSED",
        f"**Task:** `{state['task_id']}`  ",
        f"**Date:** {now}  ",
        f"**Iterations Required:** {state['iteration']} of {state['max_iterations']}  ",
        "",
        "## Reviewer Verdicts",
        "| Reviewer | Verdict | Summary |",
        "|----------|---------|---------|",
    ]
    for r in REVIEWERS:
        v = state["verdicts"][r]
        lines.append(f"| **{_format_reviewer(r)}** | ✅ APPROVED | {v.get('summary', 'Approved')} |")

    lines.extend([
        "",
        "## Suggestions & Nits (Non-blocking)",
    ])
    has_suggestions = False
    for r in REVIEWERS:
        sugs = state["verdicts"][r].get("suggestions", [])
        if sugs:
            has_suggestions = True
            lines.append(f"### {_format_reviewer(r)}")
            for s in sugs:
                lines.append(f"- {s}")
    if not has_suggestions:
        lines.append("*None. Clean approval!*")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_fix_list(path: Path, state: Dict[str, Any], iter_num: int, blockers: List[str]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    last_verdicts = state["history"][-1]["verdicts"]
    lines = [
        f"# 🛠 Review Fix List (Iteration {iter_num})",
        f"**Task:** `{state['task_id']}`  ",
        f"**Date:** {now}  ",
        f"**Next Iteration:** {state['iteration']} of {state['max_iterations']}  ",
        "",
        "> ⚠️ **Action Required:** Implement the fixes below before requesting re-review.",
        "",
        "## Blocker Summary",
    ]
    for b in blockers:
        lines.append(f"- [ ] {b}")

    lines.append("\n## Detailed Reviewer Feedback")
    for r in REVIEWERS:
        v = last_verdicts.get(r, {})
        status_icon = "✅" if v.get("verdict") == "APPROVED" else ("❌" if v.get("verdict") == "CHANGES_REQUESTED" else "⏳")
        lines.append(f"\n### {status_icon} {_format_reviewer(r)} Reviewer ({v.get('verdict', 'PENDING')})")
        if v.get("summary"):
            lines.append(f"**Summary:** {v['summary']}")
        b_list = v.get("blockers", [])
        if b_list:
            lines.append("**Blockers:**")
            for item in b_list:
                lines.append(f"- {item}")
        s_list = v.get("suggestions", [])
        if s_list:
            lines.append("**Suggestions:**")
            for item in s_list:
                lines.append(f"- {item}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_escalation_report(path: Path, state: Dict[str, Any]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        "# ⚠️ Review Escalation (Circuit Breaker Triggered)",
        f"**Task:** `{state['task_id']}`  ",
        f"**Date:** {now}  ",
        f"**Iterations Spent:** {state['max_iterations']} (Limit reached)  ",
        "",
        "## Unresolved Blockers",
    ]
    last_verdicts = state["verdicts"]
    for r in REVIEWERS:
        v = last_verdicts.get(r, {})
        if v.get("verdict") == "CHANGES_REQUESTED":
            lines.append(f"### {_format_reviewer(r)} Reviewer")
            for b in v.get("blockers", []):
                lines.append(f"- 🔴 {b}")
            if v.get("summary"):
                lines.append(f"*Note:* {v['summary']}")

    lines.extend([
        "",
        "## Next Steps for User",
        "The automated 2-iteration loop was stopped to prevent infinite churn.",
        "Please choose one of the following:",
        "1. **Override & Accept:** Accept the current state as-is if blockers are acceptable trade-offs.",
        "2. **Manual Guidance:** Provide explicit direction to the agents for a 3rd manual attempt.",
        "3. **Revert Changes:** Abandon changes that violate architectural or design constraints.",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# --- Main CLI ---


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic Quality Gatekeeper for Multi-Perspective Reviews")
    parser.add_argument("--project", default=".", help="Project path (default: current directory)")

    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    p_init = subparsers.add_parser("init", help="Initialize review session")
    p_init.add_argument("--task-id", help="Task or feature identifier")
    p_init.add_argument("--max-iterations", type=int, default=2, help="Max iterations before circuit breaker (default: 2)")
    p_init.add_argument("--force", action="store_true", help="Overwrite existing session")

    # pre-check
    subparsers.add_parser("pre-check", help="Run automated linters/security checks before reviews")

    # record
    p_record = subparsers.add_parser("record", help="Record a reviewer's verdict")
    p_record.add_argument("--reviewer", required=True, choices=["backend", "frontend", "qa", "design"], help="Reviewer role")
    p_record.add_argument("--verdict", required=True, choices=["APPROVED", "CHANGES_REQUESTED"], help="Verdict")
    p_record.add_argument("--summary", required=True, help="Reviewer summary")
    p_record.add_argument("--blocker", action="append", help="Critical blocking issue (can be specified multiple times)")
    p_record.add_argument("--suggestion", action="append", help="Non-blocking suggestion/nit")

    # evaluate
    subparsers.add_parser("evaluate", help="Evaluate all verdicts and trigger next iteration or circuit breaker")

    # status
    p_status = subparsers.add_parser("status", help="Show current gatekeeper status")
    p_status.add_argument("--json", action="store_true", help="Output state as JSON")

    # reset
    subparsers.add_parser("reset", help="Reset review gate and remove temporary state")

    args = parser.parse_args()

    dispatch = {
        "init": cmd_init,
        "pre-check": cmd_pre_check,
        "record": cmd_record,
        "evaluate": cmd_evaluate,
        "status": cmd_status,
        "reset": cmd_reset,
    }

    return dispatch[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
