import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [CommonModule],
  controllers: [StationsController],
  providers: [StationsService],
})
export class StationsModule {}
