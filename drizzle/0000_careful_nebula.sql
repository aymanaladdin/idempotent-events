CREATE TABLE IF NOT EXISTS "transfer_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"amount" numeric(20, 4) NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
