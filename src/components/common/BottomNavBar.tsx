import React from 'react';
import { Home, Camera, Clock, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Scan', path: '/scan', icon: Camera },
    { label: 'History', path: '/history', icon: Clock },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[412px] mx-auto bg-[#292C2A] border-t border-[#202321] px-4 py-2 z-40 flex items-center justify-around select-none">
      {tabs.map((tab) => {
        const isActive =
          tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
        const Icon = tab.icon;

        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-[#1EB968]' : 'text-[#676865] hover:text-[#9CA3AF]'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.3 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
