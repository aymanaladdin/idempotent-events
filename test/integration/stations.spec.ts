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
      const res = await request(app.getHttpServer())
        .get('/api/v1/stations/nonexistent-xyz/summary')
        .set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('given events with mixed statuses', () => {
    it('sums only approved amounts in total_approved_amount', async () => {
      const sid = uniqueStation();
      await ingest([
        event(sid, { amount: 100, status: 'approved' }),
        event(sid, { amount: 200, status: 'approved' }),
        event(sid, { amount: 999, status: 'pending' }),
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid}/summary`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(Number(res.body.total_approved_amount)).toBe(300);
    });

    it('counts all events regardless of status in events_count', async () => {
      const sid = uniqueStation();
      await ingest([
        event(sid, { status: 'approved' }),
        event(sid, { status: 'pending' }),
        event(sid, { status: 'rejected' }),
        event(sid, { status: 'unknown_future_status' }),
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid}/summary`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.events_count).toBe(4);
    });

    it('returns a per-status breakdown in events_by_status', async () => {
      const sid = uniqueStation();
      await ingest([
        event(sid, { status: 'approved' }),
        event(sid, { status: 'approved' }),
        event(sid, { status: 'pending' }),
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid}/summary`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.events_by_status.approved).toBe(2);
      expect(res.body.events_by_status.pending).toBe(1);
    });
  });

  describe('given events arriving out of chronological order', () => {
    it('produces the same totals as in-order arrival', async () => {
      const sid = uniqueStation();
      await ingest([
        event(sid, { amount: 50, status: 'approved', created_at: '2026-03-01T00:00:00Z' }),
        event(sid, { amount: 150, status: 'approved', created_at: '2026-01-01T00:00:00Z' }),
        event(sid, { amount: 100, status: 'approved', created_at: '2026-02-01T00:00:00Z' }),
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid}/summary`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(Number(res.body.total_approved_amount)).toBe(300);
    });
  });

  describe('given duplicate events', () => {
    it('does not change totals when the same batch is replayed', async () => {
      const sid = uniqueStation();
      const e = event(sid, { amount: 100, status: 'approved' });
      await ingest([e]);
      await ingest([e]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid}/summary`)
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(Number(res.body.total_approved_amount)).toBe(100);
      expect(res.body.events_count).toBe(1);
    });
  });

  describe('given events for multiple stations', () => {
    it('isolates each station summary independently', async () => {
      const sid1 = uniqueStation();
      const sid2 = uniqueStation();
      await ingest([event(sid1, { amount: 500, status: 'approved' })]);
      await ingest([event(sid2, { amount: 999, status: 'approved' })]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stations/${sid1}/summary`)
        .set(authHeader);

      expect(Number(res.body.total_approved_amount)).toBe(500);
      expect(res.body.events_count).toBe(1);
    });
  });
});
