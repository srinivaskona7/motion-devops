// Standalone player for HyperFrames compositions opened directly (gallery, file://).
// Inside HyperFrames preview/render the runtime owns the clock and this stays inert.
// Lives in its own file so the composition script stays free of wall-clock APIs.
window.addEventListener("load", function () {
        const hosted = window.__hf || window.__player || window.__HF_VIRTUAL_TIME__ !== undefined || window.__renderReady !== undefined;
        if (hosted || /[?&]render\b/.test(location.search)) return;
        const tl = window.__timelines && window.__timelines.main;
        if (!tl) return;
        const root = document.getElementById("root");
        const W = +root.dataset.width, H = +root.dataset.height, TOTAL = +root.dataset.duration;
        document.body.classList.add("standalone");
        const fit = () => { const s = Math.min(innerWidth / W, (innerHeight - 70) / H); root.style.transform = "scale(" + s + ")"; root.style.margin = ((H * s - H) / 2) + "px " + ((W * s - W) / 2) + "px"; };
        fit(); addEventListener("resize", fit);

        const clips = Array.from(root.querySelectorAll(".clip")).map((el) => ({ el, s: +el.dataset.start, e: +el.dataset.start + +el.dataset.duration }));
        const cues = Array.from(root.querySelectorAll(".cue")).map((el) => ({ el, s: +el.dataset.start, e: +el.dataset.start + +el.dataset.duration, say: el.dataset.say }));
        const ui = document.createElement("div");
        ui.className = "player";
        ui.innerHTML = '<button id="pp">▶ Play</button><button id="vo" aria-pressed="false">🔊 Voice</button><input id="sk" type="range" min="0" max="' + TOTAL + '" step="0.01" value="0"><span id="tc">0:00 / ' + Math.floor(TOTAL / 60) + ':' + String(TOTAL % 60).padStart(2, "0") + '</span>';
        document.body.appendChild(ui);
        const gate = document.createElement("div");
        gate.className = "gate";
        gate.innerHTML = '<div><button class="primary" id="g-voice">▶ Play with voice</button><button id="g-mute">Play muted</button></div>';
        document.body.appendChild(gate);
        const pp = ui.querySelector("#pp"), vo = ui.querySelector("#vo"), sk = ui.querySelector("#sk"), tc = ui.querySelector("#tc");
        const tts = "speechSynthesis" in window;
        if (!tts) { vo.disabled = true; vo.title = "Web Speech API not available in this browser"; }
        let t = 0, playing = false, voice = false, last = performance.now(), spoken = -1;
        const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
        function render() {
          tl.seek(t, false);
          for (const c of clips) c.el.style.visibility = t >= c.s && t < c.e ? "visible" : "hidden";
          sk.value = t; tc.textContent = fmt(t) + " / " + fmt(TOTAL);
        }
        function speak() {
          if (!voice || !playing || !tts) return;
          const i = cues.findIndex((c) => t >= c.s && t < c.e);
          if (i < 0 || i === spoken) return;
          spoken = i;
          const u = new SpeechSynthesisUtterance(cues[i].say);
          u.rate = 0.98; u.lang = "en-US";
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        }
        function frame(now) {
          const dt = (now - last) / 1000; last = now;
          if (playing) { t = Math.min(TOTAL, t + dt); if (t >= TOTAL) setPlaying(false); }
          render(); speak();
          requestAnimationFrame(frame);
        }
        function setPlaying(v) { playing = v; pp.textContent = v ? "❚❚ Pause" : "▶ Play"; if (!v && tts) speechSynthesis.cancel(); spoken = -1; if (v && t >= TOTAL) t = 0; }
        function setVoice(v) { voice = v && tts; vo.setAttribute("aria-pressed", String(voice)); if (!voice && tts) speechSynthesis.cancel(); spoken = -1; }
        pp.onclick = () => setPlaying(!playing);
        vo.onclick = () => setVoice(!voice);
        sk.oninput = () => { t = +sk.value; spoken = -1; if (tts) speechSynthesis.cancel(); };
        gate.querySelector("#g-voice").onclick = () => { gate.remove(); setVoice(true); setPlaying(true); };
        gate.querySelector("#g-mute").onclick = () => { gate.remove(); setVoice(false); setPlaying(true); };
        addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); if (gate.isConnected) gate.remove(); setPlaying(!playing); } });
        const q = new URLSearchParams(location.search);
        if (q.has("t")) { t = Math.max(0, Math.min(TOTAL, +q.get("t") || 0)); gate.remove(); }
        render(); requestAnimationFrame(frame);
      });
