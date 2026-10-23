import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, describe, it } from 'node:test';
import { importSeasonCalendarPilot, migrateSeasonCalendar, seasonCalendarDatabasePath } from '../src/seasonCalendarPilot.js';

const tempDirectory = mkdtempSync(join(tmpdir(), 'fieldvoice-season-pilot-'));
after(() => rmSync(tempDirectory, { recursive: true, force: true }));

function makeDatabase(name: string): string {
  const path = join(tempDirectory, name);
  copyFileSync(seasonCalendarDatabasePath(), path);
  return path;
}

describe('Akwa Ibom source-backed calendar pilot', () => {
  it('migrates the legacy calendar without changing existing draft rows', () => {
    const path = join(tempDirectory, 'legacy.db');
    const database = new DatabaseSync(path);
    try {
      database.exec(`
        CREATE TABLE crops(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE zones(id INTEGER PRIMARY KEY);
        CREATE TABLE lgas(id INTEGER PRIMARY KEY);
        INSERT INTO crops VALUES(2,'Cassava');
        INSERT INTO zones VALUES(4);
        CREATE TABLE crop_calendar(id INTEGER PRIMARY KEY,crop_id INTEGER NOT NULL,zone_id INTEGER NOT NULL,
          season_label TEXT NOT NULL,activity TEXT NOT NULL,month INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','verified')),source TEXT NOT NULL);
        INSERT INTO crop_calendar VALUES(17,2,4,'main_season','plant',3,'draft','Old draft source');
      `);
      migrateSeasonCalendar(database);
      migrateSeasonCalendar(database);
      const preserved = database.prepare('SELECT id,crop_id,zone_id,month,status,source FROM crop_calendar WHERE id=17').get();
      assert.deepEqual({ ...preserved }, { id: 17, crop_id: 2, zone_id: 4, month: 3, status: 'draft', source: 'Old draft source' });
      assert.equal(database.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
    } finally {
      database.close();
    }
  });

  it('refuses to reactivate the archived pilot after sourced calendar migration', () => {
    const path = makeDatabase('pilot.db');
    assert.throws(() => importSeasonCalendarPilot(path, undefined, '2026-10-23T00:00:00.000Z'), /has been archived/i);
    const database = new DatabaseSync(path, { readOnly: true });
    try {
      assert.equal(Number(database.prepare('SELECT COUNT(*) AS n FROM crop_calendar').get()?.n), 48);
      assert.equal(Number(database.prepare('SELECT COUNT(*) AS n FROM crop_calendar_archive').get()?.n), 281);
      assert.equal(Number(database.prepare("SELECT COUNT(*) AS n FROM crop_calendar WHERE status='draft'").get()?.n), 48);
      assert.equal(Number(database.prepare("SELECT COUNT(*) AS n FROM crop_calendar WHERE source LIKE '%Akwa Ibom%'").get()?.n), 0);
      assert.equal(Number(database.prepare('PRAGMA integrity_check').get()?.integrity_check === 'ok'), 1);
    } finally {
      database.close();
    }
  });

  it('does not attempt location matching for the retired pilot importer', () => {
    const path = makeDatabase('bad-location.db');
    assert.throws(() => importSeasonCalendarPilot(path, {
      sources: [],
      locations: [{ state: 'Akwa Ibom', lga: 'Eket LGA typo', reviewNote: 'Review', sourceKeys: [] }],
    }, '2026-10-23T00:00:00.000Z'), /has been archived/i);
  });
});
