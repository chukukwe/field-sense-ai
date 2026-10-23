import type { CropType } from '../types.js';

export type SeasonGuideAreaId = 'eket-example' | 'kano-example';
export type SeasonGuidePeriod = 'rainy-example' | 'dry-example';

export interface SeasonGuideArea {
  id: SeasonGuideAreaId;
  name: string;
  crops: CropType[];
}

export interface SeasonGuideEntry {
  areaId: SeasonGuideAreaId;
  period: SeasonGuidePeriod;
  crop: CropType;
  headline: string;
  rainNote: string;
  plantingNote: string;
  nextStep: string;
  reminder: string;
}

export const seasonGuideAreas: SeasonGuideArea[] = [
  { id: 'eket-example', name: 'Eket, Akwa Ibom', crops: ['Cassava', 'Plantain', 'Maize', 'Vegetables'] },
  { id: 'kano-example', name: 'Kano', crops: ['Cassava', 'Maize', 'Vegetables'] },
];

const entries: SeasonGuideEntry[] = [
  { areaId: 'eket-example', period: 'rainy-example', crop: 'Cassava', headline: 'Get ready for planting', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Plant healthy stem pieces when the soil is moist and water can drain away.', nextStep: 'Clear the field and prepare the soil. Keep healthy stems ready.', reminder: 'Do not plant in flooded soil. Ask a local farm adviser about the best time for your area.' },
  { areaId: 'eket-example', period: 'rainy-example', crop: 'Plantain', headline: 'Prepare for a rainy period', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Choose healthy suckers and a place where extra water can drain away.', nextStep: 'Clear weeds around the planting area and check for standing water.', reminder: 'Too much standing water can harm roots. Check the field after heavy rain.' },
  { areaId: 'eket-example', period: 'rainy-example', crop: 'Maize', headline: 'Get the field ready', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Plant when rain has started and the soil is moist, not dry or flooded.', nextStep: 'Prepare clean seed and clear the field before planting.', reminder: 'Ask a local farm adviser about seed spacing and feeding your soil.' },
  { areaId: 'eket-example', period: 'rainy-example', crop: 'Vegetables', headline: 'Prepare a well-drained bed', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Use healthy seed or seedlings and avoid places where water stays.', nextStep: 'Clear weeds and make a small test bed first.', reminder: 'Check leaves often for new spots or holes. Ask for local advice before using a spray.' },
  { areaId: 'eket-example', period: 'dry-example', crop: 'Cassava', headline: 'Plan around water', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Wait for rain to settle in, or make sure you have enough water before planting.', nextStep: 'Prepare the field and keep healthy stem pieces ready.', reminder: 'Do not plant into dry soil if you cannot water the crop.' },
  { areaId: 'eket-example', period: 'dry-example', crop: 'Plantain', headline: 'Keep water in mind', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Plant only when you can keep the young plant watered.', nextStep: 'Clear weeds and keep plant roots covered with dry plant material.', reminder: 'Check young plants for wilting. Do not rely on this example as a local forecast.' },
  { areaId: 'eket-example', period: 'dry-example', crop: 'Maize', headline: 'Wait for enough water', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Wait until rain has started or a steady water supply is ready.', nextStep: 'Prepare the field and keep seed dry and safe.', reminder: 'Planting into dry soil can waste seed. Ask a local farm adviser about timing.' },
  { areaId: 'eket-example', period: 'dry-example', crop: 'Vegetables', headline: 'Check your water supply', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Choose a small bed you can water before planting more.', nextStep: 'Clear weeds and keep the soil covered to hold moisture.', reminder: 'Check soil moisture often. Water gently when the crop needs it.' },
  { areaId: 'kano-example', period: 'rainy-example', crop: 'Cassava', headline: 'Get ready for planting', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Plant healthy stem pieces when rain has started and the soil is moist.', nextStep: 'Prepare the field and keep clean stem pieces ready.', reminder: 'Ask a local farm adviser if the rain is steady enough for your area.' },
  { areaId: 'kano-example', period: 'rainy-example', crop: 'Maize', headline: 'Get the field ready', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Plant when rain has started and the soil is moist.', nextStep: 'Prepare clean seed and clear the field before planting.', reminder: 'Ask a local farm adviser about seed spacing and soil care.' },
  { areaId: 'kano-example', period: 'rainy-example', crop: 'Vegetables', headline: 'Start with a small bed', rainNote: 'This example is set in a rainy period. It is not a forecast.', plantingNote: 'Use healthy seed or seedlings when the soil is moist.', nextStep: 'Prepare a small bed and clear weeds around it.', reminder: 'Check leaves for new spots or holes. Ask for local advice before using a spray.' },
  { areaId: 'kano-example', period: 'dry-example', crop: 'Cassava', headline: 'Wait for enough water', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Wait for rain to start or make sure you can water the new plants.', nextStep: 'Prepare the field and keep healthy stem pieces ready.', reminder: 'Do not plant into dry soil without a reliable water supply.' },
  { areaId: 'kano-example', period: 'dry-example', crop: 'Maize', headline: 'Plan before planting', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Wait until rain has started or a steady water supply is ready.', nextStep: 'Keep seed dry and prepare the field before rain.', reminder: 'Ask a local farm adviser about timing for your area.' },
  { areaId: 'kano-example', period: 'dry-example', crop: 'Vegetables', headline: 'Check your water supply', rainNote: 'This example is set in a drier period. It is not a forecast.', plantingNote: 'Start with a small bed that you can water.', nextStep: 'Keep weeds down and cover bare soil to help hold moisture.', reminder: 'Check the soil often. Water gently when the crop needs it.' },
];

export function getSeasonGuideEntry(areaId: SeasonGuideAreaId, period: SeasonGuidePeriod, crop: CropType): SeasonGuideEntry | undefined {
  return entries.find((entry) => entry.areaId === areaId && entry.period === period && entry.crop === crop);
}
