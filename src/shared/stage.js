// Shared scene runtime for motion-devops templates (used by src/templates/starter and every video
// scaffolded from it). Deterministic: no wall clock, no randomness, geometry measured once at build.
//
//   const S = MotionStage.create({ tl, REVEAL, SCENES, TOTAL, W, H });
//   S.seams();                         // cut-the-curve seams on each scene's .cam, axis from meta.seams
//   S.reveal("#s1-api", S.at("s1-api"));
//   S.cursor().tap("s1-api", S.at("s1-fail"));   // tip lands on the card's centre, click, exit
//   S.wires();                         // every path.wire[data-from][data-to]: route, fade, packets, labels
//
// Wire attributes: data-from / data-to (card ids), data-on (mark: fade in), data-axis ("x" | "y"),
// data-fail (mark: packets freeze red), data-label (text placed clear of every box in the stage).
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";

  function create({ tl, REVEAL, SCENES, TOTAL, W, H, seamX = 130, seamY = 260 }) {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const at = (id) => {
      if (!(id in REVEAL)) throw new Error("missing reveal mark " + id);
      return REVEAL[id];
    };
    const sc = Object.fromEntries(SCENES.map((s) => [s.id, s]));

    // ---- reveals and states ----
    const IN = { opacity: 0, y: 22, filter: "blur(6px)" };
    const SHOW = { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power3.out" };
    const reveal = (sel, t, extra = {}) => tl.fromTo(sel, { ...IN }, { ...SHOW, ...extra }, t);
    // pop: for elements that must not drift (badges, notes): opacity only
    const pop = (sel, t) => tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, t);
    const state = (id, t, color, swapTo) => {
      tl.to("#" + id, { "--ind": color, "--bd": color, duration: 0.3, ease: "power2.out" }, t);
      if (swapTo) {
        tl.to("#" + id + " .sw > span:not(." + swapTo + ")", { opacity: 0, y: -10, duration: 0.25, ease: "power2.in" }, t);
        tl.fromTo("#" + id + " .sw ." + swapTo, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, t + 0.12);
      }
    };
    const hit = (id, t, color) =>
      tl.fromTo("#" + id, { boxShadow: "0 0 0 0px " + color }, { boxShadow: "0 0 0 4px " + color + ", 0 0 46px -4px " + color, duration: 0.22, ease: "power2.out", yoyo: true, repeat: 1 }, t);
    // typewriter into [data-text]; returns the time typing ends
    const type = (id, t0, cps = 22) => {
      const el = $("#" + id), text = el.dataset.text, o = { n: 0 };
      const dur = text.length / cps;
      tl.fromTo(o, { n: 0 }, { n: text.length, duration: dur, ease: "none", onUpdate: () => { el.textContent = text.slice(0, Math.round(o.n)); } }, t0);
      return t0 + dur;
    };

    // ---- seams: exit power4.in / entry power4.out on the incoming scene's axis ----
    function seams() {
      SCENES.forEach((s, i) => {
        const cam = "#" + s.id + "-cam";
        const next = SCENES[i + 1];
        if (i > 0) {
          const ax = s.axis ?? "x", d = ax === "y" ? seamY : seamX;
          tl.fromTo(cam, { [ax]: d, opacity: 0.35, filter: "blur(8px)" },
            { [ax]: 0, filter: "blur(0px)", duration: 0.42, ease: "power4.out", immediateRender: false }, s.start);
          tl.to(cam, { opacity: 1, duration: 0.18, ease: "power2.out" }, s.start);
          // every headline word takes the from-state at the cut, then the waterfall staggers in
          const words = $$(cam + " .head .hw");
          if (words.length) {
            tl.set(words, { opacity: 0.35, [ax]: 60 }, s.start);
            tl.fromTo(words, { opacity: 0.35, [ax]: 60 }, { opacity: 1, [ax]: 0, duration: 0.36, ease: "power4.out", stagger: 0.045, immediateRender: false }, s.start + 0.04);
          }
        }
        if (next) {
          const ax = next.axis ?? "x", d = ax === "y" ? seamY : seamX;
          tl.to(cam, { [ax]: -d, filter: "blur(8px)", duration: 0.34, ease: "power4.in" }, next.start - 0.34);
          tl.to(cam, { opacity: 0, duration: 0.28, ease: "power2.in" }, next.start - 0.3);
        }
        const ch = $("#ch-" + s.id);
        if (ch) tl.fromTo(ch, { scaleX: 0 }, { scaleX: 1, duration: s.duration, ease: "none" }, s.start);
      });
    }

    // layout box of el relative to an ancestor (offsets ignore transforms: the settled position)
    function boxIn(el, anc) {
      let x = 0, y = 0, n = el;
      while (n && n !== anc) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return n === anc ? { x, y, w: el.offsetWidth, h: el.offsetHeight } : null;
    }

    // ---- oversized macOS cursor: enters from below the frame, taps a target's centre, leaves ----
    function cursor() {
      const root = $("#root");
      const el = document.createElement("div");
      el.className = "human-cursor";
      el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M5.5 3.21V20.8c0 .45.54 .67 .85 .35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85 .35z" fill="#ffffff" stroke="#1c1c1c" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
      root.appendChild(el);
      const PARK = { x: W * 0.5, y: H * 1.15 };
      gsap.set(el, PARK);
      // the arrow tip sits at (5.5, 3.2) of the 24-unit viewBox
      const TIP = { x: (5.5 / 24) * 68, y: (3.2 / 24) * 68 };
      return {
        el,
        tap(id, t, { hold = 0.4 } = {}) {
          const target = $("#" + id);
          const b = target && boxIn(target, root);
          if (!b) throw new Error("cursor target #" + id + " has no layout");
          const to = { x: b.x + b.w / 2 - TIP.x, y: b.y + b.h / 2 - TIP.y };
          tl.fromTo(el, { ...PARK }, { ...to, duration: 0.7, ease: "power3.out", immediateRender: false }, t - 0.7);
          tl.to(el, { scale: 0.82, duration: 0.08, ease: "power2.in" }, t);
          tl.to(el, { scale: 1.0, duration: 0.18, ease: "power2.out" }, t + 0.08);
          tl.to(el, { ...PARK, duration: 0.5, ease: "power2.in" }, t + 0.26 + hold);
          return t;
        },
      };
    }

    // ---- wires: route between card edges, fade in, packets, labels placed clear of boxes ----
    function wires({ speed = 220, beads = 4, boxes = ".card, .term, .badge, .note, .yaml, .banner" } = {}) {
      const paths = $$("path.wire");
      const route = (p) => {
        const stage = p.closest(".stage");
        const a = $("#" + p.dataset.from), b = $("#" + p.dataset.to);
        if (!stage || !a || !b) throw new Error("wire needs data-from/data-to inside a .stage: " + (p.dataset.from || "?"));
        const A = boxIn(a, stage), B = boxIn(b, stage);
        if (!A || !B) throw new Error("wire endpoint outside its stage: " + p.dataset.from + " -> " + p.dataset.to);
        const ac = { x: A.x + A.w / 2, y: A.y + A.h / 2 }, bc = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
        const dx = bc.x - ac.x, dy = bc.y - ac.y, gap = 8;
        const horiz = p.dataset.axis ? p.dataset.axis === "x" : Math.abs(dx) > Math.abs(dy);
        let s, e, c1, c2;
        if (horiz) {
          const sx = Math.sign(dx) || 1;
          s = { x: ac.x + sx * (A.w / 2 + gap), y: ac.y }; e = { x: bc.x - sx * (B.w / 2 + gap), y: bc.y };
          const k = (e.x - s.x) * 0.5; c1 = { x: s.x + k, y: s.y }; c2 = { x: e.x - k, y: e.y };
        } else {
          const sy = Math.sign(dy) || 1;
          s = { x: ac.x, y: ac.y + sy * (A.h / 2 + gap) }; e = { x: bc.x, y: bc.y - sy * (B.h / 2 + gap) };
          const k = (e.y - s.y) * 0.5; c1 = { x: s.x, y: s.y + k }; c2 = { x: e.x, y: e.y - k };
        }
        const f = (v) => v.toFixed(1);
        p.setAttribute("d", `M${f(s.x)},${f(s.y)} C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(e.x)},${f(e.y)}`);
        return stage;
      };
      const N = 160;
      const ks = paths.map((p) => {
        const stage = route(p);
        const len = p.getTotalLength();
        if (!(len >= 1)) throw new Error("degenerate wire " + p.dataset.from + " -> " + p.dataset.to);
        const pts = Array.from({ length: N + 1 }, (_, i) => { const q = p.getPointAtLength((i / N) * len); return [q.x, q.y]; });
        const kind = ["ok", "bad", "warn"].find((c) => p.classList.contains(c));
        const bs = Array.from({ length: beads }, () => {
          const b = document.createElementNS(SVGNS, "circle");
          b.setAttribute("r", "6"); b.setAttribute("class", "bead" + (kind ? " " + kind : "")); b.setAttribute("opacity", "0");
          p.parentNode.appendChild(b);
          return b;
        });
        return { p, stage, len, pts, kind, beads: bs, label: null, on: at(p.dataset.on), fail: p.dataset.fail ? at(p.dataset.fail) : null, scene: sc[p.closest(".scene").id] };
      });
      // labels: try spots beside the wire, keep the first that touches no box, no other label, no wire
      for (const k of ks) {
        if (!k.p.dataset.label) continue;
        const t = document.createElementNS(SVGNS, "text");
        t.setAttribute("class", "wire-label"); t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "central"); t.setAttribute("opacity", "0");
        t.textContent = k.p.dataset.label;
        k.p.parentNode.appendChild(t);
        k.label = t;
        const obstacles = $$(boxes, k.stage).filter((el) => !el.closest("svg")).map((el) => boxIn(el, k.stage)).filter(Boolean);
        const taken = ks.filter((o) => o.label && o !== k && o.stage === k.stage).map((o) => o.labelBox);
        const others = ks.filter((o) => o !== k && o.stage === k.stage);
        const hits = (r, b, pad = 4) => r.x < b.x + b.w + pad && r.x + r.w > b.x - pad && r.y < b.y + b.h + pad && r.y + r.h > b.y - pad;
        const tw = t.getComputedTextLength() + 10, th = 24;
        let best = null;
        for (const u of [0.5, 0.4, 0.6, 0.3, 0.7]) {
          const i = Math.round(u * N), [x, y] = k.pts[i], [x2, y2] = k.pts[Math.min(N, i + 1)];
          const l = Math.hypot(x2 - x, y2 - y) || 1, nx = -(y2 - y) / l, ny = (x2 - x) / l;
          for (const off of [22, -22, 34, -34, 48, -48]) {
            // centre the box `off` px off the wire plus its own half-extent along the normal
            const d = off + Math.sign(off) * (Math.abs(nx) * tw / 2 + Math.abs(ny) * th / 2);
            const cx = x + nx * d, cy = y + ny * d;
            const r = { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
            if (obstacles.some((b) => hits(r, b)) || taken.some((b) => hits(r, b, 2))) continue;
            if (k.pts.some(([px, py]) => hits(r, { x: px, y: py, w: 0, h: 0 }, 3))) continue;
            if (others.some((o) => o.pts.some(([px, py]) => hits(r, { x: px, y: py, w: 0, h: 0 }, 3)))) continue;
            best = { cx, cy, r };
            break;
          }
          if (best) break;
        }
        if (!best) throw new Error(`no clear spot for wire label "${k.p.dataset.label}": give the wire more room`);
        t.setAttribute("x", best.cx.toFixed(1)); t.setAttribute("y", best.cy.toFixed(1));
        k.labelBox = best.r;
      }
      // fade-in and fail colour on the timeline
      for (const k of ks) {
        tl.fromTo(k.p, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out", immediateRender: true }, k.on);
        if (k.fail !== null) tl.to(k.p, { stroke: "rgba(244,63,94,0.75)", duration: 0.3 }, k.fail);
      }
      const pointAt = (k, u) => { const f = u * N, i = Math.min(N - 1, Math.floor(f)), r = f - i, a = k.pts[i], b = k.pts[i + 1]; return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]; };
      const clock = { t: 0 };
      // render callback reads only precomputed geometry and the clock (safe under jump-seeks)
      function tick() {
        const t = clock.t;
        for (const k of ks) {
          if (t < k.scene.start || t >= k.scene.start + k.scene.duration) continue;
          const since = t - k.on, failed = k.fail !== null && t >= k.fail;
          const tt = failed ? k.fail - k.on : since;
          const vis = since <= 0 ? 0 : Math.min(1, since / 0.6);
          k.beads.forEach((b, j) => {
            const u = ((((tt * speed) / k.len + j / k.beads.length) % 1) + 1) % 1;
            const [x, y] = pointAt(k, u);
            const edge = failed ? 1 : Math.min(1, u / 0.12, (1 - u) / 0.12);
            b.setAttribute("cx", x.toFixed(1)); b.setAttribute("cy", y.toFixed(1));
            b.setAttribute("opacity", (vis * edge * (failed ? 0.8 : 1)).toFixed(3));
            b.setAttribute("class", "bead" + (failed ? " bad" : k.kind ? " " + k.kind : ""));
          });
          if (k.label) k.label.setAttribute("opacity", vis.toFixed(3));
        }
      }
      tl.fromTo(clock, { t: 0 }, { t: TOTAL, duration: TOTAL, ease: "none", onUpdate: tick }, 0);
      return ks;
    }

    // ---- captions: word highlight + cue rise (cues are built from story.mjs) ----
    function captions() {
      $$(".cue .w").forEach((w) => {
        const t = parseFloat(w.dataset.t);
        tl.fromTo(w, { color: "rgba(233,238,248,0.4)" }, { color: w.classList.contains("kw") ? "#8fb0ff" : "rgba(233,238,248,1)", duration: 0.16, ease: "none", immediateRender: false }, t);
      });
      $$(".cue").forEach((cue) => {
        tl.fromTo(cue, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, ease: "power3.out" }, parseFloat(cue.dataset.start));
      });
    }

    return { $, $$, at, sc, IN, SHOW, reveal, pop, state, hit, type, seams, cursor, wires, captions };
  }

  window.MotionStage = { create };
})();
