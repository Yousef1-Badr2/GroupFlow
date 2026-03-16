import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, MessageSquare, ListTodo, CreditCard, Info } from "lucide-react";
import { useStore } from "../store";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { currentUser, notifications, projects, markNotificationRead } = useStore();
  const [filter, setFilter] = useState<"all" | "task" | "message" | "poll" | "payment">("all");

  if (!currentUser) return null;

  const filteredNotifications = notifications.filter(n => {
    if (n.userId && n.userId !== currentUser.id) return false;
    if (filter !== "all" && n.type !== filter) return false;
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <ListTodo size={20} className="text-primary-600" />;
      case 'message': return <MessageSquare size={20} className="text-green-500" />;
      case 'poll': return <CheckCircle2 size={20} className="text-purple-500" />;
      case 'payment': return <CreditCard size={20} className="text-orange-500" />;
      default: return <Info size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 pt-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {['all', 'task', 'message', 'poll', 'payment'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type 
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-10 text-slate-500 flex flex-col items-center">
            <Bell size={48} className="text-slate-300 mb-4" />
            <p>You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const project = projects.find(p => p.id === notification.projectId);
            
            return (
              <div 
                key={notification.id} 
                onClick={() => !notification.read && markNotificationRead(notification.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notification.read 
                    ? 'bg-white dark:bg-[#1E1E1E] border-slate-100 dark:border-slate-800 opacity-70' 
                    : 'bg-primary-50 dark:bg-primary-950/10 border-primary-100 dark:border-primary-950/30 shadow-sm'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-full ${notification.read ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-base font-bold truncate pr-2 ${notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-sm mb-2 ${notification.read ? 'text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                      {notification.description}
                    </p>
                    {project && (
                      <Link 
                        to={`/project/${project.id}`}
                        className="inline-flex items-center text-xs font-medium text-primary-700 dark:text-primary-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.title}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
