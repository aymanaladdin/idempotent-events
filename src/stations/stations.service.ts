import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_STORE, EventStore, StationSummary } from '../storage/event-store.interface';

@Injectable()
export class StationsService {
  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  async getSummary(stationId: string): Promise<StationSummary> {
    const summary = await this.store.getStationSummary(stationId);
    if (!summary) {
      throw new NotFoundException(`Station ${stationId} not found`);
    }
    return summary;
  }
}
