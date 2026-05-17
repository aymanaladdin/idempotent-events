import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../common/auth.guard';
import { CreateTransfersDto } from './dto/create-transfers.dto';
import { InsertResultDto } from './dto/insert-result.dto';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@UseGuards(ThrottlerGuard, AuthGuard)
@Controller({ path: 'transfers', version: '1' })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary: 'Batch ingest transfer events',
    description: 'Validates all events first, then bulk-inserts valid ones. Duplicate event_ids are silently ignored. Invalid events are returned in the rejected array without blocking valid ones.',
  })
  @ApiResponse({ status: 201, description: 'Batch processed', type: InsertResultDto })
  @ApiResponse({ status: 400, description: 'Request body failed validation' })
  @ApiResponse({ status: 401, description: 'Missing or invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests — rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async ingest(@Body() dto: CreateTransfersDto) {
    return this.transfersService.ingest(dto);
  }
}
