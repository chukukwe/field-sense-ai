import type { CropAssessment } from '../types';

export function simpleConfidence(value: CropAssessment['confidence']): string {
  if (value === 'moderate') return 'Medium';
  return value === 'high' ? 'High' : 'Low';
}

export function simpleLikelihood(value: CropAssessment['possibleCauses'][number]['likelihood']): string {
  if (value === 'more_likely') return 'More likely';
  if (value === 'uncertain') return 'Not clear yet';
  return 'Could be';
}
