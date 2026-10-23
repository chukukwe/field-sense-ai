import type { CropAssessment } from '../types';

export function simpleConfidence(value: CropAssessment['confidence']): string {
  if (value === 'moderate') return 'Somewhat sure';
  return value === 'high' ? 'More sure' : 'Not sure yet';
}

export function simpleLikelihood(value: CropAssessment['possibleCauses'][number]['likelihood']): string {
  if (value === 'more_likely') return 'More likely';
  if (value === 'uncertain') return 'Not clear yet';
  return 'Could be';
}
