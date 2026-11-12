# Kubernetes Gateway API: Why Ingress is Obsolete

**Slug:** `k8s-api-gateway`
**Format:** 9:16 vertical motion explainer (`1080x1920`) — YouTube Shorts / Reels
**Companion:** `src/k8s-api-gateway/` (storyboard + template) → `videos/k8s-api-gateway/`

---

## Executive Summary

Kubernetes `Ingress` (GA 2015) was a stopgap: a single, monolithic YAML that mixed infrastructure concerns (VIP, TLS certificates) with application routing, extended through an unstructured annotation dictionary (`nginx.ingress.kubernetes.io/*`). That model couples cluster operators, platform teams, and application developers into one file and one RBAC boundary, breaks cross-vendor portability, and offers no native traffic-splitting.

The **Gateway API** (sigs.k8s.io/gateway-api) replaces Ingress with a role-oriented, namespace-aware object model: `GatewayClass` → `Gateway` → `HTTPRoute`, gated by `ReferenceGrant` for cross-namespace binding and driven by native `backendRefs` weights for canary rollouts. Ingress is obsolete because it conflates three distinct personas into one annotated blob; Gateway API separates them, scopes RBAC to each object, and makes traffic shifts a first-class, controller-agnostic feature.

---

## 1. The Breaking Point: Why Ingress Is Obsolete

### What Ingress was (2015 stopgap)

`Ingress` was designed as a single collection of HTTP(S) routing rules backed by a load balancer. In practice one Ingress YAML typically contained:

- the **infrastructure IP / VIP** (cluster-opera­tor concern),
- **TLS certificate** references (platform / security concern),
- every **application route** (`/orders`, `/checkout`, `api.example.com`) (developer concern).

Because all of it lived in one namespaced object, any change to any route required touching the same YAML, and the only extension point was the `annotations` map.

### Annotations hell

Vendors exposed behavior through controller-specific annotations:

```
nginx.ingress.kubernetes.io/ssl-redirect: "true"
nginx.ingress.kubernetes.io/proxy-body-size: "10m"
nginx.ingress.kubernetes.io/affinity: "cookie"
```

These annotations are:
- **Non-portable**: an `nginx` annotation is meaningless to Envoy, Cilium, or AWS ALB. Migrating controllers requires rewriting every annotation.
- **Untyped / unvalidated**: a typo (`nginx.ingress.kubernetes.io/enable-live-reload` vs `enable-live-reloads`) silently does nothing or takes down routing for every team sharing that Ingress controller.
- **One RBAC boundary**: editing an annotation to add a route is a cluster-level write that can blast-radius across namespaces.

### The outage scenario (Scene 1)

One cluster, one Ingress, one monolithic YAML. An annotation typo in the shared Ingress takes down routing for every team at once — there is no blast-radius boundary, no persona isolation, and no native way to shift traffic gradually without a third-party controller or custom Lua/JS snippets.

---

## 2. Persona Separation & RBAC Boundaries

Gateway API splits routing into three typed, scope-bound objects. Each maps to a persona and an RBAC boundary.

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│ GatewayClass    │────▶│ Gateway      │────▶│ HTTPRoute    │
│ (cluster scope) │     │ (namespace)  │     │ (namespace)  │
└─────────────────┘     └──────────────┘     └──────────────┘
   cluster operator       platform / SRE        app developer
   (cloud provider)       (VIP + TLS)           (paths + weights)
      AWS ALB /            port 80/443, VIP,      /orders, /checkout,
      Envoy Gateway,       TLS from cert-manager   canary weights
      Cilium
```

### GatewayClass — Cluster Operator / Cloud Provider

Cluster-scoped. Names the controller implementation and its parameters:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: alb
spec:
  controllerName: ingress.k8s.aws/alb
  parametersRef:
    group: ...; kind: ALBParams; name: prod-alb
```

Picked by the cluster operator or cloud provider team. Examples: `aws` (ALB), `envoy` (Envoy Gateway), `cilium` (Cilium). One `GatewayClass` per controller; Gateways reference it to declare which controller provisions them.

### Gateway — Platform Team / SRE

Namespace-scoped. Describes the infrastructure: listen addresses, ports `80`/`443`, hostname, and TLS termination (certificate usually from `cert-manager`):

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: infra-gateways
spec:
  gatewayClassName: alb
  addresses:
    - type: IPAddress
      value: 203.0.113.10
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: prod-wildcard-tls   # provisioned by cert-manager
```

Owned by platform / SRE. RBAC is scoped to this namespace; developers cannot change the VIP or TLS.

### HTTPRoute — App Developer / Namespace Owner

Namespace-scoped. Describes application routing: hostnames, path matches, filters, and backend references:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: checkout
  namespace: payments
spec:
  hostnames: ["checkout.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /checkout
      backendRefs:
        - name: checkout-v1
          port: 8080
          weight: 90
        - name: checkout-v2
          port: 8080
          weight: 10
```

Owned by the application developer. RBAC is scoped to the route's namespace; a developer can change `/checkout` targets and weights without touching the Gateway or other teams' routes.

### RBAC takeaway

| Object | Scope | Persona | Controls |
|--------|-------|---------|----------|
| GatewayClass | Cluster | Cluster operator / cloud provider | Controller choice, AWS ALB / Envoy / Cilium |
| Gateway | Namespace | Platform / SRE | VIP, ports 80/443, TLS cert (cert-manager) |
| HTTPRoute | Namespace | App developer | Paths (`/orders`, `/checkout`), weights, backendRefs |

No single annotated YAML. No cross-persona blast radius.

---

## 3. Cross-Namespace Security (`ReferenceGrant`)

### The problem

An `HTTPRoute` in namespace `payments` references a `Gateway` in namespace `infra-gateways`. By default, Kubernetes prevents namespaces from referencing objects across namespace boundaries — otherwise any developer could hijack traffic bound for another team's shared Gateway ("namespace hopping").

### ReferenceGrant

A `ReferenceGrant` lives in the **Gateway's** namespace (`infra-gateways`) and explicitly lists which namespaces are allowed to bind routes to its Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: ReferenceGrant
metadata:
  name: allow-payments
  namespace: infra-gateways
spec:
  from:
    - group: ""
      kind: Namespace
      name: payments
  to:
    - group: gateway.networking.k8s.io
      kind: Gateway
      name: prod-gateway
```

Without this grant, the `HTTPRoute`'s `parentRefs` → `prod-gateway` is rejected and the route condition stays `Accepted: false` with reason `AttachmentNotPermitted`. With the grant, `payments` can attach to `infra-gateways/prod-gateway` while every other namespace remains blocked — secure, explicit, auditable.

### Scene mapping (Scene 3)

- `s3-refgrant` — the `ReferenceGrant` object that permits `payments → prod-gateway`.
- `s3-secure` — the `payments` namespace binding to the shared gateway without namespace hopping.

---

## 4. Traffic Shifts & Canary Mechanics

### Native canary, no third-party controller

`HTTPRoute.backendRefs` supports `weight` natively. A 90/10 canary is declared in the route itself:

```yaml
  rules:
    - backendRefs:
        - name: checkout-v1
          port: 8080
          weight: 90
        - name: checkout-v2
          port: 8080
          weight: 10
```

The Gateway controller programs the data plane (ALB, Envoy, Cilium) to send ~90% of traffic to `v1` and ~10% to `v2`. To promote, update the weights (`50/50` → `10/90` → `0/100`) — no Ingress annotation, no service-mesh sidecar, no external traffic-split controller required.

Weights can be combined with filters (header matches, request mirrors) for progressive delivery: route a `canary` header to `v2` for internal testing while shifting 10% of general traffic.

### Scene mapping (Scene 4)

- `s4-canary` — the 90% weight to `v1`.
- `s4-v1` — stable backend (`weight: 90`).
- `s4-v2` — canary backend (`weight: 10`).

---

## 5. Failure & Troubleshooting Cheat-Sheet

| Symptom | Likely cause | Check / fix |
|---------|-------------|-------------|
| `AttachmentNotPermitted` | Route's `parentRefs` points at a Gateway in another namespace without a `ReferenceGrant`. | Create a `ReferenceGrant` in the Gateway's namespace allowing the route's namespace. |
| `RouteConditionAccepted: False` | Route rejected: missing grant, invalid `backendRef` (wrong port/name/namespace), unsupported filter, or hostname mismatch with a Gateway listener. | `kubectl get httproute <name> -o yaml` and inspect `status.parents[].conditions`. |
| Routes not accepted at all | No `Gateway` has a matching listener (port/protocol/hostname), or no `GatewayClass` controller is running. | `kubectl get gatewayclass`, `kubectl get gateway`, confirm `controllerName` is installed. |
| TLS not terminating | `Gateway.listeners[].tls.certificateRefs` secret missing or not in the Gateway's namespace; cert-manager not issued the cert. | `kubectl get secret -n <ns> <cert-secret>`, check cert-manager `Certificate` resource. |
| Canary not splitting traffic | `backendRefs` weights missing/zero, or controller doesn't support weighting. | Verify `weight` on each backendRef; confirm controller version supports traffic splits. |
| 502 / no endpoints | Backend `Service` or `Pod` not ready, or selector mismatch. | `kubectl get endpoints`, `kubectl get pod -l app=...`. |

### Diagnostic command

```bash
kubectl get httproute checkout -n payments -o yaml
```

Inspect `status.parents[].conditions` for `Accepted`/`ResolvedRefs`/`BackendRefsValid` and their `reason`/`message`. The condition reason tells you exactly whether it is `AttachmentNotPermitted` (missing `ReferenceGrant`) or `InvalidBackendRef` (bad target).

### Scene mapping (Scene 5)

- `s5-recap` — class → gateway → route, personas separated, RBAC boundaries.
- `s5-migrate` — confirm `RouteConditionAccepted`, check `ReferenceGrant`, then retire the Ingress monolith.

---

## Migration Checklist

1. Install a Gateway API controller (AWS ALB, Envoy Gateway, or Cilium) and a `GatewayClass`.
2. Create `Gateway` objects per environment/team (platform owns VIP + TLS via cert-manager).
3. Add `ReferenceGrant`s so app namespaces can bind to shared Gateways.
4. Move routes from Ingress annotations into `HTTPRoute` `backendRefs` with `weight`.
5. Validate each route: `kubectl get httproute -o yaml` → `status.parents[].conditions` all `True`.
6. Roll out canary via weight changes (`90/10` → `50/50` → `0/100`).
7. Delete the monolithic Ingress once all routes are `Accepted: True`.

---

## Scene Reference (motion video)

| Scene | Chapter | Marks (element → spoken word) |
|-------|---------|-------------------------------|
| s1 | The Breaking Point | `s1-ingress` → ingress · :443; `s1-yaml` → one YAML for every route; `s1-fail` → annotation typo / monolith fails |
| s2 | Persona Separation | `s2-class` → GatewayClass; `s2-gw` → Gateway; `s2-route` → HTTPRoute |
| s3 | Cross-Namespace Security | `s3-refgrant` → ReferenceGrant; `s3-secure` → payments → prod-gateway |
| s4 | Canary Mechanics | `s4-canary` → 90%; `s4-v1` → weight 90; `s4-v2` → weight 10 |
| s5 | Recap & Migration | `s5-recap` → class → gateway → route; `s5-migrate` → RouteConditionAccepted |
