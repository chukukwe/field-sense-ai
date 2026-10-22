/** NAERLS farming/ecological zones; this is separate from Nigeria's political zones. */
export const nigeriaFarmingZones = [
  'Sahel Savanna',
  'Sudan Savanna',
  'Northern Guinea Savanna',
  'Southern Guinea Savanna',
  'Derived Savanna',
  'Humid Forest',
  'Mid Altitude',
] as const;

export type NigeriaFarmingZone = typeof nigeriaFarmingZones[number];

interface StateZoneRule {
  defaultZone: NigeriaFarmingZone;
  requiresLocalArea: boolean;
  overrides?: Record<string, NigeriaFarmingZone>;
}

function normalizePlace(value: string): string {
  return value.toLocaleLowerCase('en-NG').replace(/[^a-z\s]/g, ' ').trim().replace(/\s+/g, ' ')
    .replace(/\s+(local government area|lga)$/i, '').trim();
}

const stateZoneRules: Record<string, StateZoneRule> = {
  Yobe: { defaultZone: 'Sahel Savanna', requiresLocalArea: true, overrides: { gulani: 'Sudan Savanna', gujba: 'Sudan Savanna', jakusko: 'Sudan Savanna', damaturu: 'Sudan Savanna' } },
  Borno: { defaultZone: 'Sahel Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Shani', 'Hawul', 'Bayo', 'Biu', 'Kwaya Kusar', 'Kwayakusar', 'Chibok', 'Damboa', 'Gwoza', 'Askira Uba'].map((name) => [normalizePlace(name), 'Sudan Savanna'])) as Record<string, NigeriaFarmingZone> },
  Jigawa: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Birniwa', 'Maigatari', 'Malam Maduri', 'Malam Madori', 'Guri', 'Hadejia'].map((name) => [normalizePlace(name), 'Sahel Savanna'])) as Record<string, NigeriaFarmingZone> },
  Kano: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Doguwa', 'Tudun Wada', 'Sumaila', 'Kibiya'].map((name) => [normalizePlace(name), 'Northern Guinea Savanna'])) as Record<string, NigeriaFarmingZone> },
  Katsina: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Sabuwa', 'Dandume', 'Bakori', 'Faskari', 'Funtua', 'Kafur', 'Kankari', 'Kankara', 'Malumfashi'].map((name) => [normalizePlace(name), 'Northern Guinea Savanna'])) as Record<string, NigeriaFarmingZone> },
  Zamfara: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Maru', 'Gusau', 'Tsare', 'Tsafe'].map((name) => [normalizePlace(name), 'Northern Guinea Savanna'])) as Record<string, NigeriaFarmingZone> },
  Sokoto: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Sabon Birni', 'Gada', 'Illela'].map((name) => [normalizePlace(name), 'Sahel Savanna'])) as Record<string, NigeriaFarmingZone> },
  Kebbi: { defaultZone: 'Sudan Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Ngaski', 'Sakaba'].map((name) => [normalizePlace(name), 'Northern Guinea Savanna'])) as Record<string, NigeriaFarmingZone> },
  Kaduna: { defaultZone: 'Northern Guinea Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Sanga', "Jema'a", 'Jaba'].map((name) => [normalizePlace(name), 'Southern Guinea Savanna'])) as Record<string, NigeriaFarmingZone> },
  Bauchi: { defaultZone: 'Northern Guinea Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Ningi', 'Warji', 'Toro'].map((name) => [normalizePlace(name), 'Mid Altitude'])) as Record<string, NigeriaFarmingZone> },
  Gombe: { defaultZone: 'Northern Guinea Savanna', requiresLocalArea: true, overrides: { nafada: 'Sudan Savanna', dukku: 'Sudan Savanna', shongom: 'Southern Guinea Savanna', shangom: 'Southern Guinea Savanna', balanga: 'Southern Guinea Savanna', kaltungo: 'Southern Guinea Savanna', billri: 'Southern Guinea Savanna', billiri: 'Southern Guinea Savanna' } },
  Niger: { defaultZone: 'Southern Guinea Savanna', requiresLocalArea: false },
  Adamawa: { defaultZone: 'Southern Guinea Savanna', requiresLocalArea: true, overrides: { ganye: 'Mid Altitude', toungo: 'Derived Savanna' } },
  Nasarawa: { defaultZone: 'Derived Savanna', requiresLocalArea: false },
  Kwara: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: { kalama: 'Northern Guinea Savanna', kaiama: 'Northern Guinea Savanna', baruten: 'Northern Guinea Savanna' } },
  'Federal Capital Territory': { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: { gwagwalada: 'Southern Guinea Savanna' } },
  Plateau: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Jos East', 'Bassa', 'Jos North', 'Jos South', 'Barkin Ladi', 'Riyom'].map((name) => [normalizePlace(name), 'Mid Altitude']).concat([['kanam', 'Northern Guinea Savanna'], ['wase', 'Southern Guinea Savanna']])) as Record<string, NigeriaFarmingZone> },
  Kogi: { defaultZone: 'Derived Savanna', requiresLocalArea: false },
  Benue: { defaultZone: 'Derived Savanna', requiresLocalArea: false },
  Taraba: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Zing', 'Ardo Kola', 'Jalingo', 'Yorro', 'Lau', 'Karim Lamido'].map((name) => [normalizePlace(name), 'Humid Forest']).concat([['sardauna', 'Mid Altitude']])) as Record<string, NigeriaFarmingZone> },
  Oyo: { defaultZone: 'Derived Savanna', requiresLocalArea: false },
  Osun: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Oriade', 'Atakunmasa East', 'Atakunmosa East', 'Ife', 'Ife Osun'].map((name) => [normalizePlace(name), 'Humid Forest'])) as Record<string, NigeriaFarmingZone> },
  Ogun: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Ogun Waterside', 'Odogbolu', 'Shagamu', 'Ifo'].map((name) => [normalizePlace(name), 'Humid Forest'])) as Record<string, NigeriaFarmingZone> },
  Ekiti: { defaultZone: 'Derived Savanna', requiresLocalArea: false },
  Enugu: { defaultZone: 'Derived Savanna', requiresLocalArea: true, overrides: Object.fromEntries(['Oji River', 'Awgu', 'Aninri'].map((name) => [normalizePlace(name), 'Humid Forest'])) as Record<string, NigeriaFarmingZone> },
  Lagos: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  Ondo: { defaultZone: 'Humid Forest', requiresLocalArea: true, overrides: Object.fromEntries(['Owo', 'Akoko South West', 'Akoko South East', 'Akoko North East', 'Akoko North West'].map((name) => [normalizePlace(name), 'Derived Savanna'])) as Record<string, NigeriaFarmingZone> },
  Edo: { defaultZone: 'Humid Forest', requiresLocalArea: true, overrides: Object.fromEntries(['Owan West', 'Akoko Edo', 'Etsako East', 'Etsako Central', 'Etsako West'].map((name) => [normalizePlace(name), 'Derived Savanna'])) as Record<string, NigeriaFarmingZone> },
  Delta: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  Bayelsa: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  Rivers: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  Anambra: { defaultZone: 'Humid Forest', requiresLocalArea: true, overrides: { aghamelum: 'Derived Savanna' } },
  Imo: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  Ebonyi: { defaultZone: 'Humid Forest', requiresLocalArea: true, overrides: { izzi: 'Derived Savanna', ishielu: 'Derived Savanna', ohaukwu: 'Derived Savanna' } },
  Abia: { defaultZone: 'Humid Forest', requiresLocalArea: false },
  'Akwa Ibom': { defaultZone: 'Humid Forest', requiresLocalArea: false },
  'Cross River': { defaultZone: 'Humid Forest', requiresLocalArea: true, overrides: Object.fromEntries(['Yala', 'Ogoja', 'Obudu', 'Bekwarra', 'Obanliku'].map((name) => [normalizePlace(name), 'Derived Savanna'])) as Record<string, NigeriaFarmingZone> },
};

const stateAliases: Record<string, string> = {
  'akwa ibom state': 'Akwa Ibom',
  'akwa ibom nigeria': 'Akwa Ibom',
  'cross river state': 'Cross River',
  'cross river nigeria': 'Cross River',
  'fct': 'Federal Capital Territory',
  'abuja': 'Federal Capital Territory',
  'abuja federal capital territory': 'Federal Capital Territory',
  'federal capital territory abuja': 'Federal Capital Territory',
};

export function resolveNigeriaState(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizePlace(value);
  const direct = Object.keys(stateZoneRules).find((state) => normalizePlace(state) === normalized);
  return direct ?? stateAliases[normalized] ?? null;
}

export function getNigeriaFarmingZone(stateValue: unknown, localAreaValue?: unknown): NigeriaFarmingZone | null {
  const state = resolveNigeriaState(stateValue);
  if (!state) return null;
  const rule = stateZoneRules[state];
  if (!rule) return null;
  if (!rule.requiresLocalArea) return rule.defaultZone;
  if (typeof localAreaValue !== 'string' || !localAreaValue.trim()) return null;
  const localArea = normalizePlace(localAreaValue);
  const explicitZone = rule.overrides?.[localArea];
  if (explicitZone) return explicitZone;
  // The reverse-geocoder's state-level administrative subdivision is needed for mixed states.
  return rule.defaultZone;
}

export function getNigeriaFarmingLocation(stateValue: unknown, localAreaValue?: unknown) {
  const state = resolveNigeriaState(stateValue);
  const zone = getNigeriaFarmingZone(state, localAreaValue);
  if (!state || !zone) return null;
  return { state, zone };
}

export function matchManualFarmingLocation(value: string) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const state = resolveNigeriaState(parts.at(-1));
  if (!state) return null;
  const localArea = parts.length > 1 ? parts.at(-2) : undefined;
  const zone = getNigeriaFarmingZone(state, localArea);
  return zone ? { state, ...(localArea ? { localArea } : {}), zone } : null;
}
