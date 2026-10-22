import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronDown } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useApp } from '../context/useApp';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    userProfile,
    updateUserProfile,
    cachedStorageMb,
    scans,
    setStorageModalOpen,
  } = useApp();

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // Catch PWA beforeinstallprompt if available
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
      }
      setInstallPrompt(null);
    } else {
      alert(
        'To install FieldVoice AI PWA:\n1. Tap your browser menu (: or Share)\n2. Select "Install app" or "Add to Home screen"'
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopHeader
        variant="detail"
        title="Settings"
        showHelp={true}
        onBack={() => navigate(-1)}
      />

      <div className="px-4 flex flex-col gap-4">
        {/* Card 1: Install FieldVoice PWA */}
        <div className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#292C2A] flex items-center justify-center text-gray-200 shrink-0">
                <Download className="w-5 h-5 text-gray-200" />
              </div>
              <h3 className="text-sm font-bold text-white">Install FieldVoice</h3>
            </div>
            <span className="bg-[#353526] text-[#FF8A32] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              Field PWA
            </span>
          </div>

          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            Add to your Android home screen for instant camera access and offline review in the field.
          </p>

          <button
            onClick={handleInstallClick}
            className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition-all text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{installSuccess ? 'App Installed!' : 'Install Field Voice AI'}</span>
          </button>

          <p className="text-[11px] text-[#8F9490] leading-snug">
            Tap Chrome options (:) and choose "Install app" or "Add to Home screen".
          </p>
        </div>

        {/* Card 2: Language & Voice */}
        <div className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Language & Voice</h3>
            <div className="h-[1px] bg-white/10 mt-2.5" />
          </div>

          <div>
            <label className="text-xs text-[#D1D5DB] block mb-2 font-medium">
              Preferred Language
            </label>
            <div className="relative">
              <select
                value={userProfile.preferredLanguage}
                onChange={(e) => updateUserProfile({ preferredLanguage: e.target.value })}
                className="w-full bg-[#292C2A] text-white text-xs p-3.5 pr-10 rounded-xl border border-transparent appearance-none focus:outline-none focus:border-[#176B45] cursor-pointer"
              >
                <option value="English (Default)">English (Default)</option>
                <option value="Nigerian Pidgin">Nigerian Pidgin</option>
                <option value="Ibibio Dialect">Ibibio Dialect</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col pr-4">
              <span className="text-xs font-bold text-white">Voice Advisory Accent</span>
              <span className="text-[11px] text-[#8F9490] mt-0.5">
                Nigerian Pidgin & Ibibio dialect guidance
              </span>
            </div>

            {/* Custom Toggle Switch */}
            <button
              role="switch"
              aria-checked={userProfile.accentGuidance}
              onClick={() =>
                updateUserProfile({ accentGuidance: !userProfile.accentGuidance })
              }
              style={{ width: 48, height: 26, borderRadius: 13, padding: 2 }}
              className={`transition-colors cursor-pointer shrink-0 ${
                userProfile.accentGuidance ? 'bg-[#B36A2D]' : 'bg-[#383B39]'
              }`}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  transform: userProfile.accentGuidance ? 'translateX(22px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        {/* Card 3: Data & Offline Storage */}
        <div className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Data & Offline Storage</h3>
            <div className="h-[1px] bg-white/10 mt-2.5" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">
                {cachedStorageMb} MB local data used
              </span>
              <span className="text-[11px] text-[#8F9490] mt-0.5">
                {scans.length} scans stored on this phone
              </span>
            </div>

            <button
              onClick={() => setStorageModalOpen(true)}
              className="bg-[#214736] hover:bg-[#176B45] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
