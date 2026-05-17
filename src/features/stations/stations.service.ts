import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENT_STORE, EventStore, StationSummary } from '../../infrastructure/storage/event-store.interface';

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);

  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  async getSummary(stationId: string): Promise<StationSummary> {
    const summary = await this.store.getStationSummary(stationId);

    if (!summary) {
      this.logger.warn(`Summary requested for unknown station: ${stationId}`);
      throw new NotFoundException(`Station ${stationId} not found`);
    }

    this.logger.log(
      `Summary for station ${stationId} — approved: ${summary.total_approved_amount}, count: ${summary.events_count}`,
    );

    return summary;
  }
}
