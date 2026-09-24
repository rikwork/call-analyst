#!/usr/bin/env python3
"""Unit tests for review_gate.py."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
import subprocess
import sys

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
GATE_SCRIPT = SCRIPTS_DIR / "review_gate.py"


class TestReviewGate(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        (self.test_dir / ".agents").mkdir()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def run_gate(self, *args) -> subprocess.CompletedProcess:
        cmd = [sys.executable, str(GATE_SCRIPT), "--project", str(self.test_dir)] + list(args)
        return subprocess.run(cmd, capture_output=True, text=True)

    def test_full_approval_flow(self):
        # 1. Init
        res = self.run_gate("init", "--task-id", "test-task", "--max-iterations", "2")
        self.assertEqual(res.returncode, 0)
        state_file = self.test_dir / ".agents" / ".review_state.json"
        self.assertTrue(state_file.is_file())

        # 2. Evaluate before reviews -> INCOMPLETE (code 4)
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 4)

        # 3. Record Backend (Stage 2)
        res = self.run_gate("record", "--reviewer", "backend", "--verdict", "APPROVED", "--summary", "Backend architecture clean")
        self.assertEqual(res.returncode, 0)

        # 4. Record Frontend (Stage 2)
        res = self.run_gate("record", "--reviewer", "frontend", "--verdict", "APPROVED", "--summary", "Components performant")
        self.assertEqual(res.returncode, 0)

        # Evaluate after Stage 2 -> INCOMPLETE (code 4, QA pending)
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 4)

        # 5. Record QA (Stage 3)
        res = self.run_gate("record", "--reviewer", "qa", "--verdict", "APPROVED", "--summary", "All smoke tests and screenshots verified")
        self.assertEqual(res.returncode, 0)

        # Evaluate after Stage 3 -> INCOMPLETE (code 4, Design pending)
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 4)

        # 6. Record Design (Stage 4)
        res = self.run_gate("record", "--reviewer", "design", "--verdict", "APPROVED", "--summary", "Tokens match design spec")
        self.assertEqual(res.returncode, 0)

        # 7. Evaluate -> PASSED (code 0)
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 0)
        self.assertTrue((self.test_dir / "REVIEW_VERDICT.md").is_file())

    def test_two_iteration_circuit_breaker(self):
        # 1. Init with max 2 iterations
        self.run_gate("init", "--task-id", "feature-fail", "--max-iterations", "2")

        # Iteration 1: Backend rejects in Stage 2 (early exit without QA/Design!)
        self.run_gate("record", "--reviewer", "backend", "--verdict", "CHANGES_REQUESTED", "--summary", "N+1 query found", "--blocker", "Fix SQL query in list_calls")
        self.run_gate("record", "--reviewer", "frontend", "--verdict", "APPROVED", "--summary", "Looks good")

        # Evaluate -> NEED_FIXES (code 2), moves to iteration 2 without waiting for QA or Design
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 2)
        self.assertTrue((self.test_dir / "REVIEW_FIX_LIST.md").is_file())

        with open(self.test_dir / ".agents" / ".review_state.json") as f:
            state = json.load(f)
        self.assertEqual(state["iteration"], 2)

        # Iteration 2: Backend, Frontend, QA approved, Design rejects
        self.run_gate("record", "--reviewer", "backend", "--verdict", "APPROVED", "--summary", "N+1 fixed")
        self.run_gate("record", "--reviewer", "frontend", "--verdict", "APPROVED", "--summary", "Good")
        self.run_gate("record", "--reviewer", "qa", "--verdict", "APPROVED", "--summary", "QA pass")
        self.run_gate("record", "--reviewer", "design", "--verdict", "CHANGES_REQUESTED", "--summary", "Contrast ratio fails WCAG", "--blocker", "Fix button contrast on dark mode")

        # Evaluate -> CIRCUIT_BREAKER (code 3)
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 3)
        self.assertTrue((self.test_dir / "REVIEW_ESCALATION.md").is_file())

        with open(self.test_dir / ".agents" / ".review_state.json") as f:
            state = json.load(f)
        self.assertEqual(state["status"], "CIRCUIT_BREAKER")

    def test_qa_failure_halts_before_design(self):
        self.run_gate("init", "--task-id", "qa-fail-test", "--max-iterations", "2")
        self.run_gate("record", "--reviewer", "backend", "--verdict", "APPROVED", "--summary", "BE OK")
        self.run_gate("record", "--reviewer", "frontend", "--verdict", "APPROVED", "--summary", "FE OK")
        self.run_gate("record", "--reviewer", "qa", "--verdict", "CHANGES_REQUESTED", "--summary", "Server crash", "--blocker", "500 error on /api/calls")

        # Evaluate should trigger NEED_FIXES without needing design
        res = self.run_gate("evaluate")
        self.assertEqual(res.returncode, 2)
        self.assertTrue((self.test_dir / "REVIEW_FIX_LIST.md").is_file())

    def test_status_output(self):
        self.run_gate("init", "--task-id", "status-test")
        res = self.run_gate("status")
        self.assertEqual(res.returncode, 0)
        self.assertIn("status-test", res.stdout)
        self.assertIn("BACKEND", res.stdout)

        res_json = self.run_gate("status", "--json")
        self.assertEqual(res_json.returncode, 0)
        data = json.loads(res_json.stdout)
        self.assertEqual(data["task_id"], "status-test")
        self.assertEqual(data["iteration"], 1)

    def test_reset(self):
        self.run_gate("init", "--task-id", "cleanup-test")
        self.assertTrue((self.test_dir / ".agents" / ".review_state.json").is_file())
        res = self.run_gate("reset")
        self.assertEqual(res.returncode, 0)
        self.assertFalse((self.test_dir / ".agents" / ".review_state.json").is_file())


if __name__ == "__main__":
    unittest.main()
