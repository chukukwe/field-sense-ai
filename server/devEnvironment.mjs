/** Only Gemini settings may fall back to the canonical local server config. */
export function selectDevGeminiSettings(devConfig, canonicalConfig) {
  const settings = {};
  for (const key of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
    // An explicitly empty dev setting disables that setting; it is not absent.
    if (Object.hasOwn(devConfig, key)) settings[key] = devConfig[key];
    else if (Object.hasOwn(canonicalConfig, key)) settings[key] = canonicalConfig[key];
  }
  return settings;
}
