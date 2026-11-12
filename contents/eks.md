# Amazon EKS: Why Managed Kubernetes Matters

**Slug:** `eks`
**Format:** 9:16 vertical motion explainer (`1080x1920`) — YouTube Shorts / Reels
**Duration:** 60s
**Cloned Voice:** Devops (VoiceStudio ID: 51c11ae3)
**Companion:** `src/eks/` (storyboard + template) → `videos/eks/`

---

## Executive Summary

Amazon EKS (Elastic Kubernetes Service) is AWS's managed Kubernetes control plane. Running Kubernetes on AWS without EKS means self-managing etcd, API servers, scheduler, controller-manager, cert rotation, and HA across availability zones — undifferentiated heavy lifting that distracts from shipping applications. EKS abstracts the control plane into a fully managed, highly available AWS service while customer workloads run on customer-owned worker nodes inside their own VPC.

EKS separates concerns cleanly: AWS owns the control plane (API server, etcd, scheduler), the customer owns worker nodes, CNI networking, IAM integration, add-ons, and application workloads. This role separation maps directly to RBAC boundaries and makes EKS the production-grade choice for Kubernetes on AWS.

---

## 1. The Breaking Point: Self-Managed Kubernetes on AWS

Before EKS, teams ran Kubernetes on EC2 using kops or kubeadm. The breaking points:

- **Control plane HA**: etcd quorum, API server multi-AZ deployment, load balancer fronting — all manual, all failure-prone.
- **Patching & upgrades**: Control plane binary upgrades, cert rotation, security patches on the control plane nodes — undifferentiated toil.
- **No native AWS integration**: IAM auth for Kubernetes required workarounds; VPC networking, security groups, ELB integration, and CloudWatch required custom glue.
- **SLA burden**: The team is on-call for the control plane at 3 AM when etcd loses quorum or the API server cert expires.

EKS removes this undifferentiated heavy lifting: AWS runs a multi-AZ control plane with automated patching, cert rotation, and etcd replacement.

---

## 2. EKS Architecture & Persona Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS (EKS Control Plane)                  │
│  API Server · etcd · Scheduler · Controller-Manager         │
│    Multi-AZ · Managed · Patched · Cert-rotated by AWS       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (public or private endpoint)
┌──────────────────────▼──────────────────────────────────────┐
│              Customer VPC (Worker Nodes)                    │
│  EC2 / Fargate nodes · kubelet · kube-proxy · VPC CNI ·     │
│  CoreDNS · EBS CSI · AWS Load Balancer Controller           │
└─────────────────────────────────────────────────────────────┘
```

| Persona | Responsibility | Scope |
|---------|---------------|-------|
| **AWS Account Admin** | EKS cluster creation, VPC, IAM OIDC provider | AWS account, cluster endpoint |
| **Cluster Admin / Platform Team** | Worker node groups, add-ons, CNI, IRSA, logging | `kubectl`, cluster-level resources |
| **App Developer / Namespace Owner** | Deployments, Services, Ingress, application config | Namespace-scoped resources |

### Key EKS Components

**EKS Control Plane** — Managed by AWS across multiple AZs. Includes API server, etcd, scheduler, controller-manager. Customers never SSH into control plane nodes.

**Worker Nodes** — Customer-owned EC2 instances or Fargate. Run kubelet, kube-proxy, and the EKS add-ons. Can be self-managed node groups or managed node groups.

**EKS Add-ons** — Officially supported, version-pinned add-ons:
- `vpc-cni` — Amazon VPC CNI plugin for pod networking
- `coredns` — Cluster DNS
- `kube-proxy` — Service load balancing
- `aws-ebs-csi-driver` — EBS persistent storage
- `aws-load-balancer-controller` — ALB/NLB integration

**IAM Roles for Service Accounts (IRSA)** — Pods assume AWS IAM roles via OIDC federation, eliminating long-lived AWS credentials on worker nodes.

---

## 3. Networking & Storage

### VPC CNI (Amazon VPC Container Network Interface)

Each pod gets a VPC-native ENI IP address. Pods communicate directly with other VPC resources without NAT or overlay. Security groups apply at the ENI level. This means:
- No overlay network (no VXLAN, no Geneve)
- Pod IPs are routable within the VPC
- Standard VPC security groups and NACLs apply
- IP address consumption: each pod consumes one ENI IP

### AWS Load Balancer Controller

Provisions AWS NLB (for TCP/UDP services of type LoadBalancer) and ALB (for Kubernetes Ingress). Integrates with AWS Certificate Manager for TLS termination.

### Storage

- **EBS CSI** — Block storage for stateful workloads (single-AZ by default; multi-AZ via replication)
- **EFS CSI** — Shared file system for multiple pods across AZs

---

## 4. Failure & Troubleshooting Cheat-Sheet

| Symptom | Likely Cause | Diagnostic Command |
|---------|-------------|-------------------|
| Pod stuck in `Pending` | No node has capacity; taints/tolerations mismatch; VPC CNI IP exhaustion | `kubectl describe pod <name>` → Events section |
| Pod `CrashLoopBackOff` | App crash, bad image, missing config/secret | `kubectl logs <pod>`, `kubectl describe pod <pod>` |
| Service DNS not resolving | CoreDNS pods unhealthy; RBAC issue with CoreDNS | `kubectl get deployment coredns -n kube-system`, `kubectl logs -n kube-system deployment/coredns` |
| IRSA: `AccessDenied` calling AWS | OIDC provider not created; trust policy wrong; service account missing `eks.amazonaws.com/role-arn` annotation | `aws eks describe-cluster`, inspect `aws-auth` ConfigMap or IRSA trust policy |
| VPC CNI: pods not getting IPs | ENI limit reached on node type; security group blocking CNI; insufficient subnet IPs | `kubectl describe daemonset aws-node -n kube-system`, `aws ec2 describe-network-interfaces` |
| `aws-load-balancer-controller` not creating ALB | IAM policy missing; subnet tags missing (`kubernetes.io/role/elb`) | `kubectl get ingress`, controller logs in `kube-system` |
| Control plane unreachable | Public access disabled; security group blocking endpoint | `aws eks describe-cluster --name <name>` → `resourcesVpcConfig.endpointPublicAccess` |

### Essential EKS CLI Commands

```bash
# Create cluster
eksctl create cluster -f cluster.yaml

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name my-cluster

# List node groups
eksctl get nodegroup --cluster my-cluster

# Delete cluster
eksctl delete cluster --name my-cluster

# IRSA: associate IAM OIDC provider
eksctl utils associate-iam-oidc-provider --cluster my-cluster --approve
```

---

## 5. Scene Reference (motion video)

| Scene | Chapter | Marks (element → spoken word) |
|-------|---------|-------------------------------|
| s1 | The Breaking Point | `s1-eks` → EKS control plane; `s1-fail` → etcd quorum lost; `s1-burden` → undifferentiated toil |
| s2 | Architecture | `s2-cp` → AWS managed control plane; `s2-nodes` → customer worker nodes; `s2-vpc` → customer VPC |
| s3 | Networking & IRSA | `s3-cni` → VPC CNI; `s3-irsa` → IAM Roles for Service Accounts; `s3-alb` → AWS Load Balancer Controller |
| s4 | Troubleshooting | `s4-pending` → Pod stuck Pending; `s4-crash` → CrashLoopBackOff; `s4-cni` → IP exhaustion |
| s5 | Recap | `s5-aws` → AWS owns control plane; `s5-customer` → customer owns nodes/workloads; `s5-migrate` → move to EKS |

---

## Migration Checklist

1. Create EKS cluster via `eksctl` or AWS Console; select VPC and subnets.
2. Create managed node groups; worker nodes join automatically.
3. Enable EKS add-ons: VPC CNI, CoreDNS, kube-proxy, EBS CSI, AWS LB Controller.
4. Create IAM OIDC provider; configure IRSA for pods needing AWS access.
5. Deploy applications with `kubectl`; use AWS LB Controller for ingress/load balancers.
6. Validate: `kubectl get nodes`, `kubectl get pods -A`, `aws eks describe-cluster`.
7. Decommission any self-managed kops/kubeadm clusters.
