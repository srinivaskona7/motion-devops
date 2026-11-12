// Single source of truth for narration, subtitles and reveal timing.
// Built by: node scripts/build-video.mjs eks
//
// Marker syntax inside narration:
//   [[id|Spoken words]]  the element #id reveals on the first spoken word
//   [[id]]               a timing mark on the next spoken word (no text)
//
// Facts used (checked against AWS EKS docs):
//   - EKS is a managed Kubernetes control plane: AWS runs API server, etcd,
//     scheduler, and controller-manager across multiple AZs.
//   - Worker nodes are customer-owned EC2 or Fargate inside the customer VPC.
//   - Amazon VPC CNI gives each pod a VPC-native ENI IP address.
//   - IRSA (IAM Roles for Service Accounts) lets pods assume AWS IAM roles
//     via OIDC federation, eliminating long-lived AWS credentials.
//   - AWS Load Balancer Controller provisions NLB/ALB from Service/Ingress.
//   - EKS add-ons: vpc-cni, coredns, kube-proxy, aws-ebs-csi-driver,
//     aws-load-balancer-controller.

export const meta = {
  slug: "eks",
  title: "Amazon EKS",
  subtitle: "Managed Kubernetes on AWS",
  accent: "#ff9900",
  formats: ["port"], // 9:16 only, written to videos/eks/
  inline: true, // self-contained index.html
  gsap: "src/shared/vendor/gsap-3.12.5.min.js",
  seams: { s5: "y" }, // all seams cut LEFT except the rise into the recap
  wps: 1.75, // narration rate, words per second (calm, educational pacing)
  lead: 1.0, // entry seam before the first word of each scene
  pad: 1.4, // padding after the last word of each scene
  total: 60, // target runtime; the last scene holds to fill it
};

export const scenes = [
  {
    id: "s1",
    chapter: "The Breaking Point",
    narration:
      "Self-managed [[s1-eks|K8s]] on [[s1-ec2|EC2]] means you run [[s1-etcd|etcd]] yourself. " +
      "Then [[s1-fail|etcd loses quorum]] at 3 AM. That's [[s1-burden|undifferentiated toil]].",
  },
  {
    id: "s2",
    chapter: "EKS Architecture",
    narration:
      "[[s2-cp|AWS runs the control plane]], [[s2-ha|multi-AZ and managed]]. " +
      "[[s2-nodes|You own worker nodes]] inside [[s2-vpc|your VPC]].",
  },
  {
    id: "s3",
    chapter: "Networking & Identity",
    narration:
      "Pods get [[s3-cni|VPC CNI]] addresses — real VPC IPs. " +
      "Identity via [[s3-irsa|IRSA]] — no long-lived keys. " +
      "[[s3-alb|AWS Load Balancer Controller]] handles ingress.",
  },
  {
    id: "s4",
    chapter: "Troubleshooting",
    narration:
      "[[s4-pending|kubectl describe pod]] for [[s4-pending-text|Pending]]. " +
      "[[s4-crash|CrashLoopBackOff]]? Check logs. " +
      "[[s4-cni|IP exhaustion]]? Check ENI limits.",
  },
  {
    id: "s5",
    chapter: "Recap & Migration",
    narration:
      "Recap: [[s5-aws|AWS owns control plane]], [[s5-customer|you own nodes]]. " +
      "[[s5-migrate|Move to EKS]] and stop patching etcd.",
  },
];

// Spoken substitutions for the cloned voice (subtitles keep the written form).
export const say = [
  [/\bEKS\b/g, "E K S"],
  [/\bIRSA\b/g, "I R S A"],
  [/\bVPC CNI\b/g, "V P C C N I"],
  [/\bkubectl\b/g, "kube control"],
  [/\bCrashLoopBackOff\b/g, "Crash Loop Back Off"],
  [/\betcd\b/g, "etcd"],
  [/\bENI\b/g, "E N I"],
  [/\bALB\b/g, "A L B"],
  [/\bNLB\b/g, "N L B"],
  [/\bCSI\b/g, "C S I"],
  [/\bAPI\b/g, "A P I"],
  [/\bTLS\b/g, "T L S"],
  [/\bIAM\b/g, "I A M"],
];
