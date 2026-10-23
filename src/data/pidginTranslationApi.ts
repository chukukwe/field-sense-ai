import type { CropAssessment } from '../types.js';

const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function translateAssessmentToPidgin(assessment: CropAssessment, idToken: string, fetcher: typeof fetch = fetch): Promise<CropAssessment> {
  let response: Response;
  try {
    response = await fetcher(`${apiBase}/api/assessment/translate-pidgin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new Error('Pidgin translation is not available right now. Your English result is still here.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(body) || !isAssessment(body.assessment)) {
    throw new Error(isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message : 'Pidgin translation could not be loaded. Your English result is still here.');
  }
  return body.assessment;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAssessment(value: unknown): value is CropAssessment {
  return isRecord(value) && ['completed', 'inconclusive'].includes(String(value.status))
    && ['Cassava', 'Plantain', 'Maize', 'Vegetables', 'Other', 'unknown'].includes(String(value.cropIdentification))
    && ['low', 'moderate', 'high'].includes(String(value.confidence))
    && Array.isArray(value.possibleCauses) && value.possibleCauses.every((item) => isRecord(item)
      && typeof item.name === 'string' && typeof item.explanation === 'string'
      && ['possible', 'more_likely', 'uncertain'].includes(String(item.likelihood)))
    && typeof value.summary === 'string' && typeof value.confidenceReason === 'string'
    && Array.isArray(value.observedSymptoms) && value.observedSymptoms.every((item) => typeof item === 'string')
    && Array.isArray(value.recommendedActions) && value.recommendedActions.every((item) => typeof item === 'string')
    && Array.isArray(value.preventionTips) && value.preventionTips.every((item) => typeof item === 'string')
    && typeof value.whenToSeekHelp === 'string'
    && Array.isArray(value.limitations) && value.limitations.every((item) => typeof item === 'string')
    && typeof value.disclaimer === 'string';
}
