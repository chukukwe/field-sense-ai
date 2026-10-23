import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export interface AfricanCalendarSeed {
  source: {
    key: string;
    title: string;
    publisher: string;
    url: string;
    dataUrl: string;
    publicationYear: number;
    license: string;
    geographicScope: string;
    retrievedAt: string;
    notes: string;
  };
  statistics: { nigeriaRows: number; unmatchedNigeriaRows: number; exactMatchedLgas: number; supportedLgas?: number; observations: number; matchedRecords: number };
  observations: Array<{
    lgaId: number;
    state: string;
    lga: string;
    crop: string;
    category: string;
    activity: 'plant' | 'harvest';
    monthStart: number | null;
    monthEnd: number | null;
    evidenceCount: number;
    surveyYears: number[];
    sourceCropNames: string[];
  }>;
}

export interface CropTimingObservation {
  crop: string;
  category: string;
  activity: 'plant' | 'harvest';
  monthStart: number | null;
  monthEnd: number | null;
  evidenceCount: number;
  surveyYears: number[];
  sourceCropNames: string[];
  status: 'sourced';
  geographicScope: string;
  source: { title: string; publisher: string; url: string; publicationYear: number; license: string };
}

export interface LgaCalendarData {
  status: 'sourced' | 'unavailable';
  observations: CropTimingObservation[];
  message?: string;
}

export function migrateAndImportAfricanCalendar(database: DatabaseSync, seed: AfricanCalendarSeed, archivedAt = new Date().toISOString()): void {
  if (!seed.source || !Array.isArray(seed.observations)) throw new Error('The sourced crop-calendar file is invalid.');
  const migration = database.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get();
  database.exec('BEGIN IMMEDIATE');
  try {
    if (!migration) {
      database.exec(`
        CREATE TABLE crop_calendar_archive (
          archive_id INTEGER PRIMARY KEY,
          old_id INTEGER NOT NULL,
          old_row_json TEXT NOT NULL,
          source_refs_json TEXT NOT NULL,
          archived_at TEXT NOT NULL,
          reason TEXT NOT NULL
        );
        CREATE TABLE crop_location_review_archive (
          lga_id INTEGER PRIMARY KEY,
          status TEXT NOT NULL,
          review_note TEXT NOT NULL,
          reviewed_at TEXT NOT NULL,
          archived_at TEXT NOT NULL,
          reason TEXT NOT NULL
        );
        CREATE TABLE crop_timing_observations (
          id INTEGER PRIMARY KEY,
          lga_id INTEGER NOT NULL REFERENCES lgas(id),
          crop_id INTEGER NOT NULL REFERENCES crops(id),
          activity TEXT NOT NULL CHECK(activity IN ('plant','harvest')),
          month_start INTEGER CHECK(month_start BETWEEN 1 AND 12),
          month_end INTEGER CHECK(month_end BETWEEN 1 AND 12),
          evidence_count INTEGER NOT NULL CHECK(evidence_count > 0),
          survey_years_json TEXT NOT NULL,
          source_crop_names_json TEXT NOT NULL,
          source_id INTEGER NOT NULL REFERENCES calendar_sources(id),
          status TEXT NOT NULL CHECK(status='sourced'),
          CHECK(month_start IS NOT NULL OR month_end IS NOT NULL)
        );
        CREATE UNIQUE INDEX crop_timing_observations_natural_key ON crop_timing_observations
          (lga_id,crop_id,activity,ifnull(month_start,-1),ifnull(month_end,-1),source_id);
        CREATE TABLE crop_location_calendar_status (
          lga_id INTEGER PRIMARY KEY REFERENCES lgas(id),
          status TEXT NOT NULL CHECK(status IN ('sourced','unavailable')),
          source_id INTEGER REFERENCES calendar_sources(id),
          updated_at TEXT NOT NULL
        );
      `);
      const rows = database.prepare('SELECT * FROM crop_calendar').all() as Array<Record<string, unknown>>;
      const refs = database.prepare(`
        SELECT r.calendar_id,json_group_array(json_object('source_id',r.source_id,'source_key',s.source_key)) AS refs_json
        FROM crop_calendar_source_refs r JOIN calendar_sources s ON s.id=r.source_id GROUP BY r.calendar_id
      `).all() as Array<{ calendar_id: number; refs_json: string }>;
      const refsByCalendar = new Map(refs.map((item) => [Number(item.calendar_id), item.refs_json]));
      const archive = database.prepare('INSERT INTO crop_calendar_archive(old_id,old_row_json,source_refs_json,archived_at,reason) VALUES(?,?,?,?,?)');
      for (const row of rows) archive.run(Number(row.id), JSON.stringify(row), refsByCalendar.get(Number(row.id)) ?? '[]', archivedAt,
        'Replaced in active calendar by source-backed historical survey observations; old entries were draft or limited pilot guidance and are not active recommendations.');
      const reviews = database.prepare('SELECT * FROM crop_calendar_location_reviews').all() as Array<Record<string, unknown>>;
      const reviewArchive = database.prepare('INSERT INTO crop_location_review_archive(lga_id,status,review_note,reviewed_at,archived_at,reason) VALUES(?,?,?,?,?,?)');
      for (const row of reviews) reviewArchive.run(Number(row.lga_id), String(row.status), String(row.review_note), String(row.reviewed_at), archivedAt,
        'Pilot review notes were retired because the associated month windows did not provide LGA-specific timing evidence.');
      database.exec('DELETE FROM crop_calendar_source_refs; DELETE FROM crop_calendar; DELETE FROM crop_calendar_location_reviews;');
      database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(2,datetime('now'))").run();
    }

    const source = seed.source;
    const putSource = database.prepare(`
      INSERT INTO calendar_sources(source_key,title,publisher,url,publication_year,geographic_scope,retrieved_at,license,notes)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET title=excluded.title,publisher=excluded.publisher,
        url=excluded.url,publication_year=excluded.publication_year,geographic_scope=excluded.geographic_scope,
        retrieved_at=excluded.retrieved_at,license=excluded.license,notes=excluded.notes
    `);
    putSource.run(source.key,source.title,source.publisher,source.url,source.publicationYear,source.geographicScope,source.retrievedAt,source.license,source.notes);
    const sourceId = Number((database.prepare('SELECT id FROM calendar_sources WHERE source_key=?').get(source.key) as {id:number}).id);
    const states = database.prepare('SELECT id,name FROM states').all() as Array<{id:number;name:string}>;
    const stateByName = new Map(states.map((row) => [normalize(row.name),Number(row.id)]));
    stateByName.set('fct', Number(states.find((row) => normalize(row.name) === normalize('Federal Capital Territory'))?.id ?? 0));
    stateByName.set('fct abuja', Number(states.find((row) => normalize(row.name) === normalize('Federal Capital Territory'))?.id ?? 0));
    const cropRows = database.prepare('SELECT id,name FROM crops').all() as Array<{id:number;name:string}>;
    const cropByName = new Map(cropRows.map((row) => [normalize(row.name),Number(row.id)]));
    const putCrop = database.prepare('INSERT INTO crops(name,category) VALUES(?,?) ON CONFLICT(name) DO NOTHING');
    const findCrop = database.prepare('SELECT id FROM crops WHERE name=?');
    const findLocation = database.prepare('SELECT id,name,state_id FROM lgas WHERE id=?');
    const putObservation = database.prepare(`
      INSERT INTO crop_timing_observations(lga_id,crop_id,activity,month_start,month_end,evidence_count,survey_years_json,source_crop_names_json,source_id,status)
      VALUES(?,?,?,?,?,?,?,?,?,'sourced') ON CONFLICT DO UPDATE SET evidence_count=excluded.evidence_count,
        survey_years_json=excluded.survey_years_json,source_crop_names_json=excluded.source_crop_names_json,status='sourced'
    `);
    const seenLocations = new Set<number>();
    for (const observation of seed.observations) {
      if (!Number.isSafeInteger(observation.lgaId) || observation.evidenceCount < 1
        || (observation.monthStart === null && observation.monthEnd === null)
        || (observation.monthStart !== null && (!Number.isInteger(observation.monthStart) || observation.monthStart < 1 || observation.monthStart > 12))
        || (observation.monthEnd !== null && (!Number.isInteger(observation.monthEnd) || observation.monthEnd < 1 || observation.monthEnd > 12))
        || !Array.isArray(observation.surveyYears) || !observation.surveyYears.every((year) => Number.isInteger(year) && year >= 1900 && year <= 2100)) {
        throw new Error('A sourced crop-timing observation has invalid fields.');
      }
      const location = findLocation.get(observation.lgaId) as {id:number;name:string;state_id:number} | undefined;
      const expectedStateId = stateByName.get(normalize(observation.state));
      if (!location || normalize(location.name) !== normalize(observation.lga) || expectedStateId !== Number(location.state_id)) {
        throw new Error('A sourced crop observation does not match its canonical LGA and state.');
      }
      let cropId = cropByName.get(normalize(observation.crop));
      if (cropId === undefined) {
        if (!observation.category.trim()) throw new Error('A sourced crop has no classification.');
        putCrop.run(observation.crop, observation.category);
        cropId = Number((findCrop.get(observation.crop) as {id:number}).id);
        cropByName.set(normalize(observation.crop), cropId);
      }
      putObservation.run(observation.lgaId,cropId,observation.activity,observation.monthStart,observation.monthEnd,
        observation.evidenceCount,JSON.stringify(observation.surveyYears),JSON.stringify(observation.sourceCropNames),sourceId);
      seenLocations.add(observation.lgaId);
    }
    database.prepare(`INSERT INTO crop_location_calendar_status(lga_id,status,source_id,updated_at)
      SELECT id,CASE WHEN id IN (${seenLocations.size ? [...seenLocations].join(',') : 'NULL'}) THEN 'sourced' ELSE 'unavailable' END,?,?
      FROM lgas WHERE 1 ON CONFLICT(lga_id) DO UPDATE SET status=excluded.status,source_id=excluded.source_id,updated_at=excluded.updated_at`)
      .run(sourceId, archivedAt);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

export function readAfricanCalendarSeed(path: string): AfricanCalendarSeed {
  return JSON.parse(readFileSync(path, 'utf8')) as AfricanCalendarSeed;
}

export function listLgaCalendarData(database: DatabaseSync, lgaId: number): LgaCalendarData {
  const statusRow = database.prepare('SELECT status FROM crop_location_calendar_status WHERE lga_id=?').get(lgaId) as {status:string} | undefined;
  const rows = database.prepare(`
    SELECT c.name AS crop,c.category,o.activity,o.month_start,o.month_end,o.evidence_count,
      o.survey_years_json,o.source_crop_names_json,o.status,s.title,s.publisher,s.url,s.publication_year,s.license,s.geographic_scope
    FROM crop_timing_observations o JOIN crops c ON c.id=o.crop_id JOIN calendar_sources s ON s.id=o.source_id
    WHERE o.lga_id=? ORDER BY c.name,o.activity,o.month_start,o.month_end
  `).all(lgaId) as Array<Record<string, unknown>>;
  if (!statusRow || statusRow.status === 'unavailable' || rows.length === 0) return {status:'unavailable',observations:[],message:'No reliable crop timing data is available for this LGA yet.'};
  return {status:'sourced',observations:rows.map((row) => ({
    crop:String(row.crop),category:String(row.category),activity:row.activity as 'plant'|'harvest',
    monthStart:row.month_start === null ? null : Number(row.month_start),monthEnd:row.month_end === null ? null : Number(row.month_end),
    evidenceCount:Number(row.evidence_count),surveyYears:JSON.parse(String(row.survey_years_json)) as number[],
    sourceCropNames:JSON.parse(String(row.source_crop_names_json)) as string[],status:'sourced',
    geographicScope:String(row.geographic_scope),source:{title:String(row.title),publisher:String(row.publisher),url:String(row.url),publicationYear:Number(row.publication_year),license:String(row.license)},
  }))};
}
