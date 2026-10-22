import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Mail, LockKeyhole, UserRound, ArrowLeft, LoaderCircle, Eye, EyeOff } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/useAuth';
import { firebaseAuth, firestore, requireEmailVerification } from '../lib/firebase';

type AuthMode = 'sign-in' | 'create-account' | 'forgot-password';

function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account was found for that email.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Network connection failed. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase yet.',
  };
  return messages[code] ?? 'We could not complete that request. Please try again.';
}

export const AuthScreen: React.FC = () => {
  const { user, loading, configured } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') ?? 'sign-in') as AuthMode;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (loading) {
    return <div className="min-h-screen bg-[#121413] flex items-center justify-center text-[#A1A7A3]"><LoaderCircle className="w-6 h-6 animate-spin" aria-label="Loading account" /></div>;
  }
  if (user && (!requireEmailVerification || user.emailVerified)) return <Navigate to="/" replace />;

  const heading = mode === 'create-account' ? 'Create your account' : mode === 'forgot-password' ? 'Reset your password' : 'Welcome back';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!configured || !firebaseAuth || !firestore) {
      setError('Firebase is not configured yet. Add the Firebase web app values to .env.local, then restart the app.');
      return;
    }
    if (mode === 'create-account' && fullName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (mode !== 'forgot-password' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'create-account' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'forgot-password') {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        setNotice('If an account exists for that email, a password reset link has been sent.');
      } else if (mode === 'create-account') {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        await updateProfile(credential.user, { displayName: fullName.trim() });
        await setDoc(doc(firestore, 'users', credential.user.uid), {
          fullName: fullName.trim(),
          email: credential.user.email,
          role: 'Smallholder Farmer & Field Scout',
          location: 'Eket Field Hub, Akwa Ibom',
          preferredLanguage: 'English (Default)',
          accentGuidance: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (requireEmailVerification) {
          await sendEmailVerification(credential.user);
          await signOut(firebaseAuth);
          setNotice('Your account is ready. Verify your email from the link we sent, then sign in.');
        } else {
          navigate('/', { replace: true });
        }
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (requireEmailVerification && !credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          await signOut(firebaseAuth);
          setNotice('Verify your email using the link we sent before signing in. We sent a fresh link.');
          return;
        }
        navigate('/', { replace: true });
      }
    } catch (requestError) {
      if (mode === 'create-account' && firebaseAuth.currentUser) {
        await signOut(firebaseAuth).catch(() => undefined);
      }
      setError(friendlyAuthError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const modeLink = (next: AuthMode) => `/auth?mode=${next}`;

  return (
    <main className="min-h-screen bg-[#121413] text-white flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-[390px]">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-[#176B45] flex items-center justify-center shadow-lg shadow-green-950/40 mb-3"><Leaf className="w-7 h-7 text-white" /></div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#22C55E] uppercase">FieldVoice AI</p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-2">{heading}</h1>
          <p className="text-sm text-[#A1A7A3] mt-2 leading-relaxed">{mode === 'create-account' ? 'Create a secure account to keep your field scans together.' : mode === 'forgot-password' ? 'We’ll email you a secure link to choose a new password.' : 'Sign in to continue to your crop-health assistant.'}</p>
        </div>

        <div className="bg-[#202321] rounded-2xl border border-[#323633] p-5 shadow-xl">
          {!configured && <div role="status" className="rounded-xl border border-[#5C3A1E] bg-[#2E2319] p-3 text-xs leading-relaxed text-[#F2D1AE] mb-4">Firebase setup is required before accounts can be created or used.</div>}
          {error && <div role="alert" className="rounded-xl border border-[#5C2020] bg-[#2C1A1A] p-3 text-xs leading-relaxed text-[#FCA5A5] mb-4">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-[#2E6040] bg-[#1F2B25] p-3 text-xs leading-relaxed text-[#BBF7D0] mb-4">{notice}</div>}

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            {mode === 'create-account' && <label className="block"><span className="text-xs font-semibold text-[#D1D5DB]">Full name</span><span className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#181B19] border border-[#323633] px-3.5"><UserRound className="w-4 h-4 text-[#8F9490]" /><input autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#626862]" placeholder="Your name" /></span></label>}
            <label className="block"><span className="text-xs font-semibold text-[#D1D5DB]">Email address</span><span className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#181B19] border border-[#323633] px-3.5"><Mail className="w-4 h-4 text-[#8F9490]" /><input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#626862]" placeholder="you@example.com" /></span></label>
            {mode !== 'forgot-password' && <label className="block"><span className="text-xs font-semibold text-[#D1D5DB]">Password</span><span className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#181B19] border border-[#323633] px-3.5"><LockKeyhole className="w-4 h-4 text-[#8F9490]" /><input autoComplete={mode === 'create-account' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#626862]" placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="shrink-0 p-1 text-[#8F9490] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22C55E] rounded"><span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>{showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}</button></span></label>}
            {mode === 'create-account' && <label className="block"><span className="text-xs font-semibold text-[#D1D5DB]">Confirm password</span><span className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#181B19] border border-[#323633] px-3.5"><LockKeyhole className="w-4 h-4 text-[#8F9490]" /><input autoComplete="new-password" type={showConfirmPassword ? 'text' : 'password'} minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#626862]" placeholder="Enter password again" /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} aria-pressed={showConfirmPassword} className="shrink-0 p-1 text-[#8F9490] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22C55E] rounded"><span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>{showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}</button></span></label>}
            {mode === 'sign-in' && <div className="flex justify-end -mt-1"><Link to={modeLink('forgot-password')} className="text-xs font-semibold text-[#22C55E] hover:underline">Forgot password?</Link></div>}
            <button disabled={busy} className="mt-1 w-full bg-[#176B45] hover:bg-[#1eb968] disabled:opacity-60 text-white py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
              {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}{busy ? 'Please wait…' : mode === 'create-account' ? 'Create Account' : mode === 'forgot-password' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#A1A7A3]">
            {mode === 'sign-in' ? <>New to FieldVoice? <Link to={modeLink('create-account')} className="font-bold text-[#22C55E] hover:underline">Create account</Link></> : mode === 'create-account' ? <>Already registered? <Link to={modeLink('sign-in')} className="font-bold text-[#22C55E] hover:underline">Sign in</Link></> : <Link to={modeLink('sign-in')} className="inline-flex items-center gap-1.5 font-bold text-[#22C55E] hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>}
          </div>
        </div>
        <p className="text-center text-[11px] text-[#626862] mt-5">Your scan details are private to your account.</p>
      </section>
    </main>
  );
};
