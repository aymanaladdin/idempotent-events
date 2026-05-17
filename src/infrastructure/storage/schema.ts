import { pgTable, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const transferEvents = pgTable('transfer_events', {
  event_id: text('event_id').primaryKey(),
  station_id: text('station_id').notNull(),
  amount: numeric('amount', { precision: 20, scale: 4 }).notNull(),
  status: text('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  stationStatusIdx: index('transfer_events_station_status_idx').on(table.station_id, table.status),
}));
