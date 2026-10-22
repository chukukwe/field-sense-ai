import React from 'react';
import { Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FloatingMicButtonProps {
  onClick?: () => void;
}

export const FloatingMicButton: React.FC<FloatingMicButtonProps> = ({ onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/scan?voice=true');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Start Voice Observation"
      className="fixed bottom-20 right-4 sm:right-[max(1rem,calc(50%-206px+1rem))] z-30 w-14 h-14 rounded-full bg-[#FF8A32] shadow-xl shadow-orange-500/25 flex items-center justify-center text-white active:scale-90 hover:brightness-105 transition-all"
    >
      <Mic className="w-6 h-6 text-white" strokeWidth={2.3} />
    </button>
  );
};
