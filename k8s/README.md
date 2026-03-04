# CARSI LMS — Kubernetes Deployment

Production Kubernetes manifests for the CARSI LMS platform.

## Prerequisites

- kubectl (v1.28+)
- Helm (v3+) — for cert-manager and ingress-nginx
- Access to a Kubernetes cluster (AKS, GKE, EKS, or self-managed)
- Docker images pushed to ghcr.io/carsi-lms/\*

## Cluster Preparation

Install the NGINX Ingress Controller and cert-manager before applying CARSI manifests.

```bash
# NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# cert-manager (for Let's Encrypt TLS)
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@carsi.com.au
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Deployment Steps

### 1. Create namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create secrets

Copy the secrets template and fill in real values:

```bash
# Option A: From env file
kubectl create secret generic carsi-secrets \
  --from-env-file=.env.prod \
  -n carsi-production

# Option B: Apply template then patch
kubectl apply -f k8s/secrets-template.yaml
kubectl -n carsi-production patch secret carsi-secrets \
  -p '{"stringData":{"JWT_SECRET_KEY":"<real-value>"}}'
```

### 3. Apply manifests (in order)

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

Or apply everything at once:

```bash
kubectl apply -f k8s/
```

### 4. Verify deployment

```bash
# Check all pods are running
kubectl get pods -n carsi-production

# Check services
kubectl get svc -n carsi-production

# Check ingress
kubectl get ingress -n carsi-production

# Check HPA status
kubectl get hpa -n carsi-production

# View logs
kubectl logs -f deployment/carsi-web -n carsi-production
kubectl logs -f deployment/carsi-backend -n carsi-production
```

## Architecture

```
Internet
  |
  v
[NGINX Ingress Controller]
  |
  +-- carsi.com.au ---------> carsi-web (port 3000)
  +-- api.carsi.com.au -----> carsi-backend (port 8000)

Internal:
  carsi-backend --> carsi-postgres (port 5432)
  carsi-backend --> carsi-redis (port 6379)
```

## Scaling

Both web and backend deployments have HPA configured:

- **Minimum replicas:** 2
- **Maximum replicas:** 10
- **Target CPU utilisation:** 70%

Manual scaling:

```bash
kubectl scale deployment carsi-web --replicas=5 -n carsi-production
```

## Rollback

```bash
# View rollout history
kubectl rollout history deployment/carsi-web -n carsi-production

# Rollback to previous version
kubectl rollout undo deployment/carsi-web -n carsi-production

# Rollback to specific revision
kubectl rollout undo deployment/carsi-web --to-revision=2 -n carsi-production
```

## Secrets Required

| Secret Key            | Description                  |
| --------------------- | ---------------------------- |
| DATABASE_URL          | PostgreSQL connection string |
| POSTGRES_PASSWORD     | Database password            |
| JWT_SECRET_KEY        | JWT signing secret           |
| STRIPE_SECRET_KEY     | Stripe payments API key      |
| STRIPE_WEBHOOK_SECRET | Stripe webhook verification  |
| STRIPE_PRICE_ID       | Subscription price ID        |
| GOOGLE_CLIENT_ID      | Google Drive OAuth client    |
| GOOGLE_CLIENT_SECRET  | Google Drive OAuth secret    |
| GOOGLE_REFRESH_TOKEN  | Google Drive refresh token   |
| SMTP_HOST             | Email SMTP server            |
| SMTP_PORT             | Email SMTP port              |
| SMTP_USER             | Email SMTP username          |
| SMTP_PASSWORD         | Email SMTP password          |
| EMAIL_FROM            | Sender email address         |
