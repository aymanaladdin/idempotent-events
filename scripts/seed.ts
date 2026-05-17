import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { transferEvents } from '../src/infrastructure/storage/schema';

const STATIONS = Array.from({ length: 10 }, (_, i) => `station-${String(i + 1).padStart(2, '0')}`);
const EVENTS_PER_STATION = 50;

const STATUS_POOL: string[] = [
  ...Array(30).fill('approved'),
  ...Array(12).fill('pending'),
  ...Array(5).fill('rejected'),
  ...Array(3).fill('unknown'),
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCreatedAt(): Date {
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return new Date(`2026-${month}-${day}T00:00:00Z`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const rows = STATIONS.flatMap((stationId) =>
    Array.from({ length: EVENTS_PER_STATION }, (_, i) => ({
      event_id: `seed-${stationId}-${String(i).padStart(3, '0')}`,
      station_id: stationId,
      amount: String(randomInt(100, 10_000)),
      status: STATUS_POOL[i % STATUS_POOL.length],
      created_at: randomCreatedAt(),
    })),
  );

  const result = await db
    .insert(transferEvents)
    .values(rows)
    .onConflictDoNothing()
    .returning({ event_id: transferEvents.event_id });

  const inserted = result.length;
  const skipped = rows.length - inserted;

  console.log(`Seeded ${inserted} events across ${STATIONS.length} stations (${skipped} skipped as duplicates)`);

  await pool.end();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
