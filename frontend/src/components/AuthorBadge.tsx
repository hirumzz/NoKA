import React from 'react';

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
  if (!username || username === '-' || username === 'anonymous') {
    return <span className="text-text-muted font-normal text-xs">-</span>;
  }

  const cleanFullName = fullName && fullName.trim() !== '' && fullName !== '-' ? fullName : null;
  const tooltipText = cleanFullName 
    ? ((labelPrefix ? labelPrefix + ': ' : '') + cleanFullName + (email ? ' (' + email + ')' : '') + ' • @' + username)
    : ((labelPrefix ? labelPrefix + ': ' : '') + '@' + username + (email ? ' (' + email + ')' : ''));

  return (
    <div 
      className={'inline-flex items-center gap-1.5 group cursor-help transition-all ' + className}
      title={tooltipText}
    >
      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0 uppercase group-hover:bg-brand-primary/10 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-colors">
        {cleanFullName ? cleanFullName.charAt(0) : username.charAt(0)}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-text-primary group-hover:text-brand-primary transition-colors truncate">
          {username}
        </span>
        {cleanFullName && cleanFullName !== username && (
          <span className="text-[10px] text-text-muted font-normal truncate max-w-[130px] leading-tight">
            {cleanFullName}
          </span>
        )}
      </div>
    </div>
  );
};
