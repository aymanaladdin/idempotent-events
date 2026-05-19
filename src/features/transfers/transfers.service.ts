import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
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

    for (const [i, rawEvent] of dto.events.entries()) {
      const rawEventId = rawEvent['event_id'];
      const eventDto = plainToInstance(TransferEventDto, rawEvent);
      const errors = validateSync(eventDto, { skipMissingProperties: false });

      if (errors.length > 0) {
        rejectedEvents.push({
          index: i,
          event_id: typeof rawEventId === 'string' ? rawEventId : undefined,
          errors: errors.flatMap((validationError) => Object.values(validationError.constraints ?? {})),
        });
      } else {
        validEvents.push({ ...eventDto, created_at: new Date(eventDto.created_at) });
      }
    }

    if (validEvents.length === 0) {
      this.logger.warn(`Batch rejected — all ${rejectedEvents.length} events failed validation`);

      throw new BadRequestException({ inserted: 0, duplicates: 0, rejected: rejectedEvents });
    }

    const batchInsertResult = await this.store.insertBatch(validEvents);
    const result: InsertResult = { ...batchInsertResult, rejected: rejectedEvents };

    this.logger.log(
      `Batch processed — inserted: ${result.inserted}, duplicates: ${result.duplicates}, rejected: ${result.rejected.length}`,
    );

    return result;
  }
}
