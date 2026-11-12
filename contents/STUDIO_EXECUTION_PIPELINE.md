# DevOps Motion Studio — Skills & 5-Agent Execution Pipeline

This document defines the specialized skill allocations, handoff order, and quality invariants for the 5-agent studio team.

---

## 🛠️ The 5-Agent Specialized Skill Allocation

| Employee Role | Primary Skill Set | Input Source | Output Deliverable | Gate Check |
|---|---|---|---|---|
| **1. Principal Researcher** (`architect`) | `backend-architect`, `c4-architecture`, `systematic-debugging` | Concept query & official docs | `contents/<slug>.md` | 5 Architectural Pillars verified |
| **2. Narrative Scriptwriter** (`scriptwriter`) | `data-storytelling`, `captions-overlay`, `avoid-ai-writing` | `contents/<slug>.md` | `src/<slug>/story.mjs` | `wps: 1.75`, Frame-0 hook, `say` phonetics |
| **3. Motion & GSAP Director** (`animator`) | `motion-doctrine`, `cut-the-curve`, `oversized-cursor`, `seam-craft` | `src/<slug>/story.mjs` | `src/<slug>/template.html` | Zero overlap, human cursor glide & tap, glowing SVG wire beads |
| **4. Voice Engineer** (`audio`) | VoiceStudio REST API (`v1/audio/speech`), `ffmpeg` | Story narrations & `say` substitutions | `videos/<slug>/assets/audio/` | Profile `51c11ae3`, silence trimming, 192k MP3 |
| **5. Pro Mastering & QC Editor** (`editor`) | `verify_reel.py`, `hyperframes`, `export-prores.mjs` | Compiled HTML & Audio | `videos/` & `renders/` | 200+ frame layout probe pass, 1080p MP4, ProRes Alpha, Git SSH push |

---

## 🔄 Strict Step-by-Step Execution Sequence

```
[Phase 1: Research] -> architect produces contents/<slug>.md
       │
       ▼ (Gate 1: Verifies root outage "Why", 3 Personas, CLI commands)
[Phase 2: Writing]  -> scriptwriter produces src/<slug>/story.mjs
       │
       ▼ (Gate 2: Verifies wps: 1.75 tempo, [[id|text]] tokens, phonetics)
[Phase 3: Visuals]  -> animator builds src/<slug>/template.html & connects src/shared/cursor.js
       │
       ▼ (Gate 3: Enforces KodeKloud cluster bounds, human cursor taps, zero-overlap transitions)
[Phase 4: Voice]    -> audio executes synthesize-cloned-audio.mjs with Profile 51c11ae3
       │
       ▼ (Gate 4: Trims dead air silences, verifies s1..s5.wav & narration.mp3)
[Phase 5: Master]   -> editor runs build-video.mjs, verify_reel.py, generate-thumbnails.mjs, & render-with-audio.mjs
       │
       ▼ (Gate 5: Automated 0-overlap layout pass -> git push origin main over SSH)
```

---

## 🎯 Modern Visual Standards & Invariants

1. **The Vector Motion Law (`motion-doctrine`)**:
   - Every cut follows continuous momentum (Scene A exit velocity matches Scene B entry velocity using mirrored `power4.in` and `power4.out`).
   - No idle sine-wave wobble: every scene element performs purposefully.
2. **Human Eye-Carrier (`oversized-cursor`)**:
   - The macOS arrow pointer enters from below (`top: 115%`), walks to the target element, performs an asymmetric tap (`scale: 0.82` for 80ms, springs to `1.0`), and ignites the traffic switch before drifting aside.
3. **Overlay Caption Law (`captions-overlay`)**:
   - Lower-third subtitles are active word overlays (`.w` highlights to `#8fb0ff`). The composition stays centered on the true canvas vertical center (`y = 960`).
4. **Opaque Stage Ground (`seam-craft`)**:
   - `#root { background: #070a13 }` prevents white-flash glitches between mid-motion cuts.
