#!/usr/bin/env python3
"""Headless check: every page loads with zero console errors and actually plays.

    python3 scripts/headless_check.py k8s-pod-scheduling

For each format it opens the built file:// page in Chromium and asserts:
  - no console errors and no uncaught page errors
  - window.__timelines.main exists and lasts the full runtime
  - the standalone player mounts, "Play muted" advances the timeline
  - ?t=<s> deep-links to the right scene (only that scene's clip is visible)
  - ?render keeps the player inert (no chrome injected into the frame)
Formats are whichever of videos/<slug>/ and videos/<slug>-reel/ exist. If a root index.html
gallery exists it must link to every format.
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
    # errors, plus GSAP warnings: a tween on a missing target silently animates nothing
    bad = lambda m: m.type == "error" or (m.type == "warning" and "GSAP target" in m.text)
    page.on("console", lambda m: errors.append(f"{tag} console.{m.type}: {m.text}") if bad(m) else None)
    page.on("pageerror", lambda e: errors.append(f"{tag} pageerror: {e}"))
    return errors


folders = [f for f in (slug, f"{slug}-reel") if (ROOT / "videos" / f / "index.html").exists()]
must(folders, f"no built video under videos/{slug}/")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for folder in folders:
        url = (ROOT / "videos" / folder / "index.html").as_uri()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = watch(page, folder)
        page.goto(url, wait_until="load")
        page.wait_for_function("document.querySelector('.gate') !== null", timeout=5000)
        root = page.evaluate("(() => { const r = document.getElementById('root').dataset; return [+r.width, +r.height, +r.duration]; })()")
        w, h, total = root
        dur = page.evaluate("window.__timelines.main.duration()")
        must(abs(dur - total) < 0.05, f"{folder}: timeline lasts {dur}s, expected {total}s")
        scenes = page.evaluate("[...document.querySelectorAll('section.scene')].map(s => [s.id, +s.dataset.start, +s.dataset.duration])")
        mid_id, mid_s, mid_d = scenes[len(scenes) // 2]
        probe_t = round(mid_s + mid_d / 2, 2)
        page.click("#g-mute")
        page.wait_for_timeout(1500)
        t = page.evaluate("window.__timelines.main.time()")
        must(t > 0.8, f"{folder}: playback did not advance (t={t:.2f}s after 1.5s)")
        must(errors == [], "\n".join(errors))

        deep = browser.new_page(viewport={"width": 1440, "height": 900})
        derr = watch(deep, folder + "?t")
        deep.goto(url + f"?t={probe_t}", wait_until="load")
        deep.wait_for_timeout(300)
        vis = deep.evaluate(
            "[...document.querySelectorAll('section.scene')].filter(s => getComputedStyle(s).visibility === 'visible').map(s => s.id)"
        )
        must(vis == [mid_id], f"{folder}: at t={probe_t} visible scenes are {vis}, expected ['{mid_id}']")
        must(derr == [], "\n".join(derr))

        rend = browser.new_page(viewport={"width": w, "height": h})
        rerr = watch(rend, folder + "?render")
        rend.goto(url + "?render", wait_until="load")
        rend.wait_for_timeout(300)
        must(rend.evaluate("document.querySelector('.player, .gate') === null"), f"{folder}: player chrome injected under ?render")
        must(rerr == [], "\n".join(rerr))
        for p in (page, deep, rend):
            p.close()

    gallery_file = ROOT / "index.html"
    if gallery_file.exists():
        gallery = browser.new_page()
        gerr = watch(gallery, "gallery")
        gallery.goto(gallery_file.as_uri(), wait_until="load")
        hrefs = gallery.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href'))")
        for want in (f"videos/{f}/" for f in folders):
            must(any(h and h.startswith(want) for h in hrefs), f"gallery: no link to {want}")
        must(gerr == [], "\n".join(gerr))
    browser.close()

if fails:
    print(f"FAIL headless {slug}:\n - " + "\n - ".join(fails))
    sys.exit(1)
print(f"PASS headless {slug}: {len(folders)} format(s), zero console errors, playback advances, deep-link and render mode OK")
