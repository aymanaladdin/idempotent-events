import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE, EventStore, InsertResult } from '../storage/event-store.interface';
import { CreateTransfersDto } from './dto/create-transfers.dto';

@Injectable()
export class TransfersService {
  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  async ingest(dto: CreateTransfersDto): Promise<InsertResult> {
    const events = dto.events.map((e) => ({
      event_id: e.event_id,
      station_id: e.station_id,
      amount: e.amount,
      status: e.status,
      created_at: new Date(e.created_at),
    }));

    return this.store.insertBatch(events);
  }
}
