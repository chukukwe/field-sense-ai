import { useEffect, useState } from 'react';
import type { CropAssessment } from '../types.js';
import { translateAssessmentToPidgin } from './pidginTranslationApi.js';
import { useAuth } from '../context/useAuth.js';

const translationCache = new Map<string, CropAssessment>();

export function usePidginAssessment(key: string | undefined, source: CropAssessment | undefined) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<'english' | 'pidgin'>('english');
  const [result, setResult] = useState<{ key: string; value: CropAssessment } | null>(() => key && translationCache.has(key)
    ? { key, value: translationCache.get(key)! } : null);
  const translated = result && result.key === key ? result.value : key ? translationCache.get(key) : undefined;
  const [error, setError] = useState('');
  const loading = language === 'pidgin' && Boolean(key && source && user && !translated && !error);

  useEffect(() => {
    let active = true;
    if (language !== 'pidgin' || !key || !source || translationCache.has(key)) {
      return () => { active = false; };
    }
    if (!user) return () => { active = false; };
    void user.getIdToken().then((idToken) => translateAssessmentToPidgin(source, idToken)).then((value) => {
      if (!active) return;
      translationCache.set(key, value);
      setResult({ key, value });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Pidgin translation is unavailable. Your English result is still here.');
    });
    return () => { active = false; };
  }, [key, language, source, user]);

  const changeLanguage = (next: 'english' | 'pidgin') => { setError(''); setLanguage(next); };

  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  return { language, setLanguage: changeLanguage, translated, display: language === 'pidgin' && translated ? translated : source, loading, error: language === 'pidgin' && !user && source ? 'Sign in again to translate this result.' : error };
}
