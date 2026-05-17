CREATE TABLE IF NOT EXISTS "transfer_events" (
  "id"         bigserial   PRIMARY KEY,
  "event_id"   text        NOT NULL,
  "station_id" text        NOT NULL,
  "amount"     numeric(20, 4) NOT NULL,
  "status"     text        NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "transfer_events_event_id_unique"
  ON "transfer_events" ("event_id");
