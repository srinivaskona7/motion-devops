# New concept request

Copy this block, fill it in, and hand it to the agent (Claude Code, OpenCode, Gemini CLI) as the
prompt. Every field changes what gets built; a blank field means the agent picks and says so.

```text
Make a motion explainer.

Slug:        <kebab-case, e.g. istio-ambient-mesh>      (must not exist in src/ or videos/)
Title:       <shown in the brand bar and player>
Audience:    <e.g. platform engineers who know Kubernetes basics>
Breaking point: <the real production failure scene 1 shows, e.g. "sidecar upgrades restart every pod">
Lifecycle:   <the 3-6 steps the viewer must understand, in order>
Command:     <the one CLI command the terminal types, e.g. istioctl install --set profile=ambient>
Recap:       <3 takeaways + one "next" action>
Length:      <seconds, default 60; ~1.7 spoken words/s, so 60 s is about 90 words>
Sources:     <official docs to check; the agent cites them with dates in contents/<slug>.md>
Voice:       <synthesize with VoiceStudio 51c11ae3 | silent for now>
Commit:      <commit only | commit and push | neither>
```

## What the agent does with it

| Step | Command / file | Done when |
|---|---|---|
| Research | `contents/<slug>.md` (sections pre-made by the scaffold) | every TODO replaced, sources dated |
| Scaffold | `npm run new <slug> "<Title>"` | builds; passes the gate untouched |
| Story | `src/<slug>/story.mjs`: narration, `[[marks]]`, `meta.total` | build does not overrun `meta.total` |
| Picture | `src/<slug>/template.html` with `src/shared/stage.js` helpers | every mark drives an element |
| Gate | `node scripts/verify-all.mjs --browser <slug>` | all PASS, no WARN |
| Voice (optional) | `node scripts/synthesize-cloned-audio.mjs <slug> 51c11ae3`, then rebuild | synth exits 0 |

Renders, pushes and deploys stay with the user unless the request says otherwise.

## Rules the gate enforces on a new video

- Content inside the band: 10 % side margins, between `.topbar` and `.hud`; no overlaps or text overflow.
- Wires end on their cards and pass through no other card; labels cover no card, label or foreign wire.
- Each scene's diagram is centred under its headline (within 12 %) and fills at least 40 % of that space.
- Frame 0 shows the hook headline and nothing a later beat reveals.
- `meta.advisory` is refused for new videos: fix the layout instead.
