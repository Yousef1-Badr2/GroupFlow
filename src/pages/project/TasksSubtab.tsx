import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, CheckSquare, Clock } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import * as firestoreService from "../../lib/firestoreService";

export default function TasksSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { tasks, members, currentUser } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const projectTasks = tasks.filter(t => t.projectId === project.id).sort((a, b) => a.dueDate - b.dueDate);
  const projectMembers = members.filter(m => m.projectId === project.id);

  const formatDueDate = (dateNum: number) => {
    if (isToday(dateNum)) return `Today`;
    if (isTomorrow(dateNum)) return `Tomorrow`;
    const dateYear = new Date(dateNum).getFullYear();
    const currentYear = new Date().getFullYear();
    if (dateYear === currentYear) {
      return format(dateNum, 'MMM d');
    }
    return format(dateNum, 'MMM d, yyyy');
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!currentUser) return;
    try {
      await firestoreService.toggleTask(project.id, taskId, !completed, currentUser.id);
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto space-y-3 pb-20">
        {projectTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-500 flex flex-col items-center">
            <CheckSquare size={48} className="text-slate-300 mb-4" />
            <p>No tasks for this project yet.</p>
          </div>
        ) : (
          projectTasks.map((task) => {
            const isOverdue = !task.completed && isPast(task.dueDate) && !isToday(task.dueDate);
            const isAssignedToMe = currentUser && task.assignedTo.includes(currentUser.id);

            return (
              <div 
                key={task.id} 
                className={`bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 flex items-start gap-3 transition-opacity ${task.completed ? 'opacity-60' : ''}`}
              >
                <button 
                  onClick={() => !project.isArchived && handleToggleTask(task.id, task.completed)}
                  disabled={project.isArchived}
                  className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    task.completed 
                      ? 'bg-primary-600 border-primary-600 text-white' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-primary-600'
                  }`}
                >
                  {task.completed && <CheckSquare size={16} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                    {task.description}
                  </p>
                  
                  <div className="flex items-center mt-2 space-x-3 flex-wrap gap-y-2">
                    <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-primary-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Clock size={12} className="mr-1" />
                      {formatDueDate(task.dueDate)}
                    </div>
                    
                    {task.assignedTo.length > 0 && !task.completed && (
                      <div className="flex gap-1">
                        {task.assignedTo.map(userId => {
                          const isMe = currentUser && userId === currentUser.id;
                          const displayName = isMe ? "Me" : `User ${userId.substring(0, 4)}`;
                          return (
                            <span key={userId} className="text-[10px] uppercase tracking-wider bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-500 px-2 py-0.5 rounded-full font-bold">
                              {displayName}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {task.completed && task.completedBy && (
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Done by {task.completedBy === currentUser?.id ? "Me" : `User ${task.completedBy.substring(0, 4)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!project.isArchived && (
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute bottom-6 right-6 bg-primary-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-800 transition-colors"
        >
          <Plus size={24} />
        </button>
      )}

      {showAddModal && (
        <AddTaskModal 
          projectId={project.id} 
          members={projectMembers} 
          userRole={userRole}
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  );
}

function AddTaskModal({ projectId, members, userRole, currentUser, onClose }: { projectId: string; members: any[]; userRole: Role; currentUser: any; onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && dueDate) {
      // Parse the date as local time to avoid timezone shifts
      const [year, month, day] = dueDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      try {
        await firestoreService.addTask({
          projectId,
          description: description.trim(),
          dueDate: dateObj.getTime(),
          assignedTo
        });
        onClose();
      } catch (error) {
        console.error("Failed to add task:", error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Add Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {userRole === 'leader' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign To</label>
              <div className="space-y-2 max-h-32 overflow-y-auto bg-primary-50/50 dark:bg-[#121212] p-3 rounded-xl border border-primary-100 dark:border-primary-900/30">
                {members.map(m => {
                  const isMe = m.userId === currentUser?.id;
                  const displayName = isMe ? "Me" : `User ${m.userId.substring(0, 4)}`;
                  return (
                    <label key={m.userId} className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assignedTo.includes(m.userId)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedTo([...assignedTo, m.userId]);
                          else setAssignedTo(assignedTo.filter(id => id !== m.userId));
                        }}
                        className="w-4 h-4 text-primary-700 bg-white border-slate-300 rounded focus:ring-primary-600 dark:focus:ring-primary-700 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button type="submit" disabled={!description.trim() || !dueDate} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
