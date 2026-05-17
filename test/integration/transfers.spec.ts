import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/app';

describe('Transfer ingestion', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = { 'x-api-key': process.env.API_KEY ?? 'test-api-key' };

  const validEvent = (overrides = {}) => ({
    event_id: `evt-${Math.random().toString(36).slice(2)}`,
    station_id: 'station-1',
    amount: 100,
    status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  const ingest = (events: object[]) =>
    request(app.getHttpServer())
      .post('/api/v1/transfers')
      .set(authHeader)
      .send({ events });

  describe('given a valid batch', () => {
    it('stores all events and reports inserted count', async () => {
      const events = [validEvent(), validEvent(), validEvent()];

      const response = await ingest(events);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(3);
      expect(response.body.duplicates).toBe(0);
      expect(response.body.rejected).toEqual([]);
    });

    it('stores events with unknown status without error', async () => {
      const response = await ingest([validEvent({ status: 'pending_review' })]);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(1);
    });

    it('accepts x-api-key header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set({ 'x-api-key': process.env.API_KEY ?? 'test-api-key' })
        .send({ events: [validEvent()] });

      expect(response.status).toBe(201);
    });

    it('accepts Basic Auth credentials', async () => {
      const username = process.env.BASIC_AUTH_USER ?? 'admin';
      const password = process.env.BASIC_AUTH_PASS ?? 'secret';

      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .auth(username, password)
        .send({ events: [validEvent()] });

      expect(response.status).toBe(201);
    });
  });

  describe('given a batch containing duplicates', () => {
    it('silently ignores duplicate event_ids and reports duplicate count', async () => {
      const event = validEvent();
      await ingest([event]);

      const response = await ingest([event]);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(0);
      expect(response.body.duplicates).toBe(1);
    });

    it('handles a mixed batch of new and duplicate events', async () => {
      const existing = validEvent();
      await ingest([existing]);
      const newEvent = validEvent();

      const response = await ingest([existing, newEvent]);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(1);
      expect(response.body.duplicates).toBe(1);
    });
  });

  describe('given events with validation failures', () => {
    it('stores valid events and lists failures in rejected[]', async () => {
      const events = [validEvent(), { amount: -1, status: 'approved' }, validEvent()];

      const response = await ingest(events);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(2);
      expect(response.body.rejected).toHaveLength(1);
      expect(response.body.rejected[0].index).toBe(1);
      expect(response.body.rejected[0].reason).toBeTruthy();
    });

    it('rejects events with missing required fields into rejected[]', async () => {
      const response = await ingest([{ amount: 100, status: 'approved' }]);

      expect(response.status).toBe(201);
      expect(response.body.inserted).toBe(0);
      expect(response.body.rejected).toHaveLength(1);
      expect(response.body.rejected[0].index).toBe(0);
      expect(response.body.rejected[0].reason).toBeTruthy();
    });

    it('rejects events with negative amount into rejected[]', async () => {
      const response = await ingest([validEvent({ amount: -1 })]);

      expect(response.status).toBe(201);
      expect(response.body.rejected).toHaveLength(1);
      expect(response.body.rejected[0].index).toBe(0);
    });

    it('rejects events with invalid created_at into rejected[]', async () => {
      const response = await ingest([validEvent({ created_at: 'not-a-date' })]);

      expect(response.status).toBe(201);
      expect(response.body.rejected).toHaveLength(1);
      expect(response.body.rejected[0].index).toBe(0);
    });
  });

  describe('given an invalid request shape', () => {
    it('returns 400 when the events field is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set(authHeader)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('given missing credentials', () => {
    it('returns 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .send({ events: [validEvent()] });

      expect(response.status).toBe(401);
    });
  });
});
