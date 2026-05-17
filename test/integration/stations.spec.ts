import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/app';

describe('Station summary', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = { 'x-api-key': process.env.API_KEY ?? 'test-api-key' };

  const uniqueStation = () => `station-${Math.random().toString(36).slice(2)}`;

  const ingest = (events: object[]) =>
    request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events });

  const event = (stationId: string, overrides = {}) => ({
    event_id: `evt-${Math.random().toString(36).slice(2)}`,
    station_id: stationId,
    amount: 100,
    status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  describe('given no events have been stored for the station', () => {
    it('returns 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/stations/nonexistent-xyz/summary')
        .set(authHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('given events with mixed statuses', () => {
    it('sums only approved amounts in total_approved_amount', async () => {
      const stationId = uniqueStation();
      await ingest([
        event(stationId, { amount: 100, status: 'approved' }),
        event(stationId, { amount: 200, status: 'approved' }),
        event(stationId, { amount: 999, status: 'pending' }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${stationId}/summary`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(Number(response.body.total_approved_amount)).toBe(300);
    });

    it('counts all events regardless of status in events_count', async () => {
      const stationId = uniqueStation();
      await ingest([
        event(stationId, { status: 'approved' }),
        event(stationId, { status: 'pending' }),
        event(stationId, { status: 'rejected' }),
        event(stationId, { status: 'unknown_future_status' }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${stationId}/summary`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.events_count).toBe(4);
    });

    it('returns a per-status breakdown in events_by_status', async () => {
      const stationId = uniqueStation();
      await ingest([
        event(stationId, { status: 'approved' }),
        event(stationId, { status: 'approved' }),
        event(stationId, { status: 'pending' }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${stationId}/summary`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.events_by_status.approved).toBe(2);
      expect(response.body.events_by_status.pending).toBe(1);
    });
  });

  describe('given events arriving out of chronological order', () => {
    it('produces the same totals as in-order arrival', async () => {
      const stationId = uniqueStation();
      await ingest([
        event(stationId, { amount: 50, status: 'approved', created_at: '2026-03-01T00:00:00Z' }),
        event(stationId, { amount: 150, status: 'approved', created_at: '2026-01-01T00:00:00Z' }),
        event(stationId, { amount: 100, status: 'approved', created_at: '2026-02-01T00:00:00Z' }),
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${stationId}/summary`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(Number(response.body.total_approved_amount)).toBe(300);
    });
  });

  describe('given duplicate events', () => {
    it('does not change totals when the same batch is replayed', async () => {
      const stationId = uniqueStation();
      const duplicateTransferEvent = event(stationId, { amount: 100, status: 'approved' });
      await ingest([duplicateTransferEvent]);
      await ingest([duplicateTransferEvent]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${stationId}/summary`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(Number(response.body.total_approved_amount)).toBe(100);
      expect(response.body.events_count).toBe(1);
    });
  });

  describe('given events for multiple stations', () => {
    it('isolates each station summary independently', async () => {
      const firstStationId = uniqueStation();
      const secondStationId = uniqueStation();
      await ingest([event(firstStationId, { amount: 500, status: 'approved' })]);
      await ingest([event(secondStationId, { amount: 999, status: 'approved' })]);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/stations/${firstStationId}/summary`)
        .set(authHeader);

      expect(Number(response.body.total_approved_amount)).toBe(500);
      expect(response.body.events_count).toBe(1);
    });
  });
});
