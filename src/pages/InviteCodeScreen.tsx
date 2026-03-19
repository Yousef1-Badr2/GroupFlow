import React, { useState } from 'react';
import { KeyRound, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { validateAndUseInviteCode } from '../lib/firestoreService';
import { useStore } from '../store';
import { toast } from 'sonner';

export default function InviteCodeScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !currentUser) return;

    setIsLoading(true);
    setError('');

    try {
      setIsLoading(true);
      setError('');
      
      const trialExpiresAt = await validateAndUseInviteCode(currentUser.id, code.trim());
      
      // Update local state to trigger re-render and let the user in
      // We set isApproved to true immediately to bypass the snapshot lag
      setCurrentUser({ ...currentUser, isApproved: true, trialExpiresAt });
      
      toast.success('Invite code accepted! Welcome.');
    } catch (err: any) {
      console.error('Invite code error:', err);
      let message = 'Invalid invite code.';
      
      try {
        // Check if it's a JSON error from handleFirestoreError
        const parsed = JSON.parse(err.message);
        if (parsed.error && (parsed.error.includes('insufficient permissions') || parsed.error.includes('Missing or insufficient permissions'))) {
          message = 'Permission denied. Please try again or contact support.';
        } else {
          message = parsed.error || message;
        }
      } catch {
        message = err.message || message;
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl p-8 border border-primary-100 dark:border-primary-900/30">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <KeyRound size={32} className="text-primary-600 dark:text-primary-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Invite Code Required</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
          This app is currently invite-only. Please enter your invite code to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              className="w-full p-4 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 text-center text-xl tracking-widest font-mono uppercase"
              maxLength={8}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!code.trim() || isLoading}
            className="w-full py-4 bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center shadow-md disabled:opacity-50 transition-colors hover:bg-primary-800"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Unlock Access
                <ArrowRight size={20} className="ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center mx-auto"
          >
            <LogOut size={16} className="mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
