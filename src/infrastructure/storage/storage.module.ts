import { Global, Module } from '@nestjs/common';
import { DrizzleService, drizzleProvider, DRIZZLE } from './drizzle.provider';
import { PostgresEventStore } from './postgres-event-store';
import { EVENT_STORE } from './event-store.interface';

@Global()
@Module({
  providers: [
    DrizzleService,
    drizzleProvider,
    {
      provide: EVENT_STORE,
      useClass: PostgresEventStore,
    },
  ],
  exports: [DRIZZLE, EVENT_STORE],
})
export class StorageModule {}
