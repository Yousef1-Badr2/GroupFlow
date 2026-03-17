import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { User, Shield, UserMinus, Key, Copy, Check } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import * as firestoreService from "../../lib/firestoreService";

export default function MembersSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { members, currentUser } = useStore();
  const [copied, setCopied] = useState(false);

  const projectMembers = members.filter(m => m.projectId === project.id);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(project.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateJoinCode = async () => {
    try {
      await firestoreService.regenerateJoinCode(project.id);
    } catch (error) {
      console.error("Failed to regenerate join code:", error);
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    try {
      await firestoreService.promoteMember(project.id, memberId);
    } catch (error) {
      console.error("Failed to promote member:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await firestoreService.removeMember(project.id, memberId);
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-6">
      {/* Join Code Section (Only for active projects) */}
      {!project.isArchived && (
        <div className="bg-primary-50 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-950/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-primary-900 dark:text-primary-400 uppercase tracking-wider flex items-center">
              <Key size={16} className="mr-2" />
              Join Code
            </h3>
            {userRole === 'leader' && (
              <button 
                onClick={handleRegenerateJoinCode}
                className="text-xs font-medium text-primary-700 dark:text-primary-500 hover:underline"
              >
                Regenerate
              </button>
            )}
          </div>
          <div className="flex items-center justify-between bg-white dark:bg-[#121212] rounded-xl p-3 border border-primary-100 dark:border-primary-950/30">
            <span className="text-2xl font-mono font-bold tracking-[0.2em] text-slate-800 dark:text-slate-200 ml-2">
              {project.joinCode}
            </span>
            <button 
              onClick={handleCopyCode}
              className="p-2 bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-500 rounded-lg hover:bg-primary-300 dark:hover:bg-primary-950/60 transition-colors"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-2">
          Team Members ({projectMembers.length})
        </h3>
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden divide-y divide-primary-100 dark:divide-primary-900/30">
          {projectMembers.map((member) => {
            const isMe = currentUser?.id === member.userId;
            // In a real app, we'd fetch user details from a users table.
            // For this local app, we'll just use a placeholder name if it's not the current user.
            const displayName = isMe ? currentUser?.name : `User ${member.userId.substring(0, 4)}`;

            return (
              <div key={member.userId} className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mr-3">
                    <User size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      {displayName}
                      {isMe && <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary-50 text-slate-600 dark:bg-primary-900/20 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">You</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                      {member.role === 'leader' ? (
                        <><Shield size={12} className="mr-1 text-primary-600" /> Leader</>
                      ) : (
                        'Member'
                      )}
                    </p>
                  </div>
                </div>

                {userRole === 'leader' && !isMe && !project.isArchived && (
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePromoteMember(member.userId)}
                      className="p-2 text-slate-400 hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
                      title="Make Leader"
                    >
                      <Shield size={18} />
                    </button>
                    <button 
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Remove Member"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
