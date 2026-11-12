#!/usr/bin/env python3
"""Headless layout + timeline verifier for a 9:16 HyperFrames reel.

  python3 scripts/verify_reel.py k8s-disaster-recovery            # verify
  python3 scripts/verify_reel.py k8s-disaster-recovery --self-test # prove checks fail on a broken layout

Checks (exit 1 on any failure):
  timeline   window.__timelines.main exists, GSAP 3.12.x, duration == root data-duration
  frame0     the hook headline is visible on frame 0 (thumbnail is never blank) and no element a
             later first-scene beat reveals is already in its revealed look
  band       every visible stage element sits inside the 10% side margins and between the
             topbar and the captions HUD (band derived from the template's own chrome)
  overlap    no two visible cards/terminals in the same stage intersect
  overflow   no card title / status line / terminal line overflows its box
  captions   at each spoken word exactly one cue is visible and it fits the HUD
  terminal   every typewriter ([data-text] in a .term) shows exactly its data-text at scene end
             (static terminals are skipped; --self-test then requires "terminal" only if one exists)
  seams      at each scene cut only one scene is visible (zero overlap)
  packets    after a jump-seek each wired scene shows moving traffic packets
  wires      every wire starts/ends within 20px of its cards and runs through no other box
  labels     wire labels, .illus notes and badges cover no box, no other label, no foreign wire
  balance    each settled diagram is centred between headline and HUD (12%) and fills >= 40% of it
--advisory wires,labels,balance reports those kinds as WARN (exit code unaffected); verify-all passes
it only for the pre-2026-11-12 videos listed in their story.mjs meta.advisory.
Writes PNG snapshots to videos/<slug>/snapshots/ (git-ignored).
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
slug = sys.argv[1] if len(sys.argv) > 1 else "k8s-disaster-recovery"
SELF_TEST = "--self-test" in sys.argv
slug = slug.removeprefix("videos/").rstrip("/")  # accept videos/<dir> as well as <dir>
VID = ROOT / "videos" / slug
if not (VID / "index.html").is_file():
    sys.exit(f"no built video at {VID}/index.html (pass the videos/ dir name, e.g. eks or k8s-pod-scheduling-reel)")
# self-test breaks the layout on purpose: keep its frames away from the real review snapshots
SNAP = VID / "snapshots" / ("self-test" if SELF_TEST else "")
SNAP.mkdir(parents=True, exist_ok=True)

# the one GSAP build every video ships (scripts/build-video.mjs defaults to it)
VENDOR_GSAP = sorted((ROOT / "src" / "shared" / "vendor").glob("gsap-*.min.js"))
GSAP_PIN = VENDOR_GSAP[-1].name[len("gsap-"):-len(".min.js")] if VENDOR_GSAP else None

# stage band: 10% side margins; vertical limits come from the template's topbar and HUD
BAND_JS = """() => {
  const root = document.getElementById('root').getBoundingClientRect();
  const W = root.width;
  const bar = document.querySelector('.topbar'), hud = document.querySelector('.hud') || document.querySelector('#captions');
  return {
    x0: Math.round(W * 0.1), x1: Math.round(W * 0.9),
    y0: bar ? Math.ceil(bar.getBoundingClientRect().bottom) : 168,
    y1: hud ? Math.floor(hud.getBoundingClientRect().top) : 1330,
  };
}"""

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
  // wires: drawn geometry in viewport space (getScreenCTM includes camera transforms)
  const inside = (p, b, inset) => p.x > b.x + inset && p.x < b.x + b.w - inset && p.y > b.y + inset && p.y < b.y + b.h - inset;
  const dist = (p, b) => Math.hypot(Math.max(b.x - p.x, 0, p.x - b.x - b.w), Math.max(b.y - p.y, 0, p.y - b.y - b.h));
  const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
  const wires = [...scene.querySelectorAll('.stage path.wire')]
    .filter((w) => vis(w) && parseFloat(getComputedStyle(w).opacity) >= 0.3 && w.getAttribute('d'))
    .map((w) => {
      const len = w.getTotalLength(), m = w.getScreenCTM(), N = 48;
      const pts = Array.from({ length: N + 1 }, (_, i) => w.getPointAtLength((i / N) * len).matrixTransform(m));
      const name = `${w.dataset.from || w.id || '?'}->${w.dataset.to || '?'}`;
      return { w, pts, name, from: w.dataset.from && document.getElementById(w.dataset.from), to: w.dataset.to && document.getElementById(w.dataset.to) };
    });
  out.wires = [];
  const settled = (el) => vis(el) && parseFloat(getComputedStyle(el).opacity) >= 0.95 && (() => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return Math.abs(m.m41) < 1 && Math.abs(m.m42) < 1 && Math.abs(m.a - 1) < 0.01; })();
  for (const k of wires) {
    if (k.from && settled(k.from) && dist(k.pts[0], r(k.from)) > 20) out.wires.push(`${k.name} starts ${Math.round(dist(k.pts[0], r(k.from)))}px away from #${k.from.id}`);
    if (k.to && settled(k.to) && dist(k.pts[k.pts.length - 1], r(k.to)) > 20) out.wires.push(`${k.name} ends ${Math.round(dist(k.pts[k.pts.length - 1], r(k.to)))}px away from #${k.to.id}`);
    for (const o of solid) {
      if (o === k.from || o === k.to || (k.from && o.contains(k.from)) || (k.to && o.contains(k.to))) continue;
      const b = r(o), n = k.pts.slice(2, -2).filter((p) => inside(p, b, 6)).length;
      if (n >= 2) out.wires.push(`${k.name} runs through #${o.id || o.className}`);
    }
  }
  // labels: wire labels and annotations sit clear of boxes, of each other, and of wires they don't name
  const labels = [...scene.querySelectorAll('.stage .wire-label, .stage .illus, .stage .badge')]
    .filter((l) => vis(l) && parseFloat(getComputedStyle(l).opacity) >= 0.3 && l.textContent.trim());
  out.labels = [];
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i], b = r(l), txt = l.textContent.trim();
    for (const o of solid) if (!o.contains(l) && hit(b, r(o))) out.labels.push(`"${txt}" covers #${o.id || o.className}`);
    for (let j = i + 1; j < labels.length; j++) if (hit(b, r(labels[j]))) out.labels.push(`"${txt}" covers "${labels[j].textContent.trim()}"`);
    for (const k of wires) {
      if (l.classList.contains('wire-label') && k.w.dataset.label === txt) continue;  // its own wire runs under it
      if (k.pts.some((p) => inside(p, b, 0))) out.labels.push(`"${txt}" sits on wire ${k.name}`);
    }
  }
  return out;
}"""

BALANCE_JS = """([id, band]) => {
const sc = document.getElementById(id);
const vis = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n);
  if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false; } return true; };
const head = sc.querySelector('.head');
const top = head && vis(head) ? head.getBoundingClientRect().bottom : band.y0;
// everything drawn in the stage: leaf elements (text, dots) and bordered/filled boxes, minus
// the full-stage layers (wire svg, backdrops) that would make every scene look 100% full
const stage = sc.querySelector('.stage');
if (!stage) return null;
const sb = stage.getBoundingClientRect();
const drawn = (e) => { const cs = getComputedStyle(e);
  return !e.children.length || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
const bs = [...stage.querySelectorAll('*')].filter((e) => !e.closest('svg') && vis(e) && drawn(e))
  .map((e) => e.getBoundingClientRect()).filter((b) => b.height > 0 && b.width > 0 && b.width * b.height < 0.6 * sb.width * sb.height);
if (!bs.length) return null;
return { top, bot: band.y1, y0: Math.min(...bs.map((b) => b.top)), y1: Math.max(...bs.map((b) => b.bottom)) };
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

_html = (VID / "index.html").read_text()
_m = re.search(r"const REVEAL = (\{.*?\});", _html)
REVEAL = json.loads(_m.group(1)) if _m else {}

failures = []
warnings = []
# --advisory wires,labels,balance: report those kinds as WARN without failing. Only videos that
# predate a check opt in (story.mjs meta.advisory); their backlog is in docs/PIPELINE_FEATURES.md.
def _arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else ""
ADVISORY = {k for k in _arg("--advisory").split(",") if k}  # verify-all passes meta.advisory


def fail(kind, msg):
    (warnings if kind in ADVISORY else failures).append(f"[{kind}] {msg}")


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
    if GSAP_PIN and info["gsap"] != GSAP_PIN:
        fail("timeline", f"GSAP {info['gsap']} (want the vendored {GSAP_PIN})")
    if abs(info["dur"] - info["root"]) > 0.05:
        fail("timeline", f"timeline {info['dur']:.2f}s != root {info['root']}s")

    BAND = page.evaluate(BAND_JS)
    FIRST = "#" + info["scenes"][0]["id"]  # the hook scene (thumbnail), whatever its id
    ends = {s["id"]: s["start"] + s["dur"] - 0.6 for s in info["scenes"]}

    def scene_samples(s):  # densely after the entry seam, stopping before the exit seam
        out, t = [], s["start"] + 0.8
        while t < s["start"] + s["dur"] - 0.45:
            out.append(round(t, 2))
            t += 0.5
        return out

    def probe(t):  # -> [(kind, message, dedupe key)]
        page.evaluate(SEEK_JS, t)
        r = page.evaluate(PROBE_JS, BAND)
        return [(kind, f"t={t:.2f} {r['scene']}: {m}", (kind, m.split(" @")[0]))
                for kind in ("band", "overlap", "overflow", "wires", "labels") for m in r.get(kind, [])]

    # balance: on each scene's settled frame the diagram sits centred in the space between its headline
    # and the HUD (within BAL_TOL of that space) and fills at least FILL_MIN of it, so no scene ends up
    # crammed against one edge with a void on the other side
    BAL_TOL, FILL_MIN = 0.12, 0.40

    def balance(s):  # -> [(kind, message)]
        page.evaluate(SEEK_JS, ends[s["id"]])
        g = page.evaluate(BALANCE_JS, [s["id"], BAND])
        if not g:
            return []
        space = g["bot"] - g["top"]
        above, below, fill_ = g["y0"] - g["top"], g["bot"] - g["y1"], (g["y1"] - g["y0"]) / space
        out = []
        if abs(above - below) / 2 > BAL_TOL * space:
            out.append(("balance", f"{s['id']}: diagram {above:.0f}px below headline but {below:.0f}px above HUD (off-centre {abs(above - below) / 2 / space:.0%} > {BAL_TOL:.0%})"))
        if fill_ < FILL_MIN:
            out.append(("balance", f"{s['id']}: diagram fills {fill_:.0%} of the {space:.0f}px between headline and HUD (< {FILL_MIN:.0%})"))
        return out

    baseline, sid = set(), None
    if SELF_TEST:  # break the layout on purpose: every check below must catch it
        # pick real elements from this video: three titled cards in one scene
        ids = page.evaluate("""() => {
          for (const s of document.querySelectorAll('section.scene')) {
            const cs = [...s.querySelectorAll('.stage .card[id]')].filter((c) => c.querySelector('h3'));
            if (cs.length >= 3) return [s.id, cs[0].id, cs[1].id, cs[2].id];
          }
          return null;
        }""")
        if not ids:
            print("SELF-TEST FAILED: no scene with 3 titled .card[id] elements to break")
            sys.exit(1)
        sid, a, b, c = ids
        has_wires = page.evaluate("(id) => !!document.querySelector('#' + id + ' .stage path.wire')", sid)
        # b's full-stage blow-up puts every label of the scene over a foreign box
        has_labels = page.evaluate("(id) => !!document.querySelector('#' + id + ' .stage :is(.wire-label, .illus, .badge)')", sid)
        # baseline: what that scene already reports unbroken, so a pre-existing warning can't pass the test
        sc_ = next(x for x in info["scenes"] if x["id"] == sid)
        baseline |= {f"[{k}] {m}" for t in scene_samples(sc_) for k, m, _ in probe(t)}
        baseline |= {f"[{k}] {m}" for k, m in balance(sc_)}
        # frame0: force one later-beat s1 element into its revealed look from t=0 (the immediateRender leak)
        s1_end = info["scenes"][0]["start"] + info["scenes"][0]["dur"]
        page.evaluate(SEEK_JS, 0)  # pick one whose ancestors show at t=0, so forcing it visible is a real leak
        leak_id = page.evaluate("""([ids, skip, FIRST]) => ids.find((id) => { const el = document.getElementById(id);
          if (!el || !el.closest(FIRST) || skip.some((k) => el.contains(document.getElementById(k)) || document.getElementById(k).contains(el))) return false;
          let op = 1;
          for (let n = el.parentElement; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false; op *= parseFloat(cs.opacity); }
          return op >= 0.05; }) || null""",
            [[k for k, v in REVEAL.items() if 1.0 <= v < s1_end], [a, b, c], FIRST])
        if leak_id:
            page.add_style_tag(content=f"#{leak_id}, #{leak_id} *{{opacity:1!important;visibility:visible!important;filter:none!important;transform:none!important}}")
        # a: pushed past the right margin by layout, not transform, so its wires detach (band, wires); b: blown up over its neighbours (overlap, wires);
        # c: title too big (overflow); the whole stage shoved down (balance)
        page.add_style_tag(content=(
            f"#{a}{{margin-left:700px!important}}"
            f"#{b}{{transform:none!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important}}"
            f"#{c}{{width:240px!important;max-width:240px!important}}"
            f"#{c} h3{{white-space:nowrap!important;text-indent:400px!important}}"
            f"#{sid} .stage{{translate:0 350px!important}}"))

    page.evaluate(SEEK_JS, 0)
    # effective opacity (CSS opacity multiplies down the tree) of the headline and each of its words
    h0 = page.evaluate("""(FIRST) => {
      const h = document.querySelector(FIRST + ' .head h2');
      if (!h) return null;
      const eff = (el) => { let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity); } return op; };
      return { min: Math.min(eff(h), ...[...h.querySelectorAll('*')].filter((w) => w.textContent.trim()).map(eff)), height: h.getBoundingClientRect().height };
    }""", FIRST)
    if not h0:
        fail("frame0", f"no {FIRST} .head h2 hook headline")
    elif h0["min"] < 0.99 or h0["height"] < 1:
        fail("frame0", f"hook headline not fully visible at t=0 (min effective opacity {h0['min']:.2f}, height {h0['height']:.0f}px)")
    # frame 0 must not show what a later beat reveals (a later fromTo's immediateRender leaks to t=0):
    # every s1 element driven by a mark at >= 1s must look different at t=0 than just after its mark.
    # Ghosted (dim/blurred) or hidden at t=0 is fine; already in its revealed look is the leak.
    FP_JS = """([ids, FIRST]) => Object.fromEntries(ids.map((id) => {
      const el = document.getElementById(id);
      if (!el || !el.closest(FIRST)) return [id, null];
      let op = 1;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') op = 0;
        op *= parseFloat(cs.opacity);
      }
      const cs = getComputedStyle(el);
      const kids = [...el.querySelectorAll('*')].map((k) => getComputedStyle(k).opacity + getComputedStyle(k).color).join();
      return [id, { op: Math.round(op * 100) / 100, look: [cs.filter, cs.transform, cs.borderColor, cs.backgroundColor, kids].join('|') }];
    }))"""
    s1 = info["scenes"][0]
    later = {k: v for k, v in REVEAL.items() if 1.0 <= v < s1["start"] + s1["dur"]}
    fp0 = page.evaluate(FP_JS, [list(later), FIRST])
    leaks = []
    for id_, v in later.items():
        if not fp0.get(id_) or fp0[id_]["op"] < 0.05:
            continue
        page.evaluate(SEEK_JS, min(v + 0.8, s1["start"] + s1["dur"] - 0.6))
        after = page.evaluate(FP_JS, [[id_], FIRST])[id_]
        if after and fp0[id_] == after:
            leaks.append(f"#{id_} ({v}s)")
    if leaks:
        fail("frame0", f"later-beat elements already revealed at t=0: {leaks}")
    page.evaluate(SEEK_JS, 0)
    page.screenshot(path=str(SNAP / "t000.00.png"))

    samples = [t for s in info["scenes"] for t in scene_samples(s)]
    seen = {}
    for t in samples:
        for kind, msg, key in probe(t):
            if key not in seen:
                seen[key] = t
                fail(kind, msg)

    # key frames for review: each scene settled
    keys = [s["start"] + s["dur"] - 0.6 for s in info["scenes"]]
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

    # terminals: each typewriter ([data-text] in a .term) ends its scene showing exactly its text after a
    # jump-seek. Static terminals (fixed .ln text only, nothing typed) have nothing to check.
    terms = page.evaluate("() => [...document.querySelectorAll('section.scene .term')].map((t, i) => ({i, scene: t.closest('section.scene').id, typed: !!t.querySelector('[data-text]')})).filter((t) => t.typed)")
    for tm in terms:
        page.evaluate(SEEK_JS, 0)
        page.evaluate(SEEK_JS, ends[tm["scene"]])
        bad = page.evaluate("""([i, broken]) => {
          const t = document.querySelectorAll('section.scene .term')[i];
          const ts = [...t.querySelectorAll('[data-text]')];
          if (broken) ts[0].dataset.text += ' <self-test>';  // typed text can no longer match
          return ts.filter((e) => e.textContent.trim() !== e.dataset.text.trim())
            .map((e) => `#${e.id}: "${e.textContent.trim().slice(0, 40)}" != "${e.dataset.text.trim().slice(0, 40)}"`);
        }""", [tm["i"], SELF_TEST])
        for m in bad:
            fail("terminal", f"{tm['scene']} at {ends[tm['scene']]:.2f}s: {m}")

    for s_ in info["scenes"]:
        for k, m in balance(s_):
            fail(k, m)

    # seams: one scene visible on each side of every cut
    for s in info["scenes"][1:]:
        for t in (s["start"] - 1 / 30, s["start"]):
            page.evaluate(SEEK_JS, t)
            n = page.evaluate("() => [...document.querySelectorAll('section.scene')].filter((s) => getComputedStyle(s).visibility === 'visible').length")
            if n != 1:
                fail("seams", f"t={t:.3f}: {n} scenes visible")
    browser.close()

if not SELF_TEST:  # self-test breakage is not a layout finding
    for w in warnings:
        print("WARN", w)  # verify-all.mjs lifts these lines into its summary
report = {"slug": slug, "self_test": SELF_TEST, "band": BAND, "samples": len(samples), "warnings": len(warnings), "snapshots": str(SNAP), "failures": failures}
print(json.dumps(report, indent=1))
if SELF_TEST:
    # only findings the injected breakage caused count: the unbroken run may already warn
    fresh = [f for f in failures + warnings if f not in baseline and (f.startswith(("[terminal]", "[frame0]")) or f" {sid}: " in f or f"] {sid}: " in f)]
    kinds = {f.split("]")[0][1:] for f in fresh}
    need = {"band", "overlap", "overflow", "balance"} | ({"terminal"} if terms else set()) | ({"wires"} if has_wires else set()) | ({"labels"} if has_labels else set()) | ({"frame0"} if leak_id else set())
    if need <= kinds:
        print("SELF-TEST OK: broken layout was caught by", sorted(need))
        sys.exit(0)
    print("SELF-TEST FAILED: missing", sorted(need - kinds))
    sys.exit(1)
sys.exit(1 if failures else 0)
