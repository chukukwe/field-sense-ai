import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateAndImportZoneMapping, readZoneMapping } from './seasonZoneMapping.js';

function findDataFile(name: string): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let index = 0; index < 8; index += 1) {
    const candidate = join(directory, 'data', name);
    try { readFileSync(candidate); return candidate; } catch { /* Continue toward the server root. */ }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`Could not find server data file: ${name}.`);
}

function findDatabase(): string {
  return findDataFile('recommendations.db');
}

const seed = readZoneMapping(findDataFile('naerls-zone-mapping.json'));
const database = new DatabaseSync(findDatabase());
try {
  const result = migrateAndImportZoneMapping(database, seed);
  console.log(`NAERLS zone mapping imported: ${result.mapped} mapped; ${result.unverified} unverified; ${result.needsReview} marked for review.`);
} finally {
  database.close();
}
