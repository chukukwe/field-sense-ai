import { farmGuideData, getFarmGuideLocation } from './farmGuideData';

const STORAGE_KEY = 'farmpal-farm-guide-location';

export interface FarmGuideLocationSelection {
  stateId: number;
  lgaId: number;
}

export function saveFarmGuideLocation(stateId: number, lgaId: number): void {
  const state = farmGuideData.states.find((item) => item.id === stateId);
  const lga = getFarmGuideLocation(lgaId);
  if (!state || !lga || lga.stateId !== state.id) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stateId, lgaId }));
  } catch {
    // Keep Farm Guide usable when browser storage is unavailable.
  }
}

export function getSavedFarmGuideLocation(): FarmGuideLocationSelection | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const selection = JSON.parse(stored) as Partial<FarmGuideLocationSelection>;
    const stateId = selection.stateId;
    const lgaId = selection.lgaId;
    if (!Number.isInteger(stateId) || !Number.isInteger(lgaId)) return null;

    const state = farmGuideData.states.find((item) => item.id === stateId);
    const lga = getFarmGuideLocation(lgaId as number);
    return state && lga?.stateId === state.id ? { stateId: state.id, lgaId: lga.id } : null;
  } catch {
    return null;
  }
}
