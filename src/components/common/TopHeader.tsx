import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';

interface TopHeaderProps {
  variant?: 'home' | 'detail' | 'page';
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showHelp?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  variant = 'page',
  title,
  subtitle,
  onBack,
  showHelp = false,
}) => {
  const navigate = useNavigate();
  const { setHelpModalOpen } = useApp();

  if (variant === 'home') {
    return (
      <header className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
            FieldVoice AI
          </h1>
          <p className="text-[13px] text-[#A1A7A3] mt-0.5 font-normal">
            Your crop-health assistant
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="w-11 h-11 rounded-full bg-[#292C2A] flex items-center justify-center text-white hover:bg-[#383B39] active:scale-95 transition"
        >
          <Settings className="w-5 h-5 text-gray-200" />
        </button>
      </header>
    );
  }

  if (variant === 'detail') {
    return (
      <header className="px-4 py-3.5 flex items-center justify-between relative min-h-[56px]">
        <button
          onClick={onBack || (() => navigate(-1))}
          aria-label="Go back"
          className="w-10 h-10 rounded-full bg-[#292C2A] flex items-center justify-center text-white hover:bg-[#383B39] active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-200" />
        </button>

        {title && (
          <h1 className="text-base font-semibold text-white tracking-wide text-center absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        )}

        {showHelp ? (
          <button
            onClick={() => setHelpModalOpen(true)}
            className="text-[15px] font-medium text-[#FF8A32] hover:underline px-2 py-1 transition"
          >
            Help
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>
    );
  }

  // variant === 'page'
  return (
    <header className="px-4 pt-5 pb-3">
      {title && (
        <h1 className="text-[22px] font-bold text-white tracking-tight">
          {title}
        </h1>
      )}
      {subtitle && (
        <p className="text-[13px] text-[#A1A7A3] mt-1 leading-snug">
          {subtitle}
        </p>
      )}
    </header>
  );
};
