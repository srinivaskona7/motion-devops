// Standalone player for HyperFrames compositions opened directly (gallery, file://).
// Inside HyperFrames preview/render the runtime owns the clock and this stays inert.
// Playback uses GSAP's own ticker through tl.play(); no wall-clock APIs here.
window.addEventListener("load", function () {
  const hosted =
    window.__hf || window.__player || window.__HF_VIRTUAL_TIME__ !== undefined || window.__renderReady !== undefined;
  if (hosted || /[?&]render\b/.test(location.search)) return;
  const tl = window.__timelines && window.__timelines.main;
  if (!tl) return;
  const root = document.getElementById("root");
  const W = +root.dataset.width, H = +root.dataset.height, TOTAL = +root.dataset.duration;
  document.body.classList.add("standalone");
  const fit = () => {
    const s = Math.min(innerWidth / W, (innerHeight - 70) / H);
    root.style.transform = "scale(" + s + ")";
    root.style.margin = (H * s - H) / 2 + "px " + (W * s - W) / 2 + "px";
  };
  fit();
  addEventListener("resize", fit);

  const clips = Array.from(root.querySelectorAll(".clip")).map((el) => ({
    el, s: +el.dataset.start, e: +el.dataset.start + +el.dataset.duration,
  }));
  const cues = Array.from(root.querySelectorAll(".cue")).map((el) => ({
    s: +el.dataset.start, e: +el.dataset.start + +el.dataset.duration, say: el.dataset.say,
  }));

  const ui = document.createElement("div");
  ui.className = "player";
  ui.innerHTML =
    '<button id="pp">▶ Play</button><button id="vo" aria-pressed="false">🔊 Voice</button>' +
    '<input id="sk" type="range" min="0" max="' + TOTAL + '" step="0.01" value="0" aria-label="Seek">' +
    '<span id="tc"></span>';
  document.body.appendChild(ui);
  const gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML =
    '<div><button class="primary" id="g-voice">▶ Play with voice</button><button id="g-mute">Play muted</button></div>';
  document.body.appendChild(gate);

  const pp = ui.querySelector("#pp"), vo = ui.querySelector("#vo"), sk = ui.querySelector("#sk"), tc = ui.querySelector("#tc");
  
  // High-fidelity local cloned audio support (from VoiceStudio)
  // build-video.mjs adds <meta name="narration"> only when the track exists (no 404 otherwise)
  const narration = document.querySelector('meta[name="narration"]');
  const audioTrack = new Audio();
  if (narration) audioTrack.src = narration.content;
  let hasRealAudio = false;
  audioTrack.addEventListener("canplaythrough", () => {
    hasRealAudio = true;
    vo.textContent = "🎙️ Cloned Voice";
  });
  audioTrack.addEventListener("error", () => {
    hasRealAudio = false;
  });

  const tts = "speechSynthesis" in window;
  if (!tts && !hasRealAudio) { vo.disabled = true; vo.title = "Audio not available"; }
  let voice = true, spoken = -1, scrubbing = false;
  const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  function sync() {
    const t = tl.time();
    for (const c of clips) c.el.style.visibility = t >= c.s && t < c.e ? "visible" : "hidden";
    if (!scrubbing) sk.value = t;
    tc.textContent = fmt(t) + " / " + fmt(TOTAL);

    // Sync cloned master audio track
    if (hasRealAudio && voice && !tl.paused()) {
      if (Math.abs(audioTrack.currentTime - t) > 0.25) {
        audioTrack.currentTime = t;
      }
      if (audioTrack.paused) audioTrack.play().catch(() => {});
    }

    if (!voice || tl.paused() || hasRealAudio) return;
    const i = cues.findIndex((c) => t >= c.s && t < c.e);
    if (i < 0 || i === spoken) return;
    spoken = i;
    const u = new SpeechSynthesisUtterance(cues[i].say);
    u.rate = 0.98;
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  const hush = () => { 
    spoken = -1; 
    if (hasRealAudio) audioTrack.pause();
    if (tts) speechSynthesis.cancel(); 
  };
  tl.eventCallback("onUpdate", sync);
  tl.eventCallback("onComplete", () => setPlaying(false));

  function setPlaying(v) {
    if (v && tl.time() >= TOTAL - 0.05) {
      tl.seek(0);
      if (hasRealAudio) audioTrack.currentTime = 0;
    }
    v ? tl.play() : tl.pause();
    pp.textContent = v ? "❚❚ Pause" : "▶ Play";
    if (hasRealAudio && voice) {
      v ? audioTrack.play().catch(() => {}) : audioTrack.pause();
    }
    if (!v) hush();
  }
  function setVoice(v) {
    voice = v;
    vo.setAttribute("aria-pressed", String(voice));
    if (hasRealAudio) {
      if (!voice) audioTrack.pause();
      else if (!tl.paused()) audioTrack.play().catch(() => {});
    } else {
      if (!voice) hush();
    }
  }
  pp.onclick = () => setPlaying(tl.paused());
  vo.onclick = () => setVoice(!voice);
  sk.oninput = () => { scrubbing = true; hush(); tl.seek(+sk.value); sync(); };
  sk.onchange = () => { scrubbing = false; };
  const start = (withVoice) => { gate.remove(); setVoice(withVoice); setPlaying(true); };
  gate.querySelector("#g-voice").onclick = () => start(true);
  gate.querySelector("#g-mute").onclick = () => start(false);
  addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    if (gate.isConnected) return start(false);
    setPlaying(tl.paused());
  });
  const q = new URLSearchParams(location.search);
  if (q.has("t")) { gate.remove(); tl.seek(Math.max(0, Math.min(TOTAL, +q.get("t") || 0))); }
  if (q.has("autoplay")) { gate.remove(); setPlaying(true); }
  sync();
});
