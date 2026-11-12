// Single source of truth for narration, subtitles and reveal timing.
// Built by: node scripts/build-video.mjs k8s-api-gateway
//
// Marker syntax inside narration:
//   [[id|Spoken words]]  the element #id reveals on the first spoken word
//   [[id]]               a timing mark on the next spoken word (no text)
//
// Facts used (checked against Gateway API docs):
//   - GatewayClass is cluster-scoped and names the controller implementation
//     (AWS ALB, Envoy Gateway, Cilium, etc.). Picked by cluster operator.
//   - Gateway is namespace-scoped, describes infrastructure: addresses,
//     ports 80/443, TLS termination via cert-manager certificates.
//   - HTTPRoute is namespace-scoped, owned by app developers: hostnames,
//     path matches, filters, and backendRefs with weights for canary splits.
//   - ReferenceGrant (in the gateway's namespace) allows a route in another
//     namespace to bind to a Gateway; without it the route condition stays
//     "Accepted: false" with reason "AttachmentNotPermitted".
//   - HTTPRoute backendRefs support `weight` for traffic splits (e.g. 90/10)
//     natively, with no third-party ingress controller or annotation.

export const meta = {
  slug: "k8s-api-gateway",
  title: "Kubernetes Gateway API",
  accent: "#22d3ee",
  formats: ["port"], // 9:16 only, written to videos/k8s-api-gateway/
  inline: true, // self-contained index.html
  gsap: "src/shared/vendor/gsap-3.12.5.min.js",
  wps: 2.2, // narration rate, words per second
  lead: 0.9, // entry seam before the first word of each scene
  pad: 1.3, // padding after the last word of each scene
  total: 60, // target runtime; the last scene holds to fill it
};

export const scenes = [
  {
    id: "s1",
    chapter: "The Breaking Point",
    narration:
      "One cluster. One [[s1-ingress|ingress]]. One [[s1-yaml|YAML]] mixing VIP, TLS, and every route. " +
      "An [[s1-fail|annotation typo]] takes down ingress for every team at once.",
  },
  {
    id: "s2",
    chapter: "Persona Separation",
    narration:
      "Gateway API splits the job by persona. [[s2-class|GatewayClass]] picks the controller. " +
      "[[s2-gw|Gateway]] owns the VIP and TLS. [[s2-route|HTTPRoute]] owns the paths.",
  },
  {
    id: "s3",
    chapter: "Cross-Namespace Security",
    narration:
      "[[s3-refgrant|ReferenceGrant]] lets [[s3-secure|payments]] bind to a shared gateway in infra-gateways " +
      "— no namespace hopping, no cross-team exposure.",
  },
  {
    id: "s4",
    chapter: "Canary Mechanics",
    narration:
      "Native canary: [[s4-canary|ninety percent]] to [[s4-v1|version one]], [[s4-v2|ten to version two]] " +
      "— weighted splits, no third-party ingress controller.",
  },
  {
    id: "s5",
    chapter: "Recap & Migration",
    narration:
      "Recap: [[s5-recap|class, gateway, route, ReferenceGrant, canary]]. " +
      "Confirm [[s5-migrate|RouteConditionAccepted]], then migrate off ingress.",
  },
];

// Spoken substitutions for the TTS voice (subtitles keep the written form).
export const say = [
  [/\bHTTPRoute\b/g, "H T T P Route"],
  [/\bGatewayClass\b/g, "Gateway Class"],
  [/\bReferenceGrant\b/g, "Reference Grant"],
  [/\bAttachmentNotPermitted\b/g, "Attachment Not Permitted"],
  [/\bRouteConditionAccepted\b/g, "Route Condition Accepted"],
  [/\bGateway API\b/g, "Gateway A P I"],
  [/\bAPI\b/g, "A P I"],
  [/\bTLS\b/g, "T L S"],
  [/\bVIP\b/g, "V I P"],
  [/\bRBAC\b/g, "R B A C"],
  [/\bIngress\b/g, "Ingress"],
  [/\bcert-manager\b/g, "cert manager"],
];
