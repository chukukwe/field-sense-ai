import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Mail,
  ShieldCheck,
  Edit3,
  Sliders,
  HelpCircle,
  LogOut,
  Check,
} from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useApp } from '../context/useApp';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, setHelpModalOpen } = useApp();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(userProfile.name);
  const [locationInput, setLocationInput] = useState<string>(userProfile.location);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const saved = await updateUserProfile({
      name: nameInput.trim(),
      email: userProfile.email,
      location: locationInput.trim(),
      avatarInitials: nameInput
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    });

    setIsEditing(false);
    setFeedbackMessage(saved ? 'Profile updated successfully' : 'Profile saved on this device, but cloud sync failed.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <TopHeader
        variant="page"
        title="Field Profile"
        subtitle="Manage your scout details and farm preferences."
      />

      <div className="px-4 flex flex-col gap-4">
        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="bg-[#174D38] border border-[#22C55E] text-white text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-[#22C55E]" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#292C2A] rounded-2xl p-5 border border-[#323633] flex flex-col items-center text-center relative shadow-md">
          {/* Dev Account Badge */}
          {userProfile.isDevData && (
            <span className="self-end bg-[#353526] text-[#FF8A32] text-[10px] font-semibold px-2.5 py-0.5 rounded-full mb-1">
              Dev Mode Data
            </span>
          )}

          {/* Avatar */}
          <div className="w-[72px] h-[72px] rounded-full bg-[#176B45] text-white font-bold text-xl flex items-center justify-center border-2 border-[#22C55E] shadow-md my-2">
            {userProfile.avatarInitials}
          </div>

          <h3 className="text-base font-bold text-white mt-1">
            {userProfile.name}
          </h3>
          <p className="text-xs text-[#8F9490] mt-0.5">{userProfile.role}</p>

          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#D1D5DB] bg-[#1F2B25] px-3 py-1.5 rounded-full border border-[#273B30]">
            <MapPin className="w-3.5 h-3.5 text-[#FF8A32]" />
            <span>{userProfile.location}</span>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 w-full bg-[#202321] hover:bg-[#2A2E2B] text-white text-xs font-semibold py-2.5 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-300" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Edit Form Modal/Card */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] flex flex-col gap-3 shadow-md"
          >
            <h4 className="text-sm font-bold text-white mb-1">Edit Account Details</h4>

            <div>
              <label className="text-[11px] text-[#A1A7A3] block mb-1">Full Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                className="w-full bg-[#181B19] text-white text-xs p-3 rounded-xl border border-[#323633] focus:border-[#176B45] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#A1A7A3] block mb-1">Email Address</label>
              <input
                type="email"
                value={userProfile.email}
                readOnly
                className="w-full bg-[#181B19] text-white text-xs p-3 rounded-xl border border-[#323633] focus:border-[#176B45] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#A1A7A3] block mb-1">Assigned Field Hub</label>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full bg-[#181B19] text-white text-xs p-3 rounded-xl border border-[#323633] focus:border-[#176B45] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2.5 rounded-xl bg-[#292C2A] text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] text-xs font-semibold text-white transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Account Details Card */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] flex flex-col gap-3">
          <h4 className="text-sm font-bold text-white">Scout Information</h4>
          
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202321]">
              <div className="flex items-center gap-2.5 text-[#D1D5DB]">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>Contact Email</span>
              </div>
              <span className="text-white font-medium text-[11px]">{userProfile.email}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202321]">
              <div className="flex items-center gap-2.5 text-[#D1D5DB]">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                <span>Diagnostics Access</span>
              </div>
              <span className="text-[#22C55E] font-semibold text-[11px]">Enabled (Offline Ready)</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] flex flex-col gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-between p-3 rounded-xl bg-[#202321] hover:bg-[#282C29] transition cursor-pointer text-xs text-white"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#FF8A32]" />
              <span>App & Voice Preferences</span>
            </div>
            <span className="text-[#8F9490] text-sm">&rarr;</span>
          </button>

          <button
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center justify-between p-3 rounded-xl bg-[#202321] hover:bg-[#282C29] transition cursor-pointer text-xs text-white"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#1EB968]" />
              <span>Help & Extension Support</span>
            </div>
            <span className="text-[#8F9490] text-sm">&rarr;</span>
          </button>

          <button
            disabled={signingOut}
            onClick={async () => {
              if (!firebaseAuth) return;
              setSigningOut(true);
              try { await signOut(firebaseAuth); }
              catch { setFeedbackMessage('Unable to sign out. Check your connection and try again.'); }
              finally { setSigningOut(false); }
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-[#202321] hover:bg-[#2E2020] transition cursor-pointer text-xs text-[#E04141] mt-1"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-[#E04141]" />
              <span>{signingOut ? 'Signing Out…' : 'Sign Out'}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
