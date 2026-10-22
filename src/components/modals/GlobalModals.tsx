import React from 'react';
import { HelpCircle, AlertOctagon, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/useApp';

interface ModalWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-[350px] bg-[#383B39] rounded-[28px] p-6 text-center text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};

export const GlobalModals: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    helpModalOpen,
    setHelpModalOpen,
    storageModalOpen,
    setStorageModalOpen,
    cachedStorageMb,
    clearCache,
  } = useApp();

  return (
    <>
      {/* Help Modal */}
      {helpModalOpen && (
        <ModalWrapper onClose={() => setHelpModalOpen(false)}>
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#176B45]">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">FieldVoice AI Guidance</h2>
          <div className="text-left text-xs text-[#D1D5DB] space-y-3 mb-6">
            <div className="bg-[#292C2A] p-3 rounded-xl">
              <p className="font-semibold text-white mb-1">📸 Taking Clear Photos</p>
              <p>Hold your phone 20cm from the affected leaf. Shield harsh midday glare with your shadow to reveal leaf patterns clearly.</p>
            </div>
            <div className="bg-[#292C2A] p-3 rounded-xl">
              <p className="font-semibold text-white mb-1">🌱 Understanding Diagnostics</p>
              <p>AI results provide agronomic screening guidance based on visible symptoms. They are not a confirmed laboratory diagnosis.</p>
            </div>
            <div className="bg-[#292C2A] p-3 rounded-xl">
              <p className="font-semibold text-white mb-1">👨‍🌾 Extension Worker Support</p>
              <p>If symptoms spread rapidly to adjacent stands, always consult your zonal AKADEP agricultural officer for on-field verification.</p>
            </div>
          </div>
          <button
            onClick={() => setHelpModalOpen(false)}
            className="w-full py-3.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] font-semibold text-sm transition"
          >
            Got It
          </button>
        </ModalWrapper>
      )}

      {/* Storage Management Modal */}
      {storageModalOpen && (
        <ModalWrapper onClose={() => setStorageModalOpen(false)}>
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#FF8A32]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-1">Manage Local Storage</h2>
          <p className="text-xs text-[#A1A7A3] mb-4">
            Currently using <span className="font-bold text-white">{cachedStorageMb} MB</span> on this device.
          </p>
          <div className="text-xs text-left bg-[#292C2A] p-3.5 rounded-xl text-[#D1D5DB] mb-5 leading-relaxed">
            <p className="font-medium text-white mb-1">Note on Cached Files:</p>
            Clearing temporary image cache will free local device space. Your saved scan assessments in History will remain preserved.
          </div>
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => {
                clearCache();
                setStorageModalOpen(false);
              }}
              className="w-full py-3.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] font-semibold text-sm transition cursor-pointer"
            >
              Clear Cached Photos
            </button>
            <button
              onClick={() => setStorageModalOpen(false)}
              className="w-full py-2.5 text-sm text-[#A1A7A3] hover:text-white transition font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Save Failed Modal */}
      {activeModal === 'save-failed' && (
        <ModalWrapper onClose={() => setActiveModal(null)}>
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#E04141]">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">Couldn't complete action</h2>
          <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6">
            Couldn't save your assessment. Your phone storage is full or the connection dropped unexpectedly. Don't worry, your photo is safely kept in memory.
          </p>
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] font-semibold text-sm transition"
            >
              Retry Saving Assessment
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 text-sm text-[#A1A7A3] hover:text-white transition font-medium"
            >
              Save Offline Copy
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Delete Failed Modal */}
      {activeModal === 'delete-failed' && (
        <ModalWrapper onClose={() => setActiveModal(null)}>
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#DC2626]">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">Couldn't delete scan</h2>
          <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6">
            Couldn't delete scan. The record remains safely in your history. Try again.
          </p>
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 rounded-xl bg-[#DC2626] hover:bg-red-700 font-semibold text-sm transition"
            >
              Retry Delete Action
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 text-sm text-[#A1A7A3] hover:text-white transition font-medium"
            >
              Keep record in history
            </button>
          </div>
        </ModalWrapper>
      )}
    </>
  );
};
