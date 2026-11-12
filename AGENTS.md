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
