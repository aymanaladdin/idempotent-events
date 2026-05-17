import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { StorageModule } from './storage/storage.module';
import { TransfersModule } from './transfers/transfers.module';
import { StationsModule } from './stations/stations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    StorageModule,
    TransfersModule,
    StationsModule,
  ],
})
export class AppModule {}
