import { ApiProperty } from '@nestjs/swagger';
import { STATION_SUMMARY_EXAMPLE } from '../stations.examples';

export class StationSummaryDto {
  @ApiProperty({
    description: 'The station identifier',
    example: STATION_SUMMARY_EXAMPLE.station_id,
    required: true,
  })
  station_id: string;

  @ApiProperty({
    description: 'Sum of amount for all events with status = "approved"',
    example: STATION_SUMMARY_EXAMPLE.total_approved_amount,
    required: true,
  })
  total_approved_amount: number;

  @ApiProperty({
    description: 'Total count of stored events for this station regardless of status',
    example: STATION_SUMMARY_EXAMPLE.events_count,
    required: true,
  })
  events_count: number;
}
