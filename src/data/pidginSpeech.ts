// Most devices do not ship a pcm voice. Read the actual Pidgin text using a
// Nigerian English or another English voice and disclose the fallback.
export function choosePidginVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => /^pcm(?:-|$)/i.test(voice.lang) || /pidgin/i.test(voice.name))
    ?? voices.find((voice) => /^en-NG$/i.test(voice.lang))
    ?? voices.find((voice) => /^en(?:-|$)/i.test(voice.lang));
}
export function isDedicatedPidginVoice(voice: SpeechSynthesisVoice | undefined) {
  return Boolean(voice && (/^pcm(?:-|$)/i.test(voice.lang) || /pidgin/i.test(voice.name)));
}
