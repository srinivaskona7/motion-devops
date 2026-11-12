# Agent Workflow Guide for `motion-devops`

This repository is optimized for autonomous coding agents (**OpenCode**, **Claude Code**, and **Gemini CLI**) to produce interactive, frame-seekable HyperFrames motion graphics for DevOps concepts.

---

## 🧭 Directory Layout

- `contents/<slug>.md`: Complete conceptual and architectural deep dive.
- `src/<slug>/story.mjs`: Timed storyboard, scene narrations (`[[id|Word]]` markers), and TTS pronunciations.
- `src/<slug>/template.html`: 1080x1920 DOM layout, SVG bezier wires, and GSAP timeline.
- `src/templates/starter/`: the 9:16 scaffold `npm run new` copies (3 scenes, shared runtime `src/shared/stage.js`).
- `docs/NEW_CONCEPT_REQUEST.md`: what to hand an agent when asking for a new concept.
- `videos/<slug>/index.html`: Compiled self-contained HTML video player.
- `videos/<slug>/assets/audio/`: VoiceStudio cloned voice tracks (`s1.wav`..`s5.wav`, `narration.mp3`).
- `renders/<slug>/`: Rendered high-bitrate MP4s and cover thumbnails.

---

---

## 🧩 Configured Skills & Roles

Every autonomous agent session in this repository has immediate access to these in-repo skills:

1. **`universal-tech-researcher`** ([`.skills/universal-tech-researcher/SKILL.md`](.skills/universal-tech-researcher/SKILL.md)):
   - Cross-domain systems research across **ANY software, hardware, or cloud technology**:
     - *AI & LLMs*: Attention heads, Transformer decoders, RAG vector retrieval, vLLM paging.
     - *Distributed Systems*: Raft consensus, Kafka log compaction, gRPC Protobuf streams.
     - *Databases*: Postgres MVCC dead tuples, LSM-tree memtables/SSTables, ClickHouse sparse indexes.
     - *Security & Cryptography*: Zero-Knowledge Proofs, OAuth2 PKCE, mTLS handshakes.
     - *Frontend & Runtimes*: React Server Components, V8 JIT compilers, WebAssembly modules.
     - *Cloud & Infrastructure*: Kubernetes Gateway API, eBPF packet tracing, Istio Ambient mesh.

2. **`devops-deep-researcher`** ([`.skills/devops-deep-researcher/SKILL.md`](.skills/devops-deep-researcher/SKILL.md)):
   - Production infrastructure scenarios, 6-stage lifecycle, and live EKS platform breakdowns.

3. **`motion-devops-creator`** ([`.skills/motion-devops-creator/SKILL.md`](.skills/motion-devops-creator/SKILL.md)):
   - Complete video lifecycle: Storyboarding (`story.mjs`), HTML/GSAP compilation, headless Playwright layout testing, thumbnail generation, and MP4/ProRes rendering.

4. **`oversized-cursor`** (`src/shared/cursor.js`):
   - Human-like macOS pointer glides in from off-screen (`top: 115%`), walks to interactive elements, asymmetric click-taps (`scale: 0.82`), and ignites transitions.

5. **`captions-overlay`**:
   - Word-by-word subtitle highlight overlay on the lower third without vertical displacement of the main diagram.

6. **`motion-doctrine` & `cut-the-curve`**:
   - Vector continuity: matched exit/entry velocity across scene seams using mirrored `power4` easing. Zero idle wobble.

---

## ⚡ Execution Commands

| Action | Command |
|---|---|
| **New concept (scaffold + build)** | `npm run new <slug> "<Title>"` (add `-- --brand "K8S · TOPIC"`) |
| **Compile HTML Video** | `node scripts/build-video.mjs <slug>` |
| **Synthesize Cloned Voice** (then rebuild) | `node scripts/synthesize-cloned-audio.mjs <slug> 51c11ae3` |
| **Static gate, all videos (CI runs this)** | `npm test` |
| **Full gate: layout, seams, player, hyperframes** | `npm run verify` (or `node scripts/verify-all.mjs --browser <slug>`) |
| **Generate Thumbnails** | `node scripts/generate-thumbnails.mjs <slug>` |
| **Render MP4 with Voice (1080p)** | `node scripts/render-with-audio.mjs <slug> 1080` |
| **Render MP4 with Voice (4K)** | `node scripts/render-with-audio.mjs <slug> 4k` |
| **Export ProRes 4444 with Alpha** | `node scripts/export-prores.mjs <slug> mov` |

### New concept workflow
0. Start from a filled `docs/NEW_CONCEPT_REQUEST.md` (topic, audience, failure to show, length, sources).
1. Research into `contents/<slug>.md` (`universal-tech-researcher` / `devops-deep-researcher`).
2. `npm run new <slug> "<Title>"`: copies `src/templates/starter/` (3 scenes, 9:16, inline) and builds it.
   The untouched scaffold already passes `node scripts/verify-all.mjs --browser <slug>`: keep it that way
   after every edit.
3. Edit `story.mjs` (narration, `[[marks]]`, `meta.total`, `meta.seams`) and `template.html` (cards and
   wires in stage-local px). Use the shared runtime `src/shared/stage.js` (`MotionStage.create`):
   `seams()`, `reveal`/`pop`/`state`/`hit`, `type()`, `cursor().tap()`, `wires()`, `captions()`.
   `wires()` throws if a label has no clear spot; move cards rather than silence it.
4. New videos gate every layout check (wires, labels, balance included). `meta.advisory` exists only
   for the four videos that predate those checks; never add it to a new video.

### Done means `npm run verify` is green
- **Never hand-edit `videos/`**: it is generated. `fresh` fails if the committed build differs from `src/`.
- Every `[[mark]]` in `story.mjs` must drive something (an element id, `at("mark")`, `data-on`).
- One GSAP for every video: `src/shared/vendor/gsap-3.12.5.min.js` (the default in `build-video.mjs`).
- Scene/caption timing lives only in `scripts/lib/timing.mjs`; the voice synth pads to the same windows
  and refuses to write `narration.mp3` if a scene's voice outlasts its picture.
- Layout band is derived per template: 10% side margins, between `.topbar` and `.hud`.
- Changing a verifier? Prove it still fails on bad input: `node scripts/test-verifiers.mjs`,
  `python3 scripts/verify_reel.py <dir> --self-test`.
- `CLAUDE.md` and `GEMINI.md` are relative symlinks to this file: edit `AGENTS.md` only.

---

## 🚨 Git Push Rule (Mandatory)
Authentication is pre-configured via SSH (`git@github.com:...`).
Always commit and push:
```bash
git add contents/ src/ videos/ scripts/
git commit -m "feat(<slug>): add motion explainer with cloned voice"
git push origin main
```
Never run `gh auth login` or convert remotes to HTTPS.
