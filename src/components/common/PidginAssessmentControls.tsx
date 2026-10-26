import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { choosePidginVoice, isDedicatedPidginVoice } from '../../data/pidginSpeech';

export const PidginAssessmentControls: React.FC<{
  language: 'english' | 'pidgin'; onLanguageChange: (language: 'english' | 'pidgin') => void;
  onRetry?: () => void; loading?: boolean; error?: string; text?: string;
}> = ({ language, onLanguageChange, onRetry, loading = false, error = '', text = '' }) => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  const scope = JSON.stringify([language, text]);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [audioState, setAudioState] = useState<{ scope: string; phase: 'stopped' | 'playing' | 'paused'; message: string }>({scope,phase:'stopped',message:''});
  const playback = audioState.scope === scope ? audioState.phase : 'stopped';
  const voiceMessage = audioState.scope === scope ? audioState.message : '';
  const setPlayback = (phase: 'stopped' | 'playing' | 'paused') => setAudioState((old) => ({scope,phase,message:old.scope === scope ? old.message : ''}));
  const setVoiceMessage = (message: string) => setAudioState((old) => ({scope,phase:old.scope === scope ? old.phase : 'stopped',message}));

  useEffect(() => {
    currentUtterance.current = null;
    if (supported) window.speechSynthesis.cancel();
    return () => { currentUtterance.current = null; if (supported) window.speechSynthesis.cancel(); };
  }, [language, text, supported]);

  const speak = () => {
    if (!supported || !text) return;
    currentUtterance.current = null;
    window.speechSynthesis.cancel();
    const voice = choosePidginVoice(window.speechSynthesis.getVoices());
    const utterance = new window.SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'en-NG';
    utterance.rate = 0.9;
    currentUtterance.current = utterance;
    utterance.onstart = () => { if (currentUtterance.current === utterance) setPlayback('playing'); };
    utterance.onpause = () => { if (currentUtterance.current === utterance) setPlayback('paused'); };
    utterance.onresume = () => { if (currentUtterance.current === utterance) setPlayback('playing'); };
    utterance.onend = () => { if (currentUtterance.current === utterance) setPlayback('stopped'); };
    utterance.onerror = (event) => { if (currentUtterance.current !== utterance) return; setPlayback('stopped'); if (!['canceled','interrupted'].includes(event.error)) setVoiceMessage('Audio could not be played. Try Listen again or read the Pidgin text.'); };
    setVoiceMessage(isDedicatedPidginVoice(voice) ? '' : 'Your browser is reading the Pidgin text with an English voice. Pronunciation may vary.');
    // Speak directly from the tap so mobile browsers retain the user gesture.
    window.speechSynthesis.speak(utterance);
    setPlayback('playing');
  };
  const stop = () => { currentUtterance.current = null; if (supported) window.speechSynthesis.cancel(); setPlayback('stopped'); };
  return <div className="flex flex-col gap-2 rounded-xl border border-[#323633] bg-[#202321] p-3">
    <div className="flex gap-2" role="group" aria-label="Assessment language">
      {(['english','pidgin'] as const).map((value) => <button key={value} type="button" aria-pressed={language === value} onClick={() => {stop();onLanguageChange(value);}} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${language === value ? 'bg-[#176B45] text-white' : 'bg-[#292C2A] text-[#D1D5DB]'}`}>{value === 'english' ? 'English' : 'Nigerian Pidgin'}</button>)}
    </div>
    {language === 'pidgin' && <>
      {loading && <p role="status" className="text-xs text-[#D1D5DB]">Translating your result…</p>}
      {error && <><p role="alert" className="text-xs text-[#FFB4A8]">{error} Showing the English result.</p>{onRetry && <button type="button" onClick={onRetry} disabled={loading} className="rounded-lg bg-[#176B45] px-3 py-2 text-xs font-semibold text-white">Retry Pidgin translation</button>}</>}
      <div className="flex gap-2">
        <button type="button" onClick={() => playback === 'paused' ? window.speechSynthesis.resume() : playback === 'playing' ? window.speechSynthesis.pause() : speak()} disabled={!text || loading || !supported} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#292C2A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {playback === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playback === 'playing' ? 'Pause' : playback === 'paused' ? 'Resume' : 'Listen in Pidgin'}
        </button>
        <button type="button" onClick={stop} disabled={playback === 'stopped'} aria-label="Stop Pidgin speech" className="rounded-lg bg-[#292C2A] px-3 py-2 text-xs text-white disabled:opacity-50"><Square className="h-4 w-4" /></button>
      </div>
      {!supported && <p className="text-[11px] text-[#A1A7A3]">This browser cannot read text aloud. The written Pidgin translation is still available.</p>}
      {voiceMessage && <p role="status" className="text-[11px] text-[#A1A7A3]">{voiceMessage}</p>}
    </>}
  </div>;
};
