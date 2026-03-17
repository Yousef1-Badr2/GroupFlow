import React, { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Send, Image as ImageIcon, Smile, X, Loader2 } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import { format } from "date-fns";
import * as firestoreService from "../../lib/firestoreService";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

export default function ChatSubtab() {
  const { project } = useOutletContext<{ project: Project; userRole: Role }>();
  const { messages, currentUser, users, theme } = useStore();
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const emojiTheme = theme === 'dark' ? Theme.DARK : theme === 'light' ? Theme.LIGHT : Theme.AUTO;

  const projectMessages = messages.filter(m => m.projectId === project.id).sort((a, b) => a.timestamp - b.timestamp);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [projectMessages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedImage) || !currentUser || isUploading) return;

    try {
      setIsUploading(true);
      let imageUrl = "";
      
      if (selectedImage) {
        imageUrl = await firestoreService.uploadImage(selectedImage, `projects/${project.id}/chat`);
      }

      await firestoreService.sendMessage({
        projectId: project.id,
        userId: currentUser.id,
        text: text.trim(),
        ...(imageUrl ? { imageUrl } : {})
      });
      
      setText("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const getUserName = (userId: string) => {
    if (userId === currentUser?.id) return "You";
    const user = users.find(u => u.id === userId);
    return user?.name || `User ${userId.substring(0, 4)}`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setText(prev => prev + emojiData.emoji);
  };

  return (
    <div className="h-full flex flex-col bg-primary-50/30 dark:bg-[#121212] relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
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
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="max-w-full rounded-xl mb-2 object-contain max-h-64"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
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
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1E1E1E] border-t border-primary-100 dark:border-primary-900/30 p-3 pb-safe z-10">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-primary-200 dark:border-primary-800" />
              <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          {showEmojiPicker && (
            <div className="absolute bottom-full right-4 mb-2 z-50" ref={emojiPickerRef}>
              <EmojiPicker onEmojiClick={onEmojiClick} theme={emojiTheme} width={300} height={400} />
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
            >
              <ImageIcon size={24} />
            </button>
            <button 
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-slate-400 hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
            >
              <Smile size={24} />
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
              disabled={(!text.trim() && !selectedImage) || isUploading}
              className="p-2.5 bg-primary-700 text-white rounded-full disabled:opacity-50 hover:bg-primary-800 transition-colors flex items-center justify-center min-w-[40px]"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
