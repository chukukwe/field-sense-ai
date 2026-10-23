import { existsSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_URL = 'https://ndownloader.figshare.com/files/65173845';
const CROP_GROUPS_URL = 'https://ndownloader.figshare.com/files/65174967';
const FIGSHARE_DOI = 'https://doi.org/10.6084/m9.figshare.28659557';
const PUBLICATION_YEAR = 2026;

type CsvRow = Record<string, string>;
interface AggregatedObservation {
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
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

function parseMonth(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,2}(?:\.0+)?$/.test(text)) return null;
  const month = Number(text);
  return month >= 1 && month <= 12 ? month : null;
}

function parseCsv(text: string, delimiter: string, onRow: (headers: string[], values: string[]) => void): void {
  let headers: string[] | null = null;
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  const acceptRow = () => {
    if (headers === null) headers = row;
    else if (row.length === headers.length) onRow(headers, row);
    row = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (afterQuote) { field += '"'; afterQuote = false; }
        else afterQuote = true;
      } else if (afterQuote) {
        quoted = false;
        afterQuote = false;
        if (char === delimiter) { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field); field = ''; acceptRow(); }
        else if (char !== '\r') field += char;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); field = ''; acceptRow(); }
    else if (char !== '\r') field += char;
  }
  if (field || row.length) { row.push(field); acceptRow(); }
}

async function fetchText(url: string, label: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${label} download failed with HTTP ${response.status}.`);
  return response.text();
}

async function fetchRows(url: string, onRow: (headers: string[], values: string[]) => void): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok || !response.body) throw new Error(`Crop survey data download failed with HTTP ${response.status}.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let headers: string[] | null = null;
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let firstChunk = true;
  const acceptRow = () => {
    if (headers === null) headers = row;
    else if (row.length === headers.length) onRow(headers, row);
    row = [];
  };
  const consume = (char: string) => {
    if (quoted) {
      if (char === '"') {
        if (afterQuote) { field += '"'; afterQuote = false; }
        else afterQuote = true;
      } else if (afterQuote) {
        quoted = false;
        afterQuote = false;
        if (char === ',') { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field); field = ''; acceptRow(); }
        else if (char !== '\r') field += char;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); field = ''; acceptRow(); }
    else if (char !== '\r') field += char;
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let chunk = decoder.decode(value, { stream: true });
    if (firstChunk) { chunk = chunk.replace(/^\uFEFF/, ''); firstChunk = false; }
    for (let index = 0; index < chunk.length; index += 1) consume(chunk[index]!);
  }
  const tail = decoder.decode();
  for (let index = 0; index < tail.length; index += 1) consume(tail[index]!);
  if (field || row.length) { row.push(field); acceptRow(); }
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  let dataDirectory = here;
  while (dataDirectory !== dirname(dataDirectory) && !existsSync(join(dataDirectory, 'data', 'recommendations.db'))) dataDirectory = dirname(dataDirectory);
  if (!existsSync(join(dataDirectory, 'data', 'recommendations.db'))) throw new Error('Could not locate the server data folder.');
  const database = new DatabaseSync(join(dataDirectory, 'data', 'recommendations.db'), { readOnly: true });
  try {
    const states = database.prepare('SELECT id,name,code FROM states').all() as Array<{ id: number; name: string; code: string }>;
    const lgas = database.prepare('SELECT id,name,state_id FROM lgas').all() as Array<{ id: number; name: string; state_id: number }>;
    const stateIds = new Map(states.map((state) => [normalize(state.name), state.id]));
    const federalCapital = states.find((state) => state.name === 'Federal Capital Territory');
    if (federalCapital) {
      stateIds.set('fct', federalCapital.id);
      stateIds.set('fct abuja', federalCapital.id);
    }
    const lgaIds = new Map(lgas.map((lga) => [`${lga.state_id}|${normalize(lga.name)}`, lga]));

    const lookupText = await fetchText(CROP_GROUPS_URL, 'Crop classification lookup');
    const cropGroups = new Map<string, string>();
    parseCsv(lookupText, ';', (headers, values) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      if (record.crop && record.group_name) cropGroups.set(normalize(record.crop), record.group_name.trim());
    });

    const aggregate = new Map<string, {
      lga: typeof lgas[number]; state: string; crop: string; category: string;
      activity: 'plant' | 'harvest'; monthStart: number | null; monthEnd: number | null;
      evidenceCount: number; surveyYears: Set<number>; sourceCropNames: Set<string>;
    }>();
    let matchedRecords = 0;
    let exactMatchedLgas = new Set<number>();
    let unmatchedRecords = 0;
    let rowsRead = 0;
    let observedHeaders: string[] = [];
    const administrativeSamples: string[] = [];
    await fetchRows(DATA_URL, (headers, values) => {
      if (observedHeaders.length === 0) observedHeaders = headers;
      const record: CsvRow = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      if (normalize(record.country ?? '') !== 'nigeria') return;
      rowsRead += 1;
      if (administrativeSamples.length < 5) administrativeSamples.push(`adm1=${record.adm1}; adm2=${record.adm2}; adm3=${record.adm3}; adm4=${record.adm4}`);
      const stateName = normalize(record.adm2 ?? '');
      const stateId = stateIds.get(stateName);
      const lga = stateId ? lgaIds.get(`${stateId}|${normalize(record.adm3 ?? '')}`) : undefined;
      if (!lga) { unmatchedRecords += 1; return; }
      exactMatchedLgas.add(lga.id);
      const crop = normalize(record.crop_simplified ?? '');
      if (!crop || crop === 'other') return;
      // Preserve a crop when the source lookup does not classify its simplified
      // label; make the missing classification explicit instead of guessing.
      const category = cropGroups.get(crop) ?? 'unclassified';
      const waveMatch = (record.dataset_name ?? '').match(/NGA_(\d{4})_/);
      if (!waveMatch) throw new Error('A Nigerian survey row has no valid survey year.');
      const surveyYear = Number(waveMatch[1]);
      const sourceCropName = (record.crop ?? '').trim();
      const add = (activity: 'plant' | 'harvest', monthStart: number | null, monthEnd: number | null) => {
        if (monthStart === null && monthEnd === null) return;
        const key = [lga.id, crop, activity, monthStart ?? '', monthEnd ?? ''].join('|');
        let item = aggregate.get(key);
        if (!item) {
          const state = states.find((value) => value.id === lga.state_id)!.name;
          item = { lga, state, crop, category, activity, monthStart, monthEnd, evidenceCount: 0, surveyYears: new Set(), sourceCropNames: new Set() };
          aggregate.set(key, item);
        }
        item.evidenceCount += 1;
        item.surveyYears.add(surveyYear);
        if (sourceCropName) item.sourceCropNames.add(sourceCropName);
      };
      const plantingMonth = parseMonth(record.planting_month ?? '');
      add('plant', plantingMonth, plantingMonth);
      add('harvest', parseMonth(record.harvest_month_begin ?? ''), parseMonth(record.harvest_month_end ?? ''));
      if (plantingMonth !== null || parseMonth(record.harvest_month_begin ?? '') !== null || parseMonth(record.harvest_month_end ?? '') !== null) matchedRecords += 1;
    });
    if (rowsRead === 0 || aggregate.size === 0) throw new Error(`The downloaded dataset contained no usable Nigerian crop-timing records (columns: ${observedHeaders.join(', ')}; Nigerian rows: ${rowsRead}; matched LGAs: ${exactMatchedLgas.size}; unmatched rows: ${unmatchedRecords}; aggregate rows: ${aggregate.size}; admin sample: ${administrativeSamples.join(' | ')}).`);

    const observations: AggregatedObservation[] = [...aggregate.values()].map((item) => ({
      lgaId: item.lga.id,
      state: item.state,
      lga: item.lga.name,
      crop: item.crop,
      category: item.category,
      activity: item.activity,
      monthStart: item.monthStart,
      monthEnd: item.monthEnd,
      evidenceCount: item.evidenceCount,
      surveyYears: [...item.surveyYears].sort((a, b) => a - b),
      sourceCropNames: [...item.sourceCropNames].sort(),
    }));
    const seed = {
      source: {
        key: 'african-crop-calendar-lsms-isa',
        title: 'African Crop Calendar: A geo-referenced dataset of crop growing seasons across diverse agro-ecological regions in Sub-Saharan Africa',
        publisher: 'Waha et al.; LSMS-ISA national statistical household surveys',
        url: FIGSHARE_DOI,
        dataUrl: DATA_URL,
        publicationYear: PUBLICATION_YEAR,
        license: 'CC BY 4.0',
        geographicScope: 'Nigeria survey sample, grouped from published admin-level-3 LGA names matched to exact canonical state and LGA names. These records are not representative estimates, field-specific advice, or a planting advisory.',
        retrievedAt: new Date().toISOString(),
        notes: 'Derived from the published AfricanCropCalendar CSV. Aggregated by canonical LGA, simplified crop, activity period, and month; each evidence count is the number of source plot records. Survey wave year labels are retained. Unmatched administrative names, unidentified crops, and missing or invalid months are excluded rather than guessed. The authors describe this as harmonised household survey data; LGA grouping does not imply a representative LGA estimate.',
      },
      statistics: { nigeriaRows: rowsRead, unmatchedNigeriaRows: unmatchedRecords, exactMatchedLgas: exactMatchedLgas.size,
        supportedLgas: new Set(observations.map((item) => item.lgaId)).size, observations: observations.length, matchedRecords },
      observations,
    };
    writeFileSync(join(dataDirectory, 'data', 'african-crop-calendar-sourced.json'), `${JSON.stringify(seed)}\n`, 'utf8');
    console.log(JSON.stringify(seed.statistics));
  } finally {
    database.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Could not prepare source-backed crop data.');
  process.exitCode = 1;
});
