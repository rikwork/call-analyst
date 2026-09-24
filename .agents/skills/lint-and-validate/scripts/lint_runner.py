#!/usr/bin/env python3
"""
Lint Runner - Monorepo-aware unified linting and type checking.
Detects project structure (single project or monorepo with multiple apps/services)
and runs appropriate linters for each module.

Usage:
    python lint_runner.py <project_path>

Supports:
    - Node.js / TypeScript: npm run lint, npx eslint ., npx tsc --noEmit
    - Python: ruff check ., mypy ., python -m compileall (syntax fallback)
"""
from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Console color helper
class Color:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty() and "NO_COLOR" not in os.environ
        self.bold = "\033[1m" if enabled else ""
        self.cyan = "\033[96m" if enabled else ""
        self.green = "\033[92m" if enabled else ""
        self.yellow = "\033[93m" if enabled else ""
        self.red = "\033[91m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""

    def info(self, msg: str) -> None:
        print(f"{self.cyan}ℹ {msg}{self.reset}")

    def pass_msg(self, msg: str) -> None:
        print(f"{self.green}[PASS] {msg}{self.reset}")

    def fail_msg(self, msg: str) -> None:
        print(f"{self.red}[FAIL] {msg}{self.reset}")

    def warn(self, msg: str) -> None:
        print(f"{self.yellow}[WARN] {msg}{self.reset}")


C = Color()

IGNORED_DIRS = {
    "node_modules",
    ".git",
    ".venv",
    "venv",
    ".agents",
    ".agent",
    "dist",
    "build",
    ".pytest_cache",
    ".next",
    "target",
    "storage",
    "__pycache__",
    ".ag-kit-backups",
    ".agents-boosted-backup",
    ".tauri",
}


def find_python_interpreter(module_path: Path, root_path: Path) -> Path:
    """Find the best Python executable (local .venv, root .venv, or sys.executable)."""
    is_win = platform.system() == "Windows"
    bin_name = "Scripts" if is_win else "bin"
    exe_name = "python.exe" if is_win else "python"

    for candidate_venv in (module_path / ".venv", root_path / ".venv"):
        candidate_exe = candidate_venv / bin_name / exe_name
        if candidate_exe.is_file():
            return candidate_exe

    return Path(sys.executable)


def find_binary_in_venvs(bin_base_name: str, module_path: Path, root_path: Path) -> Optional[Path]:
    """Find a tool binary (e.g. ruff, mypy) in virtualenvs or PATH."""
    is_win = platform.system() == "Windows"
    bin_name = "Scripts" if is_win else "bin"
    suffix = ".exe" if is_win else ""
    target_name = f"{bin_base_name}{suffix}"

    for candidate_venv in (module_path / ".venv", root_path / ".venv"):
        candidate_bin = candidate_venv / bin_name / target_name
        if candidate_bin.is_file():
            return candidate_bin

    system_path = shutil.which(bin_base_name)
    if system_path:
        return Path(system_path)

    return None


def inspect_node_module(module_path: Path, rel_name: str) -> List[Dict[str, Any]]:
    """Detect Node.js / TypeScript linters."""
    linters = []
    package_json = module_path / "package.json"
    if not package_json.is_file():
        return linters

    try:
        pkg = json.loads(package_json.read_text(encoding="utf-8"))
    except Exception:
        pkg = {}

    scripts = pkg.get("scripts", {})
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

    # 1. Lint script or ESLint
    if "lint" in scripts:
        linters.append({
            "name": f"{rel_name}: npm lint",
            "cmd": ["npm", "run", "lint"],
            "cwd": module_path,
        })
    elif "eslint" in deps or (module_path / "eslint.config.js").exists() or (module_path / "eslint.config.mjs").exists():
        linters.append({
            "name": f"{rel_name}: eslint",
            "cmd": ["npx", "eslint", "."],
            "cwd": module_path,
        })

    # 2. TypeScript compiler check
    if "typescript" in deps or (module_path / "tsconfig.json").exists():
        linters.append({
            "name": f"{rel_name}: tsc typecheck",
            "cmd": ["npx", "tsc", "--noEmit"],
            "cwd": module_path,
        })

    return linters


def inspect_python_module(module_path: Path, root_path: Path, rel_name: str) -> List[Dict[str, Any]]:
    """Detect Python linters (ruff, mypy, or compileall syntax check)."""
    linters = []
    py_exe = find_python_interpreter(module_path, root_path)

    # 1. Ruff check
    ruff_bin = find_binary_in_venvs("ruff", module_path, root_path)
    if ruff_bin:
        linters.append({
            "name": f"{rel_name}: ruff",
            "cmd": [str(ruff_bin), "check", "."],
            "cwd": module_path,
        })

    # 2. Mypy check
    mypy_bin = find_binary_in_venvs("mypy", module_path, root_path)
    if mypy_bin:
        linters.append({
            "name": f"{rel_name}: mypy",
            "cmd": [str(mypy_bin), "."],
            "cwd": module_path,
        })

    # 3. Fallback syntax compilation if neither ruff nor mypy is installed
    if not ruff_bin and not mypy_bin:
        linters.append({
            "name": f"{rel_name}: python syntax (compileall)",
            "cmd": [str(py_exe), "-m", "compileall", "-q", "."],
            "cwd": module_path,
        })

    return linters


def discover_modules(project_path: Path) -> List[Dict[str, Any]]:
    """Discover subprojects / modules within a project or monorepo."""
    modules: List[Dict[str, Any]] = []

    # 1. Check if project_path itself is a standalone module
    is_root_node = (project_path / "package.json").is_file()
    is_root_py = (project_path / "pyproject.toml").is_file() or (project_path / "requirements.txt").is_file()

    # 2. Scan immediate subdirectories (e.g. apps/*, services/*, packages/*, backend, frontend)
    found_submodules = False

    def scan_dir(dir_path: Path, depth: int = 1) -> None:
        nonlocal found_submodules
        if depth > 2 or not dir_path.is_dir():
            return

        try:
            entries = sorted(dir_path.iterdir(), key=lambda p: p.name)
        except OSError:
            return

        for child in entries:
            if not child.is_dir() or child.name.startswith(".") or child.name in IGNORED_DIRS:
                continue

            rel_name = str(child.relative_to(project_path))
            has_node = (child / "package.json").is_file()
            has_py = (child / "pyproject.toml").is_file() or (child / "requirements.txt").is_file() or (child / "app").is_dir() or any(child.glob("*.py"))

            if has_node:
                found_submodules = True
                modules.append({
                    "name": rel_name,
                    "path": child,
                    "type": "node",
                })
            elif has_py:
                found_submodules = True
                modules.append({
                    "name": rel_name,
                    "path": child,
                    "type": "python",
                })
            else:
                # Recurse one more level (e.g., into services/, apps/)
                scan_dir(child, depth + 1)

    scan_dir(project_path)

    # If submodules were found in monorepo, return them
    if modules:
        return modules

    # Otherwise, treat root project_path as the single target
    if is_root_node:
        modules.append({"name": project_path.name or "root", "path": project_path, "type": "node"})
    elif is_root_py:
        modules.append({"name": project_path.name or "root", "path": project_path, "type": "python"})
    else:
        # Check if there are loose python or js files in root
        has_py_files = any(project_path.glob("*.py"))
        if has_py_files:
            modules.append({"name": project_path.name or "root", "path": project_path, "type": "python"})

    return modules


def run_linter(linter: Dict[str, Any]) -> Dict[str, Any]:
    """Run a single linter command in its target working directory."""
    result = {
        "name": linter["name"],
        "cwd": str(linter["cwd"]),
        "passed": False,
        "output": "",
        "error": "",
    }

    cmd = list(linter["cmd"])
    is_win = platform.system() == "Windows"
    if is_win and cmd[0] in ["npm", "npx"] and not cmd[0].lower().endswith(".cmd"):
        cmd[0] = f"{cmd[0]}.cmd"

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(linter["cwd"]),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
            shell=is_win,
        )
        result["output"] = (proc.stdout or "")[:3000]
        result["error"] = (proc.stderr or "")[:1000]
        result["passed"] = (proc.returncode == 0)

    except FileNotFoundError:
        result["error"] = f"Command not found: {cmd[0]}"
    except subprocess.TimeoutExpired:
        result["error"] = "Timeout after 180s"
    except Exception as e:
        result["error"] = str(e)

    return result


def main() -> int:
    project_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

    print(f"\n{'='*64}")
    print(f"[LINT RUNNER] Monorepo-Aware Unified Linting".center(64))
    print(f"{'='*64}")
    print(f"Project: {project_path}")
    print(f"Time:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    modules = discover_modules(project_path)
    print(f"Modules Detected: {len(modules)}")
    for m in modules:
        print(f"  • [{m['name']}] ({m['type']})")
    print("-" * 64)

    # Collect linters for all modules
    all_linters: List[Dict[str, Any]] = []
    for m in modules:
        if m["type"] == "node":
            all_linters.extend(inspect_node_module(m["path"], m["name"]))
        elif m["type"] == "python":
            all_linters.extend(inspect_python_module(m["path"], project_path, m["name"]))

    if not all_linters:
        print("No linters or compilable targets detected in any module.")
        output = {
            "script": "lint_runner",
            "project": str(project_path),
            "modules": [m["name"] for m in modules],
            "checks": [],
            "passed": True,
            "message": "No linters configured",
        }
        print(json.dumps(output, indent=2))
        return 0

    print(f"Configured Checks ({len(all_linters)} total):")
    for l in all_linters:
        print(f"  - {l['name']}")
    print("-" * 64)

    results: List[Dict[str, Any]] = []
    all_passed = True

    for linter in all_linters:
        print(f"\nRunning: {linter['name']} (cwd: {linter['cwd']})...")
        res = run_linter(linter)
        results.append(res)

        if res["passed"]:
            C.pass_msg(f"{linter['name']}")
        else:
            C.fail_msg(f"{linter['name']}")
            if res["error"].strip():
                print(f"  Error snippet: {res['error'].strip()[:300]}")
            if res["output"].strip():
                print(f"  Output snippet: {res['output'].strip()[:400]}")
            all_passed = False

    # Summary table
    print("\n" + "=" * 64)
    print("CHECK SUMMARY".center(64))
    print("=" * 64)
    for r in results:
        status_text = "[PASS]" if r["passed"] else "[FAIL]"
        color_fn = C.pass_msg if r["passed"] else C.fail_msg
        color_fn(f"{r['name']}")

    output = {
        "script": "lint_runner",
        "project": str(project_path),
        "modules": [m["name"] for m in modules],
        "checks": results,
        "passed": all_passed,
    }
    print(f"\nResult: {'ALL CHECKS PASSED' if all_passed else 'SOME CHECKS FAILED'}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
