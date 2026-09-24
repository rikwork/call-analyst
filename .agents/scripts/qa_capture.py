#!/usr/bin/env python3
"""QA Screenshot & Visual Capture Utility - AG Kit.

Captures responsive screenshots (Desktop 1440px and Mobile 375px) of a running preview server.
Uses Playwright if available, or falls back to headless Google Chrome.
Stores screenshots into deterministic artifact locations for QA and Design reviewers.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple


def locate_chrome_binary() -> Optional[str]:
    """Find local Google Chrome or Chromium executable."""
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        shutil.which("google-chrome"),
        shutil.which("google-chrome-stable"),
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
    ]
    for c in candidates:
        if c and os.path.exists(c) and os.access(c, os.X_OK):
            return c
    return None


def is_server_reachable(url: str, timeout: float = 3.0) -> bool:
    """Check if HTTP server responds."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AGKit-QA/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status < 500
    except urllib.error.HTTPError as e:
        return e.code < 500
    except Exception:
        return False


def wait_for_server(url: str, max_wait_sec: int = 15) -> bool:
    """Wait until server is reachable."""
    deadline = time.time() + max_wait_sec
    while time.time() < deadline:
        if is_server_reachable(url):
            return True
        time.sleep(0.5)
    return False


def capture_with_chrome(chrome_bin: str, url: str, width: int, height: int, out_path: Path) -> bool:
    """Capture screenshot using headless Chrome CLI."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        f"--screenshot={out_path.resolve()}",
        url,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return proc.returncode == 0 and out_path.is_file() and out_path.stat().st_size > 0
    except Exception as exc:
        print(f"Chrome capture error for {width}x{height}: {exc}", file=sys.stderr)
        return False


def capture_with_playwright(url: str, viewports: Dict[str, Tuple[int, int]], out_dir: Path) -> Dict[str, str]:
    """Capture screenshots using python playwright if installed."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {}

    saved = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for name, (w, h) in viewports.items():
                context = browser.new_context(viewport={"width": w, "height": h})
                page = context.new_page()
                page.goto(url, wait_until="networkidle", timeout=15000)
                file_path = out_dir / f"{name}_{w}x{h}.png"
                page.screenshot(path=str(file_path), full_page=True)
                saved[name] = str(file_path.resolve())
                context.close()
            browser.close()
    except Exception as exc:
        print(f"Playwright capture error: {exc}", file=sys.stderr)
    return saved


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture Desktop and Mobile screenshots for QA and Design Review")
    parser.add_argument("--url", default="http://localhost:3000", help="Target URL (default: http://localhost:3000)")
    parser.add_argument("--output-dir", default=".agents/artifacts/screenshots", help="Directory to save screenshots")
    parser.add_argument("--wait-sec", type=int, default=10, help="Max seconds to wait for server response")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args()

    out_dir = Path(args.output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Verify server connectivity
    if not wait_for_server(args.url, max_wait_sec=args.wait_sec):
        err_msg = f"Server at {args.url} is not responding within {args.wait_sec}s. Is the preview server running?"
        if args.json:
            print(json.dumps({"status": "error", "message": err_msg}))
        else:
            print(f"❌ {err_msg}", file=sys.stderr)
        return 1

    viewports = {
        "desktop": (1440, 900),
        "mobile": (375, 812),
    }

    results: Dict[str, str] = {}

    # 2. Try Playwright first
    results = capture_with_playwright(args.url, viewports, out_dir)

    # 3. Fallback to Google Chrome binary if Playwright wasn't available
    if len(results) < len(viewports):
        chrome_bin = locate_chrome_binary()
        if chrome_bin:
            for name, (w, h) in viewports.items():
                if name not in results:
                    target_file = out_dir / f"{name}_{w}x{h}.png"
                    if capture_with_chrome(chrome_bin, args.url, w, h, target_file):
                        results[name] = str(target_file.resolve())

    if len(results) == len(viewports):
        summary = {
            "status": "success",
            "url": args.url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "screenshots": results,
        }
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print("✔ QA Visual Capture Successful!")
            for name, path in results.items():
                print(f"  📷 {name.upper()}: {path}")
        return 0
    else:
        err = f"Failed to capture screenshots. Missing tool: need either 'playwright' or Chrome binary."
        if args.json:
            print(json.dumps({"status": "failed", "captured": results, "error": err}))
        else:
            print(f"✖ {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
