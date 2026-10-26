// Published guidance, not agronomist approval or a forecast for a specific farm.
export interface ReviewedCalendarEntry {
  zoneId: number; cropId: number; month: number; activity: 'plant' | 'harvest';
  seasonLabel: string; status: 'source_reviewed'; source: string;
  sourceTitle: string; sourceLocator: string; window: string; conditions: string;
  reviewedOn: string;
}
const maize = 'https://www.iita.org/wp-content/uploads/2020/07/Guide-to-Maize-Production-in-Northern-Nigeria.pdf';
const humidMaize = 'https://nfhl.naerls.gov.ng/index.php?action=faq&cat=24&id=4&artlang=en';
const groundnut = 'https://mel.cgiar.org/reporting/downloadmelspace/hash/MePOgapv/v/1ab63739a9086328bd998eb2238ab4d5';
const rows: ReviewedCalendarEntry[] = [];
function add(zoneId: number, cropId: number, months: number[], window: string, source: string, sourceTitle: string, sourceLocator: string, conditions: string, seasonLabel = 'main_season') {
  for (const month of months) rows.push({ zoneId, cropId, month, activity: 'plant', seasonLabel, status: 'source_reviewed', source, sourceTitle, sourceLocator, window, conditions, reviewedOn: '2026-10-26' });
}
// Keep the source's partial-month wording. Never expand early/late weeks to a
// claim that the entire month is suitable.
add(6, 1, [7], 'First to second week of July', maize, 'IITA maize guide (2020)', 'Printed page 7, Planting date', 'Rain-fed northern maize. Wait for established rains and confirm a locally suitable variety.');
add(5, 1, [6,7], 'Last week of June to first week of July', maize, 'IITA maize guide (2020)', 'Printed page 7, Planting date', 'Rain-fed northern maize. Wait for established rains and confirm a locally suitable variety.');
add(4, 1, [5,6], 'Mid-May to second week of June', maize, 'IITA maize guide (2020)', 'Printed page 7, Planting date', 'Rain-fed northern maize. Wait for established rains and confirm a locally suitable variety.');
add(2, 1, [2,3], 'Late February through March', humidMaize, 'NAERLS maize guidance', 'SAMMAZ 63, Planting date; updated May 2024', 'For SAMMAZ 63 in the humid zone, first season. Confirm the variety and established rains.', 'first_season');
add(2, 1, [7,8], 'Late July through August', humidMaize, 'NAERLS maize guidance', 'SAMMAZ 63, Planting date; updated May 2024', 'For SAMMAZ 63 in the humid zone, second season. Confirm sufficient remaining rains and local variety suitability.', 'second_season');
add(7, 8, [7], 'Early July', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; page 10, Sowing date', 'Wet-season SAMNUT 24, 25 or 26. Plant only with adequate, consistent soil moisture.');
add(6, 8, [6,7], 'End of June to early July', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; page 10, Sowing date', 'Wet-season SAMNUT 24, 25 or 26. Plant only with adequate, consistent soil moisture.');
add(5, 8, [6], 'Mid- to end June', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; page 10, Sowing date', 'Wet-season SAMNUT 21, 22, 23 or 24. Plant only with adequate, consistent soil moisture.');
for (const zone of [3,4]) {
  add(zone, 8, [5], 'May (first planting)', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; page 10, Sowing date', 'Wet-season SAMNUT 10, 21 or 22. Check soil moisture and local suitability.', 'first_season');
  add(zone, 8, [7], 'End of July (second planting)', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; page 10, Sowing date', 'Wet-season SAMNUT 10, 21 or 22. Confirm enough remaining moisture for the crop.', 'second_season');
}
for (const zone of [2,3,4,5,6,7]) {
  add(zone, 8, [10], 'End of October', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; dry-season chapter', 'Irrigated SAMNUT 24, 25 or 26 only. Confirm dependable water and local suitability; Harmattan cold can harm establishment.', 'dry_season');
  add(zone, 8, [2], 'Early February', groundnut, 'ICRISAT groundnut guide (2015)', 'Printed page 3, Table 1; dry-season chapter', 'Irrigated SAMNUT 24, 25 or 26 only. Confirm dependable water and local suitability; do not infer suitability for cold highland sites.', 'dry_season');
}
export const reviewedCalendar: readonly ReviewedCalendarEntry[] = rows;
