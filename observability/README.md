# Observability Stack

This directory contains the configuration for the AI Resume Analyser observability stack:
**Prometheus → Alertmanager → Grafana** (metrics), with optional **Loki + Promtail** (logs).

## Components

| Component | Port | Purpose |
| --- | --- | --- |
| Prometheus | 9090 | Metrics scraping + alerting rules |
| Grafana | 3001 (host) / 3000 (container) | Dashboards + alert visualization |
| Alertmanager | 9093 | Alert routing (Slack, PagerDuty, email) |
| redis-exporter | 9121 | Celery queue depth via `redis_list_length` |
| Loki | 3100 | Log aggregation (optional) |
| Promtail | 9080 | Log shipper to Loki (optional) |

## Directory Layout

```
observability/
├── prometheus/
│   ├── prometheus.yml          # Scrape targets + alertmanager endpoint
│   └── alerts.yml              # Alerting rules (HighErrorRate, LLMTokenSpike, …)
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml  # Auto-provision Prometheus datasource
│   │   └── dashboards/
│   │       └── dashboards.yml  # File-based dashboard provisioner
│   └── dashboards/
│       └── api-overview.json   # Main 21-panel API + ML dashboard
├── loki/
│   └── loki-config.yaml        # Minimal single-binary Loki (optional)
├── promtail/
│   └── promtail-config.yaml    # Docker + Kubernetes log scraping (optional)
└── README.md                   # This file
```

## Quick Start — Local (docker-compose)

The root `docker-compose.yml` already includes `prometheus` and `grafana` services.

```bash
# Start everything
docker-compose up -d

# Prometheus UI
open http://localhost:9090

# Grafana (admin / admin — change on first login)
open http://localhost:3001
```

Dashboards are **auto-provisioned** from `grafana/dashboards/` on startup.  
No manual import required.

## Dashboard Panels (api-overview.json)

The `api-overview` dashboard has 21 panels organized in 8 rows:

| Row | Panels |
| --- | --- |
| Traffic | RPS, Error Rate gauge, In-flight requests |
| Latency | p50/p95/p99 latency, P95 by endpoint |
| Top Endpoints | Top 10 endpoints table |
| Analysis Pipeline | Analysis duration, failure rate, histogram |
| LLM Token Usage | Prompt vs completion rate, token spend donut |
| Queue Depth | Celery queue depth gauge + time series |
| Resource Usage | CPU %, memory working set |
| HTTP Status | Status-code stacked area, pie |
| Summary Stats | 24h totals, current error rate, P95, token count |

## Metric Names

| Metric | Labels | Description |
| --- | --- | --- |
| `http_requests_total` | `method`, `endpoint`, `status_code` | HTTP request counter |
| `http_request_duration_seconds` | `method`, `endpoint` | Request latency histogram |
| `analysis_duration_seconds` | `llm_provider` | End-to-end analysis latency histogram |
| `llm_tokens_total` | `provider`, `model`, `kind` | LLM token consumption counter |
| `analysis_failures_total` | `reason` | Analysis failure counter |
| `redis_list_length` | `key` | Queue depth (from redis-exporter) |

## Queue Depth (redis_exporter)

To enable `redis_list_length` metrics for the Celery queue panels, run `redis_exporter` with:

```bash
docker run -d \
  -p 9121:9121 \
  oliver006/redis_exporter \
    --redis.addr=redis://redis:6379 \
    --check-keys=celery
```

Or add it to `docker-compose.yml`:

```yaml
redis-exporter:
  image: oliver006/redis_exporter:latest
  command: ["--redis.addr=redis://redis:6379", "--check-keys=celery"]
  ports: ["9121:9121"]
  depends_on: [redis]
```

## Alerting Rules Summary

| Alert | Severity | Condition |
| --- | --- | --- |
| HighErrorRate | critical | 5xx > 1% for 5m |
| HighLatencyP95 | warning | P95 > 2s for 10m |
| HighLatencyP99 | critical | P99 > 10s for 5m |
| AnalysisFailures | warning | > 0.05 failures/s for 5m |
| AnalysisFailuresBurst | critical | > 20 failures in 10m |
| LLMTokenSpike | warning | > 500 tokens/s for 5m |
| LLMProviderTimeout | critical | any llm_timeout failures for 3m |
| WorkerQueueGrowing | warning | queue depth > 100 for 10m |
| WorkerQueueCritical | critical | queue depth > 500 for 5m |
| PodCrashLooping | critical | > 3 restarts in 15m |
| HighMemoryUsage | warning | > 85% of limit for 10m |
| HighCPUUsage | warning | > 90% of limit for 10m |

## Kubernetes Deployment

When deploying to EKS, annotate pods to enable auto-discovery:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
```

Enable Kubernetes SD in `prometheus.yml` by removing the comments from the
`kubernetes-pods` and `kubernetes-services` jobs.

## Adding New Panels

1. Edit the dashboard in Grafana UI.
2. Export via **Dashboard → Share → Export → Save to file**.
3. Replace `observability/grafana/dashboards/api-overview.json`.
4. Grafana will hot-reload within 30 s (configured in `dashboards.yml`).
