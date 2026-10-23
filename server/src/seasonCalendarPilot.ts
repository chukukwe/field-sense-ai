import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PilotSource {
  key: string;
  title: string;
  publisher: string;
  url: string;
  publicationYear: number;
  geographicScope: string;
  retrievedAt: string;
  license: string;
  notes: string;
}

interface PilotWindow {
  crop: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  farmingSystem: string;
  variety: string | null;
}

interface PilotLocation {
  state: string;
  lga: string;
  reviewNote: string;
  sourceKeys: string[];
  windows?: PilotWindow[];
}

interface PilotData {
  sources: PilotSource[];
  locations: PilotLocation[];
}

export interface CalendarSourceReference {
  key: string;
  title: string;
  publisher: string;
  url: string;
  publicationYear: number;
  geographicScope: string;
}

export interface CropCalendarPilotWindow {
  crop: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  status: 'draft' | 'reviewed' | 'verified';
  farmingSystem: string;
  variety?: string;
  evidenceScope: string;
  reviewNotes: string;
  sources: CalendarSourceReference[];
}

export interface CropCalendarLocationReview {
  lgaId: number;
  status: 'reviewed';
  note: string;
}

function assertSafeSource(source: PilotSource): void {
  if (!source.key.trim() || !source.title.trim() || !source.publisher.trim() || !source.geographicScope.trim()) {
    throw new Error('Each pilot source needs a key, title, publisher, and geographic scope.');
  }
  const url = new URL(source.url);
  if (url.protocol !== 'https:') throw new Error('Pilot source links must use HTTPS.');
  if (!Number.isInteger(source.publicationYear) || source.publicationYear < 1900 || source.publicationYear > new Date().getFullYear()) {
    throw new Error('A pilot source has an invalid publication year.');
  }
}

export function migrateSeasonCalendar(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
  `);
  const done = database.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get();
  if (done) return;

  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec(`
      CREATE TABLE calendar_sources (
        id INTEGER PRIMARY KEY,
        source_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        publisher TEXT NOT NULL,
        url TEXT NOT NULL,
        publication_year INTEGER NOT NULL CHECK(publication_year BETWEEN 1900 AND 2100),
        geographic_scope TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        license TEXT NOT NULL,
        notes TEXT NOT NULL
      );
      ALTER TABLE crop_calendar RENAME TO crop_calendar_legacy;
      CREATE TABLE crop_calendar (
        id INTEGER PRIMARY KEY,
        crop_id INTEGER NOT NULL REFERENCES crops(id),
        zone_id INTEGER NOT NULL REFERENCES zones(id),
        lga_id INTEGER REFERENCES lgas(id),
        season_label TEXT NOT NULL,
        activity TEXT NOT NULL CHECK(activity IN ('plant', 'harvest')),
        month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'reviewed', 'verified')),
        source TEXT NOT NULL,
        farming_system TEXT,
        variety TEXT,
        evidence_scope TEXT,
        review_notes TEXT
      );
      INSERT INTO crop_calendar (id,crop_id,zone_id,season_label,activity,month,status,source)
      SELECT id,crop_id,zone_id,season_label,activity,month,status,source FROM crop_calendar_legacy;
      DROP TABLE crop_calendar_legacy;
      CREATE UNIQUE INDEX crop_calendar_natural_key
        ON crop_calendar(crop_id,zone_id,ifnull(lga_id,-1),season_label,activity,month,source);
      CREATE TABLE crop_calendar_source_refs (
        calendar_id INTEGER NOT NULL REFERENCES crop_calendar(id) ON DELETE CASCADE,
        source_id INTEGER NOT NULL REFERENCES calendar_sources(id) ON DELETE RESTRICT,
        PRIMARY KEY(calendar_id,source_id)
      );
      CREATE TABLE crop_calendar_location_reviews (
        lga_id INTEGER PRIMARY KEY REFERENCES lgas(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status = 'reviewed'),
        review_note TEXT NOT NULL,
        reviewed_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations(version,applied_at) VALUES(1,datetime('now'));
    `);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function findDataFile(name: string): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(directory, 'data', name);
    try { readFileSync(candidate); return candidate; } catch { /* Keep walking toward the repository root. */ }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`Could not find server data file: ${name}.`);
}

function readPilotData(path = findDataFile('akwa-ibom-pilot-calendar.json')): PilotData {
  return JSON.parse(readFileSync(path, 'utf8')) as PilotData;
}

export function importSeasonCalendarPilot(databasePath: string, pilotData = readPilotData(), retrievedAt = new Date().toISOString()): void {
  const database = new DatabaseSync(databasePath);
  try {
    if (database.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get()) {
      throw new Error('The historical pilot has been archived and cannot be imported into the active calendar.');
    }
    migrateSeasonCalendar(database);
    for (const source of pilotData.sources) assertSafeSource(source);
    const sourceKeys = new Set(pilotData.sources.map((source) => source.key));
    if (sourceKeys.size !== pilotData.sources.length) throw new Error('Pilot source keys must be unique.');
    const sourceIds = new Map<string, number>();
    const locationRows = new Map<string, { id: number; zoneId: number }>();
    database.exec('BEGIN IMMEDIATE');
    try {
      const putSource = database.prepare(`
        INSERT INTO calendar_sources(source_key,title,publisher,url,publication_year,geographic_scope,retrieved_at,license,notes)
        VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_key) DO UPDATE SET title=excluded.title,publisher=excluded.publisher,url=excluded.url,
          publication_year=excluded.publication_year,geographic_scope=excluded.geographic_scope,
          retrieved_at=excluded.retrieved_at,license=excluded.license,notes=excluded.notes
      `);
      const findSource = database.prepare('SELECT id FROM calendar_sources WHERE source_key=?');
      for (const source of pilotData.sources) {
        putSource.run(source.key,source.title,source.publisher,source.url,source.publicationYear,source.geographicScope,retrievedAt,source.license,source.notes);
        sourceIds.set(source.key, Number(findSource.get(source.key)?.id));
      }

      const findLga = database.prepare(`
        SELECT l.id,l.zone_id FROM lgas l JOIN states s ON s.id=l.state_id WHERE s.name=? AND l.name=?
      `);
      const findCrop = database.prepare('SELECT id FROM crops WHERE name=?');
      const putReview = database.prepare(`
        INSERT INTO crop_calendar_location_reviews(lga_id,status,review_note,reviewed_at) VALUES(?,'reviewed',?,?)
        ON CONFLICT(lga_id) DO UPDATE SET status='reviewed',review_note=excluded.review_note,reviewed_at=excluded.reviewed_at
      `);
      const putWindow = database.prepare(`
        INSERT INTO crop_calendar(crop_id,zone_id,lga_id,season_label,activity,month,status,source,farming_system,variety,evidence_scope,review_notes)
        VALUES(?,?,?, ?,? ,?,'reviewed',?,?,?,?,?)
        ON CONFLICT DO NOTHING
      `);
      const getWindow = database.prepare(`
        SELECT id,status FROM crop_calendar WHERE crop_id=? AND zone_id=? AND lga_id=? AND season_label=? AND activity=? AND month=? AND source=?
      `);
      const linkSource = database.prepare('INSERT OR IGNORE INTO crop_calendar_source_refs(calendar_id,source_id) VALUES(?,?)');

      for (const location of pilotData.locations) {
        if (!location.state.trim() || !location.lga.trim() || !location.reviewNote.trim()) throw new Error('Each pilot LGA needs a review note.');
        for (const key of location.sourceKeys) if (!sourceIds.has(key)) throw new Error(`Pilot LGA references unknown source key: ${key}`);
        const key = `${location.state}|${location.lga}`;
        const lga = findLga.get(location.state, location.lga) as { id: number; zone_id: number } | undefined;
        if (!lga) throw new Error(`Pilot LGA could not be matched in the canonical location database: ${location.lga}, ${location.state}.`);
        locationRows.set(key, { id: Number(lga.id), zoneId: Number(lga.zone_id) });
        putReview.run(Number(lga.id), location.reviewNote, retrievedAt);

        for (const window of location.windows ?? []) {
          if (!Number.isInteger(window.month) || window.month < 1 || window.month > 12
            || (window.activity !== 'plant' && window.activity !== 'harvest')
            || !window.season.trim() || !window.farmingSystem.trim()) throw new Error('Pilot crop window is incomplete or has an invalid month.');
          const crop = findCrop.get(window.crop) as { id: number } | undefined;
          if (!crop) throw new Error(`Pilot crop is missing from the crop table: ${window.crop}.`);
          if (location.sourceKeys.length === 0) throw new Error(`Pilot crop window has no source references: ${location.lga}.`);
          const source = pilotData.sources.find((item) => item.key === location.sourceKeys[0])!;
          putWindow.run(Number(crop.id),Number(lga.zone_id),Number(lga.id),window.season,window.activity,window.month,
            `${source.title} (${source.publicationYear})`,window.farmingSystem,window.variety,
            source.geographicScope,location.reviewNote);
          const row = getWindow.get(Number(crop.id),Number(lga.zone_id),Number(lga.id),window.season,window.activity,window.month,
            `${source.title} (${source.publicationYear})`) as { id: number; status: string } | undefined;
          if (!row) throw new Error('A pilot calendar window could not be stored.');
          for (const sourceKey of location.sourceKeys) {
            const sourceId = sourceIds.get(sourceKey);
            if (sourceId === undefined) throw new Error(`Pilot source could not be resolved: ${sourceKey}.`);
            linkSource.run(Number(row.id), sourceId);
          }
        }
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  } finally {
    database.close();
  }
}

export function listPilotWindows(database: DatabaseSync, lgaId: number): CropCalendarPilotWindow[] {
  const rows = database.prepare(`
    SELECT cc.id AS calendar_id,c.name AS crop,cc.season_label,cc.activity,cc.month,cc.status,
      cc.farming_system,cc.variety,cc.evidence_scope,cc.review_notes
    FROM crop_calendar cc JOIN crops c ON c.id=cc.crop_id
    WHERE cc.lga_id=? ORDER BY c.name,cc.activity,cc.month
  `).all(lgaId) as Array<Record<string, unknown>>;
  const sourceQuery = database.prepare(`
    SELECT s.source_key,s.title,s.publisher,s.url,s.publication_year,s.geographic_scope,s.retrieved_at
    FROM crop_calendar_source_refs r JOIN calendar_sources s ON s.id=r.source_id WHERE r.calendar_id=? ORDER BY s.id
  `);
  return rows.map((row) => ({
    crop: String(row.crop),
    season: String(row.season_label),
    activity: row.activity as 'plant' | 'harvest',
    month: Number(row.month),
    status: row.status as 'draft' | 'reviewed' | 'verified',
    farmingSystem: String(row.farming_system ?? ''),
    ...(typeof row.variety === 'string' ? { variety: row.variety } : {}),
    evidenceScope: String(row.evidence_scope ?? ''),
    reviewNotes: String(row.review_notes ?? ''),
    sources: (sourceQuery.all(Number(row.calendar_id)) as Array<Record<string, unknown>>).map((source) => ({
      key: String(source.source_key),
      title: String(source.title),
      publisher: String(source.publisher),
      url: String(source.url),
      publicationYear: Number(source.publication_year),
      geographicScope: String(source.geographic_scope),
      retrievedAt: String(source.retrieved_at),
    })),
  }));
}

export function readPilotLocationReview(database: DatabaseSync, lgaId: number): CropCalendarLocationReview | null {
  const row = database.prepare('SELECT lga_id,status,review_note FROM crop_calendar_location_reviews WHERE lga_id=?').get(lgaId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { lgaId: Number(row.lga_id), status: 'reviewed', note: String(row.review_note) };
}

export function seasonCalendarDatabasePath(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(directory, 'data', 'recommendations.db');
    try { readFileSync(candidate); return candidate; } catch { /* Keep walking toward the repository root. */ }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('Could not find the recommendations database.');
}
