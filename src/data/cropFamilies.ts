import type { CropType } from '../types.js';

export const cropOptions: Array<{ type: CropType; label: string; family: string; localName: string }> = [
  { type: 'Cassava', label: 'Cassava', family: 'Euphorbiaceae family', localName: 'Akpu / Iwa' },
  { type: 'Plantain', label: 'Plantain', family: 'Musaceae family', localName: 'Plantain' },
  { type: 'Maize', label: 'Maize', family: 'Grass family (Poaceae)', localName: 'Corn / Ibokpot' },
  { type: 'Vegetables', label: 'Vegetables', family: 'Several plant families', localName: 'Ugwu / Waterleaf' },
  { type: 'Other', label: 'Others', family: 'Depends on the crop', localName: 'Name your crop' },
];

export function normalizeCustomCropName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80 || /[<>]/.test(name) || [...name].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  return name;
}

export type CropSelectionError = 'crop-required' | 'custom-name-required' | 'custom-name-invalid';

export function validateCropSelection(cropType: CropType | null, customCropName: string): CropSelectionError | null {
  if (!cropType) return 'crop-required';
  if (cropType !== 'Other') return null;
  if (!customCropName.trim()) return 'custom-name-required';
  return normalizeCustomCropName(customCropName) ? null : 'custom-name-invalid';
}
