import { useParams, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { ArrowLeft, Users, CheckSquare, ShoppingCart, BarChart2, MessageSquare, DollarSign, Settings, CheckCircle, Archive, LogOut } from "lucide-react";
import { useState } from "react";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { projects, members, currentUser, updateProjectStatus, archiveProject, unarchiveProject, leaveProject } = useStore();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const project = projects.find((p) => p.id === id);
  const userRole = members.find((m) => m.projectId === id && m.userId === currentUser?.id)?.role;

  if (!project || !currentUser || !userRole) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
        <p className="text-slate-500 mb-6">This project may have been deleted or you don't have access.</p>
        <button onClick={() => navigate('/')} className="bg-primary-700 text-white px-6 py-3 rounded-xl font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
    { id: 'shopping', icon: <ShoppingCart size={20} />, label: 'Shopping' },
    { id: 'payments', icon: <DollarSign size={20} />, label: 'Payments' },
    { id: 'polls', icon: <BarChart2 size={20} />, label: 'Polls' },
    { id: 'members', icon: <Users size={20} />, label: 'Members' },
  ];

  return (
    <div className="flex flex-col h-screen bg-primary-50/30 dark:bg-[#121212] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-[#1E1E1E] border-b border-primary-100 dark:border-primary-900/30 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1 min-w-0 px-4 text-center">
            <h1 className="text-lg font-bold truncate">{project.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${project.status === 'completed' ? 'bg-emerald-500' : 'bg-primary-500'}`}></span>
              {project.status === 'completed' ? 'Completed' : 'Active'} • {project.isArchived ? 'Archived' : userRole === 'leader' ? 'Leader' : 'Member'}
            </p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <Settings size={24} />
            </button>
            
            {showSettingsMenu && (
              <div className="absolute top-12 right-0 bg-white dark:bg-[#2C2C2C] rounded-xl shadow-lg border border-primary-100 dark:border-primary-900/30 py-1 z-50 min-w-[180px]">
                {userRole === 'leader' && (
                  <button
                    onClick={() => {
                      updateProjectStatus(project.id, project.status === 'completed' ? 'active' : 'completed');
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center border-b border-primary-100 dark:border-primary-900/30"
                  >
                    <CheckCircle size={16} className="mr-3 text-emerald-500" />
                    Mark as {project.status === 'completed' ? 'Active' : 'Completed'}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (project.isArchived) {
                      unarchiveProject(project.id);
                    } else {
                      archiveProject(project.id);
                    }
                    setShowSettingsMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center"
                >
                  <Archive size={16} className="mr-3" />
                  {project.isArchived ? 'Unarchive' : 'Archive'}
                </button>

                <button
                  onClick={() => {
                    setConfirmLeave(true);
                    setShowSettingsMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center"
                >
                  <LogOut size={16} className="mr-3" />
                  Leave Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-primary-100 dark:border-primary-900/30">
          {tabs.map((tab) => {
            const isActive = location.pathname.includes(`/project/${id}/${tab.id}`) || 
                             (tab.id === 'tasks' && location.pathname === `/project/${id}`);
            
            return (
              <Link
                key={tab.id}
                to={`/project/${id}/${tab.id}`}
                className={`flex items-center px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                  isActive 
                    ? 'border-primary-700 text-primary-700 dark:border-primary-500 dark:text-primary-500 font-medium bg-primary-50/50 dark:bg-primary-950/10' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet context={{ project, userRole }} />
      </main>

      {confirmLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold mb-2">Leave Project</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {userRole === 'leader' 
                ? "Are you sure you want to leave? As the leader, this will delete the project for everyone." 
                : "Are you sure you want to leave this project?"}
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmLeave(false)} 
                className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-medium bg-primary-50 dark:bg-primary-900/20 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  leaveProject(project.id);
                  setConfirmLeave(false);
                  navigate('/');
                }} 
                className="flex-1 py-3 bg-rose-600 text-white font-medium rounded-xl"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
