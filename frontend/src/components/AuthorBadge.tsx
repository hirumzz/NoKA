import React, { useState } from 'react';
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

  if (!username || username === '-' || username === 'anonymous') {
    return <span className="text-text-muted font-normal text-xs">-</span>;
  }

  const cleanFullName = fullName && fullName.trim() !== '' && fullName !== '-' ? fullName : null;
  const initial = (cleanFullName ? cleanFullName.charAt(0) : username.charAt(0)).toUpperCase();
  const isUpdated = labelPrefix?.toLowerCase().includes('update');

  return (
    <div 
      className={`relative inline-flex items-center gap-2 group cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
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

      {/* Floating Modern Profile Card (Popover Tooltip) */}
      {isHovered && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none animate-scaleUp"
          style={{ minWidth: '240px' }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-border-light/80 shadow-2xl p-3.5 text-text-primary">
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-border-light/60">
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

          {/* Pointer Arrow */}
          <div className="w-2.5 h-2.5 bg-white border-r border-b border-border-light/80 rotate-45 mx-auto -mt-1.5 shadow-xs" />
        </div>
      )}
    </div>
  );
};
