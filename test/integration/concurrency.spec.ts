import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/app';

describe('Idempotency under concurrent load', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = { 'x-api-key': process.env.API_KEY ?? 'test-api-key' };

  const uniqueStation = () => `station-${Math.random().toString(36).slice(2)}`;

  const getSummary = (sid: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/stations/${sid}/summary`)
      .set(authHeader);

  describe('given the same event_id sent by 10 concurrent requests', () => {
    it('stores exactly one event and counts 9 duplicates', async () => {
      const sid = uniqueStation();
      const event = {
        event_id: `evt-concurrent-${Math.random().toString(36).slice(2)}`,
        station_id: sid,
        amount: 250,
        status: 'approved',
        created_at: '2026-01-01T00:00:00Z',
      };
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/transfers')
          .set(authHeader)
          .send({ events: [event] }),
      );

      const results = await Promise.all(concurrentRequests);
      const totalInserted = results.reduce((sum, r) => sum + (r.body.inserted ?? 0), 0);
      const totalDuplicates = results.reduce((sum, r) => sum + (r.body.duplicates ?? 0), 0);

      expect(totalInserted).toBe(1);
      expect(totalDuplicates).toBe(9);
      const summary = await getSummary(sid);
      expect(Number(summary.body.total_approved_amount)).toBe(250);
      expect(summary.body.events_count).toBe(1);
    });
  });

  describe('given a batch replayed multiple times', () => {
    it('produces the same summary totals as a single insert', async () => {
      const sid = uniqueStation();
      const events = [
        { event_id: `e1-${sid}`, station_id: sid, amount: 100, status: 'approved', created_at: '2026-01-01T00:00:00Z' },
        { event_id: `e2-${sid}`, station_id: sid, amount: 200, status: 'approved', created_at: '2026-01-02T00:00:00Z' },
      ];

      await request(app.getHttpServer()).post('/api/v1/transfers').set(authHeader).send({ events });
      await request(app.getHttpServer()).post('/api/v1/transfers').set(authHeader).send({ events });
      await request(app.getHttpServer()).post('/api/v1/transfers').set(authHeader).send({ events });

      const summary = await getSummary(sid);

      expect(Number(summary.body.total_approved_amount)).toBe(300);
      expect(summary.body.events_count).toBe(2);
    });
  });

  describe('given concurrent batches with overlapping event_ids', () => {
    it('stores each unique event_id once and computes the correct approved total', async () => {
      const sid = uniqueStation();
      const sharedEvent = {
        event_id: `shared-${Math.random().toString(36).slice(2)}`,
        station_id: sid,
        amount: 500,
        status: 'approved',
        created_at: '2026-01-01T00:00:00Z',
      };
      const uniqueEvents = Array.from({ length: 5 }, (_, i) => ({
        event_id: `unique-${sid}-${i}`,
        station_id: sid,
        amount: 10,
        status: 'approved',
        created_at: '2026-01-01T00:00:00Z',
      }));

      const batches = uniqueEvents.map((e) =>
        request(app.getHttpServer())
          .post('/api/v1/transfers')
          .set(authHeader)
          .send({ events: [sharedEvent, e] }),
      );

      await Promise.all(batches);

      const summary = await getSummary(sid);

      expect(Number(summary.body.total_approved_amount)).toBe(550);
      expect(summary.body.events_count).toBe(6);
    });
  });
});
