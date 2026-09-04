import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Cloud,
  ShieldCheck,
  LogOut,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firebaseConfig } from '../../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowClose?: boolean;
  onResetAllData?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, allowClose = true, onResetAllData }) => {
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isCloudSynced,
    syncStatus,
    resetQuotaStatus,
    clearAllUserData,
    testFirestoreWrite,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [hasCopiedDomain, setHasCopiedDomain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firestoreTestResult, setFirestoreTestResult] = useState<string | null>(null);
  const [isTestingFirestore, setIsTestingFirestore] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const copyDomain = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentHost);
      setHasCopiedDomain(true);
      setTimeout(() => setHasCopiedDomain(false), 2500);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const code = err?.code || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain') || msg.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setErrorMsg('Domain not yet authorized in Firebase Console.');
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        setErrorMsg('The sign-in popup was closed before completing. Click below to try again.');
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setErrorMsg('The browser popup was blocked. Please allow popups for this site and try again.');
      } else if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setErrorMsg('Google Sign-In is not enabled yet in your Firebase Project settings.');
      } else if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
        setErrorMsg('Network error. Please check your connection and retry.');
      } else {
        setErrorMsg(msg || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || '';
      const code = err?.code || '';
      let friendly = err.message || 'Authentication failed.';

      if (code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential') || code === 'auth/wrong-password' || msg.includes('auth/wrong-password')) {
        friendly = 'Invalid email or password combination.';
      } else if (code === 'auth/user-not-found' || msg.includes('auth/user-not-found')) {
        friendly = 'No account found with this email. Please sign up first.';
      } else if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
        friendly = 'This email is already registered. Please sign in instead.';
      } else if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
        friendly = 'Password should be at least 6 characters.';
      } else if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        friendly = 'Email/Password authentication is not enabled in Firebase Console. Use Google Sign-in or enable Email provider in Firebase Console.';
      }
      setErrorMsg(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {user ? 'Cloud Account & Sync' : mode === 'signin' ? 'Sign In to Your Portfolio' : 'Create Your Portfolio Account'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {user ? 'Secure Firestore Persistence' : 'Access your advisors, trades, & Zerodha holdings'}
              </p>
            </div>
          </div>
          {allowClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {user ? (
            /* User is signed in */
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-xs">
                    {user.displayName || user.email?.split('@')[0] || 'Investor'}
                  </h4>
                  <p className="text-emerald-800 text-[11px] font-mono">{user.email}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      <Cloud className="w-3 h-3" />
                      Firestore Database Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-600 text-[11px]">
                <p className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Sync Status:</span>
                  <span className={`font-semibold uppercase tracking-wide ${
                    syncStatus === 'synced'
                      ? 'text-emerald-700'
                      : syncStatus === 'quota_exceeded'
                      ? 'text-amber-700'
                      : 'text-slate-600'
                  }`}>
                    {syncStatus === 'synced'
                      ? 'Realtime Synced'
                      : syncStatus === 'saving'
                      ? 'Saving...'
                      : syncStatus === 'quota_exceeded'
                      ? 'Saved Locally (Daily Free Quota Hit)'
                      : syncStatus}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">UID:</span>
                  <span className="font-mono text-slate-500 text-[10px] truncate max-w-[180px]">{user.uid}</span>
                </p>
              </div>

              {syncStatus === 'quota_exceeded' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-2">
                  <p className="font-bold flex items-center gap-1 text-amber-800">
                    <Cloud className="w-3.5 h-3.5" />
                    Daily Firestore Quota Reached
                  </p>
                  <p className="text-amber-800/90 leading-relaxed">
                    Your portfolio is safely preserved in local storage. Quotas reset daily, or you can manage/upgrade in the Firebase console:
                  </p>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-700 hover:underline inline-block"
                    >
                      Open Firebase Console &rarr;
                    </a>
                    <button
                      type="button"
                      onClick={() => resetQuotaStatus()}
                      className="px-2.5 py-1 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition shadow-xs cursor-pointer"
                    >
                      Retry Cloud Sync
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs">Firestore write check</h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Writes one small test document to your account so we can verify permissions and database configuration.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isTestingFirestore}
                  onClick={async () => {
                    if (!window.confirm('Save a small Firestore test document to verify cloud writes?')) return;
                    setIsTestingFirestore(true);
                    setFirestoreTestResult(null);
                    try {
                      await testFirestoreWrite();
                      setFirestoreTestResult('Write succeeded. Check Firestore Console under users/{your UID}/firestore_poc/test.');
                    } catch (error: any) {
                      setFirestoreTestResult(`Write failed: ${error?.message || String(error)}`);
                    } finally {
                      setIsTestingFirestore(false);
                    }
                  }}
                  className="w-full px-3 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {isTestingFirestore ? 'Testing Firestore write...' : 'Test Firestore Write'}
                </button>
                {firestoreTestResult && (
                  <p className={`text-[11px] leading-relaxed break-words ${firestoreTestResult.startsWith('Write succeeded') ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {firestoreTestResult}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-lg transition border border-rose-200 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Reset all portfolio data to 0? This will wipe all advisors and trades from cloud & local storage.')) {
                      if (onResetAllData) await onResetAllData();
                      else await clearAllUserData();
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold text-xs rounded-lg transition border border-rose-200/60 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset All Portfolio Data to 0</span>
                </button>
              </div>
            </div>
          ) : (
            /* User is signed out -> Auth Form */
            <div className="space-y-4 text-xs">
              
              {/* Unauthorized Domain Resolution Banner */}
              {isUnauthorizedDomain && (
                <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-3 text-amber-950 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs">
                        Authorize Domain in Firebase Console
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Firebase Google Sign-In requires your preview domain to be registered in Authorized Domains.
                      </p>
                    </div>
                  </div>

                  {/* Domain Copy Box */}
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-700 truncate select-all">
                      {currentHost}
                    </span>
                    <button
                      type="button"
                      onClick={copyDomain}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-semibold text-[10px] transition shrink-0 cursor-pointer"
                    >
                      {hasCopiedDomain ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Domain</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 3 Steps */}
                  <ol className="text-[11px] text-amber-900 space-y-1 pl-4 list-decimal marker:font-bold marker:text-amber-700">
                    <li>Open <strong>Firebase Console &rarr; Authentication &rarr; Settings</strong>.</li>
                    <li>Scroll to <strong>Authorized domains</strong> and click <strong>Add domain</strong>.</li>
                    <li>Paste <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">{currentHost || 'run.app'}</code> and click Save.</li>
                  </ol>

                  {/* Console Action Link */}
                  <div className="pt-1 flex items-center gap-2">
                    <a
                      href={firebaseSettingsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-semibold text-xs transition shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Firebase Auth Settings</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Standard Error message if not unauthorized domain */}
              {errorMsg && !isUnauthorizedDomain && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] uppercase font-semibold text-slate-400">or sign in with email</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="investor@domain.com"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Authenticating...'
                    : mode === 'signin'
                    ? 'Sign In & Sync Cloud Data'
                    : 'Create Account & Sync Data'}
                </button>
              </form>

              <div className="text-center pt-1 flex flex-col gap-2">
                {mode === 'signin' ? (
                  <p className="text-slate-500 text-[11px]">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                        setIsUnauthorizedDomain(false);
                      }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Sign up free
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMsg(null);
                        setIsUnauthorizedDomain(false);
                      }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                )}

                {/* Offline / Local Mode Fallback Button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    Continue as Guest (Local Storage Persistence Active)
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

