import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export interface BonnCropCalendarSeed {
  source: {
    key: string;
    title: string;
    publisher: string;
    url: string;
    fileUrl: string;
    doi: string;
    fileDoi: string;
    publicationYear: number;
    license: string;
    retrievedAt: string;
    geographicScope: string;
    notes: string;
  };
  windows: Array<{
    zoneCode: string;
    scopeStatus?: 'broad_zone' | 'unresolved';
    crop: string;
    category: string;
    season: string;
    activity: 'plant' | 'harvest';
    monthStart: number;
    monthEnd: number;
    farmingSystem: string;
    geographicScope: string;
    reviewNotes: string;
  }>;
  excludedRows: Array<{ zoneLabel: string; geographicScope: string; reason: string }>;
}

export interface PlanningWindowSource {
  key: string;
  title: string;
  publisher: string;
  url: string;
  publicationYear: number;
  geographicScope: string;
  license: string;
  retrievedAt: string;
}

export interface ZonePlanningWindow {
  crop: string;
  category: string;
  season: string;
  activity: 'plant' | 'harvest';
  monthStart: number;
  monthEnd: number;
  status: 'draft' | 'reviewed' | 'verified';
  farmingSystem: string;
  evidenceScope: string;
  reviewNotes: string;
  scopeStatus: 'broad_zone' | 'unresolved';
  sources: PlanningWindowSource[];
}

export function readBonnCropCalendarSeed(path: string): BonnCropCalendarSeed {
  const seed = JSON.parse(readFileSync(path, 'utf8')) as BonnCropCalendarSeed;
  if (!seed.source || !Array.isArray(seed.windows) || !Array.isArray(seed.excludedRows) || seed.windows.length === 0) {
    throw new Error('The Bonn crop calendar seed is incomplete.');
  }
  const url = new URL(seed.source.url);
  if (url.protocol !== 'https:' || !seed.source.license.includes('ODC-By')) throw new Error('The Bonn source citation or license is invalid.');
  return seed;
}

export function migrateAndImportBonnCalendar(database: DatabaseSync, seed: BonnCropCalendarSeed): { windows: number; zones: string[] } {
  if (!database.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get()) {
    throw new Error('The sourced historical calendar must be imported before zone planning windows.');
  }
  const zoneIds = new Map((database.prepare('SELECT id,code FROM zones').all() as Array<{id:number;code:string}>).map((row) => [row.code, Number(row.id)]));
  const crops = new Map((database.prepare('SELECT id,name FROM crops').all() as Array<{id:number;name:string}>).map((row) => [row.name.toLocaleLowerCase('en'), Number(row.id)]));
  const source = seed.source;
  const sourceName = `${source.title} (${source.publicationYear})`;
  const expectedLicense = 'Open Data Commons Attribution License (ODC-By) v1.0';
  if (!source.key || !source.title || !source.publisher || source.license !== expectedLicense) throw new Error('The Bonn calendar source metadata is invalid.');

  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      INSERT INTO calendar_sources(source_key,title,publisher,url,publication_year,geographic_scope,retrieved_at,license,notes)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET title=excluded.title,publisher=excluded.publisher,
        url=excluded.url,publication_year=excluded.publication_year,geographic_scope=excluded.geographic_scope,
        retrieved_at=excluded.retrieved_at,license=excluded.license,notes=excluded.notes
    `).run(source.key,source.title,source.publisher,source.url,source.publicationYear,source.geographicScope,source.retrievedAt,source.license,
      `${source.notes} Download: ${source.fileUrl}. File DOI: ${source.fileDoi}. Source DOI: ${source.doi}. Excluded source rows: ${seed.excludedRows.map((row) => `${row.zoneLabel} (${row.geographicScope}): ${row.reason}`).join(' ')}`);
    const sourceId = Number((database.prepare('SELECT id FROM calendar_sources WHERE source_key=?').get(source.key) as {id:number}).id);
    const putWindow = database.prepare(`
      INSERT INTO crop_calendar(crop_id,zone_id,lga_id,season_label,activity,month,status,source,farming_system,variety,evidence_scope,review_notes)
      VALUES(?,?,NULL,?,?,?,'draft',?,?,NULL,?,?) ON CONFLICT DO NOTHING
    `);
    const getWindow = database.prepare(`
      SELECT id FROM crop_calendar WHERE crop_id=? AND zone_id=? AND lga_id IS NULL AND season_label=? AND activity=? AND month=? AND source=?
    `);
    const linkSource = database.prepare('INSERT OR IGNORE INTO crop_calendar_source_refs(calendar_id,source_id) VALUES(?,?)');
    const distinctZones = new Set<string>();
    let insertedRows = 0;
    for (const window of seed.windows) {
      const zoneId = zoneIds.get(window.zoneCode);
      const cropId = crops.get(window.crop.toLocaleLowerCase('en'));
      if (zoneId === undefined || cropId === undefined) throw new Error('A Bonn calendar crop or zone does not match the canonical database.');
      if (!Number.isInteger(window.monthStart) || !Number.isInteger(window.monthEnd) || window.monthStart < 1
        || window.monthEnd > 12 || window.monthStart > window.monthEnd || !window.season.trim()
        || (window.activity !== 'plant' && window.activity !== 'harvest') || !window.geographicScope.trim()
        || !window.reviewNotes.trim() || (window.scopeStatus !== undefined && !['broad_zone', 'unresolved'].includes(window.scopeStatus))) {
        throw new Error('A Bonn calendar window is invalid.');
      }
      distinctZones.add(window.zoneCode);
      for (let month = window.monthStart; month <= window.monthEnd; month += 1) {
        putWindow.run(cropId,zoneId,window.season,window.activity,month,sourceName,window.farmingSystem,window.geographicScope,window.reviewNotes);
        const row = getWindow.get(cropId,zoneId,window.season,window.activity,month,sourceName) as { id:number } | undefined;
        if (!row) throw new Error('A Bonn calendar month could not be stored.');
        linkSource.run(Number(row.id),sourceId);
        insertedRows += 1;
      }
    }
    database.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(4,datetime('now'))").run();
    if (!database.prepare('SELECT 1 FROM schema_migrations WHERE version=5').get()) {
      database.exec("ALTER TABLE crop_calendar ADD COLUMN scope_status TEXT NOT NULL DEFAULT 'broad_zone' CHECK(scope_status IN ('broad_zone','unresolved'))");
      database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(5,datetime('now'))").run();
    }
    const updateScopeStatus = database.prepare(`
      UPDATE crop_calendar SET scope_status=?
      WHERE crop_id=? AND zone_id=? AND lga_id IS NULL AND season_label=? AND activity=? AND month=? AND source=?
    `);
    for (const window of seed.windows) {
      const zoneId = zoneIds.get(window.zoneCode)!;
      const cropId = crops.get(window.crop.toLocaleLowerCase('en'))!;
      for (let month = window.monthStart; month <= window.monthEnd; month += 1) {
        updateScopeStatus.run(window.scopeStatus ?? 'broad_zone', cropId, zoneId, window.season, window.activity, month, sourceName);
      }
    }
    database.exec('COMMIT');
    const count = Number((database.prepare('SELECT count(*) AS count FROM crop_calendar WHERE source=?').get(sourceName) as { count: number }).count);
    return { windows: count || insertedRows, zones: [...distinctZones].sort() };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function listZonePlanningWindows(database: DatabaseSync, zoneId: number): ZonePlanningWindow[] {
  const rows = database.prepare(`
    SELECT cc.id AS calendar_id,c.name AS crop,c.category,cc.season_label,cc.activity,cc.month,cc.status,cc.scope_status,
      cc.farming_system,cc.evidence_scope,cc.review_notes
    FROM crop_calendar cc JOIN crops c ON c.id=cc.crop_id
    WHERE cc.zone_id=? AND cc.lga_id IS NULL
    ORDER BY c.name,cc.activity,cc.season_label,cc.month
  `).all(zoneId) as Array<Record<string, unknown>>;
  const sourceQuery = database.prepare(`
    SELECT s.source_key,s.title,s.publisher,s.url,s.publication_year,s.geographic_scope,s.license,s.retrieved_at
    FROM crop_calendar_source_refs r JOIN calendar_sources s ON s.id=r.source_id WHERE r.calendar_id=? ORDER BY s.id
  `);
  const groups = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const key = [row.crop,row.category,row.season_label,row.activity,row.status,row.scope_status,row.farming_system,row.evidence_scope,row.review_notes].join('|');
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const result: ZonePlanningWindow[] = [];
  for (const group of groups.values()) {
    group.sort((left, right) => Number(left.month) - Number(right.month));
    let run: Array<Record<string, unknown>> = [];
    const flush = () => {
      if (run.length === 0) return;
      const first = run[0]!;
      result.push({
        crop: String(first.crop),
        category: String(first.category),
        season: String(first.season_label),
        activity: first.activity as 'plant' | 'harvest',
        monthStart: Number(run[0]!.month),
        monthEnd: Number(run[run.length - 1]!.month),
        status: first.status as 'draft' | 'reviewed' | 'verified',
        farmingSystem: String(first.farming_system ?? ''),
        evidenceScope: String(first.evidence_scope ?? ''),
        reviewNotes: String(first.review_notes ?? ''),
        scopeStatus: first.scope_status === 'unresolved' ? 'unresolved' : 'broad_zone',
        sources: (sourceQuery.all(Number(first.calendar_id)) as Array<Record<string, unknown>>).map((source) => ({
          key: String(source.source_key),title: String(source.title),publisher: String(source.publisher),url: String(source.url),
          publicationYear: Number(source.publication_year),geographicScope: String(source.geographic_scope),license: String(source.license),retrievedAt: String(source.retrieved_at),
        })),
      });
      run = [];
    };
    for (const row of group) {
      if (run.length && Number(row.month) !== Number(run[run.length - 1]!.month) + 1) flush();
      run.push(row);
    }
    flush();
  }
  return result;
}
