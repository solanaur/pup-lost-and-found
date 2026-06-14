#!/usr/bin/env node
/**
 * Seeds demo users/items into Supabase (run once after schema.sql).
 * Usage: node scripts/seed-supabase.js
 */
require('dotenv').config();
const { hydrate, flush } = require('../server/db');

async function main() {
  await hydrate();
  await flush();
  console.log('Supabase store seeded (demo data created if empty).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
