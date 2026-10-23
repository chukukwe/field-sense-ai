import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceEstimatedProgress,
  getAssessmentProgressMessage,
  type AssessmentProgressPhase,
} from '../data/assessmentProgress';

const COMPLETION_MESSAGE_MS = 450;
const UPLOAD_STATUS_MS = 1_800;

export function useAssessmentProgress() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhaseState] = useState<AssessmentProgressPhase>('preparing');
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0);
  const progressRef = useRef(0);
  const activeRef = useRef(false);
  const phaseRef = useRef<AssessmentProgressPhase>('preparing');
  const phaseStartedAtRef = useRef(0);
  const analysisStartedAtRef = useRef<number | null>(null);
  const lastTickAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionResolverRef = useRef<(() => void) | null>(null);

  const clearIntervalTimer = useCallback(() => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimeoutRef.current !== null) clearTimeout(completionTimeoutRef.current);
    completionTimeoutRef.current = null;
    const resolve = completionResolverRef.current;
    completionResolverRef.current = null;
    resolve?.();
  }, []);

  const tickProgress = useCallback(() => {
    const tickAt = Date.now();
    const elapsed = Math.max(0, Math.min(tickAt - lastTickAtRef.current, 1_000));
    lastTickAtRef.current = tickAt;

    if (phaseRef.current === 'uploading' && tickAt - phaseStartedAtRef.current >= UPLOAD_STATUS_MS) {
      phaseRef.current = 'analyzing';
      phaseStartedAtRef.current = tickAt;
      analysisStartedAtRef.current = tickAt;
      setPhaseState('analyzing');
    }

    const currentPhase = phaseRef.current;
    if (currentPhase === 'complete') return;
    progressRef.current = advanceEstimatedProgress(progressRef.current, currentPhase, elapsed);
    setProgress(progressRef.current);
    if (analysisStartedAtRef.current !== null) {
      setAnalysisElapsedMs(Math.max(0, tickAt - analysisStartedAtRef.current));
    }
  }, []);

  const ensureProgressInterval = useCallback(() => {
    if (intervalRef.current !== null) return;
    lastTickAtRef.current = Date.now();
    intervalRef.current = setInterval(tickProgress, 250);
  }, [tickProgress]);

  const setPhase = useCallback((nextPhase: Exclude<AssessmentProgressPhase, 'complete'>) => {
    const now = Date.now();
    phaseRef.current = nextPhase;
    phaseStartedAtRef.current = now;
    if (nextPhase === 'analyzing' && analysisStartedAtRef.current === null) {
      analysisStartedAtRef.current = now;
    }
    setPhaseState(nextPhase);
  }, []);

  const start = useCallback(() => {
    clearIntervalTimer();
    clearCompletionTimer();
    const now = Date.now();
    progressRef.current = 0;
    phaseRef.current = 'preparing';
    phaseStartedAtRef.current = now;
    analysisStartedAtRef.current = null;
    lastTickAtRef.current = now;
    setProgress(0);
    setPhaseState('preparing');
    setAnalysisElapsedMs(0);
    activeRef.current = true;
    ensureProgressInterval();
  }, [clearCompletionTimer, clearIntervalTimer, ensureProgressInterval]);

  const resume = useCallback(() => {
    if (!activeRef.current || phaseRef.current === 'complete') return;
    ensureProgressInterval();
  }, [ensureProgressInterval]);

  const stop = useCallback(() => {
    clearIntervalTimer();
    activeRef.current = false;
  }, [clearIntervalTimer]);

  const complete = useCallback(() => {
    clearIntervalTimer();
    progressRef.current = 100;
    phaseRef.current = 'complete';
    activeRef.current = false;
    setProgress(100);
    setPhaseState('complete');
    return new Promise<void>((resolve) => {
      completionResolverRef.current = resolve;
      completionTimeoutRef.current = setTimeout(() => {
        completionTimeoutRef.current = null;
        completionResolverRef.current = null;
        resolve();
      }, COMPLETION_MESSAGE_MS);
    });
  }, [clearIntervalTimer]);

  useEffect(() => () => {
    clearIntervalTimer();
    clearCompletionTimer();
  }, [clearCompletionTimer, clearIntervalTimer]);

  return {
    progress,
    message: getAssessmentProgressMessage(phase, analysisElapsedMs),
    start,
    resume,
    setPhase,
    stop,
    complete,
  };
}
