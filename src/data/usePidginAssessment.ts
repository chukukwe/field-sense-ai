import { useEffect, useState } from 'react';
import type { CropAssessment } from '../types.js';
import { translateAssessmentToPidgin } from './pidginTranslationApi.js';
import { useAuth } from '../context/useAuth.js';

const translationCache = new Map<string, CropAssessment>();

export function usePidginAssessment(key: string | undefined, source: CropAssessment | undefined) {
  const { user } = useAuth();
  // A translation belongs to a user and the exact English assessment, not just
  // a scan ID: a retry can replace that assessment and accounts can change.
  const cacheKey = user && key && source ? JSON.stringify([user.uid, key, source]) : '';
  const [language, setLanguage] = useState<'english' | 'pidgin'>('english');
  const [result, setResult] = useState<{ key: string; value: CropAssessment } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const translated = result?.key === cacheKey ? result.value : translationCache.get(cacheKey);
  const error = failure?.key === cacheKey ? failure.message : '';
  const loading = language === 'pidgin' && Boolean(cacheKey && !translated && !error);

  useEffect(() => {
    const controller = new AbortController();
    if (language !== 'pidgin' || !cacheKey || !source || !user || translationCache.has(cacheKey)) return () => controller.abort();
    void (async () => {
      const idToken = await user.getIdToken();
      if (controller.signal.aborted) return;
      const value = await translateAssessmentToPidgin(source, idToken, fetch, controller.signal);
      if (controller.signal.aborted) return;
      if (translationCache.size >= 40) translationCache.delete(translationCache.keys().next().value!);
      translationCache.set(cacheKey, value);
      setResult({ key: cacheKey, value });
    })().catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key: cacheKey, message: reason instanceof Error ? reason.message : 'Pidgin translation is unavailable.' });
    });
    return () => controller.abort();
    // cacheKey contains the source and user identity; user object changes alone
    // must not cancel an otherwise identical request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, language, attempt]);

  const retry = () => { if (loading) return; setFailure(null); setAttempt((value) => value + 1); };
  const changeLanguage = (next: 'english' | 'pidgin') => {
    if (next === 'pidgin' && language === 'pidgin') { retry(); return; }
    setFailure(null); setLanguage(next);
  };
  return { language, setLanguage: changeLanguage, retry, translated, display: language === 'pidgin' && translated ? translated : source, loading,
    error: language === 'pidgin' && !user && source ? 'Sign in again to translate this result.' : error };
}
