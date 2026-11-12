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
  advisory: ["wires", "labels", "balance"], // predates these checks: WARN only, backlog in docs/PIPELINE_FEATURES.md
  slug: "eks",
  title: "Amazon EKS",
  subtitle: "Managed Kubernetes on AWS",
  accent: "#ff9900",
  formats: ["port"], // 9:16 only, written to videos/eks/
  inline: true, // self-contained index.html
  gsap: "src/shared/vendor/gsap-3.12.5.min.js",
  seams: { s7: "y" }, // all seams cut LEFT except the rise into the recap
  wps: 1.6, // calm educational pacing (words per second)
  lead: 1.2, // entry seam before the first word of each scene
  pad: 1.8, // padding after the last word of each scene
  total: 180, // 3-minute runtime
};

export const scenes = [
  {
    id: "s1",
    chapter: "The Breaking Point",
    narration:
      "You run [[s1-kops|Kubernetes on EC2]] yourself. [[s1-etcd|etcd]] lives on your nodes. " +
      "Then [[s1-fail|etcd loses quorum]] at three A M. " +
      "That is [[s1-burden|undifferentiated toil]]. You patch, you upgrade, you are on call.",
  },
  {
    id: "s2",
    chapter: "What EKS Is",
    narration:
      "Amazon [[s2-eks|EKS]] runs the [[s2-cp|control plane]] for you. " +
      "[[s2-ha|Multi-AZ and fully managed]] by AWS. " +
      "Automated patching, certificate rotation, etcd replacement. " +
      "[[s2-nodes|You own worker nodes]] inside [[s2-vpc|your VPC]]. " +
      "AWS owns the control plane. You own the nodes.",
  },
  {
    id: "s3",
    chapter: "Control Plane vs Nodes",
    narration:
      "[[s3-api|API server and etcd]] — AWS patches and rotates certificates. " +
      "[[s3-sched|Scheduler and controller manager]] — fully managed by AWS. " +
      "[[s3-worker|Worker nodes]] run kubelet and kube-proxy on your EC2 or Fargate. " +
      "Two clear [[s3-personas|personas]]. Two clean boundaries.",
  },
  {
    id: "s4",
    chapter: "Networking",
    narration:
      "Pods get [[s4-cni|VPC CNI]] addresses — real VPC IPs. " +
      "No overlay network. No VXLAN, no Geneve. " +
      "Standard VPC security groups apply to every pod. " +
      "[[s4-alb|AWS Load Balancer Controller]] provisions ALB and NLB for ingress. " +
      "TLS termination through AWS Certificate Manager.",
  },
  {
    id: "s5",
    chapter: "Identity",
    narration:
      "[[s5-irsa|IRSA]] lets pods assume AWS IAM roles through OIDC federation. " +
      "[[s5-keys|No long-lived keys]] on worker nodes. Short-lived tokens from STS. " +
      "[[s5-addons|EKS add-ons]] — CoreDNS, kube-proxy, EBS CSI — version-pinned by AWS. " +
      "Your cluster identity is federated and auditable.",
  },
  {
    id: "s6",
    chapter: "Troubleshooting",
    narration:
      "Pod stuck [[s6-pending|Pending]]? Run [[s6-describe|kubectl describe pod]]. " +
      "Check the Events section for scheduling failures. " +
      "[[s6-crash|CrashLoopBackOff]]? Check the container logs and exit codes. " +
      "[[s6-eni|IP exhaustion]]? Check ENI limits and subnet size. " +
      "Most EKS issues show up in kubectl describe first.",
  },
  {
    id: "s7",
    chapter: "Recap & Migration",
    narration:
      "Recap: [[s7-aws|AWS owns the control plane]], [[s7-you|you own nodes and workloads]]. " +
      "[[s7-migrate|eksctl create cluster]] creates the cluster and node groups. " +
      "Add VPC CNI, CoreDNS, AWS Load Balancer Controller. " +
      "Configure IRSA for pod identity.",
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
  [/\bOIDC\b/g, "O I D C"],
  [/\bSTS\b/g, "S T S"],
  [/\b3 AM\b/g, "three A M"],
];
