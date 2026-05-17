import { Inject, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  EVENT_STORE,
  EventStore,
  InsertResult,
  RejectedEvent,
  TransferEventRecord,
} from '../../infrastructure/storage/event-store.interface';
import { CreateTransfersDto } from './dto/create-transfers.dto';
import { TransferEventDto } from './dto/create-transfers.dto';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(@Inject(EVENT_STORE) private readonly store: EventStore) {}

  async ingest(dto: CreateTransfersDto): Promise<InsertResult> {
    const validEvents: TransferEventRecord[] = [];
    const rejectedEvents: RejectedEvent[] = [];

    for (let i = 0; i < dto.events.length; i++) {
      const rawEventData = dto.events[i];
      const eventDto = plainToInstance(TransferEventDto, rawEventData);
      const errors = validateSync(eventDto, { skipMissingProperties: false });

      if (errors.length > 0) {
        const reason = errors
          .flatMap((validationError) => Object.values(validationError.constraints ?? {}))
          .join('; ');
        rejectedEvents.push({
          index: i,
          event_id: typeof rawEventData['event_id'] === 'string' ? rawEventData['event_id'] : `index-${i}`,
          reason,
        });
      } else {
        validEvents.push({
          event_id: eventDto.event_id,
          station_id: eventDto.station_id,
          amount: eventDto.amount,
          status: eventDto.status,
          created_at: new Date(eventDto.created_at),
        });
      }
    }

    const batchInsertResult = await this.store.insertBatch(validEvents);

    this.logger.log(
      `Batch processed — inserted: ${batchInsertResult.inserted}, duplicates: ${batchInsertResult.duplicates}, rejected: ${rejectedEvents.length}`,
    );

    return { ...batchInsertResult, rejected: rejectedEvents };
  }
}
