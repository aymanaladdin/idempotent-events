import { ApiProperty } from '@nestjs/swagger';
import { REJECTED_EVENT_EXAMPLE, INSERT_RESULT_EXAMPLE } from '../transfers.examples';

export class RejectedEventDto {
  @ApiProperty({
    description: 'Zero-based index of the event in the submitted batch',
    example: REJECTED_EVENT_EXAMPLE.index,
    required: true,
  })
  index: number;

  @ApiProperty({
    description: 'The event_id of the rejected event. Omitted when the submitted value was missing or not a string.',
    example: REJECTED_EVENT_EXAMPLE.event_id,
    required: false,
  })
  event_id?: string;

  @ApiProperty({
    description: 'Validation error messages for this event',
    example: REJECTED_EVENT_EXAMPLE.errors,
    isArray: true,
    type: String,
    required: true,
  })
  errors: string[];
}

export class InsertResultDto {
  @ApiProperty({
    description: 'Number of new events successfully stored',
    example: INSERT_RESULT_EXAMPLE.inserted,
    required: true,
  })
  inserted: number;

  @ApiProperty({
    description: 'Number of events silently ignored because their event_id already exists',
    example: INSERT_RESULT_EXAMPLE.duplicates,
    required: true,
  })
  duplicates: number;

  @ApiProperty({
    description: 'Events that failed validation and were not stored',
    type: [RejectedEventDto],
    required: true,
  })
  rejected: RejectedEventDto[];
}
