import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

interface RawViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: any;
}

export const RawViewModal: React.FC<RawViewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
      onClick={handleOutsideClick}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl border border-border-light shadow-2xl flex flex-col transition-all duration-300 ease-in-out animate-scaleUp overflow-hidden ${
          isMaximized ? 'w-full h-full max-w-6xl max-h-[95vh]' : 'w-full max-w-2xl max-h-[85vh]'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-light bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-md hover:bg-slate-200 text-text-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-slate-50 flex-grow flex flex-col">
          <div className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl flex flex-col transition-all duration-300 ${
            isMaximized ? 'flex-grow' : ''
          }`}>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800/80 shrink-0 group/lights">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-rose-500/90 flex items-center justify-center text-[8px] text-rose-900/80 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Close"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none">
                    <X className="w-[8px] h-[8px] stroke-[4]" />
                  </span>
                </button>
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-3 h-3 rounded-full bg-amber-500/90 flex items-center justify-center text-[8px] text-amber-900/80 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Minimize"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none text-black">
                    -
                  </span>
                </button>
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="w-3 h-3 rounded-full bg-emerald-500/90 flex items-center justify-center text-[8px] text-emerald-950 font-bold transition-all relative overflow-hidden focus:outline-none"
                  title="Maximize"
                >
                  <span className="opacity-0 group-hover/lights:opacity-100 absolute select-none flex items-center justify-center w-full h-full leading-none">
                    +
                  </span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest font-semibold uppercase select-none">
                plugin_details.json
              </span>
              <span className="w-12" /> {/* Spacer for centering */}
            </div>
            
            <div className={`transition-all duration-300 ease-in-out ${isMinimized ? 'h-0 opacity-0 overflow-hidden' : 'opacity-100 flex-grow'}`}>
              <pre className={`p-5 bg-slate-950 text-emerald-400 text-xs font-mono leading-relaxed overflow-x-auto select-all custom-scrollbar ${
                isMaximized ? 'h-full max-h-none' : 'max-h-[500px]'
              }`}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
