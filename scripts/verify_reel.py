#!/usr/bin/env python3
"""Headless layout + timeline verifier for a 9:16 HyperFrames reel.

  python3 scripts/verify_reel.py k8s-disaster-recovery            # verify
  python3 scripts/verify_reel.py k8s-disaster-recovery --self-test # prove checks fail on a broken layout

Checks (exit 1 on any failure):
  timeline   window.__timelines.main exists, GSAP 3.12.x, duration == root data-duration
  frame0     the hook headline is visible on frame 0 (thumbnail is never blank)
  band       every visible stage element sits inside x 108..972, y 168..1330 (platform-safe band)
  overlap    no two visible cards/terminals in the same stage intersect
  overflow   no card title / status line / terminal line overflows its box
  captions   at each spoken word exactly one cue is visible and it fits the HUD
  terminal   the Velero terminal ends showing the exact restore command
  seams      at each scene cut only one scene is visible (zero overlap)
  packets    after a jump-seek each wired scene shows moving traffic packets
Writes PNG snapshots to videos/<slug>/snapshots/ (git-ignored).
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
slug = sys.argv[1] if len(sys.argv) > 1 else "k8s-disaster-recovery"
SELF_TEST = "--self-test" in sys.argv
VID = ROOT / "videos" / slug
SNAP = VID / "snapshots"
SNAP.mkdir(exist_ok=True)

BAND = {"x0": 108, "x1": 972, "y0": 168, "y1": 1330}
VELERO_CMD = "velero restore create --from-backup k8s-daily"

SEEK_JS = """(t) => {
  const tl = window.__timelines.main;
  tl.seek(t, false);
  for (const el of document.querySelectorAll('#root .clip')) {
    const s = +el.dataset.start, e = s + +el.dataset.duration;
    el.style.visibility = (t >= s && t < e) ? 'visible' : 'hidden';
  }
  return true;
}"""

PROBE_JS = """(band) => {
  const vis = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false;
      n = n.parentElement;
    }
    return true;
  };
  const r = (el) => { const b = el.getBoundingClientRect(); return {x: b.left, y: b.top, w: b.width, h: b.height}; };
  const out = {band: [], overlap: [], overflow: [], scene: null};
  const scene = [...document.querySelectorAll('section.scene')].find((s) => getComputedStyle(s).visibility === 'visible');
  if (!scene) return out;
  out.scene = scene.id;
  const items = [...scene.querySelectorAll('.stage .card, .stage .term, .stage .yaml, .stage .banner, .stage .layers, .stage .final, .head')]
    .filter(vis);
  for (const el of items) {
    const b = r(el);
    if (b.x < band.x0 - 0.5 || b.x + b.w > band.x1 + 0.5 || b.y < band.y0 - 0.5 || b.y + b.h > band.y1 + 0.5)
      out.band.push(`${el.id || el.className} @ ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`);
  }
  // overlap: solid boxes only; the s1 layers panel deliberately covers a dimmed diagram
  const solid = items.filter((el) => el.matches('.card, .term, .yaml, .banner'));
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = r(solid[i]), b = r(solid[j]);
    const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ix > 2 && iy > 2) out.overlap.push(`${solid[i].id} x ${solid[j].id}`);
  }
  // overflow: text wider than its container
  for (const el of scene.querySelectorAll('.card h3, .card .sw span, .term .ln, .yaml .ln')) {
    if (!vis(el)) continue;
    const box = el.closest('.card, .term, .yaml');
    const rg = document.createRange(); rg.selectNodeContents(el);  // text extent, not the block box
    const eb = rg.getBoundingClientRect(), bb = box.getBoundingClientRect();
    const pad = 10;
    if (eb.right > bb.right - pad + 0.5 && el.textContent.trim()) out.overflow.push(`${box.id}: "${el.textContent.trim().slice(0, 40)}" (${Math.round(eb.right - bb.right + pad)}px)`);
  }
  return out;
}"""

CAPTION_JS = """(t) => {
  const cues = [...document.querySelectorAll('.cue')].filter((c) => getComputedStyle(c).visibility === 'visible');
  const hud = document.querySelector('#captions').getBoundingClientRect();
  return cues.map((c) => {
    const ws = [...c.querySelectorAll('.w')];
    const last = ws[ws.length - 1].getBoundingClientRect(), first = ws[0].getBoundingClientRect();
    return {id: c.id, fits: first.top >= hud.top - 1 && last.bottom <= hud.bottom + 1 && Math.max(...ws.map((w) => w.getBoundingClientRect().right)) <= hud.right + 1};
  });
}"""

failures = []


def fail(kind, msg):
    failures.append(f"[{kind}] {msg}")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1920})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((VID / "index.html").as_uri() + "?render")
    page.wait_for_function("!!(window.__timelines && window.__timelines.main)")
    page.evaluate("document.fonts.ready")
    if errors:
        fail("js", "; ".join(errors))

    info = page.evaluate("""() => ({
      gsap: gsap.version, dur: window.__timelines.main.duration(),
      root: +document.getElementById('root').dataset.duration,
      scenes: [...document.querySelectorAll('section.scene')].map((s) => ({id: s.id, start: +s.dataset.start, dur: +s.dataset.duration})),
      words: [...document.querySelectorAll('.cue .w')].map((w) => +w.dataset.t),
    })""")
    if not info["gsap"].startswith("3.12."):
        fail("timeline", f"GSAP {info['gsap']} (want 3.12.x)")
    if abs(info["dur"] - info["root"]) > 0.05:
        fail("timeline", f"timeline {info['dur']:.2f}s != root {info['root']}s")

    if SELF_TEST:  # break the layout on purpose: every check below must catch it
        page.add_style_tag(content="#s2-gap{left:700px!important} #s4-ready{width:640px!important} #s3-dst h3{font-size:60px!important}")

    page.evaluate(SEEK_JS, 0)
    h0 = page.evaluate("() => { const h = document.querySelector('#s1 .head h2'); return getComputedStyle(h).opacity + '|' + h.getBoundingClientRect().height; }")
    if float(h0.split("|")[0]) < 0.99:
        fail("frame0", f"hook headline not visible at t=0 ({h0})")
    page.screenshot(path=str(SNAP / "t000.00.png"))

    # sample each scene densely after its entry seam and before its exit seam
    samples = []
    for s in info["scenes"]:
        t = s["start"] + 0.8
        while t < s["start"] + s["dur"] - 0.45:
            samples.append(round(t, 2))
            t += 0.5
    seen = {}
    for t in samples:
        page.evaluate(SEEK_JS, t)
        r = page.evaluate(PROBE_JS, BAND)
        for kind in ("band", "overlap", "overflow"):
            for m in r[kind]:
                key = (kind, m.split(" @")[0])
                if key not in seen:
                    seen[key] = t
                    fail(kind, f"t={t:.2f} {r['scene']}: {m}")

    # key frames for review: each scene settled + the failure + the terminal
    keys = [s["start"] + s["dur"] - 0.6 for s in info["scenes"]] + [9.5, 64.0]
    for t in keys:
        page.evaluate(SEEK_JS, t)
        page.screenshot(path=str(SNAP / f"t{t:06.2f}.png"))

    # packets: after a jump-seek (how renders and scrubbing move), every wired scene shows live beads
    for sc_ in info["scenes"]:
        t = sc_["start"] + sc_["dur"] - 0.6
        page.evaluate(SEEK_JS, 0)
        page.evaluate(SEEK_JS, t)
        n = page.evaluate("(id) => { const w = document.querySelectorAll('#' + id + ' path.wire').length; const b = [...document.querySelectorAll('#' + id + ' circle.bead')].filter((c) => +c.getAttribute('opacity') > 0.5).length; return [w, b]; }", sc_["id"])
        if n[0] and n[1] < 3:
            fail("packets", f"t={t:.2f} {sc_['id']}: {n[1]} visible packets on {n[0]} wires after jump-seek")

    # captions: exactly one cue visible at every spoken word, and it fits the HUD
    for t in info["words"]:
        page.evaluate(SEEK_JS, t + 0.05)
        cues = page.evaluate(CAPTION_JS, t)
        if len(cues) != 1:
            fail("captions", f"t={t:.2f}: {len(cues)} cues visible")
        elif not cues[0]["fits"]:
            if ("captions", cues[0]["id"]) not in seen:
                seen[("captions", cues[0]["id"])] = t
                fail("captions", f"t={t:.2f}: {cues[0]['id']} overflows the HUD")

    # terminal ends with the exact Velero command
    s4 = next(s for s in info["scenes"] if s["id"] == "s4")
    page.evaluate(SEEK_JS, s4["start"] + s4["dur"] - 0.6)
    typed = page.evaluate("() => document.getElementById('s4-c1').textContent")
    if typed != VELERO_CMD:
        fail("terminal", f"typed {typed!r}, want {VELERO_CMD!r}")

    # seams: one scene visible on each side of every cut
    for s in info["scenes"][1:]:
        for t in (s["start"] - 1 / 30, s["start"]):
            page.evaluate(SEEK_JS, t)
            n = page.evaluate("() => [...document.querySelectorAll('section.scene')].filter((s) => getComputedStyle(s).visibility === 'visible').length")
            if n != 1:
                fail("seams", f"t={t:.3f}: {n} scenes visible")
    browser.close()

report = {"slug": slug, "self_test": SELF_TEST, "samples": len(samples), "failures": failures, "snapshots": str(SNAP)}
print(json.dumps(report, indent=1))
if SELF_TEST:
    kinds = {f.split("]")[0][1:] for f in failures}
    need = {"band", "overlap", "overflow"}
    if need <= kinds:
        print("SELF-TEST OK: broken layout was caught by", sorted(need))
        sys.exit(0)
    print("SELF-TEST FAILED: missing", sorted(need - kinds))
    sys.exit(1)
sys.exit(1 if failures else 0)
