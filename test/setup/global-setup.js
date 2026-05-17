'use strict';

require('dotenv').config({ path: '.env.test' });

const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const path = require('path');

module.exports = async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL;
  const url = new URL(dbUrl);
  const dbName = url.pathname.slice(1);

  const adminConnStr = dbUrl.replace(`/${dbName}`, '/postgres');
  const adminPool = new Pool({ connectionString: adminConnStr });
  await adminPool.query(`CREATE DATABASE "${dbName}"`).catch(() => {});
  await adminPool.end();

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../../drizzle'),
  });
  await pool.end();

  console.log(`[globalSetup] test DB "${dbName}" ready`);
};
