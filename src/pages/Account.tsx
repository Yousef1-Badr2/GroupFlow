import { useState, useEffect } from "react";
import { User, Settings, Moon, Sun, Monitor, Trash2, Save } from "lucide-react";
import { useStore } from "../store";
import { v4 as uuidv4 } from "uuid";

export default function Account() {
  const { currentUser, setCurrentUser, updateUser, theme, setTheme, colorTheme, setColorTheme, clearData } = useStore();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [isEditing, setIsEditing] = useState(!currentUser);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone || "");
      setBio(currentUser.bio || "");
    }
  }, [currentUser]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (!currentUser) {
      setCurrentUser({
        id: uuidv4(),
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
    } else {
      updateUser({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleClearData = () => {
    clearData();
    setIsEditing(true);
    setName("");
    setPhone("");
    setBio("");
    setConfirmClear(false);
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
        <section className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-white dark:border-[#1E1E1E] shadow-md">
              {name ? (
                <span className="text-3xl font-bold text-slate-400">{name.charAt(0).toUpperCase()}</span>
              ) : (
                <User size={40} className="text-slate-300" />
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
                  className="w-full p-3 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 234 567 8900"
                  className="w-full p-3 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio (Optional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
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
              <h2 className="text-2xl font-bold">{currentUser.name}</h2>
              {currentUser.phone && <p className="text-slate-500 dark:text-slate-400">{currentUser.phone}</p>}
              {currentUser.bio && <p className="text-slate-600 dark:text-slate-300 mt-4 italic">"{currentUser.bio}"</p>}
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 flex items-center">
            <Settings size={16} className="mr-2" />
            App Settings
          </h3>
          
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-xs text-slate-500">Choose your preferred appearance</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                >
                  <Sun size={18} />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                >
                  <Moon size={18} />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
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
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 space-x-1">
                <button
                  onClick={() => setColorTheme('red')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'red' ? 'bg-white dark:bg-slate-700 shadow-sm scale-110' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-red-600"></div>
                </button>
                <button
                  onClick={() => setColorTheme('blue')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'blue' ? 'bg-white dark:bg-slate-700 shadow-sm scale-110' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600"></div>
                </button>
                <button
                  onClick={() => setColorTheme('green')}
                  className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${colorTheme === 'green' ? 'bg-white dark:bg-slate-700 shadow-sm scale-110' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-green-600"></div>
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-rose-600 dark:text-rose-400">Clear Data</p>
                <p className="text-xs text-slate-500">Delete all local projects and tasks</p>
              </div>
              <button
                onClick={() => setConfirmClear(true)}
                className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold mb-2">Clear Data</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete all local data? This cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmClear(false)} 
                className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearData} 
                className="flex-1 py-3 bg-rose-600 text-white font-medium rounded-xl"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
