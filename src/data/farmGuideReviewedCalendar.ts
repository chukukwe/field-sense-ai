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
// Cassava: the source distinguishes two rainy seasons from savannah onset.
// Limit the latter to Guinea savannas; do not infer suitability in arid/highland zones.
const cassava = 'https://www.iita.org/wp-content/uploads/2016/06/Growing_cassava_commercially_in_Nigeria_an_illustrated_guide.pdf';
add(2, 2, [4,5], 'April–May, at the start of the major rainy season', cassava, 'IITA: Growing cassava commercially in Nigeria', 'Printed page 8, Step 6', 'Only where two rainy seasons occur. Confirm a suitable local variety, moist well-drained soil and dependable rains for establishment.', 'first_season');
add(2, 2, [8], 'August, at the start of the minor rainy season', cassava, 'IITA: Growing cassava commercially in Nigeria', 'Printed page 8, Step 6', 'Only where two rainy seasons occur and enough rain remains for establishment. Confirm local suitability; avoid dry-season planting where rains end early or the water table is low.', 'second_season');
for (const zone of [4,5]) add(zone, 2, [5,6], 'May–June, at the start of the growing season', cassava, 'IITA: Growing cassava commercially in Nigeria', 'Printed page 8, Step 6', 'Conditional Guinea savanna guidance. Wait for dependable rains and moist, well-drained soil; confirm a locally suitable variety and sufficient establishment moisture.');

const soybean = 'https://www.iita.org/wp-content/uploads/2020/07/Guide-to-Soybean-Production-in-Northern-Nigeria..pdf';
add(4, 9, [6,7], 'Early June to early July', soybean, 'IITA soybean guide (2020, revised edition)', 'Printed page 7, Table 2', 'Rain-fed Southern Guinea savanna. Plant after rains are well established; confirm a locally suitable variety and enough remaining moisture.');
add(5, 9, [6,7], 'Mid-June to early July', soybean, 'IITA soybean guide (2020, revised edition)', 'Printed page 7, Table 2, Northern Guinea–Sudan row', 'Rain-fed Northern Guinea savanna. Plant after rains are well established; confirm a locally suitable variety and enough remaining moisture.');
add(6, 9, [7], 'First to second week of July', soybean, 'IITA soybean guide (2020, revised edition)', 'Printed page 7, Table 2, explicit Sudan savanna row', 'Rain-fed Sudan savanna. Use the source’s more specific Sudan window, after established rains; confirm variety suitability and remaining moisture.');

const cowpea = 'https://biblio.iita.org/documents/U20BkOmoiguiCowpeaNothomNodev.pdf-c0c4714c7c29354d2ee191210918d6c2.pdf';
// Restrict to the determinate early/medium branch, not every cowpea variety.
// Southern Guinea is held pending local review of the unusually late window.
add(7, 7, [6], '14–28 June', cowpea, 'IITA cowpea guide for northern Nigeria (2020)', 'Printed page 7, Table 1, determinate branch', 'Rain-fed, determinate early- or medium-maturing cowpea only. Confirm this growth habit and maturity with the seed supplier. Wait for established rains; ensure flowering has moisture and maturity falls in dry weather.');
add(6, 7, [6,7], '25 June–24 July', cowpea, 'IITA cowpea guide for northern Nigeria (2020)', 'Printed page 7, Table 1, determinate branch', 'Rain-fed, determinate early- or medium-maturing cowpea only. Confirm growth habit, local suitability and established rains; ensure flowering has moisture and maturity falls in dry weather.');
add(5, 7, [7,8], '25 July–8 August', cowpea, 'IITA cowpea guide for northern Nigeria (2020)', 'Printed page 7, Table 1, determinate branch', 'Rain-fed, determinate early- or medium-maturing cowpea only. Confirm growth habit, local suitability and established rains; ensure flowering has moisture and maturity falls in dry weather.');

export const reviewedCalendar: readonly ReviewedCalendarEntry[] = rows;
