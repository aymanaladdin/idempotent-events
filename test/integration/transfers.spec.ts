import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('POST /transfers', () => {
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

  const validEvent = (overrides = {}) => ({
    event_id: `evt-${Math.random().toString(36).slice(2)}`,
    station_id: 'station-1',
    amount: 100,
    status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  it('inserts a batch and returns correct inserted count', async () => {
    const events = [validEvent(), validEvent(), validEvent()];
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(3);
    expect(res.body.duplicates).toBe(0);
    expect(res.body.rejected).toEqual([]);
  });

  it('counts duplicates correctly without reinserting them', async () => {
    const event = validEvent();
    await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [event] });

    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [event] });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(0);
    expect(res.body.duplicates).toBe(1);
  });

  it('handles mixed batch of new and duplicate events', async () => {
    const existing = validEvent();
    await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [existing] });

    const newEvent = validEvent();
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [existing, newEvent] });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
    expect(res.body.duplicates).toBe(1);
  });

  it('returns invalid events in rejected[] without blocking valid ones', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({
        events: [
          validEvent(),
          { amount: -1, status: 'approved' },
          validEvent(),
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(2);
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0].index).toBe(1);
    expect(res.body.rejected[0].reason).toBeTruthy();
  });

  it('rejects event with missing required fields into rejected[]', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [{ amount: 100, status: 'approved' }] });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(0);
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0].index).toBe(0);
    expect(res.body.rejected[0].reason).toBeTruthy();
  });

  it('rejects event with negative amount into rejected[]', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [validEvent({ amount: -1 })] });

    expect(res.status).toBe(201);
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0].index).toBe(0);
  });

  it('rejects event with invalid created_at into rejected[]', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [validEvent({ created_at: 'not-a-date' })] });

    expect(res.status).toBe(201);
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0].index).toBe(0);
  });

  it('returns 400 if events field is missing entirely', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  it('stores events with unknown status without error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events: [validEvent({ status: 'pending_review' })] });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
  });

  it('returns 401 without credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .send({ events: [validEvent()] });

    expect(res.status).toBe(401);
  });

  it('accepts basic auth credentials', async () => {
    const user = process.env.BASIC_AUTH_USER ?? 'admin';
    const pass = process.env.BASIC_AUTH_PASS ?? 'secret';
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .auth(user, pass)
      .send({ events: [validEvent()] });

    expect(res.status).toBe(201);
  });
});
