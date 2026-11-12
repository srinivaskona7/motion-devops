#!/usr/bin/env bash
# ==============================================================================
# setup-env.sh — One-Click Universal Setup Script for motion-devops
# Works on macOS & Linux across OpenCode, Claude Code, and Gemini.
# ==============================================================================
set -euo pipefail

echo ""
echo "🚀 INITIALIZING UNIVERSAL MOTION-DEVOPS ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required. Please install Node >= 20.x."
  exit 1
fi
echo "✅ Node.js: $(node -v)"

# 2. Check FFmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "⚠️ FFmpeg not found in PATH. Please install ffmpeg (e.g. brew install ffmpeg)."
else
  echo "✅ FFmpeg: $(ffmpeg -version | head -n 1)"
fi

# 3. Check HyperFrames CLI
if ! command -v hyperframes >/dev/null 2>&1; then
  echo "📦 Installing HyperFrames CLI globally..."
  npm install -g hyperframes@0.9.37
else
  echo "✅ HyperFrames CLI: $(hyperframes --version 2>/dev/null || echo 'installed')"
fi

# 3b. Python playwright + Chromium (needed by npm run verify: verify_reel.py, headless_check.py)
if python3 -c "import playwright" >/dev/null 2>&1; then
  echo "✅ Python playwright: installed"
else
  echo "📦 Installing Python playwright + Chromium..."
  python3 -m pip install --user playwright && python3 -m playwright install chromium
fi

# 4. Install repo dependencies
echo "📦 Installing project dependencies..."
npm install

# 5. Sync in-repo skills to global agent directories
echo "🔗 Syncing skills to ~/.agents/skills, ~/.claude/skills, ~/.gemini/config/skills..."
SKILLS_SRC="$ROOT_DIR/.skills"

for TARGET in "$HOME/.agents/skills" "$HOME/.claude/skills" "$HOME/.gemini/config/skills"; do
  mkdir -p "$TARGET"
  if [ -d "$SKILLS_SRC" ]; then
    cp -R "$SKILLS_SRC/"* "$TARGET/" 2>/dev/null || true
  fi
done
echo "✅ Skills synchronized across all agent systems."

# 6. Configure OpenCode MCP Settings
OPENCODE_CONFIG="$HOME/.config/opencode/opencode.jsonc"
if [ -f "$OPENCODE_CONFIG" ]; then
  echo "⚙️  Configuring OpenCode MCP for VoiceStudio..."
  node "$ROOT_DIR/scripts/setup-opencode-engine.mjs"
fi

echo ""
echo "🎉 ENVIRONMENT READY ON THIS MACHINE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verify every video (static + headless):"
echo "  npm test && npm run verify"
echo "To test an interactive video:"
echo "  open videos/k8s-api-gateway/index.html?autoplay=1"
echo ""
