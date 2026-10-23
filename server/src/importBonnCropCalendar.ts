import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateAndImportBonnCalendar, readBonnCropCalendarSeed } from './bonnCropCalendar.js';

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

const database = new DatabaseSync(findDataFile('recommendations.db'));
try {
  const result = migrateAndImportBonnCalendar(database, readBonnCropCalendarSeed(findDataFile('bonn-crop-calendar.json')));
  console.log(`Bonn source windows imported as draft data: ${result.windows} month rows across ${result.zones.length} farming zones.`);
} finally {
  database.close();
}
