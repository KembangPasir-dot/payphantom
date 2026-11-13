#!/usr/bin/env python3
"""Record PayPhantom demo video, TAKE 1 — LIVE sandbox mode (port 3101).

Flow (single continuous take):
  1. Open http://localhost:3101, wait for health line to show live mode.
  2. Type the demo chat message (Sarah $120 USD — PayPal rejects IDR), send it.
  3. Wait for the real invoice card (SENT) to appear, hold it on screen.
  4. Try to open the real PayPal sandbox payer page in a new tab (external
     site may fail to load in this VM — tolerated, video continues).
  5. Close the context -> video file finalized (webm).

Usage:
  .venv-record/bin/python record-take1-live.py [--out-dir DIR]
Output: prints VIDEO_WEBM path.
"""
import argparse
import os
import sys
import time

from playwright.sync_api import sync_playwright

MESSAGE = "Invoice Sarah sarah@example.com $120 for consulting, due Friday"
# NOTE: USD on purpose — PayPal Invoicing API rejects IDR.
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
        # Health line: "Mode: live (PayPal live) · AI: aktif · ..."
        page.wait_for_function(
            "document.getElementById('health').textContent.includes('live')",
            timeout=15000,
        )
        print(f"[{time.time()-t0:5.1f}s] LIVE health confirmed: {page.inner_text('#health')!r}", flush=True)
        page.wait_for_timeout(2000)

        page.click("#input")
        page.type("#input", MESSAGE, delay=55)
        page.wait_for_timeout(400)
        page.click("#form button[type=submit]")
        print(f"[{time.time()-t0:5.1f}s] message sent, waiting for invoice card SENT", flush=True)

        # Gemini free-tier latency can be slow; allow up to 4 minutes.
        page.wait_for_selector("#invoices .card .badge.SENT", timeout=240000)
        print(f"[{time.time()-t0:5.1f}s] invoice card SENT on screen", flush=True)
        page.wait_for_timeout(4000)  # let the viewer read the card

        # Try the real PayPal sandbox payer page (may fail in this VM — tolerated).
        try:
            with ctx.expect_page(timeout=15000) as new_page_info:
                page.click("#invoices .card a[href*='paypal.com']")
            paypal_page = new_page_info.value
            try:
                paypal_page.wait_for_load_state("domcontentloaded", timeout=30000)
            except Exception as e:
                print("paypal page load warning:", e, flush=True)
            page.wait_for_timeout(5000)
            print(f"[{time.time()-t0:5.1f}s] paypal page shown, title: {paypal_page.title()!r}", flush=True)
            paypal_page.screenshot(path=os.path.join(args.out_dir, "take1-paypal-page-check.png"))
            paypal_page.close()
        except Exception as e:
            print("paypal page step skipped (external site unreachable in VM):", str(e)[:200], flush=True)
            page.wait_for_timeout(2000)

        page.wait_for_timeout(1500)
        video_path = page.video.path()
        ctx.close()
        browser.close()
        print(f"total take: {time.time()-t0:.1f}s")
        print("VIDEO_WEBM:", video_path)


if __name__ == "__main__":
    main()
