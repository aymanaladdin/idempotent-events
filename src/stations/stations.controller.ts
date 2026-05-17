import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../common/auth.guard';
import { StationsService } from './stations.service';

@ApiTags('stations')
@ApiSecurity('x-api-key')
@UseGuards(ThrottlerGuard, AuthGuard)
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get(':station_id/summary')
  @ApiOperation({ summary: 'Get reconciliation summary for a station' })
  @ApiParam({ name: 'station_id', example: 'station-42' })
  @ApiResponse({
    status: 200,
    description: 'Station summary',
    schema: {
      example: {
        station_id: 'station-42',
        total_approved_amount: 450.25,
        events_count: 12,
        events_by_status: { approved: 7, pending: 3, rejected: 2 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Station not found' })
  async getSummary(@Param('station_id') stationId: string) {
    return this.stationsService.getSummary(stationId);
  }
}
