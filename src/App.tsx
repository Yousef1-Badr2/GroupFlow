import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';

import Layout from './components/Layout';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Account from './pages/Account';
import Login from './pages/Login';
import { Toaster } from 'sonner';
import FirebaseSync from './components/FirebaseSync';
import { isUserApproved } from './lib/userUtils';

import ProjectDetails from './pages/ProjectDetails';
import TasksSubtab from './pages/project/TasksSubtab';
import MembersSubtab from './pages/project/MembersSubtab';
import ShoppingSubtab from './pages/project/ShoppingSubtab';
import PollsSubtab from './pages/project/PollsSubtab';
import ChatSubtab from './pages/project/ChatSubtab';
import PaymentsSubtab from './pages/project/PaymentsSubtab';

import InviteCodeScreen from './pages/InviteCodeScreen';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { theme, colorTheme, currentUser, isAuthReady } = useStore();

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
      
      // Apply color theme
      root.setAttribute('data-theme', colorTheme);
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, colorTheme]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <FirebaseSync />
      {!isAuthReady ? (
        <div className="min-h-screen bg-primary-50 dark:bg-[#121212] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Routes>
          {!currentUser ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : !isUserApproved(currentUser) ? (
            <>
              <Route path="/invite" element={<InviteCodeScreen />} />
              <Route path="*" element={<Navigate to="/invite" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Layout />}>
                <Route index element={<Projects />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="account" element={<Account />} />
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
              
              <Route path="/project/:id" element={<ProjectDetails />}>
                <Route index element={<Navigate to="tasks" replace />} />
                <Route path="tasks" element={<TasksSubtab />} />
                <Route path="members" element={<MembersSubtab />} />
                <Route path="shopping" element={<ShoppingSubtab />} />
                <Route path="polls" element={<PollsSubtab />} />
                <Route path="chat" element={<ChatSubtab />} />
                <Route path="payments" element={<PaymentsSubtab />} />
              </Route>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/invite" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      )}
    </BrowserRouter>
  );
}
