# Build & verification pipeline

What exists, what it costs, what it deliberately does not do. Update this with any pipeline change.

## Flow

```
src/<slug>/story.mjs ─┐                         ┌─> videos/<slug>/index.html (+ -reel/ if both formats)
src/<slug>/template ──┼─> scripts/build-video ──┼─> SCRIPT.md, ledger.json (meta.seams), meta.json
scripts/lib/timing ───┘          ▲              └─> <meta name="narration"> if the track exists
                                 │
scripts/synthesize-cloned-audio ─┘ (same timing module; writes videos/<slug>/assets/audio/)
```

## Gates

| Command | Runs | Cost | Proves |
|---|---|---|---|
| `npm test` (CI) | `verify-all.mjs` static + `test-verifiers.mjs` | ~2 s, node only | committed `videos/` == fresh build of `src/`; root size/duration; every mark drives something; no wall-clock/random/network in our code; captions ordered and timed; verifiers still fail on injected defects |
| `npm run verify` | + `verify_reel.py`, its `--self-test`, `headless_check.py`, `hyperframes check`, seam-gate | ~2-4 min per video, Chromium | layout band / overlap / overflow at 0.5 s samples; one caption per spoken word; terminals typed; packets live after jump-seek; one scene per cut frame; player plays, deep-links, stays inert under `?render`; HyperFrames lint, layout, contrast; seam velocity matching; wire routing (ends on its cards, through no other box), label placement, diagram balance; frame 0 shows no later beat. `meta.advisory` downgrades wires/labels/balance to WARN (the 4 pre-existing videos only) |
| `npm run new <slug> "<Title>"` | copies `src/templates/starter/`, fills slug/title/brand, writes a `contents/` brief stub, builds | ~1 s | refuses an existing `src/<slug>` or `videos/<slug>`, and `{{`/`}}`/`@@` in title/brand; removes what it wrote if the build fails |
| `verify-starter.mjs` (end of `npm test`; `--browser` at end of `npm run verify`) | scaffolds the starter into a temp copy of the repo and runs `verify-all` there | ~3 s static, ~1 min browser | the untouched scaffold passes the gate with no WARN, so a `stage.js` or starter edit that breaks new videos fails the gate |

## Invariants and where they are enforced

| Invariant | Enforced by |
|---|---|
| `videos/` is generated, never hand-edited | `fresh` in `verify-all.mjs` |
| One timing source for picture, captions and voice | `scripts/lib/timing.mjs`; synth exits 1 on voice overrun or >0.1 s drift |
| One GSAP build (vendored 3.12.5) | `build-video.mjs` default; `verify_reel.py` compares the runtime version |
| Stage content clears the template's own chrome | `verify_reel.py` band = 10% side margins, `.topbar` bottom .. `.hud` top |
| `--self-test` breaks real elements of *this* video | picks 3 titled `.card[id]` in one scene (+ one later-beat `#s1` element for frame0); a kind counts only if a finding is new vs. that scene's unbroken baseline |
| Frame 0 (thumbnail) leaks no later beat | `verify_reel.py` frame0: every `#s1` mark ≥ 1 s must look different at t=0 than just after its mark (ghosted/hidden is fine) |
| New videos share one runtime | `src/shared/stage.js`, shipped by `build-video.mjs` only when the template loads `assets/stage.js` |
| Render orientation matches the composition | `render-video.mjs` reads root `data-width`/`data-height` (portrait/landscape arg only overrides) |
| No silent default video | build, synth and render scripts exit non-zero without a slug |

## Deliberately not done

- Browser checks are not in CI: they need Chromium + `npx hyperframes`; run `npm run verify` locally.
- seam-gate lives in `~/.claude/skills/motion-doctrine`; `verify-all` reports SKIP when it is absent.
- `hyperframes check` *warnings* (silent film, sub-composition size, text below 28 px in pod-scheduling) do not fail the gate.
- No renders, pushes or deploys are run by any check.
- `wires`, `labels`, `balance` are **advisory only where `meta.advisory` lists them**, and
  `verify-all` accepts `meta.advisory` only from the four pre-2026-11-12 videos (`LEGACY` in
  `verify-all.mjs`): eks and api-gateway list all three, disaster-recovery `labels`+`balance`,
  pod-scheduling `labels`. `verify_reel.py --advisory` prints them as `WARN` before its JSON;
  exit code unaffected. `--self-test` still requires them to fire. Drop a kind from a video's
  list once its rows below are clear; unknown kinds fail the gate.
- pod-scheduling's self-test cannot require `frame0`: every `#s1` mark sits inside a container hidden at t=0.
- The wire detach check skips an endpoint card that has any transform (fading/sliding in). A card
  GSAP moves for good after its wires are routed would detach unreported; no template does that.
- Landscape (`meta.formats` with `land`) layout is not gated: `verify_reel.py` checks 9:16 only, and
  the starter's layout is 9:16.
- Requesting a new concept: `docs/NEW_CONCEPT_REQUEST.md` is the prompt template; the brief stub's
  sections match the contract in `.skills/motion-devops-creator/SKILL.md`.

## Layout backlog (advisory warnings, 2026-11-12)

Found by the advisory checks on the current builds (23 warnings, 2026-11-12); all four videos still pass the gate.
The earlier "wire starts/ends N px away" rows were false positives (endpoint card still fading in) and
disappeared once the detach check required a settled endpoint.

| Video | Scene | Defect | Likely fix |
|---|---|---|---|
| eks | s1 | `s1-kops`→`s1-api` and →`s1-pay` wires run through `#s1-etcd` | move etcd out of the fan-out path or route the wires around it |
| eks | s5 | "OIDC" wire label covers `#s5-irsa` | lengthen the wire or offset the label |
| eks | s1–s7 | diagrams fill 22–40 % of headline→HUD space (min 40 %; s6 is 39.x %) | spread rows vertically / taller cards |
| eks | s1 | cursor taps the headline instead of a card | retarget the cursor click |
| api-gateway | s1 | `s1-ingress`→`s1-api` and →`s1-pay` wires run through `#s1-yaml` | move the YAML card off the fan-out |
| api-gateway | s4 | `s4-route`→`s4-v1` runs through `#s4-canary`; "90%" covers `#s4-canary`, "10%" covers `#s4-route` | route the 90 % split around the canary card; lift labels off cards |
| api-gateway | s1, s2, s4, s5 | diagrams fill 27–32 % of the space | as eks |
| disaster-recovery | s2 | "restore" label sits on the `s2-file`→`s2-bucket` wire | offset the label |
| disaster-recovery | s4 | "restore" label covers `#s4-bk` | offset the label |
| disaster-recovery | s1 | diagram fills 37 % of the space | minor spacing |
| disaster-recovery | all | composition ends at y≈1320; 600 px of empty floor below the HUD (other reels: ~150 px) | intentional platform safe zone? confirm before changing |
| pod-scheduling | s2 | "scores illustrative" note sits on the `s2-bind`→`s2-nc` wire | move the note left |

Re-list with `node scripts/verify-all.mjs --browser` (or `python3 scripts/verify_reel.py <dir>`).

## Still on the user's hands

- Renders (`render-with-audio.mjs`), voice synthesis (needs VoiceStudio on 127.0.0.1:3900), push.
- After synthesizing a voice track: rebuild the slug so the player picks it up.
