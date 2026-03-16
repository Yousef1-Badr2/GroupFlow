import { useState } from "react";
import { Search, CheckSquare, Clock } from "lucide-react";
import { useStore } from "../store";
import { format, isPast, isToday, isTomorrow } from "date-fns";

export default function Tasks() {
  const { currentUser, tasks, projects, members, toggleTask } = useStore();
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  if (!currentUser) return null;

  // Get all active projects the user is part of
  const activeProjectIds = projects
    .filter(p => !p.isArchived && members.some(m => m.projectId === p.id && m.userId === currentUser.id))
    .map(p => p.id);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (!activeProjectIds.includes(task.projectId)) return false;
    if (!showCompleted && task.completed) return false;
    if (search && !task.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.dueDate - b.dueDate);

  // Group by project
  const tasksByProject = filteredTasks.reduce((acc, task) => {
    if (!acc[task.projectId]) acc[task.projectId] = [];
    acc[task.projectId].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const formatDueDate = (dateNum: number) => {
    if (isToday(dateNum)) return `Today, ${format(dateNum, 'h:mm a')}`;
    if (isTomorrow(dateNum)) return `Tomorrow, ${format(dateNum, 'h:mm a')}`;
    return format(dateNum, 'MMM d, h:mm a');
  };

  return (
    <div className="p-4 max-w-md mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 pt-4">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${showCompleted ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/30 dark:text-primary-500' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
        >
          {showCompleted ? "Hide Completed" : "Show Completed"}
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 transition-shadow"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-6">
        {Object.keys(tasksByProject).length === 0 ? (
          <div className="text-center py-10 text-slate-500 flex flex-col items-center">
            <CheckSquare size={48} className="text-slate-300 mb-4" />
            <p>No tasks found.</p>
          </div>
        ) : (
          Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
            const project = projects.find(p => p.id === projectId);
            if (!project) return null;

            return (
              <div key={projectId} className="space-y-3">
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-[#121212] py-2 z-10">
                  {project.title}
                </h2>
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  {projectTasks.map((task, index) => {
                    const isOverdue = !task.completed && isPast(task.dueDate) && !isToday(task.dueDate);
                    const isAssignedToMe = task.assignedTo.includes(currentUser.id);

                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 flex items-start gap-3 ${index !== projectTasks.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''} ${task.completed ? 'opacity-60' : ''}`}
                      >
                        <button 
                          onClick={() => toggleTask(task.id)}
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
                          
                          <div className="flex items-center mt-2 space-x-3">
                            <div className={`flex items-center text-xs font-medium ${isOverdue ? 'text-primary-500' : 'text-slate-500 dark:text-slate-400'}`}>
                              <Clock size={12} className="mr-1" />
                              {formatDueDate(task.dueDate)}
                            </div>
                            
                            {isAssignedToMe && (
                              <span className="text-[10px] uppercase tracking-wider bg-primary-100 text-primary-800 dark:bg-primary-950/40 dark:text-primary-500 px-2 py-0.5 rounded-full font-bold">
                                Me
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
