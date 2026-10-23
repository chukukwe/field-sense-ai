import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export interface ZoneMappingException {
  sourceLga: string;
  canonicalLga?: string;
  zone: string | null;
  review?: boolean;
  note?: string;
}

export interface ZoneMappingState {
  name: string;
  defaultZone: string;
  exceptions: ZoneMappingException[];
}

export interface ZoneMappingSeed {
  source: {
    key: string;
    title: string;
    publisher: string;
    url: string;
    publicationYear: number;
    updatedAt: string;
    retrievedAt: string;
    license: string;
    methodology: string;
    limitations: string;
  };
  reviewStates: Record<string, string>;
  states: ZoneMappingState[];
}

export interface ZoneSourceReference {
  key: string;
  title: string;
  publisher: string;
  url: string;
  publicationYear: number;
  license: string;
}

export interface ResolvedLgaZone {
  zoneId: number | null;
  zoneCode: string;
  zoneName: string;
  rainySeasonType: 'bimodal' | 'unimodal' | 'unknown';
  source: ZoneSourceReference;
  status: 'mapped' | 'unverified';
  needsReview: boolean;
  reviewNote: string | null;
}

export function normalizeLocationName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');
}

export function readZoneMapping(path: string): ZoneMappingSeed {
  const seed = JSON.parse(readFileSync(path, 'utf8')) as ZoneMappingSeed;
  if (!seed.source || !Array.isArray(seed.states) || seed.states.length !== 37) {
    throw new Error('The NAERLS zone mapping file is incomplete.');
  }
  const url = new URL(seed.source.url);
  if (url.protocol !== 'https:' || !seed.source.key || !seed.source.title || !seed.source.methodology) {
    throw new Error('The NAERLS zone mapping source details are invalid.');
  }
  return seed;
}

export function migrateAndImportZoneMapping(database: DatabaseSync, seed: ZoneMappingSeed): { mapped: number; unverified: number; needsReview: number } {
  const source = seed.source;
  const sourceUrl = new URL(source.url);
  if (sourceUrl.protocol !== 'https:') throw new Error('Zone mapping source links must use HTTPS.');
  if (!Number.isInteger(source.publicationYear) || source.publicationYear < 1900 || source.publicationYear > 2100) {
    throw new Error('The zone mapping source year is invalid.');
  }

  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const migration = database.prepare('SELECT 1 FROM schema_migrations WHERE version=3').get();
  if (!migration) {
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(`
        CREATE TABLE zone_mapping_sources (
          source_key TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          publisher TEXT NOT NULL,
          url TEXT NOT NULL,
          publication_year INTEGER NOT NULL,
          source_updated_at TEXT NOT NULL,
          retrieved_at TEXT NOT NULL,
          license TEXT NOT NULL,
          methodology TEXT NOT NULL,
          limitations TEXT NOT NULL
        );
        CREATE TABLE lga_zone_assignments (
          lga_id INTEGER PRIMARY KEY REFERENCES lgas(id) ON DELETE CASCADE,
          zone_id INTEGER REFERENCES zones(id),
          source_key TEXT NOT NULL REFERENCES zone_mapping_sources(source_key),
          assignment_basis TEXT NOT NULL CHECK(assignment_basis IN ('state_default','lga_exception','unresolved_exception')),
          source_lga_name TEXT,
          status TEXT NOT NULL CHECK(status IN ('mapped','unverified')),
          needs_review INTEGER NOT NULL CHECK(needs_review IN (0,1)),
          review_note TEXT
        );
        INSERT INTO schema_migrations(version,applied_at) VALUES(3,datetime('now'));
      `);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  const states = database.prepare('SELECT id,name FROM states').all() as Array<{ id: number; name: string }>;
  const lgas = database.prepare('SELECT id,name,state_id FROM lgas').all() as Array<{ id: number; name: string; state_id: number }>;
  const zones = database.prepare('SELECT id,code FROM zones').all() as Array<{ id: number; code: string }>;
  const stateByName = new Map(states.map((row) => [normalizeLocationName(row.name), row]));
  const zoneIdByCode = new Map(zones.map((row) => [row.code, Number(row.id)]));
  const rowsByState = new Map<number, typeof lgas>();
  for (const lga of lgas) rowsByState.set(Number(lga.state_id), [...(rowsByState.get(Number(lga.state_id)) ?? []), lga]);
  if (states.length !== 37 || lgas.length !== 774) throw new Error('Canonical Nigerian state and LGA data is incomplete.');

  const mappings: Array<{
    lgaId: number;
    zoneId: number | null;
    basis: 'state_default' | 'lga_exception' | 'unresolved_exception';
    sourceLgaName: string | null;
    status: 'mapped' | 'unverified';
    needsReview: boolean;
    reviewNote: string | null;
  }> = [];
  const seenStates = new Set<number>();
  for (const stateRule of seed.states) {
    const state = stateByName.get(normalizeLocationName(stateRule.name));
    if (!state) throw new Error(`A zone mapping state does not match canonical state data: ${stateRule.name}.`);
    if (seenStates.has(Number(state.id))) throw new Error(`The zone mapping lists a state more than once: ${stateRule.name}.`);
    seenStates.add(Number(state.id));
    const stateLgas = rowsByState.get(Number(state.id)) ?? [];
    const exceptionsByLga = new Map<string, ZoneMappingException>();
    const duplicateExceptions = new Set<string>();
    for (const exception of stateRule.exceptions ?? []) {
      const key = normalizeLocationName(exception.canonicalLga ?? exception.sourceLga);
      if (exceptionsByLga.has(key)) duplicateExceptions.add(key);
      exceptionsByLga.set(key, exception);
    }
    const matchedExceptionKeys = new Set<string>();
    for (const lga of stateLgas) {
      const exceptionKey = normalizeLocationName(lga.name);
      const exception = exceptionsByLga.get(exceptionKey);
      if (exception) matchedExceptionKeys.add(exceptionKey);
      const zoneCode = exception ? exception.zone : stateRule.defaultZone;
      const zoneId = typeof zoneCode === 'string' ? zoneIdByCode.get(zoneCode) : undefined;
      if (typeof zoneCode === 'string' && zoneId === undefined) throw new Error(`The zone code is not in the zone table: ${zoneCode}.`);
      const unresolved = zoneId === undefined;
      const reviewStateNote = seed.reviewStates?.[stateRule.name];
      const duplicateNote = duplicateExceptions.has(exceptionKey) ? 'The source lists this LGA more than once.' : null;
      const reviewNote = exception?.note ?? duplicateNote ?? reviewStateNote ?? (unresolved ? 'The source does not name a destination zone for this LGA exception.' : null);
      mappings.push({
        lgaId: Number(lga.id),
        zoneId: zoneId ?? null,
        basis: unresolved ? 'unresolved_exception' : exception ? 'lga_exception' : 'state_default',
        sourceLgaName: exception?.sourceLga ?? null,
        status: unresolved ? 'unverified' : 'mapped',
        needsReview: unresolved || Boolean(exception?.review) || Boolean(reviewStateNote) || duplicateExceptions.has(exceptionKey),
        reviewNote: reviewNote ?? null,
      });
    }
    for (const key of exceptionsByLga.keys()) {
      if (!matchedExceptionKeys.has(key)) throw new Error(`An exception LGA does not match canonical location data in ${stateRule.name}.`);
    }
  }
  if (seenStates.size !== 37 || mappings.length !== 774) throw new Error('The NAERLS mapping did not resolve every canonical state and LGA.');

  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      INSERT INTO zone_mapping_sources(source_key,title,publisher,url,publication_year,source_updated_at,retrieved_at,license,methodology,limitations)
      VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET
        title=excluded.title,publisher=excluded.publisher,url=excluded.url,publication_year=excluded.publication_year,
        source_updated_at=excluded.source_updated_at,retrieved_at=excluded.retrieved_at,license=excluded.license,
        methodology=excluded.methodology,limitations=excluded.limitations
    `).run(source.key,source.title,source.publisher,source.url,source.publicationYear,source.updatedAt,source.retrievedAt,source.license,source.methodology,source.limitations);
    const put = database.prepare(`
      INSERT INTO lga_zone_assignments(lga_id,zone_id,source_key,assignment_basis,source_lga_name,status,needs_review,review_note)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(lga_id) DO UPDATE SET zone_id=excluded.zone_id,source_key=excluded.source_key,
        assignment_basis=excluded.assignment_basis,source_lga_name=excluded.source_lga_name,status=excluded.status,
        needs_review=excluded.needs_review,review_note=excluded.review_note
    `);
    for (const mapping of mappings) put.run(mapping.lgaId,mapping.zoneId,source.key,mapping.basis,mapping.sourceLgaName,mapping.status,mapping.needsReview ? 1 : 0,mapping.reviewNote);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return {
    mapped: mappings.filter((entry) => entry.status === 'mapped').length,
    unverified: mappings.filter((entry) => entry.status === 'unverified').length,
    needsReview: mappings.filter((entry) => entry.needsReview).length,
  };
}

export function readZoneSourceReference(row: Record<string, unknown>): ZoneSourceReference {
  return {
    key: String(row.source_key),
    title: String(row.source_title),
    publisher: String(row.source_publisher),
    url: String(row.source_url),
    publicationYear: Number(row.source_publication_year),
    license: String(row.source_license),
  };
}
