import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';

export const transferEvents = pgTable('transfer_events', {
  event_id: text('event_id').primaryKey(),
  station_id: text('station_id').notNull(),
  amount: numeric('amount', { precision: 20, scale: 4 }).notNull(),
  status: text('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
