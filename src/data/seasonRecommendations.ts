import type { NigeriaFarmingZone } from './nigeriaRegions.js';

export type RecommendationCropId = string;

export interface RecommendationSource {
  title: string;
  organization: string;
  url: string;
}

export interface CropRecommendation {
  id: RecommendationCropId;
  name: string;
  image?: string;
  summary: string;
  why: string;
  plantingWindow: string;
  windowNote: string;
  considerations: string[];
  guidance: string[];
  risks: string[];
  sources: RecommendationSource[];
}

export type RecommendationResult =
  | { status: 'ready'; locationLabel: 'Eket, Akwa Ibom'; date: string; recommendations: CropRecommendation[] }
  | { status: 'unsupported-location' }
  | { status: 'invalid-date' };

const sources = {
  cassava: {
    title: 'Growing cassava commercially in Nigeria: an illustrated guide',
    organization: 'International Institute of Tropical Agriculture (IITA)',
    url: 'https://www.iita.org/wp-content/uploads/2016/06/Growing_cassava_commercially_in_Nigeria_an_illustrated_guide.pdf',
  },
  maize: {
    title: 'Planting Date, Time and Method — SAMMAZ 63',
    organization: 'National Agricultural Extension and Research Liaison Services (NAERLS)',
    url: 'https://nfhl.naerls.gov.ng/index.php?action=faq&cat=24&id=4&artlang=en',
  },
  akwaIbomZone: {
    title: 'Nigeria Agricultural Ecological Zones',
    organization: 'National Agricultural Extension and Research Liaison Services (NAERLS)',
    url: 'https://nfhl.naerls.gov.ng/index.php?action=faq&cat=1&id=1&artlang=en',
  },
} satisfies Record<string, RecommendationSource>;

const recommendationDetails: Record<'cassava' | 'maize', CropRecommendation> = {
  cassava: {
    id: 'cassava',
    name: 'Cassava',
    image: '/assets/crop-cassava-clear.webp',
    summary: 'The source month range includes this part of the year for some two-rainy-season Nigerian zones.',
    why: 'IITA recommends planting at the beginning of a growing season so cuttings can sprout and establish with moisture. Its guide names April–May for the major season and August for the minor season in areas with two rainy seasons. This is a Nigerian guide, not an Eket-specific field assessment.',
    plantingWindow: 'April–May, or August in some two-rainy-season zones',
    windowNote: 'The source describes broad Nigerian growing-zone windows. Confirm local rain onset, field moisture, variety, and advice from an extension worker before planting.',
    considerations: [
      'Plant when dependable rains begin so stem cuttings can sprout and establish.',
      'The guide cautions against dry-season planting where rains stop early or the water table is low.',
      'No plot-level soil or current rainfall measurement is used to select this crop.',
    ],
    guidance: [
      'Use healthy planting stems suited to the variety and your local conditions.',
      'Check that the field has adequate moisture at planting and can drain appropriately.',
      'Ask a local extension worker whether the source window fits your community’s rainfall pattern.',
    ],
    risks: [
      'A calendar window does not confirm that rain has started or that the soil is moist.',
      'The cited guide does not provide an Eket-specific planting date or guarantee a result.',
    ],
    sources: [sources.cassava],
  },
  maize: {
    id: 'maize',
    name: 'Maize',
    image: '/assets/crop-maize-clear.webp',
    summary: 'NAERLS gives humid-zone planting windows that include this part of the year.',
    why: 'NAERLS says to sow after rains are established, preferably just after a good rain. For the humid zone, its SAMMAZ 63 page lists late February–March and late July–August. NAERLS includes Akwa Ibom in its ecological-zone reference; the variety guidance still needs local confirmation.',
    plantingWindow: 'Late February–March, or late July–August (humid-zone guidance)',
    windowNote: 'This schedule is for SAMMAZ 63 and broad ecological zones. Confirm variety, established rain, field drainage, and local extension advice.',
    considerations: [
      'The source says the timing of established rains varies by ecological zone and year.',
      'A short-range weather forecast is not evidence that rains are established for planting.',
      'No field-level soil, rainfall, or variety assessment is available here.',
    ],
    guidance: [
      'Wait for established rains rather than relying on the first shower.',
      'Use seed and practices recommended for your maize variety and local area.',
      'Check with an extension worker before applying variety-specific dates to another maize variety.',
    ],
    risks: [
      'NAERLS warns that planting too early or too late can affect grain quality or yield.',
      'The timing is not a guarantee for an individual farm or season.',
    ],
    sources: [sources.maize, sources.akwaIbomZone],
  },
};

const supportedEketLocationAliases = new Set([
  'eket',
  'eket akwa ibom',
  'eket akwa ibom nigeria',
  'eket nigeria',
]);

function normalizeLocation(value: string): string {
  return value.toLocaleLowerCase('en-NG').replace(/[^a-z\s]/g, ' ').trim().replace(/\s+/g, ' ');
}

export function matchSupportedLocation(value: string): { id: 'eket'; label: 'Eket, Akwa Ibom' } | null {
  return supportedEketLocationAliases.has(normalizeLocation(value))
    ? { id: 'eket', label: 'Eket, Akwa Ibom' }
    : null;
}

function isDateWithinRange(date: string, startMonth: number, startDay: number, endMonth: number, endDay: number): boolean {
  const [, monthPart, dayPart] = date.split('-');
  const month = Number(monthPart);
  const day = Number(dayPart);
  const current = month * 100 + day;
  return current >= startMonth * 100 + startDay && current <= endMonth * 100 + endDay;
}

export function getSeasonRecommendations(locationId: string, date: string): RecommendationResult {
  if (locationId !== 'eket') return { status: 'unsupported-location' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 'invalid-date' };
  const [year, month, day] = date.split('-').map(Number);
  if (new Date(Date.UTC(year!, month! - 1, day!)).toISOString().slice(0, 10) !== date) return { status: 'invalid-date' };

  const recommendations: CropRecommendation[] = [];
  if ((month! >= 4 && month! <= 5) || month === 8) recommendations.push(recommendationDetails.cassava);
  if (isDateWithinRange(date, 2, 21, 3, 31) || isDateWithinRange(date, 7, 21, 8, 31)) recommendations.push(recommendationDetails.maize);

  return { status: 'ready', locationLabel: 'Eket, Akwa Ibom', date, recommendations };
}

/** Broad planning references for the southern belt; these are not field-specific recommendations. */
export function getSouthernPlanningRecommendations(): CropRecommendation[] {
  return [recommendationDetails.maize, recommendationDetails.cassava];
}

const demoCropCatalog: Record<string, { name: string; image?: string }> = {
  maize: { name: 'Maize', image: '/assets/crop-maize-clear.webp' },
  cassava: { name: 'Cassava', image: '/assets/crop-cassava-clear.webp' },
  yam: { name: 'Yam', image: '/assets/crops/yam.jpg' },
  rice: { name: 'Rice', image: '/assets/crops/rice.jpg' },
  millet: { name: 'Millet', image: '/assets/crops/millet.jpg' },
  sorghum: { name: 'Sorghum', image: '/assets/crops/sorghum.jpg' },
  cowpea: { name: 'Cowpea', image: '/assets/crops/cowpea.jpg' },
  groundnut: { name: 'Groundnut', image: '/assets/crops/groundnut.jpg' },
  soybean: { name: 'Soybean', image: '/assets/crops/soybean.jpg' },
  tomato: { name: 'Tomato', image: '/assets/crops/tomato.jpg' },
  onion: { name: 'Onion', image: '/assets/crops/onion.jpg' },
  pepper: { name: 'Pepper', image: '/assets/crops/pepper.jpg' },
  plantain: { name: 'Plantain', image: '/assets/crops/plantain.jpg' },
  cocoyam: { name: 'Cocoyam', image: '/assets/crops/cocoyam.jpg' },
  okra: { name: 'Okra', image: '/assets/crops/okra.jpg' },
  leafyVegetables: { name: 'Leafy vegetables', image: '/assets/crops/leafy-vegetables.jpg' },
  wheat: { name: 'Wheat', image: '/assets/crops/wheat.jpg' },
  sesame: { name: 'Sesame', image: '/assets/crops/sesame.jpg' },
  potato: { name: 'Potato', image: '/assets/crops/potato.jpg' },
} satisfies Record<string, { name: string; image?: string }>;

export function getCropPreviewImage(cropName: string): string | undefined {
  const normalized = cropName.trim().toLocaleLowerCase();
  const crop = Object.values(demoCropCatalog).find(({ name }) => name.toLocaleLowerCase() === normalized)
    ?? (normalized === 'irish potato' ? demoCropCatalog.potato : undefined);
  return crop?.image;
}

type DemoCropId = keyof typeof demoCropCatalog;

interface ZoneCropSet {
  rainyMonths: readonly number[];
  rainy: readonly DemoCropId[];
  dry: readonly DemoCropId[];
}

// This preview data is intentionally marked as a sample. It is a zone-filtering demo,
// not an authoritative planting calendar or field-specific recommendation.
const sampleZoneCropSets: Record<NigeriaFarmingZone, ZoneCropSet> = {
  'Sahel Savanna': {
    rainyMonths: [5, 6, 7, 8, 9],
    rainy: ['millet', 'sorghum', 'cowpea', 'maize', 'groundnut', 'rice', 'sesame'],
    dry: ['tomato', 'onion', 'pepper', 'wheat'],
  },
  'Sudan Savanna': {
    rainyMonths: [5, 6, 7, 8, 9, 10],
    rainy: ['millet', 'sorghum', 'maize', 'cowpea', 'groundnut', 'soybean', 'rice', 'sesame'],
    dry: ['tomato', 'onion', 'pepper', 'wheat'],
  },
  'Northern Guinea Savanna': {
    rainyMonths: [4, 5, 6, 7, 8, 9, 10],
    rainy: ['maize', 'rice', 'soybean', 'cowpea', 'groundnut', 'sorghum', 'sesame'],
    dry: ['tomato', 'onion', 'pepper', 'leafyVegetables'],
  },
  'Southern Guinea Savanna': {
    rainyMonths: [4, 5, 6, 7, 8, 9, 10],
    rainy: ['maize', 'yam', 'cassava', 'rice', 'soybean', 'cowpea', 'groundnut'],
    dry: ['tomato', 'pepper', 'leafyVegetables', 'onion'],
  },
  'Derived Savanna': {
    rainyMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    rainy: ['maize', 'cassava', 'yam', 'rice', 'soybean', 'cowpea', 'groundnut', 'plantain'],
    dry: ['tomato', 'pepper', 'okra', 'leafyVegetables', 'onion'],
  },
  'Humid Forest': {
    rainyMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    rainy: ['cassava', 'yam', 'plantain', 'maize', 'rice', 'cocoyam', 'okra', 'pepper', 'soybean'],
    dry: ['tomato', 'pepper', 'okra', 'leafyVegetables', 'onion'],
  },
  'Mid Altitude': {
    rainyMonths: [4, 5, 6, 7, 8, 9, 10],
    rainy: ['maize', 'rice', 'soybean', 'cowpea', 'groundnut', 'potato'],
    dry: ['tomato', 'pepper', 'leafyVegetables', 'wheat', 'potato'],
  },
};

export function getZoneSampleSeason(zone: NigeriaFarmingZone, date: string): 'rainy-season sample' | 'dry-season sample' {
  const month = Number(date.slice(5, 7));
  return sampleZoneCropSets[zone].rainyMonths.includes(month) ? 'rainy-season sample' : 'dry-season sample';
}

export function getZoneDemoRecommendations(zone: NigeriaFarmingZone, date: string): CropRecommendation[] {
  const season = getZoneSampleSeason(zone, date);
  const cropIds = season === 'rainy-season sample' ? sampleZoneCropSets[zone].rainy : sampleZoneCropSets[zone].dry;
  return cropIds.map((id) => {
    const crop = demoCropCatalog[id]!;
    return {
      id,
      name: crop.name,
      ...(crop.image ? { image: crop.image } : {}),
      summary: 'Sample crop included for this farming zone.',
      why: `${crop.name} is included in the ${zone} ${season}. This sample list is for preview only and is not verified planting advice.`,
      plantingWindow: season === 'rainy-season sample' ? 'Rainy-season sample list' : 'Dry-season sample list',
      windowNote: 'The app has not yet checked a trusted local crop calendar for your exact area. Confirm planting dates, water needs, variety, soil and field history with an extension worker.',
      considerations: [
        'This crop appears in sample data only; it is not selected from a farm-specific assessment.',
        'Rainfall timing and soil conditions can change within the same farming zone.',
        'Dry-season production may depend on an irrigation supply; this sample does not check water access.',
      ],
      guidance: ['Use this card to preview the zone and season filter. Ask a local extension worker for planting decisions.'],
      risks: ['Sample data only. Do not use this card as a planting recommendation or crop-rotation plan.'],
      sources: [],
    };
  });
}

const southernPlanningAliases = new Set(['southern nigeria', 'south nigeria', 'southern region nigeria']);

export function isSouthernPlanningRegion(value: string): boolean {
  return southernPlanningAliases.has(normalizeLocation(value));
}

export const seasonSenseSources = {
  okra: {
    title: 'Agronomic practice of Okra',
    organization: 'National Agricultural Extension and Research Liaison Services (NAERLS)',
    url: 'https://kms.naerls.gov.ng/variety/viewdetails/176',
    limitation: 'The record says wet-season planting, but this app does not have verified Eket wet-season or field-moisture data to determine whether to recommend it today.',
  },
  yam: {
    title: 'Yam regeneration guidelines',
    organization: 'International Institute of Tropical Agriculture (IITA)',
    url: 'https://www.iita.org/wp-content/uploads/2017/Yam_Regeneration_guidelines.pdf',
    limitation: 'The cited document covers yam regeneration and broad yam-belt timing; it does not establish an Eket-specific commercial planting recommendation.',
  },
  nimet: {
    title: 'Seasonal Climate Prediction Update: August 2026 (ASO 2026)',
    organization: 'Nigerian Meteorological Agency (NiMet)',
    url: 'https://nimet.gov.ng/publication_detail?id=92',
    limitation: 'The outlook covers August–October 2026 at a broad climate scale. It is not an Eket-specific crop recommendation or a substitute for current field observations.',
  },
} satisfies Record<string, RecommendationSource & { limitation: string }>;

export function getRecommendationEvidenceGap(date: string): string {
  const month = Number(date.slice(5, 7));
  const hasCassavaOrMaizeWindow = (month >= 4 && month <= 5) || month === 8 || month === 2 || month === 3 || month === 7;
  if (!hasCassavaOrMaizeWindow) {
    return 'The available cassava and maize sources give planting windows that do not include this date. Okra guidance is seasonal but the app cannot verify current Eket wet-season field conditions. The yam source is a regeneration guide, not a local production calendar.';
  }
  return 'No crop passed the available source-based planting-window checks for this date. Weather and soil conditions at your plot still need local confirmation.';
}
