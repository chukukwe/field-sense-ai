import { useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { fetchSeasonalRainfall } from '../../data/seasonalRainfallApi';
import type { SeasonalRainfallResult } from '../../../shared/seasonalRainfall';

export function FarmGuideRainfall({ stateId, lgaId, areaName }: { stateId: number; lgaId: number; areaName: string }) {
  const { user } = useAuth();
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date()));
  const [result, setResult] = useState<SeasonalRainfallResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setStatus('loading');
    if (!user) { setStatus('error'); return () => controller.abort(); }
    void (async () => {
      const idToken = await user.getIdToken();
      if (controller.signal.aborted) return;
      const data = await fetchSeasonalRainfall({ stateId, lgaId, year, idToken, signal: controller.signal });
      if (!controller.signal.aborted) { setResult(data); setStatus('ready'); }
    })().catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [stateId, lgaId, year, retry, user]);
  const record = result?.status === 'available' ? result.record : null;
  return <section className="rounded-2xl border border-[#235840] bg-[#19392B] p-4" aria-label="NiMet seasonal rainfall outlook" aria-live="polite">
    <h2 className="text-sm font-bold text-white">NiMet seasonal outlook · {year}</h2>
    <p className="mt-1 text-xs text-[#A7F3D0]">{areaName}</p>
    {status === 'loading' && <p className="mt-3 text-xs text-[#D1D5DB]" role="status">Loading the seasonal rainfall outlook…</p>}
    {status === 'error' && <><p className="mt-3 text-xs text-[#D1D5DB]">The seasonal outlook could not be loaded. Your crop guide is still available below.</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 rounded-xl bg-[#176B45] px-4 text-xs font-semibold text-white">Retry outlook</button></>}
    {result?.status === 'no_record' && <p className="mt-3 text-xs text-[#D1D5DB]">NiMet has no matching {year} record for this area. We have not substituted another area or year.</p>}
    {record && <dl className="mt-4 grid grid-cols-2 gap-4">{[
      ['Predicted rain onset', record.onset ?? 'Not provided'], ['Predicted season end', record.cessation ?? 'Not provided'],
      ['Growing season length', record.lengthOfSeason !== undefined ? `${record.lengthOfSeason} days` : 'Not provided'],
      ['Predicted annual rainfall', record.annualRainfall !== undefined ? `${record.annualRainfall.toLocaleString()} mm` : 'Not provided'],
    ].map(([label, value]) => <div key={label}><dt className="text-[11px] text-[#B4C5BA]">{label}</dt><dd className="mt-1 text-sm font-semibold text-white">{value}</dd></div>)}</dl>}
    {result && <p className="mt-3 text-[10px] text-[#B4C5BA]">Source: NiMet seasonal rainfall API. Retrieved {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(result.fetchedAt))}. The service caches data for up to 12 hours.</p>}
    <p className="mt-3 text-[11px] leading-relaxed text-[#C6D2CA]">This is a seasonal prediction for {year}, not today’s weather or observed rainfall. Check field conditions before planting. It does not verify the draft crop calendar.</p>
  </section>;
}
