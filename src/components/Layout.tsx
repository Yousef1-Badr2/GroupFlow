import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { FolderKanban, CheckSquare, Bell, User } from "lucide-react";
import { useStore } from "../store";

export default function Layout() {
  const notifications = useStore((state) => state.notifications);
  const currentUser = useStore((state) => state.currentUser);
  const unreadCount = notifications.filter((n) => !n.read && (!n.userId || n.userId === currentUser?.id)).length;

  return (
    <div className="flex flex-col h-screen bg-primary-50/30 dark:bg-[#121212] text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-white dark:bg-[#1E1E1E] border-t border-primary-100 dark:border-primary-900/30 flex justify-around items-center h-16 px-2 z-50 transition-colors">
        <NavItem to="/" icon={<FolderKanban size={24} />} label="Projects" />
        <NavItem to="/tasks" icon={<CheckSquare size={24} />} label="Tasks" />
        <NavItem 
          to="/notifications" 
          icon={
            <div className="relative">
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          } 
          label="Alerts" 
        />
        <NavItem to="/account" icon={<User size={24} />} label="Account" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 ${
          isActive
            ? "text-primary-700 dark:text-primary-500"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`
      }
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}
