import { useState, useEffect } from 'react';
import { 
  Users, Shield, ShieldAlert, ShieldCheck, 
  Trash2, Search, Filter, Mail, Phone, 
  Calendar, ArrowLeft, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import * as firestoreService from '../lib/firestoreService';
import { User } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ConfirmationModal';

export default function AdminDashboard() {
  const { currentUser } = useStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'trial'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await firestoreService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await firestoreService.updateUserApproval(userId, !currentStatus);
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));
      toast.success(`User ${!currentStatus ? 'approved' : 'access revoked'}`);
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    setModalConfig({
      isOpen: true,
      title: 'Change User Role',
      message: `Are you sure you want to make this user an ${newRole}?`,
      onConfirm: async () => {
        setActionLoading(userId);
        try {
          await firestoreService.updateUserRole(userId, newRole);
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
          toast.success(`User role updated to ${newRole}`);
        } catch (error) {
          console.error("Failed to update role:", error);
          toast.error("Failed to update user role");
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone and will remove all their data.',
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(userId);
        try {
          await firestoreService.deleteUser(userId);
          setUsers(users.filter(u => u.id !== userId));
          toast.success("User deleted successfully");
        } catch (error) {
          console.error("Failed to delete user:", error);
          toast.error("Failed to delete user");
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'approved') return matchesSearch && user.isApproved;
    if (filter === 'pending') return matchesSearch && !user.isApproved && !user.trialExpiresAt;
    if (filter === 'trial') return matchesSearch && user.trialExpiresAt && user.trialExpiresAt > Date.now();
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-[#121212] pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1E1E] border-b border-primary-100 dark:border-primary-900/30 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/account')}
                className="p-2 mr-4 text-slate-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold flex items-center">
                <Shield className="mr-2 text-primary-600" size={24} />
                Admin Dashboard
              </h1>
            </div>
            <div className="text-sm text-slate-500 font-medium">
              {users.length} Total Users
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
            <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Approved</p>
            <p className="text-2xl font-bold">{users.filter(u => u.isApproved).length}</p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold">{users.filter(u => !u.isApproved && !u.trialExpiresAt).length}</p>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">On Trial</p>
            <p className="text-2xl font-bold">{users.filter(u => u.trialExpiresAt && u.trialExpiresAt > Date.now()).length}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 shadow-sm"
            />
          </div>
          <div className="flex bg-white dark:bg-[#1E1E1E] p-1 rounded-xl border border-primary-100 dark:border-primary-900/30 shadow-sm">
            {[
              { id: 'all', label: 'All' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending', label: 'Pending' },
              { id: 'trial', label: 'Trial' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table/List */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/30">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trial Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 dark:divide-primary-900/30">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-primary-50/30 dark:hover:bg-primary-900/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3 overflow-hidden">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-primary-600 font-bold">{user.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                            <div className="text-xs text-slate-500 flex items-center">
                              <Mail size={12} className="mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isApproved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 size={12} className="mr-1" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            <XCircle size={12} className="mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleRole(user.id, user.role || 'user')}
                          disabled={actionLoading === user.id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}
                        >
                          {user.role === 'admin' ? <ShieldCheck size={12} className="mr-1" /> : <Shield size={12} className="mr-1" />}
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {user.trialExpiresAt ? (
                          <div className="text-xs">
                            <div className={`font-medium ${user.trialExpiresAt > Date.now() ? 'text-purple-600' : 'text-red-500'}`}>
                              {user.trialExpiresAt > Date.now() ? 'Active Trial' : 'Trial Expired'}
                            </div>
                            <div className="text-slate-500 flex items-center mt-1">
                              <Calendar size={12} className="mr-1" />
                              {format(user.trialExpiresAt, 'MMM d, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No trial</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleApproval(user.id, user.isApproved || false)}
                            disabled={actionLoading === user.id}
                            className={`p-2 rounded-lg transition-colors ${user.isApproved ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                            title={user.isApproved ? "Revoke Access" : "Approve User"}
                          >
                            {actionLoading === user.id ? <Loader2 size={18} className="animate-spin" /> : (user.isApproved ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />)}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No users found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        isDestructive={modalConfig.isDestructive}
      />
    </div>
  );
}
