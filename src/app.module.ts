import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { validate } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { UiModule } from './ui/ui.module';
import { StorageModule } from './storage/storage.module';
import { TransfersModule } from './transfers/transfers.module';
import { StationsModule } from './stations/stations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, load: [appConfig] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CommonModule,
    StorageModule,
    HealthModule,
    UiModule,
    TransfersModule,
    StationsModule,
  ],
})
export class AppModule {}
