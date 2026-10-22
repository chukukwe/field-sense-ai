import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CloudRain, Leaf, LoaderCircle, MapPin, RefreshCw, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { useAuth } from '../context/useAuth';
import { forecastCoverage, requestEketForecast, type WeatherForecast } from '../data/seasonSense';
import {
  getRecommendationEvidenceGap,
  getSeasonRecommendations,
  matchSupportedLocation,
  seasonSenseSources,
  type CropRecommendation,
} from '../data/seasonRecommendations';

type Screen = 'location' | 'loading' | 'recommendations' | 'details';

function lagosToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function monthLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
    .format(new Date(Date.UTC(year!, month! - 1, day!)));
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' })
    .format(new Date(Date.UTC(year!, month! - 1, day!)));
}

export const SeasonSenseScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('location');
  const [location, setLocation] = useState('Eket, Akwa Ibom, Nigeria');
  const [locationError, setLocationError] = useState('');
  const [locationLabel, setLocationLabel] = useState('Eket, Akwa Ibom');
  const [today, setToday] = useState(lagosToday);
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  const evidenceGap = useMemo(() => getRecommendationEvidenceGap(today), [today]);

  const loadWeather = async () => {
    if (!user) {
      setWeatherError('Sign in again to request the short-term weather outlook.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError('');
    try {
      setForecast(await requestEketForecast(await user.getIdToken()));
    } catch {
      setForecast(null);
      setWeatherError('Current weather is unavailable. Seasonal guidance is still shown above and does not depend on a forecast.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const discover = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocationError('');
    if (!location.trim()) {
      setLocationError('Enter a town or LGA and state to continue.');
      return;
    }
    const matched = matchSupportedLocation(location);
    if (!matched) {
      setLocationError('SeasonSense currently has sourced recommendations and weather coverage for Eket, Akwa Ibom only. This location has not been verified or matched to another profile.');
      return;
    }

    setLocationLabel(matched.label);
    setToday(lagosToday());
    setForecast(null);
    setWeatherError('');
    setScreen('loading');
    window.setTimeout(() => {
      const result = getSeasonRecommendations(matched.id, lagosToday());
      if (result.status === 'ready') {
        setToday(result.date);
        setRecommendations(result.recommendations);
      } else {
        setRecommendations([]);
      }
      setScreen('recommendations');
      void loadWeather();
    }, 0);
  };

  const returnToLocation = () => {
    setScreen('location');
    setSelectedCrop(null);
    setWeatherError('');
  };

  const refreshRecommendations = () => {
    const currentDate = lagosToday();
    const result = getSeasonRecommendations('eket', currentDate);
    setToday(currentDate);
    setRecommendations(result.status === 'ready' ? result.recommendations : []);
  };

  const activeForecastCoverage = forecast ? forecastCoverage(forecast) : null;

  return (
    <div className="flex flex-col pb-2">
      <TopHeader
        variant="detail"
        title="SeasonSense AI"
        onBack={screen === 'location' ? () => navigate('/') : screen === 'details' ? () => setScreen('recommendations') : returnToLocation}
      />

      <main className="flex flex-col gap-4 px-4">
        {screen === 'location' && (
          <>
            <section className="rounded-2xl border border-[#235840] bg-[#1B4733] p-5 shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#234A38] text-[#A7F3D0]">
                <Sprout className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">What should you plant this season?</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/80">Explore crop choices against published Nigerian agricultural guidance for your location and the time of year.</p>
            </section>

            <form onSubmit={discover} className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <label htmlFor="season-location" className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin className="h-4 w-4 text-[#22C55E]" aria-hidden="true" /> Your location
              </label>
              <input
                id="season-location"
                name="location"
                type="text"
                value={location}
                onChange={(event) => { setLocation(event.target.value); setLocationError(''); }}
                autoComplete="address-level2"
                aria-describedby="location-help location-error"
                className="mt-3 min-h-12 w-full rounded-xl border border-[#444A45] bg-[#202321] px-3 text-sm text-white outline-none placeholder:text-[#777D78] focus:border-[#22C55E]"
                placeholder="Town or LGA, State, Nigeria"
              />
              <p id="location-help" className="mt-2 text-[11px] leading-relaxed text-[#A1A7A3]">Enter a town or LGA with its state. Eket, Akwa Ibom is prefilled for this MVP.</p>
              {locationError && <p id="location-error" role="alert" className="mt-3 rounded-xl border border-[#70403B] bg-[#382321] p-3 text-xs leading-relaxed text-[#FCA5A5]">{locationError}</p>}
              <button type="submit" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B45] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1eb968] active:scale-[0.98]">
                <Leaf className="h-4 w-4" aria-hidden="true" /> Discover suitable crops
              </button>
            </form>

            <div className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">How location matching works</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">The current version recognizes Eket, Akwa Ibom. It matches the place name to a configured profile; it does not use GPS or geocode your location. Other locations are not treated as verified.</p>
            </div>
          </>
        )}

        {screen === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-[#323633] bg-[#292C2A] p-6 text-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-[#22C55E]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-white">Checking sourced crop guidance…</p>
          </div>
        )}

        {screen === 'recommendations' && (
          <>
            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Location profile</p>
                  <h1 className="mt-1 flex items-center gap-1.5 text-base font-bold text-white"><MapPin className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />{locationLabel}</h1>
                  <p className="mt-1 text-xs text-[#A1A7A3]">Seasonal guidance for {monthLabel(today)}</p>
                </div>
                <button type="button" onClick={returnToLocation} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">Change location</button>
              </div>
              <p className="mt-3 rounded-xl bg-[#202321] p-3 text-[11px] leading-relaxed text-[#D1D5DB]">Place-name match only; no GPS or geocoding verification. Crop choices come from cited seasonal guidance. Short-term weather is displayed separately and is not used as proof of crop suitability.</p>
            </section>

            {recommendations.length > 0 ? (
              <section aria-labelledby="recommendation-heading" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 id="recommendation-heading" className="text-sm font-bold text-white">Potential seasonal matches</h2>
                  <span className="rounded-full bg-[#1F2B25] px-2.5 py-1 text-[10px] font-semibold text-[#BBF7D0]">Source-based</span>
                </div>
                <p className="px-1 text-xs leading-relaxed text-[#A1A7A3]">These are candidates whose published planting windows include this date. Check actual rain, soil, variety, and local extension advice before planting.</p>
                {recommendations.map((crop) => (
                  <article key={crop.id} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A] shadow-sm">
                    <div className="flex items-center gap-3 p-4">
                      <img src={crop.image} alt={`${crop.name} crop`} className="h-16 w-16 shrink-0 rounded-xl bg-[#181B19] object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">{crop.name}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#D1D5DB]">{crop.summary}</p>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-[#22C55E]" aria-label="Matches a cited planting window" />
                    </div>
                    <div className="border-t border-[#3B403C] px-4 py-3">
                      <p className="text-[11px] font-semibold text-[#BBF7D0]">Source window: {crop.plantingWindow}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#A1A7A3]">{crop.windowNote}</p>
                      <button type="button" onClick={() => { setSelectedCrop(crop); setScreen('details'); }} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">
                        View crop details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section role="status" className="rounded-2xl border border-[#5C4A2F] bg-[#2B261E] p-4">
                <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-[#FBBF24]" aria-hidden="true" /><h2 className="text-sm font-bold text-white">No crop recommendation is supported for this date</h2></div>
                <p className="mt-2 text-xs leading-relaxed text-[#E5D5B7]">{evidenceGap}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#E5D5B7]">This means the configured sources do not support a recommendation here; it does not mean other crops cannot grow locally. Ask an agricultural extension worker for current local advice.</p>
                <button type="button" onClick={refreshRecommendations} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#FBBF24] hover:bg-[#382F22]"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Recheck this season</button>
              </section>
            )}

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <div className="flex items-center gap-2"><CloudRain className="h-4 w-4 text-[#60A5FA]" aria-hidden="true" /><h2 className="text-sm font-bold text-white">Short-term weather context</h2></div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#A1A7A3]">A seven-day forecast can add context, but it is not a seasonal outlook and does not determine crop suitability.</p>
              {weatherLoading && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[#D1D5DB]"><LoaderCircle className="h-4 w-4 animate-spin text-[#60A5FA]" aria-hidden="true" />Loading current forecast…</p>}
              {weatherError && <div role="status" className="mt-3 rounded-xl border border-[#5C3A1E] bg-[#2E2319] p-3 text-xs leading-relaxed text-[#F2D1AE]"><p>{weatherError}</p><button type="button" onClick={() => void loadWeather()} disabled={weatherLoading} className="mt-2 inline-flex min-h-9 items-center gap-1.5 font-semibold text-[#FBBF24] disabled:opacity-60"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry weather</button></div>}
              {!weatherLoading && !weatherError && !forecast && <button type="button" onClick={() => void loadWeather()} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#60A5FA] hover:bg-[#202321]"><CloudRain className="h-3.5 w-3.5" aria-hidden="true" /> Load short-term forecast</button>}
              {forecast && activeForecastCoverage && <>
                <p className="mt-3 text-[11px] text-[#A1A7A3]">Open-Meteo forecast coverage: {dateLabel(activeForecastCoverage.start)}{activeForecastCoverage.end !== activeForecastCoverage.start ? ` – ${dateLabel(activeForecastCoverage.end)}` : ''}. Retrieved {dateLabel(forecast.retrievedAt.slice(0, 10))}.</p>
                <div className="mt-2 divide-y divide-[#3B403C]">{forecast.forecastDays.map((day) => <div key={day.date} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs"><span className="font-semibold text-white">{dateLabel(day.date)}</span><span className="text-[#D1D5DB]">Rain {day.precipitationMm.toFixed(1)} mm{day.precipitationProbabilityPct !== undefined ? ` • ${Math.round(day.precipitationProbabilityPct)}% chance` : ''}</span><span className="text-[#D1D5DB]">{Math.round(day.temperatureMinC)}–{Math.round(day.temperatureMaxC)} °C</span></div>)}</div>
                <p className="mt-2 text-[10px] leading-relaxed text-[#A1A7A3]">Forecast observations only. They do not confirm field soil moisture, a season-long rainfall pattern, or crop suitability.</p>
              </>}
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Guidance we could not use as a current recommendation</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">Some sources provide general or incomplete timing information. They are shown here so gaps are clear, not used to make unsupported crop choices.</p>
              {[seasonSenseSources.okra, seasonSenseSources.yam, seasonSenseSources.nimet].map((source) => <div key={source.url} className="mt-3 border-t border-[#3B403C] pt-3"><a href={source.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#22C55E] hover:underline">{source.organization}: {source.title} ↗</a><p className="mt-1 text-[11px] leading-relaxed text-[#A1A7A3]">{source.limitation}</p></div>)}
            </section>
          </>
        )}

        {screen === 'details' && selectedCrop && (
          <>
            <article className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
              <img src={selectedCrop.image} alt={`${selectedCrop.name} crop`} className="h-40 w-full bg-[#181B19] object-cover" />
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Potential seasonal match • {locationLabel}</p>
                <h1 className="mt-1 text-xl font-bold text-white">{selectedCrop.name}</h1>
                <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{selectedCrop.why}</p>
              </div>
            </article>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Planting-window guidance</h2>
              <p className="mt-2 text-xs font-semibold text-[#BBF7D0]">{selectedCrop.plantingWindow}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{selectedCrop.windowNote}</p>
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Conditions to check</h2>
              <ul className="mt-3 space-y-2">{selectedCrop.considerations.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" />{item}</li>)}</ul>
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Practical guidance</h2>
              <ul className="mt-3 space-y-2">{selectedCrop.guidance.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22C55E]" aria-hidden="true" />{item}</li>)}</ul>
            </section>

            <section className="rounded-2xl border border-[#70403B] bg-[#382321] p-4">
              <h2 className="text-sm font-bold text-white">Risks and limits</h2>
              <ul className="mt-2 space-y-2">{selectedCrop.risks.map((item) => <li key={item} className="text-xs leading-relaxed text-[#F2D1CE]">• {item}</li>)}</ul>
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Sources</h2>
              {selectedCrop.sources.map((source) => <div key={source.url} className="mt-3 border-t border-[#3B403C] pt-3"><p className="text-[11px] font-semibold text-[#A1A7A3]">{source.organization}</p><a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs leading-relaxed text-[#22C55E] hover:underline">{source.title} ↗</a></div>)}
              <p className="mt-3 text-[10px] leading-relaxed text-[#A1A7A3]">SeasonSense summarizes published guidance; it does not verify your farm's soil, rainfall, seed variety, or local planting conditions.</p>
            </section>

            <button type="button" onClick={() => setScreen('recommendations')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#292C2A] text-sm font-semibold text-white hover:bg-[#383B39]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to recommendations</button>
          </>
        )}

        <p className="px-1 pb-2 text-[10px] leading-relaxed text-[#777D78]">SeasonSense provides general, source-attributed crop guidance. Confirm planting choices with local agricultural extension advice.</p>
      </main>
    </div>
  );
};
