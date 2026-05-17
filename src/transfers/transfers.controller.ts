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
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@UseGuards(ThrottlerGuard, AuthGuard)
@Controller({ path: 'transfers', version: '1' })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Batch ingest transfer events' })
  @ApiResponse({
    status: 201,
    description: 'Events processed',
    schema: {
      example: {
        inserted: 7,
        duplicates: 3,
        rejected: [{ index: 2, event_id: 'abc', reason: 'missing station_id' }],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async ingest(@Body() dto: CreateTransfersDto) {
    return this.transfersService.ingest(dto);
  }
}
