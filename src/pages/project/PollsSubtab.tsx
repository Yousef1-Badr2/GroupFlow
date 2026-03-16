import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, BarChart2, CheckCircle2 } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";

export default function PollsSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { polls, votes, currentUser, votePoll, closePoll } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const projectPolls = polls.filter(p => p.projectId === project.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="h-full flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        {projectPolls.length === 0 ? (
          <div className="text-center py-10 text-slate-500 flex flex-col items-center">
            <BarChart2 size={48} className="text-slate-300 mb-4" />
            <p>No polls created yet.</p>
          </div>
        ) : (
          projectPolls.map((poll) => {
            const pollVotes = votes.filter(v => v.pollId === poll.id);
            const totalVotes = pollVotes.length;
            const uniqueVotersCount = new Set(pollVotes.map(v => v.userId)).size;
            const myVotes = currentUser ? pollVotes.filter(v => v.userId === currentUser.id) : [];

            return (
              <div key={poll.id} className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{poll.question}</h3>
                    {poll.allowMultipleChoices && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multiple choices allowed</p>
                    )}
                  </div>
                  {poll.closed ? (
                    <span className="text-xs font-bold uppercase tracking-wider bg-primary-50 text-slate-600 dark:bg-primary-900/20 dark:text-slate-400 px-2 py-1 rounded-full whitespace-nowrap">
                      Closed
                    </span>
                  ) : userRole === 'leader' && !project.isArchived ? (
                    <button 
                      onClick={() => closePoll(poll.id)}
                      className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
                    >
                      Close Poll
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {poll.options.map((option, index) => {
                    const optionVotes = pollVotes.filter(v => v.optionIndex === index).length;
                    const percentageBase = poll.allowMultipleChoices ? uniqueVotersCount : totalVotes;
                    const percentage = percentageBase === 0 ? 0 : Math.round((optionVotes / percentageBase) * 100);
                    const isMyVote = myVotes.some(v => v.optionIndex === index);

                    return (
                      <div key={index} className="relative">
                        <button
                          onClick={() => !poll.closed && !project.isArchived && votePoll(poll.id, index)}
                          disabled={poll.closed || project.isArchived}
                          className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all relative z-10 ${
                            isMyVote 
                              ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 text-primary-950 dark:text-primary-100' 
                              : 'border-primary-100 dark:border-primary-900/30 bg-white dark:bg-[#1E1E1E] hover:border-primary-400 dark:hover:border-primary-800'
                          }`}
                        >
                          <span className="font-medium flex items-center">
                            {isMyVote && <CheckCircle2 size={16} className="mr-2 text-primary-600" />}
                            {option}
                          </span>
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {percentage}% ({optionVotes})
                          </span>
                        </button>
                        
                        {/* Progress Bar Background */}
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-xl transition-all duration-500 ease-out ${
                            isMyVote ? 'bg-primary-100 dark:bg-primary-950/40' : 'bg-primary-50/50 dark:bg-primary-900/20'
                          }`}
                          style={{ width: `${percentage}%`, zIndex: 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-right">
                  {poll.allowMultipleChoices 
                    ? `${uniqueVotersCount} voter${uniqueVotersCount !== 1 ? 's' : ''} (${totalVotes} total vote${totalVotes !== 1 ? 's' : ''})`
                    : `${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}`
                  }
                </p>
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

      {showAddModal && <AddPollModal projectId={project.id} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function AddPollModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const createPoll = useStore(state => state.createPoll);

  const handleAddOption = () => setOptions([...options, ""]);
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim() !== "");
    if (question.trim() && validOptions.length >= 2) {
      createPoll({
        projectId,
        question: question.trim(),
        options: validOptions,
        allowMultipleChoices
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6 max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">Create Poll</h2>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Options</label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                  {options.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveOption(index)}
                      className="p-3 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={handleAddOption}
              className="mt-2 text-sm font-bold text-primary-700 dark:text-primary-500 hover:underline"
            >
              + Add Option
            </button>
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="allowMultiple"
              checked={allowMultipleChoices}
              onChange={(e) => setAllowMultipleChoices(e.target.checked)}
              className="w-4 h-4 text-primary-700 bg-slate-100 border-slate-300 rounded focus:ring-primary-600 dark:focus:ring-primary-700 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
            />
            <label htmlFor="allowMultiple" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Allow multiple choices
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-primary-100 dark:border-primary-900/30">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={!question.trim() || options.filter(o => o.trim() !== "").length < 2} 
              className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
