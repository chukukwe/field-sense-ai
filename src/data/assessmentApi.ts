import type { CropAssessment, CropType } from '../types.js';

export class AssessmentRequestError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'AssessmentRequestError';
    this.code = code;
    this.retryable = retryable;
  }
}

export async function requestCropAssessment(input: {
  image: Blob;
  cropType: CropType;
  observations: string;
  scanId: string;
  idToken: string;
}, fetcher: typeof fetch = fetch): Promise<CropAssessment> {
  const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const form = new FormData();
  form.append('image', input.image, 'crop-photo');
  form.append('cropType', input.cropType);
  form.append('observations', input.observations);
  form.append('scanId', input.scanId);

  let response: Response;
  try {
    response = await fetcher(`${baseUrl}/api/analyze-crop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.idToken}` },
      body: form,
    });
  } catch {
    throw new AssessmentRequestError('Could not reach the assessment service. Check your connection and try again.', 'NETWORK_ERROR', true);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof body === 'object' && body !== null && 'error' in body ? body.error : null;
    const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'The assessment service could not complete this request.';
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'ASSESSMENT_FAILED';
    const retryable = typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true;
    throw new AssessmentRequestError(message, code, retryable);
  }

  if (typeof body !== 'object' || body === null || !('assessment' in body)) {
    throw new AssessmentRequestError('The assessment response was incomplete. You can retry this scan.', 'INVALID_RESPONSE', true);
  }
  if (!isCropAssessment(body.assessment)) {
    throw new AssessmentRequestError('The assessment response could not be validated. You can retry this scan.', 'INVALID_RESPONSE', true);
  }
  return body.assessment;
}

function isCropAssessment(value: unknown): value is CropAssessment {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  const text = (key: string) => typeof result[key] === 'string' && result[key].length > 0;
  const stringList = (key: string) => Array.isArray(result[key]) && result[key].every((item) => typeof item === 'string');
  if (result.status !== 'completed' && result.status !== 'inconclusive') return false;
  if (result.cropIdentification !== 'unknown' && !['Cassava', 'Plantain', 'Maize', 'Vegetables', 'Other'].includes(String(result.cropIdentification))) return false;
  if (!['low', 'moderate', 'high'].includes(String(result.confidence))) return false;
  if (!text('confidenceReason') || !text('summary') || !text('whenToSeekHelp') || !text('disclaimer')) return false;
  if (!stringList('observedSymptoms') || !stringList('recommendedActions') || !stringList('preventionTips') || !stringList('limitations')) return false;
  if (!Array.isArray(result.possibleCauses)) return false;
  return result.possibleCauses.every((cause) => {
    if (typeof cause !== 'object' || cause === null) return false;
    const item = cause as Record<string, unknown>;
    return typeof item.name === 'string' && typeof item.explanation === 'string'
      && ['possible', 'more_likely', 'uncertain'].includes(String(item.likelihood));
  });
}
