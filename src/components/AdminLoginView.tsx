import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';

export function AdminLoginView() {
  const {
    user,
    adminToken,
    adminAuthStatus,
    effectiveRole,
    isStaffAuthenticated,
    loginWithAdminPasscode,
    claimAdminPasscode,
    signInWithGoogle,
    signOut,
    setActiveView,
  } = useNewspaper();

  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsInitialClaim = !adminAuthStatus.envConfigured && !adminAuthStatus.claimed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = passcode.trim();
    if (trimmed.length < (needsInitialClaim ? 8 : 4)) {
      setErrorMsg(
        needsInitialClaim
          ? 'Please choose an Admin Passcode of at least 8 characters.'
          : 'Please enter your private Admin Passcode.'
      );
      return;
    }

    if (needsInitialClaim && trimmed !== confirmPasscode.trim()) {
      setErrorMsg('Passcode confirmation does not match.');
      return;
    }

    setSubmitting(true);
    const res = needsInitialClaim
      ? await claimAdminPasscode(trimmed)
      : await loginWithAdminPasscode(trimmed);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Authentication failed.');
      return;
    }

    setPasscode('');
    setConfirmPasscode('');
    setActiveView('newsroom');
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E1262D] font-bold">
          Private Editorial & Administration Portal
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white mt-2">
          Binduz CMS & Newsroom Authentication
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
          Protected workstation for publishers, editors, journalists, SEO strategists, media teams, and moderators.
        </p>
      </div>

      {isStaffAuthenticated ? (
        <div className="bg-white dark:bg-neutral-900 border border-emerald-500/40 rounded-md p-8 shadow-sm max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Authenticated as {effectiveRole}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {adminToken
                ? 'Private Admin Passcode session is active in memory.'
                : `Signed in via Google (${user?.email || user?.displayName}).`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('newsroom')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded cursor-pointer"
            >
              <span>Open WordPress CMS Desk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold rounded hover:border-[#E1262D] cursor-pointer"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Private Server-Verified Admin Passcode */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded bg-[#E1262D]/10 text-[#E1262D] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
                    {needsInitialClaim ? 'Claim Private Admin Passcode' : 'Admin Passcode Sign-In'}
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    {adminAuthStatus.envConfigured
                      ? 'Verified via Server Secret'
                      : needsInitialClaim
                      ? 'One-Time Cryptographic Setup'
                      : 'Verified via Scrypt Credential'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-5">
                {needsInitialClaim
                  ? 'No server admin passcode has been claimed yet. Set a strong private passphrase (8+ characters) to permanently lock and protect administration access.'
                  : 'Enter your private Admin Passcode to unlock Super Admin CMS, Visual Page Builder, Section Customizer, and Role Governance.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    {needsInitialClaim ? 'Create Private Admin Passcode' : 'Admin Passcode'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete={needsInitialClaim ? 'new-password' : 'current-password'}
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder={needsInitialClaim ? 'Minimum 8 characters' : 'Enter private passcode'}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:border-[#E1262D]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {needsInitialClaim && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Confirm Passcode
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Re-enter passcode"
                      className="w-full px-3 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:border-[#E1262D]"
                    />
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-2.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Verifying...'
                    : needsInitialClaim
                    ? 'Claim Admin Passcode & Enter CMS'
                    : 'Sign In to Admin CMS'}
                </button>
              </form>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
              Tokens stay strictly in active session memory and clear automatically when you close or sign out.
            </div>
          </div>

          {/* Card 2: Staff & Super Admin Google Sign-In */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded bg-[#0D47FF]/10 text-[#0D47FF] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
                    Editorial Staff Google Sign-In
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    Role-Based Firebase Access
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-5">
                Reporters, Editors, Proofreaders, SEO Managers, Media Teams, Ad Managers, Moderators, and the Super Admin account can sign in using verified Google credentials to sync directly with Firestore.
              </p>

              <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 mb-6">
                <li className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D47FF] shrink-0" />
                  <span>14 distinct editorial & management roles enforced server-side</span>
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D47FF] shrink-0" />
                  <span>Full revision history, audit logs, and real-time Firestore sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D47FF] shrink-0" />
                  <span>Zero demo test accounts or spoofed role switches</span>
                </li>
              </ul>

              {user ? (
                <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div>
                    Signed in as <strong>{user.email}</strong> ({effectiveRole}).
                  </div>
                  <p className="text-[11px] opacity-85">
                    Your Google account currently holds reader access. Request a role upgrade from a Super Admin or sign in with the private Admin Passcode.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="w-full py-2.5 px-4 bg-[#0D47FF] hover:bg-[#0a38cc] text-white text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  Continue with Google Staff Account
                </button>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Public Reader?</span>
              <button
                type="button"
                onClick={() => setActiveView('frontpage')}
                className="font-semibold text-[#E1262D] hover:underline cursor-pointer"
              >
                Return to Front Page
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
