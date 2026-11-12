// Single source of truth for narration, subtitles and reveal timing.
// Scaffolded by: npm run new @@SLUG@@ "@@TITLE@@"     Built by: node scripts/build-video.mjs @@SLUG@@
//
// Marker syntax inside narration:
//   [[id|Spoken words]]  the element #id reveals on the first spoken word
//   [[id]]               a timing mark on the next spoken word (no text)
// Every mark must drive something: an element id, S.at("mark") in template.html, or a wire data-on.
//
// Facts used (cite the docs you checked; research notes live in contents/@@SLUG@@.md):
//   - TODO

export const meta = {
  slug: "@@SLUG@@",
  title: "@@TITLE@@",
  subtitle: "TODO one-line promise",
  accent: "#326ce5",
  formats: ["port"], // 9:16 only, written to videos/@@SLUG@@/
  inline: true, // self-contained index.html (GSAP, stage.js, player inlined)
  seams: { s2: "x", s3: "y" }, // incoming seam axis per scene; also drives ledger.json for seam-gate
  wps: 1.7, // 1.7-1.8 words per second, never above 1.85
  lead: 1.2, // entry seam before the first word of each scene
  pad: 1.8, // stillness after the last word of each scene
  total: 60, // seconds; the last scene pads to this, and the build fails if narration overruns
};

export const scenes = [
  {
    id: "s1",
    chapter: "The Problem",
    narration:
      "Every request goes through [[s1-core|one shared system]]. " +
      "[[s1-apps|Web, api and payments]] all depend on it. " +
      "Then [[s1-fail|one change breaks]] every team at once.",
  },
  {
    id: "s2",
    chapter: "How It Works",
    narration:
      "First you [[s2-step1|declare the state you want]]. " +
      "A controller [[s2-step2|reconciles]] the gap. " +
      "Status lets you [[s2-step3|observe the result]]. " +
      "[[s2-term|One command]] applies it.",
  },
  {
    id: "s3",
    chapter: "Recap",
    narration:
      "[[s3-one|Declare what you want]]. [[s3-two|Let the system converge]]. " +
      "[[s3-three|Read status, not logs]]. " +
      "[[s3-next|Next, try it]] on a test cluster.",
  },
];

// TTS pronunciation fixes applied to captions' data-say (the spoken text), e.g. [/\bkubectl\b/g, "kube control"]
export const say = [];
