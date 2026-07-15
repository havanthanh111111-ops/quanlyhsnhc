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
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-500/20',
    warning: 'bg-amber-600 hover:bg-amber-700 text-black font-bold',
    info: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  };

  const icons = {
    danger: <AlertTriangle className="text-red-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
    info: <HelpCircle className="text-emerald-500" size={20} />
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-white/10"
        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
      >
        <div className="flex items-center gap-3">
          {icons[type]}
          <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#ffffff' }}>{title}</h3>
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#cbd5e1' }}>{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${buttonColors[type]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
