import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferEventDto {
  @ApiProperty({
    description: 'Globally unique identifier for this event — used for idempotency; duplicates are silently ignored',
    example: 'evt-001',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @ApiProperty({
    description: 'Identifier of the station this transfer belongs to',
    example: 'station-42',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  station_id: string;

  @ApiProperty({
    description: 'Non-negative transfer amount — only counted toward station totals when status is "approved"',
    example: 100.5,
    minimum: 0,
    required: true,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Any string value — unknown statuses are stored but excluded from approved totals',
    example: 'approved',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Event timestamp in ISO 8601 format',
    example: '2026-02-19T10:00:00Z',
    required: true,
  })
  @IsDateString()
  created_at: string;
}

export class CreateTransfersDto {
  @ApiProperty({
    description: 'Batch of transfer events to ingest — must contain at least one event. Each event is validated individually; invalid entries are returned in rejected[] without blocking valid ones.',
    type: [TransferEventDto],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  events: Record<string, unknown>[];
}
