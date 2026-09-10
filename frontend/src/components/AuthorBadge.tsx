import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mail, User } from 'lucide-react';

interface AuthorBadgeProps {
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
  labelPrefix?: string;
  className?: string;
}

export const AuthorBadge: React.FC<AuthorBadgeProps> = ({
  username,
  fullName,
  email,
  labelPrefix,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openDownward: boolean }>({
    top: 0,
    left: 0,
    openDownward: false
  });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!username || username === '-' || username === 'anonymous') {
    return <span className="text-text-muted font-normal text-xs">-</span>;
  }

  const cleanFullName = fullName && fullName.trim() !== '' && fullName !== '-' ? fullName : null;
  const initial = (cleanFullName ? cleanFullName.charAt(0) : username.charAt(0)).toUpperCase();
  const isUpdated = labelPrefix?.toLowerCase().includes('update');

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const CARD_WIDTH = 260;
    const CARD_HEIGHT = 160;

    // Determine if we should open downward or upward based on viewport clearance
    const shouldOpenDownward = rect.top < 200 || (rect.top - CARD_HEIGHT < 10);

    // Calculate vertical position
    const top = shouldOpenDownward 
      ? rect.bottom + 8 
      : rect.top - 8;

    // Center horizontally on the badge, clamped safely within screen bounds
    const centerX = rect.left + rect.width / 2;
    let left = centerX - CARD_WIDTH / 2;
    if (left < 16) left = 16;
    if (left + CARD_WIDTH > window.innerWidth - 16) {
      left = window.innerWidth - CARD_WIDTH - 16;
    }

    setCoords({
      top,
      left,
      openDownward: shouldOpenDownward
    });
    setIsHovered(true);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex items-center gap-2 group cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar Circle */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200 shadow-2xs ${
        isUpdated 
          ? 'bg-blue-50 text-blue-600 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
          : 'bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
      }`}>
        {initial}
      </div>

      {/* Name Text */}
      <div className="flex flex-col min-w-0 text-left">
        <span className="text-xs font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
          {username}
        </span>
        {cleanFullName && cleanFullName !== username && (
          <span className="text-[10px] text-text-muted font-medium truncate max-w-[130px] leading-tight">
            {cleanFullName}
          </span>
        )}
      </div>

      {/* Floating Modern Profile Card (Rendered into document.body via Portal to prevent table clipping) */}
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
          style={{ 
            top: coords.openDownward ? `${coords.top}px` : undefined,
            bottom: coords.openDownward ? undefined : `${window.innerHeight - coords.top}px`,
            left: `${coords.left}px`,
            width: '260px'
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-border-light shadow-2xl p-3.5 text-text-primary animate-scaleUp">
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border-light/60">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                isUpdated ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {labelPrefix || 'Author'}
              </span>
              <span className="text-[10px] font-mono text-text-muted">NOKA Member</span>
            </div>

            {/* Profile Info */}
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs ${
                isUpdated ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-text-primary truncate">
                  {cleanFullName || username}
                </h4>
                <div className="flex items-center gap-1 text-[11px] font-mono text-brand-primary font-semibold mt-0.5">
                  <User className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="truncate">@{username}</span>
                </div>
              </div>
            </div>

            {/* Email Row */}
            {email && (
              <div className="mt-2.5 pt-2 border-t border-border-light/60 flex items-center gap-1.5 text-[10px] font-medium text-text-secondary bg-slate-50/80 px-2.5 py-1.5 rounded-lg">
                <Mail className="w-3 h-3 text-text-muted shrink-0" />
                <span className="truncate select-all">{email}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
