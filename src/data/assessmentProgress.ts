export type AssessmentProgressPhase = 'preparing' | 'uploading' | 'analyzing' | 'complete';

/**
 * Advances an estimated UI percentage. This is deliberately not a provider
 * completion signal: active analysis is capped below 100 until validation
 * succeeds in the assessment API client.
 */
export function advanceEstimatedProgress(
  current: number,
  phase: Exclude<AssessmentProgressPhase, 'complete'>,
  elapsedMs: number,
): number {
  const stepMs = Math.max(0, Math.min(elapsedMs, 1_000));
  const normalized = Math.max(0, Math.min(current, 100));
  if (!stepMs) return normalized;

  if (phase === 'preparing') return Math.min(18, normalized + stepMs * 0.0035);
  if (phase === 'uploading') return Math.min(38, normalized + stepMs * 0.003);

  const rate = normalized < 72 ? 0.0018 : normalized < 88 ? 0.0004 : 0.00006;
  return Math.min(94, normalized + stepMs * rate);
}

export function getAssessmentProgressMessage(
  phase: AssessmentProgressPhase,
  analysisElapsedMs: number,
): string {
  if (phase === 'preparing') return 'Preparing your crop image…';
  if (phase === 'uploading') return 'Uploading crop image…';
  if (phase === 'complete') return 'Analysis complete';
  if (analysisElapsedMs >= 30_000) return 'This is taking a little longer than usual…';
  return 'AI is examining your crop…';
}
