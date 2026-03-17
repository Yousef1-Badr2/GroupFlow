import React, { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Send, Image as ImageIcon } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import { format } from "date-fns";
import * as firestoreService from "../../lib/firestoreService";

export default function ChatSubtab() {
  const { project } = useOutletContext<{ project: Project; userRole: Role }>();
  const { messages, currentUser } = useStore();
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const projectMessages = messages.filter(m => m.projectId === project.id).sort((a, b) => a.timestamp - b.timestamp);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [projectMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && currentUser) {
      try {
        await firestoreService.sendMessage({
          projectId: project.id,
          userId: currentUser.id,
          text: text.trim()
        });
        setText("");
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const getUserName = (userId: string) => {
    if (userId === currentUser?.id) return "You";
    // In a real app, fetch from users table. Here we use a placeholder or check if it's the current user.
    return `User ${userId.substring(0, 4)}`;
  };

  return (
    <div className="h-full flex flex-col bg-primary-50/30 dark:bg-[#121212]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {projectMessages.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          projectMessages.map((msg, index) => {
            const isMe = msg.userId === currentUser?.id;
            const showName = index === 0 || projectMessages[index - 1].userId !== msg.userId;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 ml-1 mr-1">
                    {getUserName(msg.userId)}
                  </span>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                    isMe 
                      ? 'bg-primary-700 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-[#1E1E1E] border border-primary-100 dark:border-primary-900/30 text-slate-900 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <span className={`text-[10px] mt-1 block text-right ${isMe ? 'text-primary-300' : 'text-slate-400'}`}>
                    {format(msg.timestamp, 'h:mm a')}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {!project.isArchived && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1E1E1E] border-t border-primary-100 dark:border-primary-900/30 p-3 pb-safe">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button 
              type="button"
              className="p-2 text-slate-400 hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
            >
              <ImageIcon size={24} />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-primary-50/50 dark:bg-[#121212] border-none rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm"
            />
            <button 
              type="submit"
              disabled={!text.trim()}
              className="p-2.5 bg-primary-700 text-white rounded-full disabled:opacity-50 hover:bg-primary-800 transition-colors flex items-center justify-center"
            >
              <Send size={20} className="ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
