import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navigationItems = [
  { label: 'Home', path: '/' },
  { label: 'Scan a crop', path: '/scan' },
  { label: 'Scan history', path: '/history' },
  { label: 'Profile', path: '/profile' },
];

export const NavigationMenuButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = 'fieldvoice-primary-navigation';

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const buttonSize = compact ? 'w-10 h-10' : 'w-11 h-11';

  return (
    <div className="relative z-40 shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className={`${buttonSize} rounded-full bg-[#292C2A] flex items-center justify-center text-white hover:bg-[#383B39] active:scale-95 transition`}
      >
        {isOpen ? <X className="w-5 h-5 text-gray-200" /> : <Menu className="w-5 h-5 text-gray-200" />}
      </button>

      {isOpen && (
        <nav id={menuId} aria-label="Main navigation" className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[#323633] bg-[#292C2A] p-2 shadow-xl">
          {navigationItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            return (
              <button
                key={item.path}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setIsOpen(false);
                  navigate(item.path);
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-[#174D38] font-semibold text-white' : 'text-[#D1D5DB] hover:bg-[#383B39] hover:text-white'}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
