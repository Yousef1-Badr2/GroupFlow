import { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl p-8 border border-primary-100 dark:border-primary-900/30 text-center">
        <div className="w-20 h-20 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
          <span className="text-4xl font-black text-white">G</span>
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">GroupFlow</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Collaborate with your team on projects, tasks, and expenses in real-time.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 bg-white dark:bg-[#2C2C2C] border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-[#363636] transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
