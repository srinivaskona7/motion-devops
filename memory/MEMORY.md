# Repository Memory — Universal Tech Motion Studio

## 1. Project Invariants & Purpose
- **Goal**: Autonomous generation of cinematic, frame-accurate HyperFrames motion explainers for **ANY technology concept** (AI/ML & LLMs, Backend Distributed Systems, Databases, Security/Crypto, Frontend/Mobile, Cloud & DevOps).
- **Universal Technology Coverage**:
  - `AI & LLMs`: Transformers, Attention, RAG, Quantization, Vector Search.
  - `Distributed Systems & Backend`: Kafka, Raft, gRPC, Redis, Microservices, Event Sourcing.
  - `Databases`: PostgreSQL MVCC, LSM-trees vs B-Trees, ClickHouse Columnar, DynamoDB.
  - `Frontend & Systems`: React Server Components, WebAssembly, WebGL, Browser rendering.
  - `Security & Networking`: Zero-Knowledge Proofs, OAuth2/OIDC, mTLS, Linux eBPF.
  - `Cloud & DevOps`: Kubernetes, Istio, Docker, Terraform, Cloud Fabric.
- **Formats Supported**:
  - `9:16 Vertical` (`1080x1920`): Optimized for YouTube Shorts, Instagram Reels, TikTok.
  - `16:9 Landscape` (`1920x1080`): Optimized for YouTube, technical presentations, documentation.
- **Audio Identity**: Local VoiceStudio voice cloning using profile **`Devops`** (`ID: 51c11ae3`).
- **Pacing Standard**: Educational tempo **1.75 Words Per Second** (`wps: 1.75`) with synthesis voice speed **`0.90`** (`speed: 0.90`) for clear, measured articulation without rush.
- **Audio-Visual Zero Drift Invariant**: Dynamic padding equation `pad = Math.max(0.2, visualScene.duration - lead - spokenDur)` ensures every scene audio file exactly matches the timeline scene duration, preventing accumulated audio-visual drift across multi-scene reels.
- **DOM Layout & Clearance Invariants (0 Overlap Guarantee)**:
  - **Topbar Clearance**: For 7-chapter timelines, `.topbar { left: 80px; right: 80px; }` and `.chap { width: 96px; letter-spacing: 0.08em; }` to fit long uppercase titles (e.g. `TROUBLESHOOT`, `CONTROL PLANE`) without text wrapping or clipping.
  - **Bound Box Vertical Clearance**: Pill labels (`.bound .bl`) occupy space down to `+20px`. The first card inside any `.bound` MUST start at `top: 430px` or greater (when bound top is 380px/400px) to provide >= 30px clearance.
  - **Bound Box Stacking Heights**: Stacking 4 cards of 86px height + gaps requires bound container `height >= 480px` to prevent child cards from bursting out through the container boundary.

---

## 2. Directory Layout & Module Tree

```
motion-devops/
├── .skills/                              <- In-repo skill packages
│   ├── devops-deep-researcher/           <- Production research & 6-stage lifecycle
│   └── motion-devops-creator/            <- Build, test, render, and export workflows
├── contents/                             <- All deep-dive research briefs (<slug>.md)
├── memory/
│   └── MEMORY.md                         <- Single source of truth for repository state
├── scripts/
│   ├── build-video.mjs                   <- Compiles src/<slug> into videos/<slug>/index.html
│   ├── export-prores.mjs                 <- Exports Apple ProRes 4444 with Alpha (.mov)
│   ├── generate-thumbnails.mjs           <- Captures click-ready social cover thumbnails
│   ├── render-video.mjs                  <- Headless video renderer via HyperFrames CLI
│   ├── render-with-audio.mjs             <- Muxes cloned voice narration with video stream
│   ├── setup-opencode-engine.mjs         <- Auto-configures OpenCode MCP & tools
│   ├── synthesize-cloned-audio.mjs       <- Queries local VoiceStudio API (profile 51c11ae3)
│   ├── verify-video.mjs                  <- Node layout verifier
│   └── verify_reel.py                    <- Headless 200+ frame layout probe (0 overlaps)
├── src/
│   ├── shared/
│   │   ├── cursor.js                     <- Human-like oversized cursor driver
│   │   ├── player.js                     <- Standalone interactive audio-visual player
│   │   └── vendor/gsap-3.12.5.min.js     <- Bundled GSAP animation engine
│   └── templates/
│       └── kodekloud-vertical/           <- Reusable KodeKloud-style structural template
├── videos/                               <- Compiled self-contained HTML video players
├── renders/                              <- Rendered MP4 videos, ProRes exports, thumbnails
├── AGENTS.md                             <- Agent instructions & execution commands
├── CLAUDE.md                             <- Symlink to AGENTS.md
└── PREREQUISITES.md                      <- Full system dependencies & MCP guide
```

---

## 3. Autonomous Execution Workflow for Any Concept

When given a concept (e.g. `k8s-api-gateway` or `devops-roadmap-ecommerce`):

1. **Research Brief**: Author `contents/<slug>.md` covering the breaking point ("Why"), 3 Personas, traffic flows, and live CLI fixes.
2. **Storyboard**: Author `src/<slug>/story.mjs` setting `wps: 1.75`, word reveal tokens `[[id|text]]`, and phonetics in `say`.
3. **DOM Template**: Author `src/<slug>/template.html` using structural containers (`cluster · prod`), glowing SVG packet paths, and `src/shared/cursor.js`.
4. **Voice Synthesis**:
   ```bash
   node scripts/synthesize-cloned-audio.mjs <slug> 51c11ae3
   ```
5. **Compilation & Headless Audit**:
   ```bash
   node scripts/build-video.mjs <slug>
   python3 scripts/verify_reel.py <slug>
   ```
6. **Rendering**:
   ```bash
   node scripts/generate-thumbnails.mjs <slug>
   node scripts/render-with-audio.mjs <slug> 1080
   ```
7. **Local Preview Link**:
   `open "videos/<slug>/index.html?autoplay=1"`
