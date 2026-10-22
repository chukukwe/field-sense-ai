import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' };
  zoneSource: string;
  needsReview: boolean;
}

export interface CropCalendarEntry {
  crop: string;
  category: string;
  localNames?: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  status: 'draft' | 'verified';
  source: string;
}

export interface LgaSeasonPlan {
  location: {
    lgaId: number;
    lga: string;
    state: string;
    zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' };
    coordinates: { latitude: number; longitude: number };
    zoneSource: string;
    zoneNeedsReview: boolean;
  };
  calendar: {
    month: number;
    monthName: string;
    nextMonth: number;
    nextMonthName: string;
    timeZone: 'Africa/Lagos';
    status: 'draft' | 'mixed' | 'verified';
    notice: string;
  };
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

function readCalendarEntries(rows: Array<Record<string, unknown>>): CropCalendarEntry[] {
  return rows.map((row) => ({
    crop: String(row.crop),
    category: String(row.category),
    ...(typeof row.local_names === 'string' && row.local_names.length > 0 ? { localNames: row.local_names } : {}),
    season: String(row.season_label),
    activity: row.activity as 'plant' | 'harvest',
    month: Number(row.month),
    status: row.status as 'draft' | 'verified',
    source: String(row.source),
  }));
}

export function createSeasonRecommendationService(databasePath = findDatabasePath()): SeasonRecommendationService {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  database.exec('PRAGMA query_only = ON');

  const stateQuery = database.prepare('SELECT id, code, name FROM states ORDER BY name');
  const lgaQuery = database.prepare(`
    SELECT l.id, l.name, l.latitude, l.longitude, l.zone_id, l.zone_source, l.needs_review,
      z.code AS zone_code, z.name AS zone_name, z.rainy_season_type
    FROM lgas l
    JOIN zones z ON z.id = l.zone_id
    WHERE l.state_id = ?
    ORDER BY l.name
  `);
  const locationQuery = database.prepare(`
    SELECT l.id, l.name, l.latitude, l.longitude, l.zone_id, l.zone_source, l.needs_review,
      s.id AS state_id, s.code AS state_code, s.name AS state_name,
      z.code AS zone_code, z.name AS zone_name, z.rainy_season_type
    FROM lgas l
    JOIN states s ON s.id = l.state_id
    JOIN zones z ON z.id = l.zone_id
    WHERE l.id = ?
  `);
  const cropQuery = database.prepare(`
    SELECT c.name AS crop, c.category, c.local_names, cc.season_label, cc.activity,
      cc.month, cc.status, cc.source
    FROM crop_calendar cc
    JOIN crops c ON c.id = cc.crop_id
    WHERE cc.zone_id = ? AND cc.activity = ? AND cc.month = ?
    ORDER BY c.name, cc.season_label
  `);
  const calendarTotals = database.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified
    FROM crop_calendar
  `).get() as { total: number; draft: number; verified: number };

  return {
    listStates() {
      return stateQuery.all().map((row) => ({ id: Number(row.id), code: String(row.code), name: String(row.name) }));
    },
    listLgas(stateId) {
      const stateRow = database.prepare('SELECT id, code, name FROM states WHERE id = ?').get(stateId);
      if (!stateRow) return null;
      const state: RecommendationState = { id: Number(stateRow.id), code: String(stateRow.code), name: String(stateRow.name) };
      const lgas = lgaQuery.all(stateId).map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        zone: {
          code: String(row.zone_code),
          name: String(row.zone_name),
          rainySeasonType: row.rainy_season_type as 'bimodal' | 'unimodal',
        },
        zoneSource: String(row.zone_source),
        needsReview: Number(row.needs_review) === 1,
      }));
      return { state, lgas };
    },
    getPlan(lgaId, date = new Date()) {
      const row = locationQuery.get(lgaId);
      if (!row) return null;
      const { month, name: monthName } = getLagosMonth(date);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextMonthName = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', month: 'long' })
        .format(new Date(Date.UTC(2024, nextMonth - 1, 15)));
      const read = (activity: 'plant' | 'harvest', targetMonth: number) => readCalendarEntries(
        cropQuery.all(Number(row.zone_id), activity, targetMonth),
      );
      const plantNow = read('plant', month);
      const harvestNow = read('harvest', month);
      const plantNextMonth = read('plant', nextMonth);
      const status = calendarTotals.draft === calendarTotals.total
        ? 'draft'
        : calendarTotals.draft > 0 && calendarTotals.verified > 0
          ? 'mixed'
          : 'verified';
      return {
        location: {
          lgaId: Number(row.id),
          lga: String(row.name),
          state: String(row.state_name),
          zone: {
            code: String(row.zone_code),
            name: String(row.zone_name),
            rainySeasonType: row.rainy_season_type as 'bimodal' | 'unimodal',
          },
          coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
          zoneSource: String(row.zone_source),
          zoneNeedsReview: Number(row.needs_review) === 1,
        },
        calendar: {
          month,
          monthName,
          nextMonth,
          nextMonthName,
          timeZone: 'Africa/Lagos' as const,
          status,
          notice: status === 'verified'
            ? 'Crop timing still depends on local conditions and variety. Confirm with a local extension worker.'
            : 'This crop calendar contains draft data that has not been verified. Do not use it as planting advice.',
        },
        plantNow,
        harvestNow,
        plantNextMonth,
        emptyMessages: {
          ...(plantNow.length === 0 ? { plantNow: 'No planting window is listed for this zone this month.' } : {}),
          ...(harvestNow.length === 0 ? { harvestNow: 'No harvest window is listed for this zone this month.' } : {}),
          ...(plantNextMonth.length === 0 ? { plantNextMonth: 'No planting window is listed for this zone next month.' } : {}),
        },
      };
    },
    close() {
      database.close();
    },
  };
}
