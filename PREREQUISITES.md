# # Prerequisites & Environment Setup — `motion-devops`

This guide outlines every system dependency, global tool, MCP server, and AI skill required to autonomously research, animate, voice-clone, and render videos in this repository.

---

## 1. System Binaries & CLI Tools

Ensure these tools are installed and accessible in your `$PATH`:

| Tool | Recommended Version | Verification Command | Purpose |
|---|---|---|---|
| **Node.js** | `>= 20.x` (current: `v26.13.0`) | `node -v` | Core build system & GSAP compilation |
| **npm** | `>= 10.x` | `npm -v` | Dependency management |
| **FFmpeg** | `>= 7.x` (on `PATH`, or set `FFMPEG`/`FFPROBE`) | `ffmpeg -version` | Audio mixing, silence trimming, video muxing |
| **HyperFrames CLI** | `v0.9.37` (`which hyperframes`) | `hyperframes --version` | Headless Chromium rendering & frame extraction |
| **Python** | `>= 3.10` with `playwright` | `python3 -c "import playwright; print('OK')"` | Headless layout and 0-overlap testing |
| **OpenCode** | Latest (`which opencode`) | `opencode --version` | Autonomous AI coding agent |

---

## 2. VoiceStudio & Local Voice Cloning Setup

VoiceStudio provides local, private on-device voice cloning with zero cloud API latency or usage fees.

1. **Verify Backend Status**:
   ```bash
   lsof -i :3900
   ```
   *Expected: Process running on `127.0.0.1:3900`.*
2. **Verify Cloned Voice Profile**:
   ```bash
   curl -s http://127.0.0.1:3900/profiles | jq '.[] | {id, name}'
   ```
   *Target Profile:*
   - **Name**: `Devops`
   - **Profile ID**: `51c11ae3`
3. **OpenAI-Compatible Speech Endpoint**:
   `http://127.0.0.1:3900/v1/audio/speech`
4. **Zero Audio-Visual Drift Standard**:
   `scripts/synthesize-cloned-audio.mjs` pads silence per scene to the scene windows from `scripts/lib/timing.mjs` (the same module the build uses), `pad = scene.duration - lead - spokenDur`. If any scene's voice outlasts its picture (pad < 0.05 s) it exits 1 without writing `narration.mp3`; it also exits 1 if the master track drifts more than 0.1 s from `meta.total`. Rebuild the slug afterwards so the player picks up the track. Voice synthesis speed is pinned to `0.90` for crystal-clear educational tempo.

---

## 3. MCP Server Configuration (OpenCode & Claude)

OpenCode reads its MCP servers from `~/.config/opencode/opencode.jsonc`.

Verify the `mcp` block includes:
```jsonc
{
  "mcp": {
    "voicestudio": {
      "url": "http://127.0.0.1:3900/mcp/",
      "type": "remote"
    },
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "--registry", "https://registry.npmjs.org/", "@playwright/mcp@latest"],
      "enabled": true
    },
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "-y", "--registry", "https://registry.npmjs.org/", "chrome-devtools-mcp@latest"],
      "enabled": true
    }
  }
}
```

---

## 4. Installed Agent Skills

The following skills are pre-configured in `.skills/` and synchronized to `~/.agents/skills/`, `~/.claude/skills/`, and `~/.gemini/config/skills/`:

1. **`devops-deep-researcher`**: In-depth architectural research across all 6 DevOps stages (Code, CI, Supply Chain, GitOps, IaC/EKS, Day-2 Observability), disaster breaking points, live `kubectl` terminal fixes, and terminology glossaries.
2. **`motion-devops-creator`**: Video compilation, headless 200-frame layout audit, social thumbnail creation, and MP4/ProRes rendering.
3. **`oversized-cursor`**: Human-like macOS pointer animation with click-ignition and smooth drift.
4. **`captions-overlay`**: Active word-level subtitle lighting on the lower third.
5. **`motion-doctrine` & `cut-the-curve`**: Vector velocity continuity across scene transitions with zero white-flash glitches.

---

## 5. One-Shot Setup Verification Script

To verify all dependencies and MCP endpoints in one command, run:
```bash
node scripts/setup-opencode-engine.mjs
```
