import { getFarmGuideCalendarEntries, getReviewedCalendarForLocation } from './farmGuideData.js';

export type WaterSupply = 'rainfall' | 'irrigation';
export const guideCheckedOn = '25 October 2026';
export const guideSources = {
  climate: { title: 'NiMet seasonal outlook', url: 'https://nimet.gov.ng/scp?id=3' },
  cassava: { title: 'IITA: Agronomy of cassava', url: 'https://cgspace.cgiar.org/items/e78b8dc2-da35-4306-9eeb-bae56727242a' },
  maize: { title: 'NAERLS: Maize planting and established rains', url: 'https://nfhl.naerls.gov.ng/index.php?action=faq&cat=24&id=4&artlang=en' },
  plantain: { title: 'FARA: Plantain production in Nigeria (2016)', url: 'https://library.faraafrica.org/wp-content/uploads/2019/10/Guidebook-Plantain-production-in-Nigeria-rev.pdf' },
  okra: { title: 'NAERLS: Okra growing practices', url: 'https://kms.naerls.gov.ng/variety/viewdetails/176' },
  help: { title: 'NAERLS farmers’ information service', url: 'https://nfhl.naerls.gov.ng/' },
};

export interface CropCare {
  beforePlanting: string;
  water: string;
  earlyCare: string;
  harvest: string;
  scope: string;
  source: { title: string; url: string };
}

// Summaries support general crop care, never verification of the draft calendar.
export const cropCare: Record<string, CropCare> = {
  Cassava: {
    beforePlanting: 'Use fresh stem cuttings from healthy, mature plants. Choose loose soil that drains well.',
    water: 'Plant when the soil has enough moisture for the cuttings to establish. Avoid waterlogged ground.',
    earlyCare: 'Control weeds early. Young cassava is especially affected by weeds during its first few months.',
    harvest: 'Timing depends on variety and use. Confirm maturity locally rather than harvesting by calendar month alone.',
    scope: 'General IITA crop guidance. Variety, soil and planting date change the plan.',
    source: guideSources.cassava,
  },
  Maize: {
    beforePlanting: 'Confirm a locally suitable variety and its expected maturity before choosing a planting date.',
    water: 'For rain-fed maize, wait until rains are established. A single early shower does not show that the season is ready.',
    earlyCare: 'Check establishment after sowing and seek local advice if the crop grows poorly.',
    harvest: 'Use the variety’s maturity and the condition of the crop. A regional harvest month cannot predict your field’s harvest.',
    scope: 'The NAERLS timing source is for SAMMAZ 63 in the humid zone; its month ranges are not applied across Nigeria.',
    source: guideSources.maize,
  },
  Plantain: {
    beforePlanting: 'Confirm that your site and planting material suit plantain before setting out a new field.',
    water: 'Planting usually follows the start of dependable rains. Plantain needs well-distributed moisture; plan carefully for a long dry season.',
    earlyCare: 'Keep up with weeding as the plants establish. Delayed field care can reduce performance.',
    harvest: 'Check bunch development and the intended market. Do not use a fixed month as a harvest instruction.',
    scope: 'General Nigerian production guidance from FARA. It does not provide an LGA-specific planting forecast.',
    source: guideSources.plantain,
  },
  Okra: {
    beforePlanting: 'Use suitable seed and prepare the field before sowing directly into the soil.',
    water: 'Choose planting time with local rain or dependable irrigation in mind. Check local conditions before sowing.',
    earlyCare: 'Check germination and replace failed stands early. Keep weeds under control.',
    harvest: 'Check pods often and pick while tender. Maturity varies with variety and growing conditions.',
    scope: 'General NAERLS okra practices. These notes are not guidance for every vegetable crop.',
    source: guideSources.okra,
  },
};

export function getLagosMonth(date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Africa/Lagos' }).format(date));
}

export function getPlanningMonth(value: string | null, currentMonth = getLagosMonth()): number {
  if (value && /^(?:[1-9]|1[0-2])$/.test(value)) return Number(value);
  return currentMonth;
}

export function getPlantingWindows(zoneId: number, month: number, water: WaterSupply, locationId?: number) {
  const entries = locationId === undefined ? getFarmGuideCalendarEntries(zoneId, month, 'plant') : getReviewedCalendarForLocation(locationId, month, 'plant');
  return entries
    .filter((entry) => water === 'irrigation' || entry.seasonLabel !== 'dry_season');
}

export interface GuidePreferences { water: WaterSupply; crop: string }
const defaults: GuidePreferences = { water: 'rainfall', crop: 'Cassava' };
export function readGuidePreferences(stateId: number, lgaId: number, crops: string[]): GuidePreferences {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(`farmpal-guide-plan-${stateId}-${lgaId}`) ?? 'null');
    if (!saved || typeof saved !== 'object') return { ...defaults };
    const record = saved as Record<string, unknown>;
    return { water: record.water === 'irrigation' ? 'irrigation' : 'rainfall',
      crop: typeof record.crop === 'string' && crops.includes(record.crop) ? record.crop : defaults.crop };
  } catch { return { ...defaults }; }
}

export function saveGuidePreferences(stateId: number, lgaId: number, preferences: GuidePreferences) {
  try { window.localStorage.setItem(`farmpal-guide-plan-${stateId}-${lgaId}`, JSON.stringify(preferences)); }
  catch { /* The current plan remains usable without device storage. */ }
}
