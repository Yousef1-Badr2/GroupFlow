import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-primary-100 dark:border-primary-900/30">
          <h3 className="text-xl font-bold">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-2xl ${isDestructive ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20' : 'bg-primary-100 text-primary-600 dark:bg-primary-900/20'}`}>
              <AlertTriangle size={24} />
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="p-6 bg-primary-50/50 dark:bg-primary-900/10 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-xl font-bold hover:bg-primary-50 dark:hover:bg-primary-900/40 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 text-white rounded-xl font-bold shadow-md transition-colors ${isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-700 hover:bg-primary-800'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
