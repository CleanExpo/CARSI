# Kubernetes Hosting Decision — CARSI LMS

> **Date:** 05/03/2026
> **Status:** Recommendation — awaiting approval
> **Linear Issue:** GP-160

---

## Requirements

- 2–10 pods (web + backend), auto-scaling
- PostgreSQL with persistent storage
- Redis
- Custom domains: carsi.com.au, api.carsi.com.au
- SSL via cert-manager (Let's Encrypt)
- AUD pricing (Australian hosting preferred for data sovereignty)
- Budget: ~$200–500 AUD/month for production

---

## Options Compared

### Option 1: DigitalOcean DOKS (Managed Kubernetes)

**Pricing (AUD):** ~$160–190/month for production cluster

| Component                            | Cost (USD)      | Cost (AUD approx.) |
| ------------------------------------ | --------------- | ------------------ |
| 2x Basic nodes (s-2vcpu-4gb)         | $48/month each  | $148               |
| Load balancer                        | $12/month       | $18                |
| Managed PostgreSQL (basic-1vcpu-1gb) | $15/month       | $23                |
| **Total**                            | **~$123/month** | **~$190/month**    |

**Pros:**

- Sydney region (SYD1) — data sovereignty for Australian customer data
- Simple UI, one-click node pools, managed control plane
- Managed PostgreSQL add-on removes StatefulSet complexity
- Spaces (S3-compatible) for backups and media storage
- Straightforward DNS management via DigitalOcean panel
- Free managed control plane (no per-cluster fee)
- Good documentation and community support

**Cons:**

- Smaller ecosystem than AWS/GCP
- Fewer enterprise compliance certifications
- Limited to DigitalOcean's service offerings

**CARSI fit:** Highly recommended — Sydney region, simple ops, cost-effective for current scale.

---

### Option 2: AWS EKS (Elastic Kubernetes Service)

**Pricing (AUD):** ~$300–500/month

| Component                    | Cost (USD)          | Cost (AUD approx.)  |
| ---------------------------- | ------------------- | ------------------- |
| EKS control plane            | $73/month (0.10/hr) | $112                |
| 2x t3.medium EC2             | $60/month each      | $184                |
| ALB load balancer            | ~$20/month + data   | $30+                |
| RDS PostgreSQL (db.t3.micro) | ~$15/month          | $23                 |
| Data transfer                | Variable            | Variable            |
| **Total**                    | **~$230–350/month** | **~$350–540/month** |

**Pros:**

- Most mature K8s offering, enormous ecosystem
- Sydney region (ap-southeast-2) available
- Extensive compliance certifications (SOC 2, ISO 27001, IRAP)
- Graviton instances for cost savings
- Deep integration with AWS services (RDS, ElastiCache, S3, CloudFront)

**Cons:**

- Complex pricing model with hidden data transfer costs
- Steep learning curve
- EKS control plane costs $73/month on top of compute
- Requires IAM expertise for secure setup

**CARSI fit:** Good for future scale. Overkill for current 2–10 pod requirements. Consider when revenue justifies the operational overhead.

---

### Option 3: GKE (Google Kubernetes Engine)

**Pricing (AUD):** ~$200–350/month

| Component                          | Cost (USD)          | Cost (AUD approx.)  |
| ---------------------------------- | ------------------- | ------------------- |
| GKE Autopilot (per-pod pricing)    | ~$100–150/month     | $154–230            |
| Cloud SQL PostgreSQL (db-f1-micro) | ~$10/month          | $15                 |
| Load balancer                      | ~$18/month          | $28                 |
| **Total**                          | **~$130–200/month** | **~$200–310/month** |

**Pros:**

- Autopilot mode simplifies node management (pay per pod, not per node)
- Sydney region (australia-southeast1) available
- Strong K8s expertise (Google created Kubernetes)
- Free tier available for small zonal clusters

**Cons:**

- Complex billing model
- Google platform lock-in risk
- Autopilot has restrictions on privileged containers and host networking

**CARSI fit:** Good option, especially with Autopilot. More complex billing than DOKS.

---

### Option 4: Self-hosted (Hetzner/Vultr + k3s)

**Pricing (AUD):** ~$60–120/month

| Component                             | Cost (USD)        | Cost (AUD approx.) |
| ------------------------------------- | ----------------- | ------------------ |
| 2x Vultr Sydney instances (2vCPU/4GB) | $24/month each    | $74                |
| Vultr managed PostgreSQL              | $15/month         | $23                |
| **Total**                             | **~$60–80/month** | **~$95–120/month** |

**Pros:**

- Cheapest option by far
- Full control over infrastructure
- k3s is lightweight and easy to set up
- Vultr has Sydney region

**Cons:**

- No managed control plane — you maintain K8s upgrades, etcd backups, node patching
- No SLA on cluster availability (your responsibility)
- Hetzner has no Australian data centre
- Security patching burden falls entirely on you

**CARSI fit:** Good for cost, poor for operational burden. Suitable only if a dedicated DevOps person is available.

---

## Recommendation: DigitalOcean DOKS

### Rationale

1. **Sydney region (SYD1)** — data sovereignty for Australian customer data under the Privacy Act 1988
2. **Lowest operational overhead** — managed control plane, one-click K8s version upgrades, built-in monitoring
3. **Cost-effective at CARSI's scale** — ~$190 AUD/month for a production-ready cluster
4. **Spaces (S3-compatible)** — for database backups, media storage, and course content caching
5. **Managed PostgreSQL add-on** — removes the need for StatefulSet/PVC complexity in K8s
6. **Simple DNS management** — DigitalOcean DNS panel for carsi.com.au
7. **No control plane fee** — unlike AWS EKS ($73/month) and GKE Standard ($73/month)

### Recommended Cluster Configuration

```yaml
Cluster:
  name: carsi-prod
  region: syd1
  version: 1.29 (latest stable)

Node Pool:
  name: worker-pool
  size: s-2vcpu-4gb
  count: 2
  auto_scale: true
  min_nodes: 2
  max_nodes: 5

Add-ons:
  - Managed PostgreSQL (basic-1vcpu-1gb, SYD1)
  - Spaces bucket (carsi-prod-assets, SYD1)
  - DigitalOcean Load Balancer (auto-provisioned by nginx-ingress)
```

### Monthly Cost Breakdown (AUD)

| Item                 | AUD/month |
| -------------------- | --------- |
| 2x s-2vcpu-4gb nodes | ~$148     |
| Load balancer        | ~$18      |
| Managed PostgreSQL   | ~$23      |
| Spaces (10 GB)       | ~$8       |
| **Total**            | **~$197** |

Auto-scaling to 5 nodes at peak: ~$340 AUD/month.

### Setup Commands

```bash
# Install doctl CLI
# macOS: brew install doctl
# Windows: choco install doctl

# Authenticate
doctl auth init

# Create cluster in Sydney
doctl kubernetes cluster create carsi-prod \
  --region syd1 \
  --node-pool "name=worker-pool;size=s-2vcpu-4gb;count=2;auto-scale=true;min-nodes=2;max-nodes=5"

# Get kubeconfig
doctl kubernetes cluster kubeconfig save carsi-prod

# Verify cluster
kubectl get nodes

# Install nginx-ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --set controller.service.type=LoadBalancer

# Install cert-manager for SSL
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true

# Apply CARSI K8s manifests
kubectl apply -f k8s/
```

---

## Next Steps

1. Create DigitalOcean account and enable billing
2. Create DOKS cluster in SYD1 region
3. Install nginx-ingress + cert-manager (commands above)
4. Create K8s manifests in `k8s/` directory (deployments, services, ingress, secrets)
5. Set up managed PostgreSQL and configure connection string
6. Point carsi.com.au DNS A record to load balancer IP
7. Configure Let's Encrypt ClusterIssuer for automatic SSL
8. Deploy and verify health endpoints

---

## Future Considerations

- **CDN:** DigitalOcean Spaces CDN or Cloudflare in front of the load balancer for static assets
- **Monitoring:** DigitalOcean built-in monitoring + optional Prometheus/Grafana stack
- **CI/CD:** GitHub Actions deploying to DOKS via `doctl` and `kubectl`
- **Backup:** Automated PostgreSQL backups via managed service + Spaces for disaster recovery
- **Migration path:** If CARSI outgrows DOKS, migrating to AWS EKS is straightforward since K8s manifests are portable
