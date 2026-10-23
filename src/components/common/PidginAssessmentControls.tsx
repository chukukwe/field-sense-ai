import React, { useEffect, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';

export const PidginAssessmentControls: React.FC<{
  language: 'english' | 'pidgin';
  onLanguageChange: (language: 'english' | 'pidgin') => void;
  loading?: boolean;
  error?: string;
  text?: string;
}> = ({ language, onLanguageChange, loading = false, error = '', text = '' }) => {
  const [voiceAvailable, setVoiceAvailable] = useState(() => 'speechSynthesis' in window
    && window.speechSynthesis.getVoices().some((voice) => /^(pcm|pdc)(-|$)/i.test(voice.lang) || /pidgin/i.test(voice.name)));
  const [playback, setPlayback] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [voiceMessage, setVoiceMessage] = useState('');

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const refresh = () => setVoiceAvailable(window.speechSynthesis.getVoices().some((voice) => /^(pcm|pdc)(-|$)/i.test(voice.lang) || /pidgin/i.test(voice.name)));
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speak = () => {
    if (!('speechSynthesis' in window) || !text || !voiceAvailable) {
      setVoiceMessage(voiceAvailable ? 'Speech is not supported by this browser.' : 'This browser does not have a Nigerian Pidgin voice. The written Pidgin version is available.');
      return;
    }
    window.speechSynthesis.cancel();
    const voice = window.speechSynthesis.getVoices().find((item) => /^(pcm|pdc)(-|$)/i.test(item.lang) || /pidgin/i.test(item.name));
    if (!voice) { setVoiceAvailable(false); setVoiceMessage('This browser does not have a Nigerian Pidgin voice. The written Pidgin version is available.'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onstart = () => { setPlayback('playing'); setVoiceMessage(''); };
    utterance.onpause = () => setPlayback('paused');
    utterance.onresume = () => setPlayback('playing');
    utterance.onend = () => setPlayback('stopped');
    utterance.onerror = () => { setPlayback('stopped'); setVoiceMessage('Audio could not be played. You can read the written Pidgin version.'); };
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setPlayback('stopped'); };
  const changeLanguage = (next: 'english' | 'pidgin') => { if (next === 'english') stop(); onLanguageChange(next); };

  return <div className="flex flex-col gap-2 rounded-xl border border-[#323633] bg-[#202321] p-3">
    <div className="flex gap-2" role="group" aria-label="Assessment language">
      <button type="button" aria-pressed={language === 'english'} onClick={() => changeLanguage('english')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${language === 'english' ? 'bg-[#176B45] text-white' : 'bg-[#292C2A] text-[#D1D5DB]'}`}>English</button>
      <button type="button" aria-pressed={language === 'pidgin'} onClick={() => changeLanguage('pidgin')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${language === 'pidgin' ? 'bg-[#176B45] text-white' : 'bg-[#292C2A] text-[#D1D5DB]'}`}>Nigerian Pidgin</button>
    </div>
    {language === 'pidgin' && <>
      {loading && <p role="status" className="text-xs text-[#D1D5DB]">Translating your result…</p>}
      {error && <p role="alert" className="text-xs text-[#FFB4A8]">{error} Showing the English result.</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => playback === 'paused' ? window.speechSynthesis.resume() : playback === 'playing' ? window.speechSynthesis.pause() : speak()} disabled={!text || loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#292C2A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {playback === 'playing' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playback === 'playing' ? 'Pause' : playback === 'paused' ? 'Resume' : 'Listen in Pidgin'}
        </button>
        <button type="button" onClick={stop} disabled={playback === 'stopped'} aria-label="Stop Pidgin speech" className="rounded-lg bg-[#292C2A] px-3 py-2 text-xs text-white disabled:opacity-50"><Square className="h-4 w-4" /></button>
      </div>
      {!voiceAvailable && <p className="text-[11px] text-[#A1A7A3]">A Nigerian Pidgin speech voice is not available in this browser. You can still read the translation.</p>}
      {voiceMessage && <p role="status" className="text-[11px] text-[#A1A7A3]">{voiceMessage}</p>}
    </>}
  </div>;
};
