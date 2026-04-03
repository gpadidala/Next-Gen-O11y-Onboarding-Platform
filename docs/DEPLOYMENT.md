# Deployment Guide

## Local Development (Docker Compose)

```bash
# Start everything
docker-compose up --build -d

# Verify
curl http://localhost:8000/api/v1/health
curl http://localhost:3000

# Run migrations
docker-compose exec backend alembic upgrade head

# View logs
docker-compose logs -f backend

# Tear down
docker-compose down -v
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (AKS recommended)
- `kubectl` configured
- Container registry access

### Direct Manifests

```bash
# Create namespace
kubectl apply -f infra/kubernetes/namespace.yaml

# Deploy secrets and config
kubectl apply -f infra/kubernetes/secrets.yaml
kubectl apply -f infra/kubernetes/configmap.yaml

# Deploy database
kubectl apply -f infra/kubernetes/postgres-statefulset.yaml

# Deploy application
kubectl apply -f infra/kubernetes/backend-deployment.yaml
kubectl apply -f infra/kubernetes/frontend-deployment.yaml

# Configure ingress and autoscaling
kubectl apply -f infra/kubernetes/ingress.yaml
kubectl apply -f infra/kubernetes/hpa.yaml
```

### Helm Chart

```bash
# Install
helm install obs-onboarding infra/helm/observability-onboarding/ \
  --namespace observability-onboarding \
  --create-namespace \
  -f infra/helm/observability-onboarding/values.yaml

# Upgrade
helm upgrade obs-onboarding infra/helm/observability-onboarding/ \
  --namespace observability-onboarding

# Uninstall
helm uninstall obs-onboarding -n observability-onboarding
```

## Terraform (Azure)

```bash
cd infra/terraform

# Initialize
terraform init

# Plan
terraform plan -var="environment=production"

# Apply
terraform apply -var="environment=production"
```

Creates: Resource Group, AKS Cluster, PostgreSQL Flexible Server with pgvector, VNet, Log Analytics.

## Environment Variables

See [.env.example](../.env.example) for all configuration options.

Critical production settings:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — Application secret (change from default)
- `CORS_ORIGINS` — Allowed frontend origins
- All MCP API keys must be set for full functionality

## Health Checks

- **Liveness**: `GET /api/v1/health` — returns 200 if service is running
- **Readiness**: `GET /api/v1/ready` — checks DB and MCP connectivity
- **Metrics**: `GET /metrics` — Prometheus-format metrics
