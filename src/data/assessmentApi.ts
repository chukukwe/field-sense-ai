import type { CropAssessment, CropType } from '../types.js';

export class AssessmentRequestError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, code: string, retryable: boolean, status?: number) {
    super(message);
    this.name = 'AssessmentRequestError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

// Allow the backend provider budget (200 seconds), plus upload and persistence time.
export const ASSESSMENT_REQUEST_TIMEOUT_MS = 240_000;

export async function requestCropAssessment(input: {
  image: Blob;
  cropType: CropType;
  customCropName?: string;
  observations: string;
  scanId: string;
  idToken: string;
}, fetcher: typeof fetch = fetch): Promise<CropAssessment> {
  const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const form = new FormData();
  form.append('image', input.image, 'crop-photo');
  form.append('cropType', input.cropType);
  if (input.customCropName) form.append('customCropName', input.customCropName.trim());
  form.append('observations', input.observations);
  form.append('scanId', input.scanId);

  const controller = new AbortController();
  const timeoutError = () => new AssessmentRequestError(
    'The crop check took too long. Your scan is saved. Open it from history to check or try again later.',
    'ASSESSMENT_TIMEOUT', true, 408,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, ASSESSMENT_REQUEST_TIMEOUT_MS);
  });
  const submit = async (): Promise<CropAssessment> => {
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/api/analyze-crop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${input.idToken}` },
        body: form,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) throw timeoutError();
      throw new AssessmentRequestError('Could not reach the crop check service. Check your connection and try again.', 'NETWORK_ERROR', true);
    }

    const body: unknown = await response.json().catch(() => null);
    if (controller.signal.aborted) throw timeoutError();
    if (!response.ok) {
      const rawError = typeof body === 'object' && body !== null && 'error' in body ? body.error : null;
      const error = typeof rawError === 'object' && rawError !== null
        ? rawError as { message?: unknown; code?: unknown; retryable?: unknown }
        : null;
      const message = typeof error?.message === 'string'
        ? error.message
        : response.status === 408 || response.status === 504
          ? 'The crop check took too long. Your scan is saved. Try again later.'
          : response.status === 429
            ? 'The crop check is busy right now. Wait a little, then try again.'
            : response.status === 503
              ? 'The crop check is not available right now. Your scan is saved. Try again later.'
              : 'The crop check could not finish. Try again later.';
      const code = typeof error?.code === 'string'
        ? error.code
        : response.status === 408 || response.status === 504
          ? 'ASSESSMENT_TIMEOUT'
          : response.status === 429
            ? 'RATE_LIMITED'
            : response.status === 503
              ? 'ASSESSMENT_UNAVAILABLE'
              : 'ASSESSMENT_FAILED';
      const retryable = error && 'retryable' in error
        ? error.retryable === true
        : response.status === 408 || response.status === 429 || response.status === 503 || response.status === 504;
      throw new AssessmentRequestError(message, code, retryable, response.status);
    }

    if (typeof body !== 'object' || body === null || !('assessment' in body)) {
      throw new AssessmentRequestError('The crop check returned an incomplete result. Try again.', 'INVALID_RESPONSE', true);
    }
    if (!isCropAssessment(body.assessment)) {
      throw new AssessmentRequestError('The crop check result could not be checked. Try again.', 'INVALID_RESPONSE', true);
    }
    return body.assessment;
  };
  try {
    // Covers response-body stalls as well as an upload or connection that hangs.
    return await Promise.race([submit(), deadline]);
  } finally {
    clearTimeout(timer);
  }
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
