# Agent Workflow Guide for `motion-devops`

This repository is optimized for autonomous coding agents (**OpenCode**, **Claude Code**, and **Gemini CLI**) to produce interactive, frame-seekable HyperFrames motion graphics for DevOps concepts.

---

## 🧭 Directory Layout

- `contents/<slug>.md`: Complete conceptual and architectural deep dive.
- `src/<slug>/story.mjs`: Timed storyboard, scene narrations (`[[id|Word]]` markers), and TTS pronunciations.
- `src/<slug>/template.html`: 1080x1920 DOM layout, SVG bezier wires, and GSAP timeline.
- `src/templates/`: Reusable KodeKloud-style vertical and landscape visual templates.
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

2. **`motion-devops-creator`** ([`.skills/motion-devops-creator/SKILL.md`](.skills/motion-devops-creator/SKILL.md)):
   - Complete video lifecycle: Storyboarding (`story.mjs`), HTML/GSAP compilation, headless Playwright layout testing, thumbnail generation, and MP4/ProRes rendering.

3. **`oversized-cursor`** (`src/shared/cursor.js`):
   - Human-like macOS pointer glides in from off-screen (`top: 115%`), walks to interactive elements, asymmetric click-taps (`scale: 0.82`), and ignites transitions.

4. **`captions-overlay`**:
   - Word-by-word subtitle highlight overlay on the lower third without vertical displacement of the main diagram.

5. **`motion-doctrine` & `cut-the-curve`**:
   - Vector continuity: matched exit/entry velocity across scene seams using mirrored `power4` easing. Zero idle wobble.

---

## ⚡ Execution Commands

| Action | Command |
|---|---|
| **Synthesize Cloned Voice** | `node scripts/synthesize-cloned-audio.mjs <slug> 51c11ae3` |
| **Compile HTML Video** | `node scripts/build-video.mjs <slug>` |
| **Verify Layout (Headless)** | `python3 scripts/verify_reel.py <slug>` |
| **Generate Thumbnails** | `node scripts/generate-thumbnails.mjs <slug>` |
| **Render MP4 with Voice (1080p)** | `node scripts/render-with-audio.mjs <slug> 1080` |
| **Render MP4 with Voice (4K)** | `node scripts/render-with-audio.mjs <slug> 4k` |
| **Export ProRes 4444 with Alpha** | `node scripts/export-prores.mjs <slug> mov` |

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
