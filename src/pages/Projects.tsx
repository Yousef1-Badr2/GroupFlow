import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Users, Archive, Folder, MoreVertical, LogOut, CheckCircle } from "lucide-react";
import { useStore } from "../store";
import { format } from "date-fns";
import * as firestoreService from "../lib/firestoreService";

export default function Projects() {
  const { currentUser, projects, members } = useStore();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<{ id: string, isLeader: boolean } | null>(null);
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Folder className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to GroupFlow</h2>
        <p className="text-slate-500 mb-6">Set up your account to start managing projects.</p>
        <Link to="/account" className="bg-primary-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm">
          Go to Account
        </Link>
      </div>
    );
  }

  const userProjects = projects.filter((p) =>
    members.some((m) => m.projectId === p.id && m.userId === currentUser.id)
  );

  const filteredProjects = userProjects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesArchive = p.isArchived === showArchived;
    return matchesSearch && matchesArchive;
  });

  const handleArchive = async (projectId: string, isArchived: boolean) => {
    try {
      await firestoreService.archiveProject(projectId, !isArchived);
    } catch (error) {
      console.error("Failed to archive project:", error);
    }
  };

  const handleUpdateStatus = async (projectId: string, currentStatus: string) => {
    try {
      await firestoreService.updateProjectStatus(projectId, currentStatus === 'completed' ? 'active' : 'completed');
    } catch (error) {
      console.error("Failed to update project status:", error);
    }
  };

  const handleLeave = async (projectId: string, isLeader: boolean) => {
    try {
      await firestoreService.leaveProject(projectId, currentUser.id, isLeader);
    } catch (error) {
      console.error("Failed to leave project:", error);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto h-full flex flex-col" onClick={() => setActiveMenu(null)}>
      <div className="flex items-center justify-between mb-6 pt-4">
        <h1 className="text-2xl font-bold">{showArchived ? 'Archived' : 'Projects'}</h1>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`p-2 rounded-full ${showArchived ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-500' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
        >
          <Archive size={20} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 transition-shadow"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            {showArchived ? "No archived projects." : "No active projects found."}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const memberCount = members.filter((m) => m.projectId === project.id).length;
            const userRole = members.find((m) => m.projectId === project.id && m.userId === currentUser.id)?.role;

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="block bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 hover:border-primary-300 dark:hover:border-primary-800 hover:shadow-md transition-all cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold truncate pr-2">{project.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                      userRole === 'leader' 
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-950/30 dark:text-primary-500' 
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {userRole === 'leader' ? 'Leader' : 'Member'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === project.id ? null : project.id);
                      }}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeMenu === project.id && (
                      <div className="absolute top-12 right-4 bg-white dark:bg-[#2C2C2C] rounded-xl shadow-lg border border-primary-100 dark:border-primary-900/30 py-1 z-20 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(project.id, project.isArchived);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center"
                        >
                          <Archive size={14} className="mr-2" />
                          {project.isArchived ? 'Unarchive' : 'Archive'}
                        </button>

                        {userRole === 'leader' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(project.id, project.status);
                              setActiveMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center"
                          >
                            <CheckCircle size={14} className="mr-2 text-emerald-500" />
                            {project.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmLeave({ id: project.id, isLeader: userRole === 'leader' });
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center"
                        >
                          <LogOut size={14} className="mr-2" />
                          Leave
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                  <div className="flex items-center mr-4">
                    <Users size={16} className="mr-1.5" />
                    <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-xs flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${project.status === 'completed' ? 'bg-emerald-500' : 'bg-primary-500'}`}></span>
                    {project.status === 'completed' ? 'Completed' : 'Active'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-20 right-4 flex flex-col items-end z-40">
        {showMenu && (
          <div className="flex flex-col items-end space-y-3 mb-4">
            <button
              onClick={() => { setShowJoinModal(true); setShowMenu(false); }}
              className="bg-primary-50 dark:bg-primary-900/20 text-slate-700 dark:text-slate-200 p-3 rounded-full shadow-lg border border-primary-100 dark:border-primary-900/30 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <span className="mr-2 font-medium px-2">Join Project</span>
              <Users size={20} />
            </button>
            <button
              onClick={() => { setShowCreateModal(true); setShowMenu(false); }}
              className="bg-primary-50 dark:bg-primary-900/20 text-slate-700 dark:text-slate-200 p-3 rounded-full shadow-lg border border-primary-100 dark:border-primary-900/30 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <span className="mr-2 font-medium px-2">Create Project</span>
              <Folder size={20} />
            </button>
          </div>
        )}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="bg-primary-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-800 transition-colors"
        >
          <Plus size={24} className={`transition-transform duration-200 ${showMenu ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Overlay to close menu when clicking outside */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Modals will go here, simplified for now */}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 w-full max-sm shadow-xl">
            <h2 className="text-xl font-bold mb-2">Leave Project</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {confirmLeave.isLeader 
                ? "Are you sure you want to leave? As the leader, this will delete the project for everyone." 
                : "Are you sure you want to leave this project?"}
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmLeave(null)} 
                className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-medium bg-primary-50 dark:bg-primary-900/20 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleLeave(confirmLeave.id, confirmLeave.isLeader);
                  setConfirmLeave(null);
                }} 
                className="flex-1 py-3 bg-rose-600 text-white font-medium rounded-xl"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinProjectModal onClose={() => setShowJoinModal(false)} />}
    </div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const { currentUser } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && currentUser) {
      await firestoreService.createProject(currentUser.id, title.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Create Project</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Project Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-primary-600"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinProjectModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const { currentUser } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() && currentUser) {
      const projectId = await firestoreService.joinProject(currentUser.id, code.trim().toUpperCase());
      if (projectId) {
        onClose();
      } else {
        setError("Invalid or archived join code.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Join Project</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter 6-character code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-primary-600 uppercase"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-rose-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end space-x-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button type="submit" disabled={!code.trim() || code.length < 6} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50">Join</button>
          </div>
        </form>
      </div>
    </div>
  );
}
