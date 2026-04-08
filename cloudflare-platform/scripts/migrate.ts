#!/usr/bin/env npx tsx
/**
 * Phase 6.2: Database Migration Tooling
 * Reads numbered SQL files from migrations/ directory and executes against D1.
 * Tracks applied migrations in a `migrations` table.
 *
 * Usage:
 *   npx wrangler d1 execute nxt_energy_trading --command="CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))"
 *   npx tsx scripts/migrate.ts
 *
 * Or run migrations manually:
 *   for f in migrations/*.sql; do wrangler d1 execute nxt_energy_trading --file="$f"; done
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');
const DB_NAME = 'nxt_energy_trading';

function getMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // numbered files sort naturally: 001_, 002_, etc.
  } catch {
    console.log('No migrations/ directory found. Creating it...');
    execSync(`mkdir -p ${MIGRATIONS_DIR}`);
    return [];
  }
}

function getAppliedMigrations(): string[] {
  try {
    const result = execSync(
      `npx wrangler d1 execute ${DB_NAME} --command="SELECT filename FROM migrations ORDER BY id" --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(result);
    return (parsed[0]?.results || []).map((r: { filename: string }) => r.filename);
  } catch {
    // migrations table might not exist yet
    console.log('Creating migrations tracking table...');
    execSync(
      `npx wrangler d1 execute ${DB_NAME} --command="CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))"`,
      { stdio: 'inherit' }
    );
    return [];
  }
}

const SAFE_FILENAME_RE = /^\d{3}_[a-z0-9_]+\.sql$/;

function applyMigration(filename: string): void {
  if (!SAFE_FILENAME_RE.test(filename)) {
    throw new Error(`Invalid migration filename: '${filename}'. Must match pattern NNN_lowercase_name.sql`);
  }
  const filepath = join(MIGRATIONS_DIR, filename);
  console.log(`Applying migration: ${filename}`);
  execSync(`npx wrangler d1 execute ${DB_NAME} --file="${filepath}"`, { stdio: 'inherit' });
  execSync(
    `npx wrangler d1 execute ${DB_NAME} --command="INSERT INTO migrations (filename) VALUES ('${filename}')"`,
    { stdio: 'inherit' }
  );
  console.log(`  Applied: ${filename}`);
}

async function main() {
  console.log('=== NXT Energy Trading Platform — Database Migrations ===\n');

  const files = getMigrationFiles();
  if (files.length === 0) {
    console.log('No migration files found in migrations/ directory.');
    console.log('Create files like: migrations/001_initial_schema.sql');
    return;
  }

  const applied = getAppliedMigrations();
  const pending = files.filter((f) => !applied.includes(f));

  console.log(`Total migrations: ${files.length}`);
  console.log(`Already applied:  ${applied.length}`);
  console.log(`Pending:          ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('All migrations are up to date.');
    return;
  }

  for (const file of pending) {
    applyMigration(file);
  }

  console.log(`\nDone! Applied ${pending.length} migration(s).`);
}

main().catch(console.error);
