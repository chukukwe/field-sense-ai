export interface SeasonalRainfallRecord {
  state: string; lga: string; year: number;
  onset?: string; cessation?: string; lengthOfSeason?: number; annualRainfall?: number;
}
export type SeasonalRainfallResult = (
  | { status: 'available'; record: SeasonalRainfallRecord }
  | { status: 'no_record'; state: string; lga: string; year: number }
) & { fetchedAt: string };
