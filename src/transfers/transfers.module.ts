import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [CommonModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
