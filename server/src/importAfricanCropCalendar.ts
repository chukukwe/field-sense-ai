import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateAndImportAfricanCalendar, readAfricanCalendarSeed } from './seasonCalendarSource.js';
import { seasonCalendarDatabasePath } from './seasonCalendarPilot.js';

let directory = dirname(fileURLToPath(import.meta.url));
while (directory !== dirname(directory) && !existsSync(join(directory, 'data', 'african-crop-calendar-sourced.json'))) directory = dirname(directory);
const seedPath = join(directory, 'data', 'african-crop-calendar-sourced.json');
if (!existsSync(seedPath)) throw new Error('The sourced crop-calendar data file was not found.');
const databasePath = process.argv[2] ?? seasonCalendarDatabasePath();
const seed = readAfricanCalendarSeed(seedPath);
const database = new DatabaseSync(databasePath);
try {
  migrateAndImportAfricanCalendar(database, seed);
  const result = {
    sourceObservations: seed.observations.length,
    supportedLgas: seed.statistics.supportedLgas,
    archivedCalendarEntries: Number((database.prepare('SELECT COUNT(*) AS count FROM crop_calendar_archive').get() as {count:number}).count),
    activeDraftEntries: Number((database.prepare("SELECT COUNT(*) AS count FROM crop_calendar WHERE status='draft'").get() as {count:number}).count),
    lgaCount: Number((database.prepare('SELECT COUNT(*) AS count FROM lgas').get() as {count:number}).count),
  };
  if (result.activeDraftEntries !== 0 || result.lgaCount !== 774) throw new Error('Post-import validation failed.');
  console.log(JSON.stringify(result));
} finally {
  database.close();
}
