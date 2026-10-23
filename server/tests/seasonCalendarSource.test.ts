import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { listLgaCalendarData, migrateAndImportAfricanCalendar, type AfricanCalendarSeed } from '../src/seasonCalendarSource.js';

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
    INSERT INTO schema_migrations VALUES(1,'old');
    CREATE TABLE states(id INTEGER PRIMARY KEY,code TEXT,name TEXT);
    INSERT INTO states VALUES(1,'AB','Abia'),(2,'AK','Akwa Ibom');
    CREATE TABLE zones(id INTEGER PRIMARY KEY,code TEXT,name TEXT,rainy_season_type TEXT);
    INSERT INTO zones VALUES(1,'TEST','Test zone','unimodal');
    CREATE TABLE lgas(id INTEGER PRIMARY KEY,state_id INTEGER,name TEXT,latitude REAL,longitude REAL,zone_id INTEGER,zone_source TEXT,needs_review INTEGER);
    INSERT INTO lgas VALUES(1,1,'Aba North',5.1,7.3,1,'manual',0),(2,1,'Aba South',5.1,7.3,1,'manual',0),(3,2,'Eket',4.6,7.9,1,'manual',0);
    CREATE TABLE crops(id INTEGER PRIMARY KEY,name TEXT UNIQUE,category TEXT,local_names TEXT);
    INSERT INTO crops VALUES(1,'Old crop','root_tuber',NULL);
    CREATE TABLE calendar_sources(id INTEGER PRIMARY KEY,source_key TEXT UNIQUE,title TEXT,publisher TEXT,url TEXT,publication_year INTEGER,geographic_scope TEXT,retrieved_at TEXT,license TEXT,notes TEXT);
    CREATE TABLE crop_calendar(id INTEGER PRIMARY KEY,crop_id INTEGER,zone_id INTEGER,lga_id INTEGER,season_label TEXT,activity TEXT,month INTEGER,status TEXT,source TEXT,farming_system TEXT,variety TEXT,evidence_scope TEXT,review_notes TEXT);
    INSERT INTO crop_calendar VALUES(10,1,1,NULL,'old','plant',4,'draft','old source',NULL,NULL,NULL,NULL);
    INSERT INTO crop_calendar VALUES(11,1,1,1,'pilot','plant',5,'reviewed','old source','note',NULL,'regional','review note');
    CREATE TABLE crop_calendar_source_refs(calendar_id INTEGER,source_id INTEGER);
    INSERT INTO calendar_sources VALUES(1,'old','Old source','Old publisher','https://example.org',2020,'regional','old','unknown','old');
    INSERT INTO crop_calendar_source_refs VALUES(10,1),(11,1);
    CREATE TABLE crop_calendar_location_reviews(lga_id INTEGER,status TEXT,review_note TEXT,reviewed_at TEXT);
    INSERT INTO crop_calendar_location_reviews VALUES(1,'reviewed','old review','old');
  `);
  return db;
}

const seed: AfricanCalendarSeed = {
  source: {
    key: 'african-crop-calendar-lsms-isa', title: 'African Crop Calendar', publisher: 'Survey authors',
    url: 'https://doi.org/10.6084/m9.figshare.28659557', dataUrl: 'https://example.org/data.csv',
    publicationYear: 2026, license: 'CC BY 4.0', geographicScope: 'Historical Nigerian household plot observations matched by exact LGA.',
    retrievedAt: '2026-10-23T00:00:00.000Z', notes: 'Observed data, not planting advice.',
  },
  statistics: { nigeriaRows: 1, unmatchedNigeriaRows: 0, exactMatchedLgas: 1, supportedLgas: 1, observations: 1, matchedRecords: 1 },
  observations: [{
    lgaId: 2, state: 'Abia', lga: 'Aba South', crop: 'cassava', category: 'Root and tuber', activity: 'plant',
    monthStart: 3, monthEnd: 3, evidenceCount: 4, surveyYears: [2018, 2023], sourceCropNames: ['Cassava'],
  }],
};

describe('sourced crop-calendar migration', () => {
  it('archives old rows, preserves LGAs, and distinguishes sourced from unavailable data', () => {
    const db = createDatabase();
    try {
      migrateAndImportAfricanCalendar(db, seed, '2026-10-23T00:00:00.000Z');
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_calendar_archive').get() as {n:number}).n, 2);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_calendar').get() as {n:number}).n, 0);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_calendar_source_refs').get() as {n:number}).n, 0);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_location_review_archive').get() as {n:number}).n, 1);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM lgas').get() as {n:number}).n, 3);
      assert.ok(db.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get());
      const sourced = listLgaCalendarData(db, 2);
      assert.equal(sourced.status, 'sourced');
      assert.equal(sourced.observations[0]?.source.license, 'CC BY 4.0');
      assert.equal(sourced.observations[0]?.geographicScope, seed.source.geographicScope);
      assert.deepEqual(listLgaCalendarData(db, 3), {
        status: 'unavailable', observations: [], message: 'No reliable crop timing data is available for this LGA yet.',
      });
      assert.equal((db.prepare("SELECT COUNT(*) AS n FROM crop_timing_observations WHERE status='draft'").get() as {n:number}).n, 0);
      migrateAndImportAfricanCalendar(db, seed, '2026-10-24T00:00:00.000Z');
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_calendar_archive').get() as {n:number}).n, 2);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_timing_observations').get() as {n:number}).n, 1);
    } finally { db.close(); }
  });

  it('rejects source observations whose declared state or LGA does not match the canonical record', () => {
    for (const field of ['state','lga'] as const) {
      const db = createDatabase();
      try {
        const invalid = structuredClone(seed);
        invalid.observations[0]![field] = field === 'state' ? 'Akwa Ibom' : 'Aba North';
        assert.throws(() => migrateAndImportAfricanCalendar(db, invalid), /does not match its canonical LGA/);
        assert.equal((db.prepare('SELECT COUNT(*) AS n FROM crop_calendar').get() as {n:number}).n, 2);
      } finally { db.close(); }
    }
  });
});
