import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { AuthGuard } from '../common/auth.guard';
import { DRIZZLE, DrizzleDb } from '../storage/drizzle.provider';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process is alive' })
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — database is reachable' })
  readiness() {
    return this.health.check([() => this.checkDb()]);
  }

  @Get()
  @HealthCheck()
  @UseGuards(AuthGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Combined health check — requires auth' })
  check() {
    return this.health.check([() => this.checkDb()]);
  }

  private async checkDb(): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { database: { status: 'up' } };
    } catch (err) {
      return { database: { status: 'down', message: (err as Error).message } };
    }
  }
}
