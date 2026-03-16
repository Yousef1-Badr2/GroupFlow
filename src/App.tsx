import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';

import Layout from './components/Layout';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Account from './pages/Account';

import ProjectDetails from './pages/ProjectDetails';
import TasksSubtab from './pages/project/TasksSubtab';
import MembersSubtab from './pages/project/MembersSubtab';
import ShoppingSubtab from './pages/project/ShoppingSubtab';
import PollsSubtab from './pages/project/PollsSubtab';
import ChatSubtab from './pages/project/ChatSubtab';
import PaymentsSubtab from './pages/project/PaymentsSubtab';

export default function App() {
  const { theme, colorTheme } = useStore();

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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="account" element={<Account />} />
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
      </Routes>
    </BrowserRouter>
  );
}
