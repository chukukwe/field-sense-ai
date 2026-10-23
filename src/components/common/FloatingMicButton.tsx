import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';

interface FloatingMicButtonProps {
  onClick?: () => void;
}

export const FloatingMicButton: React.FC<FloatingMicButtonProps> = ({ onClick }) => {
  const navigate = useNavigate();
  const { resetScanDraft } = useApp();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      resetScanDraft();
      navigate('/scan');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Start new scan"
      title="Start new scan"
      className="fixed bottom-20 right-4 sm:right-[max(1rem,calc(50%-206px+1rem))] z-30 w-14 h-14 rounded-full bg-[#FF8A32] shadow-xl shadow-orange-500/25 flex items-center justify-center text-white active:scale-90 hover:brightness-105 transition-all"
    >
      <Plus className="w-6 h-6 text-white" strokeWidth={2.3} />
    </button>
  );
};
