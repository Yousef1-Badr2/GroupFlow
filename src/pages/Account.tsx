import { useState, useEffect } from "react";
import { User, Settings, Moon, Sun, Monitor, LogOut, Save } from "lucide-react";
import { useStore } from "../store";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

export default function Account() {
  const { currentUser, theme, setTheme, colorTheme, setColorTheme } = useStore();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
    }
  }, [currentUser]);

  const handleSave = () => {
    // In this version, we're not updating user profile in Firestore yet
    // but we could implement it in firestoreService
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 pt-4">
        <h1 className="text-2xl font-bold">Account</h1>
        {currentUser && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary-700 dark:text-primary-500 font-medium text-sm px-4 py-2 bg-primary-50 dark:bg-primary-950/20 rounded-full"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-8">
        {/* Profile Section */}
        <section className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl shadow-sm border border-primary-100 dark:border-primary-900/30">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center border-4 border-white dark:border-[#1E1E1E] shadow-md overflow-hidden">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : name ? (
                <span className="text-3xl font-bold text-primary-400">{name.charAt(0).toUpperCase()}</span>
              ) : (
                <User size={40} className="text-primary-300" />
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="w-full py-4 bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center shadow-md disabled:opacity-50 transition-colors"
              >
                <Save size={20} className="mr-2" />
                Save Profile
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{currentUser?.name}</h2>
              <p className="text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 flex items-center">
            <Settings size={16} className="mr-2" />
            App Settings
          </h3>
          
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden divide-y divide-primary-100 dark:divide-primary-900/30">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-xs text-slate-500">Choose your preferred appearance</p>
              </div>
              <div className="flex bg-primary-50/50 dark:bg-primary-900/20 rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-primary-800 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-primary-700 dark:hover:text-primary-400'}`}
                >
                  <Sun size={18} />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-primary-800 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-primary-700 dark:hover:text-primary-400'}`}
                >
                  <Moon size={18} />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-white dark:bg-primary-800 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-primary-700 dark:hover:text-primary-400'}`}
                >
                  <Monitor size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Color Theme</p>
                <p className="text-xs text-slate-500">Choose your accent color</p>
              </div>
              <div className="flex bg-primary-50/50 dark:bg-primary-900/20 rounded-lg p-1 space-x-1">
                <button
                  onClick={() => setColorTheme('red')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'red' ? 'bg-white dark:bg-primary-800 shadow-sm scale-110' : 'hover:bg-primary-100 dark:hover:bg-primary-800/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-red-600"></div>
                </button>
                <button
                  onClick={() => setColorTheme('blue')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'blue' ? 'bg-white dark:bg-primary-800 shadow-sm scale-110' : 'hover:bg-primary-100 dark:hover:bg-primary-800/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600"></div>
                </button>
                <button
                  onClick={() => setColorTheme('green')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'green' ? 'bg-white dark:bg-primary-800 shadow-sm scale-110' : 'hover:bg-primary-100 dark:hover:bg-primary-800/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-green-600"></div>
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-rose-600 dark:text-rose-400">Sign Out</p>
                <p className="text-xs text-slate-500">Log out of your account</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
