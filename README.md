# Idempotent Events API

Station transfer event ingestion API with idempotency and concurrency safety guarantees.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL 16 via Drizzle ORM
- **Auth:** Basic Auth or `x-api-key` header
- **Docs:** Swagger UI at `/api`
- **Demo UI:** Alpine.js at `/`

## Requirements

- Node.js 20+
- PostgreSQL 16+ (or Docker)

## Run Locally

```bash
cp .env.example .env
npm install
# Start Postgres, then run migrations and start the server
node scripts/migrate.js
make run
# or: npm run start:dev
```

## Run with Docker

```bash
docker compose up --build
```

Services:
- **App:** http://localhost:3000
- **Swagger UI:** http://localhost:3000/api
- **Demo UI:** http://localhost:3000
- **pgAdmin:** http://localhost:5050 (admin@admin.com / admin)

## Run Tests

```bash
# Local (requires running Postgres)
make test

# Docker
make docker-test
```

## API Examples

### POST /transfers — Batch ingest events

```bash
curl -X POST http://localhost:3000/transfers \
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

### GET /stations/:station_id/summary — Reconciliation summary

```bash
curl http://localhost:3000/stations/station-42/summary \
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
curl -u admin:secret http://localhost:3000/stations/station-42/summary
```

## Design Notes

### Idempotency Strategy

Each `event_id` has a `UNIQUE INDEX` on the `transfer_events` table. Inserts use Drizzle's `.onConflictDoNothing()` which maps to PostgreSQL's `INSERT ... ON CONFLICT DO NOTHING`. Duplicate events are silently skipped — never overwritten.

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

### events_count Semantics

`events_count` reflects **all stored events** for the station regardless of status. `total_approved_amount` sums only `status = 'approved'` events. This gives a complete audit picture and allows deriving the approval rate.

### Tradeoffs & Future Layers

| Concern | Current | Production path |
|---|---|---|
| Rate limiting | `@nestjs/throttler` (per-instance) | API Gateway (Kong / AWS API GW) for cluster-wide limits |
| Dedup cache | DB unique index only | Redis bloom filter as fast-path before DB write at extreme write volume |
| Storage | Postgres only | `EventStore` interface makes swapping to another adapter trivial |
| Auth | Basic Auth / API key | JWT + RBAC via an identity provider |

### Storage Port

The `EventStore` interface in `src/storage/event-store.interface.ts` defines the persistence contract. The current implementation is `PostgresEventStore`. Swapping to a different backend requires only a new class implementing the same interface and updating the provider in `StorageModule`.
