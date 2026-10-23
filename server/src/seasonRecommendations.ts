import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listLgaCalendarData } from './seasonCalendarSource.js';
import type { LgaCalendarData } from './seasonCalendarSource.js';
import { listZonePlanningWindows } from './bonnCropCalendar.js';
import type { ZonePlanningWindow } from './bonnCropCalendar.js';
import { readZoneSourceReference } from './seasonZoneMapping.js';
import type { ZoneSourceReference } from './seasonZoneMapping.js';

export interface RecommendationState {
  id: number;
  code: string;
  name: string;
}

export interface RecommendationLga {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' | 'unknown' };
  zoneSource: ZoneSourceReference | null;
  needsReview: boolean;
}

export interface CropCalendarEntry {
  crop: string;
  category: string;
  localNames?: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  status: 'sourced';
  source: string;
  farmingSystem?: string;
  variety?: string;
  evidenceScope?: string;
  reviewNotes?: string;
  sources: Array<{ key: string; title: string; publisher: string; url: string; publicationYear: number; geographicScope: string }>;
}

export interface LgaSeasonPlan {
  location: {
    lgaId: number;
    lga: string;
    state: string;
    zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' | 'unknown' };
    coordinates: { latitude: number; longitude: number };
    zoneSource: ZoneSourceReference | null;
    zoneNeedsReview: boolean;
  };
  calendar: {
    month: number;
    monthName: string;
    nextMonth: number;
    nextMonthName: string;
    timeZone: 'Africa/Lagos';
    status: 'sourced' | 'unavailable';
    notice: string;
  };
  locationReview: null;
  zoneRecommendations: {
    zoneCode: string;
    zoneName: string;
    scope: 'agroecological-zone';
    status: 'source_window' | 'unavailable';
    source: ZoneSourceReference | null;
    message: string;
  };
  planningWindows: ZonePlanningWindow[];
  cropTiming: LgaCalendarData;
  plantNow: CropCalendarEntry[];
  harvestNow: CropCalendarEntry[];
  plantNextMonth: CropCalendarEntry[];
  emptyMessages: {
    plantNow?: string;
    harvestNow?: string;
    plantNextMonth?: string;
  };
}

export interface SeasonRecommendationService {
  listStates(): RecommendationState[];
  listLgas(stateId: number): { state: RecommendationState; lgas: RecommendationLga[] } | null;
  getPlan(lgaId: number, date?: Date): LgaSeasonPlan | null;
  close(): void;
}

function findDatabasePath(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let level = 0; level < 8; level += 1) {
    const candidate = join(directory, 'data', 'recommendations.db');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error('The crop recommendation database could not be found in the server data folder.');
}

function getLagosMonth(date: Date): { month: number; name: string } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', month: 'numeric' }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const name = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', month: 'long' }).format(date);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Could not determine the current month in Africa/Lagos.');
  return { month, name };
}

export function createSeasonRecommendationService(databasePath = findDatabasePath()): SeasonRecommendationService {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  database.exec('PRAGMA query_only = ON');

  const stateQuery = database.prepare('SELECT id, code, name FROM states ORDER BY name');
  const lgaQuery = database.prepare(`
    SELECT l.id, l.name, l.latitude, l.longitude, za.zone_id, za.status AS assignment_status,
      za.needs_review AS assignment_needs_review, za.review_note AS assignment_review_note,
      z.code AS zone_code, z.name AS zone_name, z.rainy_season_type,
      zs.source_key,zs.title AS source_title,zs.publisher AS source_publisher,zs.url AS source_url,
      zs.publication_year AS source_publication_year,zs.license AS source_license
    FROM lgas l
    LEFT JOIN lga_zone_assignments za ON za.lga_id = l.id
    LEFT JOIN zones z ON z.id = za.zone_id
    LEFT JOIN zone_mapping_sources zs ON zs.source_key = za.source_key
    WHERE l.state_id = ?
    ORDER BY l.name
  `);
  const locationQuery = database.prepare(`
    SELECT l.id, l.name, l.latitude, l.longitude, za.zone_id, za.status AS assignment_status,
      za.needs_review AS assignment_needs_review, za.review_note AS assignment_review_note,
      s.id AS state_id, s.code AS state_code, s.name AS state_name,
      z.code AS zone_code, z.name AS zone_name, z.rainy_season_type,
      zs.source_key,zs.title AS source_title,zs.publisher AS source_publisher,zs.url AS source_url,
      zs.publication_year AS source_publication_year,zs.license AS source_license
    FROM lgas l
    JOIN states s ON s.id = l.state_id
    LEFT JOIN lga_zone_assignments za ON za.lga_id = l.id
    LEFT JOIN zones z ON z.id = za.zone_id
    LEFT JOIN zone_mapping_sources zs ON zs.source_key = za.source_key
    WHERE l.id = ?
  `);
  const readLgaRecord = (row: Record<string, unknown>): RecommendationLga => {
    const mapped = row.assignment_status === 'mapped' && typeof row.zone_code === 'string';
    return {
      id: Number(row.id),
      name: String(row.name),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      zone: {
        code: mapped ? String(row.zone_code) : 'UNVERIFIED',
        name: mapped ? String(row.zone_name) : 'Zone not verified',
        rainySeasonType: mapped ? row.rainy_season_type as 'bimodal' | 'unimodal' : 'unknown',
      },
      zoneSource: typeof row.source_key === 'string' ? readZoneSourceReference(row) : null,
      needsReview: !mapped || Number(row.assignment_needs_review) === 1,
    };
  };
  return {
    listStates() {
      return stateQuery.all().map((row) => ({ id: Number(row.id), code: String(row.code), name: String(row.name) }));
    },
    listLgas(stateId) {
      const stateRow = database.prepare('SELECT id, code, name FROM states WHERE id = ?').get(stateId);
      if (!stateRow) return null;
      const state: RecommendationState = { id: Number(stateRow.id), code: String(stateRow.code), name: String(stateRow.name) };
      const lgas = (lgaQuery.all(stateId) as Array<Record<string, unknown>>).map(readLgaRecord);
      return { state, lgas };
    },
    getPlan(lgaId, date = new Date()) {
      const row = locationQuery.get(lgaId);
      if (!row) return null;
      const { month, name: monthName } = getLagosMonth(date);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextMonthName = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', month: 'long' })
        .format(new Date(Date.UTC(2024, nextMonth - 1, 15)));
      const cropTiming = listLgaCalendarData(database, lgaId);
      const assignmentMapped = row.assignment_status === 'mapped' && typeof row.zone_id === 'number';
      const zoneUsable = assignmentMapped && Number(row.assignment_needs_review) !== 1;
      const zoneWindows: ZonePlanningWindow[] = zoneUsable
        ? listZonePlanningWindows(database, Number(row.zone_id)) : [];
      const planningWindows = zoneWindows.filter((window) => window.scopeStatus === 'broad_zone');
      const hasUnresolvedSourceScope = zoneWindows.length > 0 && planningWindows.length === 0;
      const recommendationSource = planningWindows[0]?.sources[0] ?? null;
      const zoneSource = typeof row.source_key === 'string' ? readZoneSourceReference(row) : null;
      const zoneCode = assignmentMapped ? String(row.zone_code) : 'UNVERIFIED';
      const zoneName = assignmentMapped ? String(row.zone_name) : 'Zone not verified';
      const plantNow: CropCalendarEntry[] = [];
      const harvestNow: CropCalendarEntry[] = [];
      const plantNextMonth: CropCalendarEntry[] = [];
      return {
        location: {
          lgaId: Number(row.id),
          lga: String(row.name),
          state: String(row.state_name),
          zone: { code: zoneCode, name: zoneName, rainySeasonType: assignmentMapped ? row.rainy_season_type as 'bimodal' | 'unimodal' : 'unknown' },
          coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
          zoneSource,
          zoneNeedsReview: !zoneUsable,
        },
        calendar: {
          month,
          monthName,
          nextMonth,
          nextMonthName,
          timeZone: 'Africa/Lagos' as const,
          status: cropTiming.status,
          notice: cropTiming.status === 'sourced'
            ? 'These are historical crop observations from survey households, not planting advice or a forecast.'
            : 'No reliable crop timing data is available for this LGA yet.',
        },
        locationReview: null,
        zoneRecommendations: {
          zoneCode,
          zoneName,
          scope: 'agroecological-zone',
          status: planningWindows.length > 0 ? 'source_window' : 'unavailable',
          source: recommendationSource,
          message: !zoneUsable
            ? 'This LGA zone assignment is unverified or needs review. No crop dates are shown.'
            : planningWindows.length > 0
              ? 'A draft source window is available for this broad farming zone. It is not verified planting advice.'
              : hasUnresolvedSourceScope
                ? 'A published source has dates for this zone, but does not identify which local areas they cover. No dates are shown for this LGA.'
                : 'No source-backed planting window is available for this zone yet. We will not guess.',
        },
        planningWindows,
        cropTiming,
        plantNow,
        harvestNow,
        plantNextMonth,
        emptyMessages: {
          plantNow: 'Historical survey data does not tell us what to plant this month.',
          harvestNow: 'Historical survey data does not tell us what to harvest this month.',
          plantNextMonth: 'Historical survey data does not tell us what to plant next month.',
        },
      };
    },
    close() {
      database.close();
    },
  };
}
