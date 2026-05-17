import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  EVENT_STORE,
  EventStore,
  InsertResult,
  RejectedEvent,
  TransferEventRecord,
} from '../storage/event-store.interface';
import { CreateTransfersDto } from './dto/create-transfers.dto';
import { TransferEventDto } from './dto/create-transfers.dto';

@Injectable()
export class TransfersService {
  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  async ingest(dto: CreateTransfersDto): Promise<InsertResult> {
    const valid: TransferEventRecord[] = [];
    const rejected: RejectedEvent[] = [];

    for (let i = 0; i < dto.events.length; i++) {
      const raw = dto.events[i];
      const eventDto = plainToInstance(TransferEventDto, raw);
      const errors = validateSync(eventDto, { skipMissingProperties: false });

      if (errors.length > 0) {
        const reason = errors
          .flatMap((e) => Object.values(e.constraints ?? {}))
          .join('; ');
        rejected.push({
          index: i,
          event_id: typeof raw['event_id'] === 'string' ? raw['event_id'] : `index-${i}`,
          reason,
        });
      } else {
        valid.push({
          event_id: eventDto.event_id,
          station_id: eventDto.station_id,
          amount: eventDto.amount,
          status: eventDto.status,
          created_at: new Date(eventDto.created_at),
        });
      }
    }

    const storeResult = await this.store.insertBatch(valid);
    return { ...storeResult, rejected };
  }
}
