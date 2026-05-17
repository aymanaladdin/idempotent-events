import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth.guard';
import { StationSummaryDto } from './dto/station-summary.dto';
import { StationsService } from './stations.service';

@ApiTags('stations')
@ApiSecurity('x-api-key')
@UseGuards(ThrottlerGuard, AuthGuard)
@Controller({ path: 'stations', version: '1' })
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get(':station_id/summary')
  @ApiOperation({
    summary: 'Get reconciliation summary for a station',
    description: 'Returns total approved amount, all-status event count, and a per-status breakdown. Only approved events contribute to total_approved_amount.',
  })
  @ApiParam({ name: 'station_id', description: 'Station identifier', example: 'station-42' })
  @ApiResponse({ status: 200, description: 'Station summary', type: StationSummaryDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid credentials' })
  @ApiResponse({ status: 404, description: 'No events found for this station' })
  @ApiResponse({ status: 429, description: 'Too many requests — rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSummary(@Param('station_id') stationId: string) {
    return this.stationsService.getSummary(stationId);
  }
}
