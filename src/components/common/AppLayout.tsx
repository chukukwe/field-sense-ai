import React from 'react';
import { useLocation } from 'react-router-dom';
import { OfflineBanner } from './OfflineBanner';
import { BottomNavBar } from './BottomNavBar';
import { FloatingMicButton } from './FloatingMicButton';
import { GlobalModals } from '../modals/GlobalModals';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();

  // Pages with bottom nav:
  const showBottomNav =
    location.pathname === '/' ||
    location.pathname === '/scan' ||
    location.pathname === '/history' ||
    location.pathname === '/profile';

  // Floating mic FAB shows on Home and History
  const showFab = location.pathname === '/' || location.pathname === '/history';

  return (
    <div className="min-h-screen w-full bg-[#121413] flex justify-center selection:bg-[#176B45] selection:text-white">
      {/* 412px mobile frame */}
      <div className="w-full max-w-[412px] min-h-screen bg-[#202321] text-white flex flex-col relative shadow-2xl overflow-x-hidden">
        <OfflineBanner />
        
        <main className={`flex-1 flex flex-col ${showBottomNav ? 'pb-20' : 'pb-6'}`}>
          {children}
        </main>

        {showFab && <FloatingMicButton />}
        {showBottomNav && <BottomNavBar />}
        <GlobalModals />
      </div>
    </div>
  );
};
