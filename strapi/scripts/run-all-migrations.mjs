#!/usr/bin/env node

/**
 * Orchestrator that runs every Phase 3 migration script in the correct
 * order, with a single confirmation prompt and per-script status output.
 *
 * Usage:
 *   STRAPI_URL=https://cms.e-do.studio \
 *   STRAPI_TOKEN=<full-access-token> \
 *   DATABASE_CLIENT=postgres \
 *   DATABASE_URL=postgres://... \
 *     node strapi/scripts/run-all-migrations.mjs
 *
 * For staging dry-run with a sqlite copy:
 *   DATABASE_CLIENT=sqlite \
 *   DATABASE_FILENAME=../.tmp/data.db \
 *   STRAPI_URL=http://localhost:1337 \
 *   STRAPI_TOKEN=<dev-token> \
 *     node strapi/scripts/run-all-migrations.mjs
 *
 * Skip confirmation (only for non-interactive CI):
 *   YES=1 node strapi/scripts/run-all-migrations.mjs
 *
 * Skip the year migration (which needs the Strapi server STOPPED first):
 *   SKIP_YEAR=1 node strapi/scripts/run-all-migrations.mjs
 *
 * All individual scripts are idempotent — re-running this orchestrator
 * after a partial failure is safe. They each report "skipped" for entries
 * already migrated.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TASKS = [
  // [scriptFilename, description, requiredEnvVars, skipIfEnv]
  [
    'migrate-year-to-string.mjs',
    'gallery_projects.year integer → varchar(4) (DB-level, Strapi must be STOPPED)',
    ['DATABASE_CLIENT'],
    'SKIP_YEAR',
  ],
  [
    'migrate-pricing-to-rows.mjs',
    'machine/cyclorama/post-prod pricing strings → pricing-row component',
    ['STRAPI_URL', 'STRAPI_TOKEN'],
    null,
  ],
  [
    'migrate-hours-to-component.mjs',
    'site-setting hours/weekendHours → opening-hours component',
    ['STRAPI_URL', 'STRAPI_TOKEN'],
    null,
  ],
  [
    'migrate-address-to-component.mjs',
    'site-setting street/city/postal/country → postal-address component',
    ['STRAPI_URL', 'STRAPI_TOKEN'],
    null,
  ],
  [
    'migrate-blog-post-snake-to-camel.mjs',
    'blog-post cta_* (snake_case) → ctaXxx (camelCase)',
    ['STRAPI_URL', 'STRAPI_TOKEN'],
    null,
  ],
  [
    'audit-required-candidates.mjs',
    'Read-only audit: which fields are safe to flip to required:true',
    ['DATABASE_CLIENT'],
    null,
  ],
];

function checkEnv(required) {
  return required.filter((k) => !process.env[k]);
}

async function ask(question) {
  if (process.env.YES === '1') {
    console.log(`${question} → auto-yes (YES=1)`);
    return true;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function runScript(filename) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [join(__dirname, filename)], {
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('exit', (code) => resolve(code ?? 1));
    proc.on('error', (err) => {
      console.error(`Failed to spawn ${filename}: ${err.message}`);
      resolve(1);
    });
  });
}

async function main() {
  const target = process.env.STRAPI_URL ?? '(no STRAPI_URL)';
  const dbClient = process.env.DATABASE_CLIENT ?? '(no DATABASE_CLIENT)';

  console.log('=== Phase 3 migration orchestrator ===');
  console.log(`Strapi target: ${target}`);
  console.log(`DB client:     ${dbClient}`);
  console.log('');
  console.log('Tasks:');
  for (const [name, desc, required, skipEnv] of TASKS) {
    const missing = checkEnv(required);
    const willSkip = skipEnv && process.env[skipEnv];
    const status = willSkip ? `SKIP (${skipEnv} set)` : missing.length ? `BLOCKED (missing ${missing.join(', ')})` : 'ready';
    console.log(`  • ${name.padEnd(40)} — ${status}`);
    console.log(`      ${desc}`);
  }
  console.log('');

  const blockedTasks = TASKS.filter(([, , required, skipEnv]) => {
    if (skipEnv && process.env[skipEnv]) return false;
    return checkEnv(required).length > 0;
  });
  if (blockedTasks.length === TASKS.length) {
    console.error('All tasks are blocked by missing env vars. Aborting.');
    process.exit(1);
  }

  console.log('⚠️  These migrations write to the live data set behind STRAPI_URL.');
  console.log('⚠️  Take a DB backup BEFORE running. The year migration requires');
  console.log('⚠️  the Strapi server to be STOPPED (so its schema sync does not race).');
  console.log('');

  const ok = await ask('Proceed with all ready tasks?');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  const results = [];
  for (const [name, desc, required, skipEnv] of TASKS) {
    if (skipEnv && process.env[skipEnv]) {
      console.log(`\n--- ${name} — SKIPPED (${skipEnv} set) ---`);
      results.push({ name, status: 'skipped' });
      continue;
    }
    const missing = checkEnv(required);
    if (missing.length > 0) {
      console.log(`\n--- ${name} — BLOCKED (missing ${missing.join(', ')}) ---`);
      results.push({ name, status: 'blocked' });
      continue;
    }
    console.log(`\n--- ${name} ---`);
    console.log(`    ${desc}`);
    const code = await runScript(name);
    if (code === 0) {
      console.log(`✓ ${name} completed.`);
      results.push({ name, status: 'ok' });
    } else {
      console.error(`✗ ${name} exited with code ${code}. Stopping the orchestrator.`);
      results.push({ name, status: 'failed' });
      break;
    }
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.status.padEnd(8)} ${r.name}`);
  }
  const failed = results.find((r) => r.status === 'failed');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
