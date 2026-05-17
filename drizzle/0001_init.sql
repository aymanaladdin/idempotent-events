CREATE TABLE IF NOT EXISTS "transfer_events" (
  "event_id"   text           PRIMARY KEY,
  "station_id" text           NOT NULL,
  "amount"     numeric(20, 4) NOT NULL,
  "status"     text           NOT NULL,
  "created_at" timestamptz    NOT NULL
);
