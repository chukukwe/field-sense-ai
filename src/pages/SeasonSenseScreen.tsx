import React from 'react';
import { MapPin, Sprout } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import {
  farmGuideData,
  getFarmGuideLocation,
  getFarmGuideLocations,
  getFarmGuideZone,
} from '../data/farmGuideData';
import { saveFarmGuideLocation } from '../data/farmGuideLocationStorage';

export const SeasonSenseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateId = searchParams.get('stateId') ?? '';
  const lgaId = searchParams.get('lgaId') ?? '';
  const state = farmGuideData.states.find((item) => String(item.id) === stateId);
  const locations = state ? getFarmGuideLocations(state.id) : [];
  const selectedLga = lgaId ? getFarmGuideLocation(Number(lgaId)) : undefined;
  const validLga = state && selectedLga?.stateId === state.id ? selectedLga : undefined;
  const zone = validLga ? getFarmGuideZone(validLga.zoneId) : undefined;
  const canSeePlan = Boolean(state && validLga && zone);

  const chooseState = (nextStateId: string) => {
    setSearchParams(nextStateId ? { stateId: nextStateId } : {}, { replace: true });
  };
  const chooseLga = (nextLgaId: string) => {
    setSearchParams(nextLgaId ? { stateId, lgaId: nextLgaId } : { stateId }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <TopHeader variant="page" title="Farm Guide" subtitle="Choose your state and LGA to see your farming zone and crop calendar." />

      <main className="px-4 flex flex-col gap-4">
        <section className="rounded-2xl border border-[#235840] bg-[#1B4733] p-4">
          <div className="flex flex-col items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#A7F3D0]"><Sprout className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className="mt-1 text-lg font-bold leading-tight text-white">Plan for your area</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/80">Choose your state and local government area. Farm Guide shows a broad farming-zone estimate, draft seasonal windows and crop care notes. Confirm local conditions before planting.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4" aria-label="Choose your location">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-white">
              State
              <span className="relative mt-1.5 block">
                <select
                  value={stateId}
                  onChange={(event) => chooseState(event.target.value)}
                  className="farm-guide-select w-full appearance-none rounded-xl border border-[#3B423E] bg-[#181B19] py-3 pl-3 pr-12 text-xs text-white focus:border-[#176B45] focus:outline-none"
                >
                  <option value="">Choose your state</option>
                  {farmGuideData.states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </span>
            </label>

            <label className="block text-xs font-semibold text-white">
              Local government area (LGA)
              <span className="relative mt-1.5 block">
                <select
                  value={validLga ? lgaId : ''}
                  disabled={!state}
                  onChange={(event) => chooseLga(event.target.value)}
                  className="farm-guide-select w-full appearance-none rounded-xl border border-[#3B423E] bg-[#181B19] py-3 pl-3 pr-12 text-xs text-white focus:border-[#176B45] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{state ? 'Choose your LGA' : 'Choose a state first'}</option>
                  {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </span>
            </label>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#A1A7A3]">The location list covers Nigeria’s 36 states and the FCT.</p>

          {validLga && zone && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#202321] p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1EB968]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Selected area</p>
                <p className="text-xs font-semibold text-white">{validLga.name}, {state?.name}</p>
                <p className="mt-1 text-[11px] text-[#A1A7A3]">Estimated farming zone · Approximate</p>
                <p className="text-xs font-semibold text-white">{zone.name}</p>
                {validLga.needsReview && <p className="mt-1 text-[10px] leading-relaxed text-[#FFD29D]">This LGA’s zone assignment needs local review.</p>}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!canSeePlan}
            onClick={() => {
              if (!state || !validLga) return;
              saveFarmGuideLocation(state.id, validLga.id);
              navigate(`/farm-guide/plan?stateId=${state.id}&lgaId=${validLga.id}`, { replace: true });
            }}
            className="mt-4 min-h-11 w-full rounded-xl bg-[#176B45] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1D7B51] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            See plan
          </button>
        </section>
      </main>
    </div>
  );
};
