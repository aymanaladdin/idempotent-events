# Idempotent Events API

Station transfer event ingestion API with idempotency and concurrency safety guarantees.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL 16 via Drizzle ORM
- **Auth:** Basic Auth or `x-api-key` header (API routes) / Browser Basic Auth (UI)
- **API Docs:** Scalar at `/reference`
- **Demo UI:** Alpine.js at `/ui/dashboard` (browser basic auth protected)

## Requirements

- Node.js 20+
- PostgreSQL 16+ (or Docker)

## Run Locally

```bash
cp .env.example .env
npm install
npm run db:migrate    # apply migrations via drizzle-kit
make run              # or: npm run start:dev
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `API_KEY` | Value expected in `x-api-key` header | — |
| `BASIC_AUTH_USER` | Basic auth username | `admin` |
| `BASIC_AUTH_PASS` | Basic auth password | `secret` |
| `PORT` | HTTP port | `3000` |

## Run with Docker

```bash
docker compose up --build
```

Services:
| URL | Service |
|---|---|
| http://localhost:3000/ui/dashboard | Demo UI (login: admin / secret) |
| http://localhost:3000/reference | Scalar API reference |
| http://localhost:3000/health/live | Liveness probe |
| http://localhost:3000/health/ready | Readiness probe (checks DB) |
| http://localhost:5050 | pgAdmin (admin@admin.com / admin) |

## Run Tests

```bash
# Local (requires running Postgres)
make test

# Docker
make docker-test
```

22 integration tests covering:
- Batch insert returns correct `inserted` / `duplicates` counts
- Duplicate `event_id` is silently ignored, totals unchanged
- Out-of-order arrival produces correct summary
- Concurrent POSTs with the same `event_id` never double-insert
- Partial accept: valid events are inserted despite invalid siblings in the batch
- Summary correctness per station (approved amount, event count, by-status breakdown)

## Seed Demo Data

```bash
# Local (requires running Postgres)
make seed

# Docker (uses the builder container — no production image impact)
make docker-seed
```

Inserts 10 stations × 50 events each with randomised statuses (approved / pending / rejected / unknown).

## API Routes

All API routes are prefixed with `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/transfers` | Batch ingest transfer events |
| `GET` | `/api/v1/stations/:id/summary` | Reconciliation summary per station |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/reference` | Scalar API docs |
| `GET` | `/ui/dashboard` | Demo UI |

## API Examples

### POST /api/v1/transfers — Batch ingest events

```bash
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me-in-production" \
  -d '{
    "events": [
      {
        "event_id": "evt-001",
        "station_id": "station-42",
        "amount": 100.50,
        "status": "approved",
        "created_at": "2026-02-19T10:00:00Z"
      },
      {
        "event_id": "evt-002",
        "station_id": "station-42",
        "amount": 200.00,
        "status": "pending",
        "created_at": "2026-02-19T11:00:00Z"
      }
    ]
  }'
```

Response:
```json
{
  "inserted": 2,
  "duplicates": 0,
  "rejected": []
}
```

### POST /api/v1/transfers — Partial accept (one invalid event)

```bash
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me-in-production" \
  -d '{
    "events": [
      {
        "event_id": "evt-003",
        "station_id": "station-42",
        "amount": 150.00,
        "status": "approved",
        "created_at": "2026-02-19T12:00:00Z"
      },
      {
        "event_id": "evt-bad",
        "station_id": "station-42",
        "amount": -50,
        "status": "approved",
        "created_at": "2026-02-19T12:01:00Z"
      }
    ]
  }'
```

Response:
```json
{
  "inserted": 1,
  "duplicates": 0,
  "rejected": [
    {
      "index": 1,
      "event_id": "evt-bad",
      "errors": ["amount must not be less than 0"]
    }
  ]
}
```

### GET /api/v1/stations/:station_id/summary — Reconciliation summary

```bash
curl http://localhost:3000/api/v1/stations/station-42/summary \
  -H "x-api-key: change-me-in-production"
```

Response:
```json
{
  "station_id": "station-42",
  "total_approved_amount": 100.5,
  "events_count": 2,
  "events_by_status": {
    "approved": 1,
    "pending": 1
  }
}
```

### Basic Auth

```bash
curl -u admin:secret http://localhost:3000/api/v1/stations/station-42/summary
```

### Health checks

```bash
curl http://localhost:3000/health/live   # always 200
curl http://localhost:3000/health/ready  # 200 when DB up, 503 when down
```

## Design Notes

### Idempotency Strategy

Each `event_id` has a `UNIQUE INDEX` on the `transfer_events` table. Inserts use Drizzle's `.onConflictDoNothing()` which maps to PostgreSQL's `INSERT ... ON CONFLICT DO NOTHING`. Duplicate events are silently skipped — never overwritten.

This is preferred over a read-then-write check because it is a single atomic round-trip — no TOCTOU race is possible between the existence check and the insert. The unique constraint enforces idempotency and concurrency safety from the same primitive, with no extra application logic.

It is also deliberately `DO NOTHING` rather than `ON CONFLICT DO UPDATE`: on a conflict, PostgreSQL discards the incoming row immediately after the index lookup — no heap write, no WAL entry, no new MVCC row version. `ON CONFLICT DO UPDATE` would write a new row version and generate WAL traffic on every duplicate, accumulating dead tuples under high replay rates.

The response distinguishes three outcomes per batch:
- **inserted** — new events stored
- **duplicates** — events already present, silently ignored
- **rejected** — events that failed validation (never reach the DB)

### Concurrency Strategy

Concurrency safety is handled entirely at the database layer via the unique index. Two concurrent POSTs containing the same `event_id` will race to insert — PostgreSQL's index serializes the conflict and exactly one succeeds. No application-level locks or mutexes are needed; the DB guarantees are sufficient and correct across multiple app instances.

### Partial Accept Strategy

The batch follows a **validate-all-first, then bulk-insert** pipeline:
1. All events in the batch are validated by `class-validator` before any DB write.
2. Valid events are bulk-inserted in a single query with `ON CONFLICT DO NOTHING`.
3. Invalid events are returned in the `rejected` array with their index and reason.

This approach is chosen over fail-fast because it makes the endpoint safe to consume from message queues, pub/sub systems, or any replay mechanism — a single invalid event in a replayed batch will not block valid new events from being inserted.

**Validation rules (per event):**
- `event_id`, `station_id`, `status`, `created_at` — required strings
- `amount` — required, must be a non-negative number
- `created_at` — must be a valid ISO 8601 date string
- `status` — any string is accepted; unknown values are stored but do not count toward `total_approved_amount`

### events_count Semantics

`events_count` reflects **all stored events** for the station regardless of status. `total_approved_amount` sums only `status = 'approved'` events. This gives a complete audit picture and allows deriving the approval rate.

### API Versioning

All API endpoints are versioned via URI prefix (`/api/v1/...`). The global `/api` prefix and `v1` version are configured in `main.ts`. The `/ui/dashboard`, `/reference`, and `/health*` routes are intentionally excluded from the global prefix.

### Tradeoffs & Future Layers

| Concern | Current | Production path |
|---|---|---|
| Rate limiting | `@nestjs/throttler` (per-instance) | API Gateway (Kong / AWS API GW) for cluster-wide limits |
| Dedup cache | DB unique index only | Redis bloom filter as fast-path before DB write at extreme write volume |
| Storage | Postgres only | `EventStore` interface makes swapping to another adapter trivial |
| Auth | Basic Auth / API key | JWT + RBAC via an identity provider |

### Storage Port

The `EventStore` interface in `src/infrastructure/storage/event-store.interface.ts` defines the persistence contract. The current implementation is `PostgresEventStore`. Swapping to a different backend requires only a new class implementing the same interface and updating the provider in `StorageModule`.

```
src/
  features/
    transfers/        # POST /transfers — controller, service, DTOs
    stations/         # GET /stations/:id/summary — controller, service, DTOs
    ui/               # /ui/dashboard — browser-auth guard, static serving
  infrastructure/
    storage/          # EventStore port + PostgresEventStore adapter
    health/           # /health/live + /health/ready
  common/             # parseBasicAuth helper, shared auth guard
  config/             # env validation, app config
```
