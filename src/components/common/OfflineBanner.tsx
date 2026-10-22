import React from 'react';
import { WifiOff } from 'lucide-react';
import { useApp } from '../../context/useApp';

export const OfflineBanner: React.FC = () => {
  const { isOffline, offlineQueueCount, setIsOffline } = useApp();

  if (!isOffline) return null;

  return (
    <div className="w-full bg-[#FF8A32] text-white px-4 py-2 flex items-center justify-between z-40 transition-all">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-white shrink-0" />
        <span className="text-xs sm:text-sm font-medium tracking-tight">
          Offline mode. Scans cached locally
        </span>
      </div>
      <button
        onClick={() => setIsOffline(false)}
        title="Click to toggle online mode"
        className="bg-[#176B45] hover:bg-[#1eb968] transition-colors text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
      >
        QUEUE {offlineQueueCount}
      </button>
    </div>
  );
};
