#!/usr/bin/env python3
"""Record PayPhantom demo video, TAKE 2 — MOCK mode (port 3101), SIMULATION.

This take demonstrates what happens AFTER an invoice is paid: the receipt
record is created and the mint gas is quoted. It runs in mock mode because
a live sandbox payment needs a sandbox buyer account (not available here),
and mock-pay is mock-mode-only by design. The UI itself labels everything
MOCK, and the edit adds an intertitle saying this part is a simulation.

Flow:
  1. Open http://localhost:3101 (mock server), wait for health line.
  2. Type the demo chat message, send it.
  3. Wait for the mock invoice card (SENT), hold it.
  4. Click "Simulasikan pembayaran (mock)" -> receipt card (MOCK) appears.
  5. Click "Cek biaya mint struk" -> real BSC gas quote appears in chat.
  6. Close the context -> video file finalized (webm).

Usage:
  .venv-record/bin/python record-take2-mock.py [--out-dir DIR]
Output: prints VIDEO_WEBM path.
"""
import argparse
import os
import sys
import time

from playwright.sync_api import sync_playwright

MESSAGE = "Invoice Sarah sarah@example.com $120 for consulting, due Friday"
URL = "http://localhost:3101"
CHROME = "/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default="/home/hatch/workspace/kiroween/payphantom/demo")
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=args.out_dir,
            record_video_size={"width": 1280, "height": 720},
        )
        page = ctx.new_page()
        t0 = time.time()
        page.goto(URL)
        page.wait_for_function(
            "document.getElementById('health').textContent.includes('mock')",
            timeout=15000,
        )
        print(f"[{time.time()-t0:5.1f}s] MOCK health confirmed: {page.inner_text('#health')!r}", flush=True)
        page.wait_for_timeout(2000)

        page.click("#input")
        page.type("#input", MESSAGE, delay=55)
        page.wait_for_timeout(400)
        page.click("#form button[type=submit]")
        print(f"[{time.time()-t0:5.1f}s] message sent, waiting for invoice card SENT", flush=True)

        page.wait_for_selector("#invoices .card .badge.SENT", timeout=240000)
        print(f"[{time.time()-t0:5.1f}s] invoice card SENT on screen", flush=True)
        page.wait_for_timeout(2500)

        # Simulate the payer paying (mock mode only).
        page.click("#invoices .card [data-mockpay]")
        print(f"[{time.time()-t0:5.1f}s] mock-pay clicked, waiting for receipt card", flush=True)
        page.wait_for_selector("#receipts .card .badge.MOCK", timeout=30000)
        print(f"[{time.time()-t0:5.1f}s] receipt card MOCK on screen", flush=True)
        page.wait_for_timeout(4000)  # let the viewer read the receipt card

        # Real BSC gas quote for the deferred mint.
        page.click("#invoices .card [data-quote]")
        print(f"[{time.time()-t0:5.1f}s] quote clicked, waiting for quote message", flush=True)
        page.wait_for_function(
            "document.getElementById('log').textContent.includes('Perkiraan biaya mint')",
            timeout=60000,
        )
        print(f"[{time.time()-t0:5.1f}s] gas quote on screen", flush=True)
        page.wait_for_timeout(5000)  # let the viewer read the quote

        video_path = page.video.path()
        ctx.close()
        browser.close()
        print(f"total take: {time.time()-t0:.1f}s")
        print("VIDEO_WEBM:", video_path)


if __name__ == "__main__":
    main()
