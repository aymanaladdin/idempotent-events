import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Concurrency and idempotency', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = {
    'x-api-key': process.env.API_KEY ?? 'change-me-in-production',
  };

  const uniqueStation = () => `station-${Math.random().toString(36).slice(2)}`;

  const getSummary = (sid: string) =>
    request(app.getHttpServer())
      .get(`/stations/${sid}/summary`)
      .set(authHeader);

  it('concurrent POSTs with same event_id do not double-insert', async () => {
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
        .post('/transfers')
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

  it('replayed batch produces same totals', async () => {
    const sid = uniqueStation();
    const events = [
      { event_id: `e1-${sid}`, station_id: sid, amount: 100, status: 'approved', created_at: '2026-01-01T00:00:00Z' },
      { event_id: `e2-${sid}`, station_id: sid, amount: 200, status: 'approved', created_at: '2026-01-02T00:00:00Z' },
    ];

    await request(app.getHttpServer()).post('/transfers').set(authHeader).send({ events });
    await request(app.getHttpServer()).post('/transfers').set(authHeader).send({ events });
    await request(app.getHttpServer()).post('/transfers').set(authHeader).send({ events });

    const summary = await getSummary(sid);
    expect(Number(summary.body.total_approved_amount)).toBe(300);
    expect(summary.body.events_count).toBe(2);
  });

  it('concurrent batches with overlapping event_ids produce consistent totals', async () => {
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
        .post('/transfers')
        .set(authHeader)
        .send({ events: [sharedEvent, e] }),
    );

    await Promise.all(batches);

    const summary = await getSummary(sid);
    expect(Number(summary.body.total_approved_amount)).toBe(550);
    expect(summary.body.events_count).toBe(6);
  });
});
