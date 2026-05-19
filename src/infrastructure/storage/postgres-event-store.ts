import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from './drizzle.provider';
import { EventStore, InsertResult, StationSummary, TransferEventRecord } from './event-store.interface';
import { transferEvents } from './schema';

const APPROVED_STATUS = 'approved';

@Injectable()
export class PostgresEventStore implements EventStore {
  private readonly logger = new Logger(PostgresEventStore.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insertBatch(events: TransferEventRecord[]): Promise<InsertResult> {
    if (events.length === 0) {
      return { inserted: 0, duplicates: 0, rejected: [] };
    }

    const rows = events.map((event) => ({
      event_id: event.event_id,
      station_id: event.station_id,
      amount: String(event.amount),
      status: event.status,
      created_at: event.created_at,
    }));

    try {
      const result = await this.db
        .insert(transferEvents)
        .values(rows)
        .onConflictDoNothing({ target: transferEvents.event_id })
        .returning({ event_id: transferEvents.event_id });

      const inserted = result.length;
      const duplicates = events.length - inserted;

      return { inserted, duplicates, rejected: [] };
    } catch (error) {
      this.logger.error('Failed to insert batch', (error as Error).stack);
      throw error;
    }
  }

  async getStationSummary(stationId: string): Promise<StationSummary | null> {
    try {
      const [row] = await this.db
        .select({
          count: sql<string>`count(*)`,
          approved_total: sql<string>`coalesce(sum(case when ${transferEvents.status} = ${APPROVED_STATUS} then ${transferEvents.amount}::numeric else 0 end), 0)`,
        })
        .from(transferEvents)
        .where(eq(transferEvents.station_id, stationId));

      const eventsCount = Number(row?.count ?? 0);
      if (eventsCount === 0) return null;

      return {
        station_id: stationId,
        total_approved_amount: Number(row.approved_total),
        events_count: eventsCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get summary for station ${stationId}`, (error as Error).stack);
      throw error;
    }
  }
}
