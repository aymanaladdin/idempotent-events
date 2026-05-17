import { uuidv7 } from 'uuidv7';

export interface TransferEventPayload {
  event_id: string;
  station_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export const buildTransferEvent = (overrides: Partial<TransferEventPayload> = {}): TransferEventPayload => ({
  event_id: uuidv7(),
  station_id: 'station-1',
  amount: 100,
  status: 'approved',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});
