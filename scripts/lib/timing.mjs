// Narration → timeline. The single source of scene, reveal and caption timing:
// build-video.mjs renders it, synthesize-cloned-audio.mjs pads the voice to it.
// Changing anything here changes every built video (verify-all.mjs freshness will flag it).
export const MARK = /\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g;
export const r2 = (n) => Math.round(n * 1000) / 1000;

// ---- 1. tokenise narration into words, keyword flags and reveal marks ----
export function tokenise(text) {
  const words = []; // {w, kw}
  const marks = {}; // id -> word index
  let pending = []; // marks waiting for the next spoken word
  const pushPlain = (chunk) => {
    // punctuation glued to a keyword ("[[x|apply]],") belongs to that word
    const glue = chunk.match(/^[^\s]+/);
    if (glue && words.length && !pending.length) {
      words[words.length - 1].w += glue[0];
      chunk = chunk.slice(glue[0].length);
    }
    for (const w of chunk.split(/\s+/).filter(Boolean)) {
      for (const id of pending) marks[id] = words.length;
      pending = [];
      words.push({ w, kw: false });
    }
  };
  const setMark = (id, k) => {
    if (id in marks) throw new Error(`duplicate mark ${id}`);
    marks[id] = k;
  };
  let cursor = 0;
  let match;
  MARK.lastIndex = 0;
  while ((match = MARK.exec(text))) {
    pushPlain(text.slice(cursor, match.index));
    const [, id, spoken] = match;
    if (spoken) {
      setMark(id, words.length);
      for (const p of pending) setMark(p, words.length);
      pending = [];
      for (const w of spoken.split(/\s+/).filter(Boolean)) words.push({ w, kw: true });
    } else {
      if (id in marks || pending.includes(id)) throw new Error(`duplicate mark ${id}`);
      pending.push(id);
    }
    cursor = match.index + match[0].length;
  }
  pushPlain(text.slice(cursor));
  if (pending.length) throw new Error(`dangling marks ${pending}`);
  return { words, marks };
}

// ---- 2. timing ----
export function computeTiming(meta, scenes) {
  let t = 0;
  const timing = { scenes: [], reveals: {}, total: meta.total };
  const allCues = [];
  for (const [i, sc] of scenes.entries()) {
    const { words, marks } = tokenise(sc.narration);
    const start = t;
    const wordT = (k) => r2(start + meta.lead + k / meta.wps);
    let dur = meta.lead + words.length / meta.wps + meta.pad;
    const isLast = i === scenes.length - 1;
    const s = { id: sc.id, chapter: sc.chapter, start: r2(start), words: words.length };
    for (const [id, k] of Object.entries(marks)) {
      if (id in timing.reveals) throw new Error(`mark ${id} reused across scenes`);
      timing.reveals[id] = wordT(k);
    }
    // cues
    let cue = [];
    const cues = [];
    words.forEach((wd, k) => {
      cue.push({ ...wd, t: wordT(k) });
      const endsSentence = /[.?!]$/.test(wd.w);
      const softBreak = /[,;:]$/.test(wd.w) && cue.length >= 9;
      if (endsSentence || softBreak || cue.length >= 13) {
        cues.push(cue);
        cue = [];
      }
    });
    if (cue.length) cues.push(cue);
    // no orphan captions: a 1–2 word tail of a sentence joins the cue before it
    for (let k = cues.length - 1; k > 0; k--) {
      const prev = cues[k - 1];
      if (cues[k].length <= 2 && !/[.?!]$/.test(prev[prev.length - 1].w)) {
        prev.push(...cues[k]);
        cues.splice(k, 1);
      }
    }
    s.cues = cues;
    timing.scenes.push(s);
    t = start + dur;
    if (isLast) {
      if (t > meta.total + 0.001) {
        throw new Error(`narration overruns target: ${r2(t)}s > ${meta.total}s, trim words`);
      }
      dur = meta.total - start;
      t = meta.total;
    }
    s.duration = r2(dur);
  }
  // durations from rounded starts, so scene N ends exactly where N+1 begins (no 1ms overlap)
  timing.scenes.forEach((s, i, all) => {
    if (i < all.length - 1) {
      let d = r2(all[i + 1].start - s.start);
      while (s.start + d > all[i + 1].start) d = r2(d - 0.001); // float: start+dur must not pass the next start
      s.duration = d;
    }
  });
  // cue windows: until the next cue in the scene, else last word + 1.1s (inside the scene)
  for (const s of timing.scenes) {
    const end = s.start + s.duration;
    s.cues.forEach((c, k) => {
      const next = s.cues[k + 1];
      const cs = r2(c[0].t - 0.12);
      const ce = next ? r2(next[0].t - 0.12) : r2(Math.min(c[c.length - 1].t + 1.3, end - 0.6));
      allCues.push({ scene: s.id, start: cs, duration: r2(ce - cs), words: c });
    });
  }
  return { timing, allCues };
}
