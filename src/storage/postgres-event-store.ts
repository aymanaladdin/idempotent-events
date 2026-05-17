import { Inject, Injectable } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from './drizzle.provider';
import { EventStore, InsertResult, StationSummary, TransferEventRecord } from './event-store.interface';
import { transferEvents } from './schema';

@Injectable()
export class PostgresEventStore implements EventStore {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insertBatch(events: TransferEventRecord[]): Promise<InsertResult> {
    if (events.length === 0) {
      return { inserted: 0, duplicates: 0, rejected: [] };
    }

    const rows = events.map((e) => ({
      event_id: e.event_id,
      station_id: e.station_id,
      amount: String(e.amount),
      status: e.status,
      created_at: e.created_at,
    }));

    const result = await this.db
      .insert(transferEvents)
      .values(rows)
      .onConflictDoNothing({ target: transferEvents.event_id })
      .returning({ event_id: transferEvents.event_id });

    const inserted = result.length;
    const duplicates = events.length - inserted;

    return { inserted, duplicates, rejected: [] };
  }

  async getStationSummary(stationId: string): Promise<StationSummary | null> {
    const rows = await this.db
      .select({
        status: transferEvents.status,
        count: sql<string>`count(*)`,
        total: sql<string>`coalesce(sum(case when ${transferEvents.status} = 'approved' then ${transferEvents.amount}::numeric else 0 end), 0)`,
      })
      .from(transferEvents)
      .where(eq(transferEvents.station_id, stationId))
      .groupBy(transferEvents.status);

    if (rows.length === 0) return null;

    const events_by_status: Record<string, number> = {};
    let events_count = 0;
    let total_approved_amount = 0;

    for (const row of rows) {
      const count = Number(row.count);
      events_by_status[row.status] = count;
      events_count += count;
      if (row.status === 'approved') {
        total_approved_amount = Number(row.total);
      }
    }

    return {
      station_id: stationId,
      total_approved_amount,
      events_count,
      events_by_status,
    };
  }
}
