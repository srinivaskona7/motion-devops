---
name: devops-deep-researcher
description: Elite DevOps Systems Architect & Pedagogical Researcher. Researches real-world production architectures, breaking points, step-by-step lifecycle stages, CLI commands, and practical failure scenarios for distributed cloud-native platforms.
---

# DevOps Deep Researcher & Systems Architect

This skill governs the in-depth architectural breakdown of cloud-native and DevOps workflows. Every concept must be grounded in an end-to-end production platform (e.g. an e-commerce platform processing 50k req/sec with Cart, Checkout, Inventory, and Payment services).

## The 6 Mandatory Research Layers

For every DevOps topic, the researcher produces `contents/<slug>.md` covering:

1. **Practical Production Use Case**:
   - The concrete scenario (e.g. Black Friday sale on an E-commerce platform on AWS EKS).
   - The microservices involved: `web-frontend`, `cart-service`, `orders-service`, `payment-service`, PostgreSQL DB.
2. **The 6 Practical DevOps Lifecycle Stages**:
   - **Stage 1 (Code & Source)**: Git branching, semantic versioning, pull request quality gates.
   - **Stage 2 (CI & Security Scanning)**: GitHub Actions / GitLab CI, Trivy container scanning, SonarQube SAST, Docker multi-stage builds.
   - **Stage 3 (Artifact & Supply Chain)**: AWS ECR container registry, Cosign image signing, immutable digest tags.
   - **Stage 4 (GitOps Continuous Delivery)**: ArgoCD / Flux synchronizing Helm charts into AWS EKS cluster.
   - **Stage 5 (Infrastructure as Code & Cloud Fabric)**: Terraform / OpenTofu provisioning VPC, EKS Managed Node Groups, Karpenter autoscaling, IRSA (IAM Roles for Service Accounts).
   - **Stage 6 (Day-2 Operations & Observability)**: Prometheus metrics, Grafana dashboards, OpenTelemetry distributed tracing, Jaeger, FluentBit logs to OpenSearch.
3. **The Disaster / Breaking Point**:
   - The exact outage: e.g. Black Friday traffic spike causes memory pressure, OOMKilled pods, database connection pool exhaustion, and cascading 504 gateway timeouts.
4. **Live Hands-On Terminal Diagnostics & Fixes**:
   - Exact CLI commands:
     - `kubectl get pods -A -l app=orders-service`
     - `kubectl describe pod <pod-name> | grep -E "State|Exit Code|Reason"`
     - `kubectl top nodes` / `kubectl top pods`
     - Karpenter node autoscaling trigger & HPA scaling manifest.
5. **Architectural Terminology Glossaries**:
   - Concrete, zero-fluff definitions of: VPC CNI, IRSA, Karpenter vs Cluster Autoscaler, ArgoCD Sync Wave, Pod Disruption Budget (PDB), Service Mesh mTLS.
6. **Key Takeaways & Golden Rules**:
   - Production readiness checklist before going live.
