import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { AppConfig } from '../../config/app.config';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
  private readonly pool: Pool;
  readonly db: DrizzleDb;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<AppConfig>('app').databaseUrl });
    this.db = drizzle(this.pool, { schema });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [DrizzleService],
  useFactory: (svc: DrizzleService) => svc.db,
};
