import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function CustomConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Đồng ý',
  cancelLabel = 'Hủy',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-500/20 shadow-sm',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
  };

  const icons = {
    danger: <AlertTriangle className="text-red-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
    info: <HelpCircle className="text-blue-500" size={20} />
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 bg-white"
      >
        <div className="flex items-center gap-3">
          {icons[type]}
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap font-medium">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${buttonColors[type]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
