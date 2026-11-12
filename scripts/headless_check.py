#!/usr/bin/env python3
"""Headless check: every page loads with zero console errors and actually plays.

    python3 scripts/headless_check.py k8s-pod-scheduling

For each format it opens the built file:// page in Chromium and asserts:
  - no console errors and no uncaught page errors
  - window.__timelines.main exists and lasts the full runtime
  - the standalone player mounts, "Play muted" advances the timeline
  - ?t=<s> deep-links to the right scene (only that scene's clip is visible)
  - ?render keeps the player inert (no chrome injected into the frame)
Also loads the root gallery and asserts it links to both formats.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
slug = sys.argv[1]
fails: list[str] = []


def must(cond, msg):
    if not cond:
        fails.append(msg)


def watch(page, tag):
    errors = []
    page.on("console", lambda m: errors.append(f"{tag} console.{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"{tag} pageerror: {e}"))
    return errors


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for folder, (w, h) in ((slug, (1920, 1080)), (f"{slug}-reel", (1080, 1920))):
        url = (ROOT / "videos" / folder / "index.html").as_uri()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = watch(page, folder)
        page.goto(url, wait_until="load")
        page.wait_for_function("document.querySelector('.gate') !== null", timeout=5000)
        dur = page.evaluate("window.__timelines.main.duration()")
        must(abs(dur - 180) < 0.01, f"{folder}: timeline lasts {dur}s, expected 180s")
        page.click("#g-mute")
        page.wait_for_timeout(1500)
        t = page.evaluate("window.__timelines.main.time()")
        must(t > 0.8, f"{folder}: playback did not advance (t={t:.2f}s after 1.5s)")
        must(errors == [], "\n".join(errors))

        deep = browser.new_page(viewport={"width": 1440, "height": 900})
        derr = watch(deep, folder + "?t")
        deep.goto(url + "?t=100", wait_until="load")
        deep.wait_for_timeout(300)
        vis = deep.evaluate(
            "['s1','s2','s3','s4','s5'].filter(id => getComputedStyle(document.getElementById(id)).visibility === 'visible')"
        )
        must(vis == ["s3"], f"{folder}: at t=100 visible scenes are {vis}, expected ['s3']")
        must(derr == [], "\n".join(derr))

        rend = browser.new_page(viewport={"width": w, "height": h})
        rerr = watch(rend, folder + "?render")
        rend.goto(url + "?render", wait_until="load")
        rend.wait_for_timeout(300)
        must(rend.evaluate("document.querySelector('.player, .gate') === null"), f"{folder}: player chrome injected under ?render")
        must(rerr == [], "\n".join(rerr))
        for p in (page, deep, rend):
            p.close()

    gallery = browser.new_page()
    gerr = watch(gallery, "gallery")
    gallery.goto((ROOT / "index.html").as_uri(), wait_until="load")
    hrefs = gallery.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href'))")
    for want in (f"videos/{slug}/", f"videos/{slug}-reel/"):
        must(any(h and h.startswith(want) for h in hrefs), f"gallery: no link to {want}")
    must(gerr == [], "\n".join(gerr))
    browser.close()

if fails:
    print(f"FAIL headless {slug}:\n - " + "\n - ".join(fails))
    sys.exit(1)
print(f"PASS headless {slug}: 2 formats + gallery, zero console errors, playback advances, deep-link and render mode OK")
