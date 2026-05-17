export interface TransferEventRecord {
  event_id: string;
  station_id: string;
  amount: number;
  status: string;
  created_at: Date;
}

export interface InsertResult {
  inserted: number;
  duplicates: number;
  rejected: RejectedEvent[];
}

export interface RejectedEvent {
  index: number;
  event_id: string;
  reason: string;
}

export interface StationSummary {
  station_id: string;
  total_approved_amount: number;
  events_count: number;
  events_by_status: Record<string, number>;
}

export const EVENT_STORE = Symbol('EVENT_STORE');

export interface EventStore {
  insertBatch(events: TransferEventRecord[]): Promise<InsertResult>;
  getStationSummary(stationId: string): Promise<StationSummary | null>;
}
