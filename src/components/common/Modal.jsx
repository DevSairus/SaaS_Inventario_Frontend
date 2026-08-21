import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };
  // Fallback a 'md' si se pasa un size inválido (ej. "large") -- sin esto
  // sizes[size] da undefined, el modal queda sin max-w y se desborda a lo ancho.
  const sizeCls = sizes[size] || sizes.md;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4">
        <div
          className={`relative bg-white dark:bg-graphite rounded-lg shadow-xl ${sizeCls} w-full my-8 max-h-[85vh] flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b dark:border-white/10 flex-shrink-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 dark:text-gray-100 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
