/**
 * Illustrative SeasonSense content for zones/crops without a verified local plan.
 * This catalog is deliberately separate from the server's sourced calendar and
 * historical survey records. It contains no dates, rainfall, soil measurements,
 * fertilizer rates, yields, or claims about current pest outbreaks.
 */

export interface SeasonPlanningDemo {
  id: string;
  zoneCode: string;
  zoneName: string;
  crop: string;
  status: 'demo';
  source: { type: 'illustrative'; label: 'FieldSense illustrative content' };
  updatedAt: string;
  planningPeriod: string;
  zoneContext: string;
  landPreparation: string;
  planting: string;
  water: string;
  nutrients: string;
  risks: string[];
  maintenance: string[];
  timeline: string[];
  harvest: string;
}

export const seasonPlanningDemoUpdatedAt = '2026-10-23';

interface ZoneProfile {
  name: string;
  context: string;
  water: string;
}

interface CropProfile {
  name: string;
  planningCue: string;
  landPreparation: string;
  planting: string;
  nutrients: string;
  risks: string[];
  maintenance: string[];
  timeline: string[];
}

const zoneProfiles: Record<string, ZoneProfile> = {
  SAHEL: {
    name: 'Sahel Savanna',
    context: 'This is a drier savanna planning context. Local rainfall can vary, and this guide has no rainfall observations for your farm.',
    water: 'Check local rain onset and soil moisture before field work. Dry-season production needs a confirmed water source; this guide does not assume irrigation is available.',
  },
  SUDAN: {
    name: 'Sudan Savanna',
    context: 'This savanna planning context can have a short and variable rainy period. The guide does not measure this season or your field.',
    water: 'Confirm that rain has become dependable for establishment. Plan around dry spells and drainage using local advice; no forecast is used here.',
  },
  NORTHERN_GUINEA: {
    name: 'Northern Guinea Savanna',
    context: 'This guide uses a savanna-zone context. Rain timing and field conditions differ between communities and farms.',
    water: 'Check soil moisture after rain and watch for both dry spells and runoff. Do not treat this example as a rainfall forecast.',
  },
  SOUTHERN_GUINEA: {
    name: 'Southern Guinea Savanna',
    context: 'This is a transitional savanna planning context. Local rain breaks, soil, and field drainage can change what is practical.',
    water: 'Confirm dependable moisture locally and consider how the field drains after heavy rain. No local rainfall data is included in this example.',
  },
  DERIVED_SAVANNA: {
    name: 'Derived Savanna',
    context: 'This transition-zone example allows for different field conditions across nearby areas. It does not identify the conditions on your farm.',
    water: 'Check the actual rain pattern and water access at the field. Avoid using a zone label as proof that the crop has enough water.',
  },
  HUMID_FOREST: {
    name: 'Humid Forest',
    context: 'This humid-zone example highlights moisture and drainage checks. It does not identify whether a particular plot is upland, swamp, or coastal.',
    water: 'Check for waterlogging as well as dry spells, and confirm whether the field drains suitably for the crop. This guide contains no plot-level water data.',
  },
  MID_ALTITUDE: {
    name: 'Mid Altitude',
    context: 'This zone label can cover local elevation and weather differences. No elevation or temperature measurement is used in this example.',
    water: 'Confirm local moisture and drainage, and ask an extension worker whether the selected variety fits the area. No weather forecast is used.',
  },
};

const cropProfiles: Record<string, CropProfile> = {
  maize: {
    name: 'Maize',
    planningCue: 'Illustrative cue: plan sowing only after local advice confirms dependable moisture for seed establishment. No month range is supported here.',
    landPreparation: 'Prepare a workable seedbed and manage crop residue without burning where practical. Check that the field is not waterlogged.',
    planting: 'Use clean seed of a locally suitable variety. Follow the seed label or extension guidance for spacing and depth; this demo gives no planting rate.',
    nutrients: 'Use a soil test or local extension recommendation to choose nutrient inputs. No fertilizer type or rate is prescribed here.',
    risks: ['Inspect leaves and stems for unusual feeding damage; this guide does not report a pest outbreak.', 'Check for weeds and water stress during early establishment.'],
    maintenance: ['Control weeds while plants are small, using locally approved methods.', 'Recheck crop health after heavy rain or a dry spell.'],
    timeline: ['Field preparation', 'Plant after local conditions and seed choice are checked', 'Establishment and weed control', 'Flowering and grain filling', 'Harvest after local maturity signs are confirmed'],
  },
  cassava: {
    name: 'Cassava',
    planningCue: 'Illustrative cue: coordinate healthy stem cuttings with locally confirmed moisture and field drainage. No month range is supported here.',
    landPreparation: 'Choose a field with suitable drainage and prepare planting ridges or mounds only where local soil and water conditions call for them.',
    planting: 'Use healthy, disease-free stem cuttings of a variety recommended for the area. Ask an extension worker about cutting size, spacing, and planting method.',
    nutrients: 'Check soil fertility and local guidance before adding compost, manure, or fertilizer. No nutrient rate is included.',
    risks: ['Inspect leaves and stems for unusual symptoms or damage; this guide does not confirm any disease is present.', 'Check for waterlogging and early weed competition.'],
    maintenance: ['Replace failed stands only after checking the cause of poor establishment.', 'Keep weeds managed and monitor crop condition through the season.'],
    timeline: ['Field and planting-material checks', 'Planting when local moisture is suitable', 'Establishment and weed management', 'Canopy and root development', 'Harvest only when local maturity and market needs are checked'],
  },
  yam: {
    name: 'Yam',
    planningCue: 'Illustrative cue: confirm seed-yam availability, local planting practice, and suitable field moisture before choosing a date.',
    landPreparation: 'Select a field and mound, ridge, or stake system suited to the local soil and farming practice.',
    planting: 'Use healthy seed yam or setts from a trusted source. Confirm variety, sett preparation, spacing, and planting method with local extension advice.',
    nutrients: 'Base nutrient additions on soil condition and local advice. This illustrative guide gives no fertilizer rate.',
    risks: ['Inspect planting material and vines for rot or damage; no outbreak is claimed.', 'Watch for water stress, excess water, and early weed competition.'],
    maintenance: ['Provide support where the local variety and system require it.', 'Manage weeds and check vines and leaves regularly.'],
    timeline: ['Field and seed-yam selection', 'Planting after local timing is confirmed', 'Establishment and support', 'Vine growth and tuber development', 'Harvest after maturity signs are confirmed locally'],
  },
  rice: {
    name: 'Rice',
    planningCue: 'Illustrative cue: first confirm that the field and water system suit the selected rice type; this guide gives no planting date.',
    landPreparation: 'First confirm whether the field and production system are suitable for rice. Prepare land according to the locally used upland, lowland, or irrigated system.',
    planting: 'Choose a locally recommended variety and method. This guide does not assume a water regime, nursery method, or planting date.',
    nutrients: 'Use soil information and advice for the selected rice system to plan nutrients. No fertilizer rate is supplied.',
    risks: ['Monitor weeds, water stress or excess standing water, and unusual leaf or stem damage.', 'This guide does not report pest or disease presence.'],
    maintenance: ['Keep water management matched to the actual production system.', 'Inspect crop establishment and manage weeds with locally approved methods.'],
    timeline: ['Confirm field and water system', 'Prepare land and planting material', 'Establishment', 'Vegetative growth and reproductive development', 'Harvest when crop maturity is confirmed locally'],
  },
  cowpea: {
    name: 'Cowpea',
    planningCue: 'Illustrative cue: choose a locally suitable variety and coordinate planting with locally confirmed moisture; no date range is supplied.',
    landPreparation: 'Use a field with suitable drainage and check the previous crop and rotation plan before planting.',
    planting: 'Select a locally suitable variety and seed source. Follow local guidance for planting depth, spacing, and intercropping.',
    nutrients: 'Check soil and seek local guidance before applying nutrients. This guide provides no fertilizer rate.',
    risks: ['Inspect leaves, flowers, and pods for unusual insect damage; this is not a report of an outbreak.', 'Check for weeds and water stress during establishment.'],
    maintenance: ['Manage early weed competition and monitor crop growth.', 'Dry and store harvested grain safely using locally recommended practices.'],
    timeline: ['Seed and field checks', 'Plant after local conditions are confirmed', 'Establishment and weed control', 'Flowering and pod development', 'Harvest when pods and grain are mature by local guidance'],
  },
  groundnut: {
    name: 'Groundnut',
    planningCue: 'Illustrative cue: confirm the field, rotation, and suitable moisture before planting; no month range is supported here.',
    landPreparation: 'Check that the field is suitable for digging and has drainage appropriate for groundnut. Avoid reusing a field without considering rotation and disease history.',
    planting: 'Use clean seed of a locally suitable variety. Follow local advice for spacing, seed treatment, and planting depth.',
    nutrients: 'Use soil testing or extension guidance for nutrient needs, especially where soil fertility is uncertain. No rate is given here.',
    risks: ['Monitor leaves and pods for unusual damage or spots; this guide does not indicate an outbreak.', 'Check for poor drainage and weed competition.'],
    maintenance: ['Keep weeds controlled early and avoid damaging pegs during field work.', 'Check crop maturity before digging and drying.'],
    timeline: ['Field and seed checks', 'Planting after local conditions are confirmed', 'Establishment and weed control', 'Flowering and pod formation', 'Dig and dry only after maturity is checked locally'],
  },
  sorghum: {
    name: 'Sorghum',
    planningCue: 'Illustrative cue: wait for local advice on dependable moisture and a suitable variety; this guide does not supply dates.',
    landPreparation: 'Prepare a seedbed that fits the local soil and water conditions. Check drainage and the field’s previous crop.',
    planting: 'Choose a locally suitable variety and follow local guidance for planting depth and spacing. No date or seed rate is supplied.',
    nutrients: 'Use soil testing or extension advice to guide nutrient choices; avoid applying a guessed rate.',
    risks: ['Inspect leaves and heads for unusual pest or disease symptoms; no outbreak is claimed.', 'Monitor weeds, moisture stress, and bird damage as the crop matures.'],
    maintenance: ['Manage early weeds and monitor crop establishment.', 'Plan harvest and safe drying with local maturity guidance.'],
    timeline: ['Seed and field selection', 'Plant after local conditions are checked', 'Establishment and weed control', 'Head formation and grain filling', 'Harvest after maturity signs are confirmed locally'],
  },
  millet: {
    name: 'Millet',
    planningCue: 'Illustrative cue: check local moisture and seed guidance before sowing; no exact planting period is available in this demo.',
    landPreparation: 'Use a field and seedbed suited to local soil and water conditions. Keep the rotation and previous crop in view.',
    planting: 'Choose seed recommended for the area and follow local guidance for sowing depth and spacing. This example gives no exact planting date.',
    nutrients: 'Check soil condition and ask local extension staff about nutrient needs. No fertilizer rate is supplied.',
    risks: ['Monitor seedlings and heads for unusual damage; no pest outbreak is reported here.', 'Check for weeds, moisture stress, and bird damage near maturity.'],
    maintenance: ['Control weeds early with locally suitable methods.', 'Inspect the crop after rain and through head development.'],
    timeline: ['Field and seed checks', 'Sowing after local timing is confirmed', 'Establishment and weed control', 'Head development and grain filling', 'Harvest after local maturity checks'],
  },
  soybean: {
    name: 'Soybean',
    planningCue: 'Illustrative cue: confirm variety, seed treatment needs, and suitable local moisture before setting a planting date.',
    landPreparation: 'Check drainage, soil condition, and rotation history before selecting a field.',
    planting: 'Use locally recommended seed and inoculant only when appropriate for the variety and local supply. Confirm planting method and spacing with extension guidance.',
    nutrients: 'Base nutrient choices on soil testing and local recommendations. This demo gives no fertilizer or inoculant dose.',
    risks: ['Check leaves and pods for unusual damage or disease symptoms; no outbreak is claimed.', 'Monitor weeds and moisture during establishment and flowering.'],
    maintenance: ['Manage weeds early and inspect crop growth regularly.', 'Use locally approved practices if symptoms or pest damage appear.'],
    timeline: ['Field and seed checks', 'Plant after local suitability is confirmed', 'Establishment and weed control', 'Flowering and pod filling', 'Harvest when maturity is confirmed locally'],
  },
  plantain: {
    name: 'Plantain',
    planningCue: 'Illustrative cue: confirm healthy planting material, site drainage, and local establishment timing before planting.',
    landPreparation: 'Select a site with suitable drainage and access for routine field care. Check the previous crop and planting-material source.',
    planting: 'Use healthy planting material of a locally suitable type. Confirm spacing and establishment method with an extension worker.',
    nutrients: 'Check soil condition and use local advice to plan organic matter and nutrient additions. No rate is specified.',
    risks: ['Inspect mats and leaves for unusual damage or disease symptoms; no outbreak is claimed.', 'Check for waterlogging, drought stress, and weed competition.'],
    maintenance: ['Keep the planting area accessible and manage weeds.', 'Monitor plant condition and follow local advice on mat management.'],
    timeline: ['Site and planting-material checks', 'Establishment', 'Leaf and stem growth', 'Flowering and bunch development', 'Harvest only after maturity and local market requirements are checked'],
  },
  cocoyam: {
    name: 'Cocoyam',
    planningCue: 'Illustrative cue: confirm that the plot’s drainage and moisture suit the selected cocoyam type before planting.',
    landPreparation: 'Check whether the plot drains well enough for the chosen cocoyam type and production system.',
    planting: 'Use healthy corms or cormels and follow local advice on planting depth and spacing.',
    nutrients: 'Use soil information and extension advice before applying nutrients. No fertilizer rate is included.',
    risks: ['Inspect leaves and corms for unusual damage or rot; this guide does not claim disease is present.', 'Monitor weeds and excess water.'],
    maintenance: ['Manage weeds and monitor field moisture.', 'Remove and seek advice on plants showing unusual symptoms.'],
    timeline: ['Field and planting-material checks', 'Planting after local conditions are checked', 'Establishment and weed management', 'Leaf and corm development', 'Harvest after maturity is confirmed locally'],
  },
  potato: {
    name: 'Irish potato',
    planningCue: 'Illustrative cue: confirm local suitability, seed-tuber supply, and extension guidance before selecting a planting date.',
    landPreparation: 'Confirm local suitability, seed-tuber availability, and soil drainage before planning a potato crop.',
    planting: 'Use healthy seed tubers of a locally recommended variety. Confirm planting date, seed handling, and ridging practice with local extension guidance.',
    nutrients: 'Use a soil test or local recommendation to plan nutrient inputs. This example supplies no rates.',
    risks: ['Monitor leaves and tubers for unusual damage or disease symptoms; no outbreak is claimed.', 'Check moisture and drainage throughout crop development.'],
    maintenance: ['Use locally recommended weed and earthing-up practices.', 'Inspect crop health and avoid storing damaged or wet tubers.'],
    timeline: ['Confirm site and seed tubers', 'Prepare ridges and plant at locally advised timing', 'Establishment and crop care', 'Tuber development', 'Harvest after local maturity checks'],
  },
};

const zoneCropIds: Record<string, readonly string[]> = {
  SAHEL: ['millet', 'sorghum', 'cowpea', 'groundnut'],
  SUDAN: ['millet', 'sorghum', 'maize', 'cowpea', 'groundnut'],
  NORTHERN_GUINEA: ['maize', 'sorghum', 'cowpea', 'groundnut', 'soybean'],
  SOUTHERN_GUINEA: ['maize', 'cassava', 'yam', 'cowpea', 'soybean'],
  DERIVED_SAVANNA: ['maize', 'cassava', 'yam', 'rice', 'cowpea'],
  HUMID_FOREST: ['cassava', 'yam', 'plantain', 'rice', 'cocoyam'],
  MID_ALTITUDE: ['maize', 'potato', 'cowpea', 'soybean'],
};

function createDemo(zoneCode: string, cropId: string): SeasonPlanningDemo {
  const zone = zoneProfiles[zoneCode];
  const crop = cropProfiles[cropId];
  if (!zone || !crop) throw new Error('The illustrative crop guide configuration is incomplete.');
  return {
    id: `demo:${zoneCode}:${cropId}`,
    zoneCode,
    zoneName: zone.name,
    crop: crop.name,
    status: 'demo',
    source: { type: 'illustrative', label: 'FieldSense illustrative content' },
    updatedAt: seasonPlanningDemoUpdatedAt,
    planningPeriod: crop.planningCue,
    zoneContext: zone.context,
    landPreparation: crop.landPreparation,
    planting: crop.planting,
    water: zone.water,
    nutrients: crop.nutrients,
    risks: crop.risks,
    maintenance: crop.maintenance,
    timeline: crop.timeline,
    harvest: 'No sourced harvest date or yield estimate is available for this demo. Confirm maturity signs and harvest timing with local extension guidance.',
  };
}

export function getSeasonPlanningDemos(zoneCode: string): SeasonPlanningDemo[] {
  const cropIds = zoneCropIds[zoneCode];
  if (!cropIds) return [];
  return cropIds.map((cropId) => createDemo(zoneCode, cropId));
}

/** Return only fallback cards; source-backed cards are rendered before these. */
export function getFallbackSeasonPlanningDemos(zoneCode: string, sourceCropNames: readonly string[] = []): SeasonPlanningDemo[] {
  const sourcedCrops = new Set(sourceCropNames.map((crop) => crop.trim().toLocaleLowerCase()));
  return getSeasonPlanningDemos(zoneCode).filter((plan) => !sourcedCrops.has(plan.crop.toLocaleLowerCase()));
}

export function getSeasonPlanningDemo(zoneCode: string, cropName: string): SeasonPlanningDemo | null {
  return getSeasonPlanningDemos(zoneCode).find((plan) => plan.crop.toLocaleLowerCase() === cropName.trim().toLocaleLowerCase()) ?? null;
}
