const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const migrationsDir = path.join(__dirname, '..', 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    await client.query(sql);
  }

  await client.end();
  console.log('Migrations complete');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
