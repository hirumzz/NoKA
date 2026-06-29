import React from 'react';
import { HelpCircle, ExternalLink, Activity } from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Help & Documentation</h2>
        <p className="text-xs text-text-secondary mt-1">Get support and learn more about managing your Kong API Gateways with NOKA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-brand-primary/10 text-brand-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">What is NOKA?</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            NOKA (Nocta Kong Admin) is a premium open-source administrative console designed to manage Kong API Gateways. It provides full GUI control over your Services, Routes, Consumers, Plugins, Certificates, and Upstreams, complete with user role configurations and comprehensive audit logs.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-emerald-50 text-emerald-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Documentation Links</h3>
          </div>
          <div className="space-y-2">
            <a 
              href="https://docs.konghq.com/" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-between p-3 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold text-text-secondary transition-colors"
            >
              Kong Gateway Official Docs
              <ExternalLink className="w-4 h-4 text-text-muted" />
            </a>
            <a 
              href="https://github.com/pantsel/konga" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-between p-3 rounded border border-border-light hover:bg-slate-50 text-xs font-semibold text-text-secondary transition-colors"
            >
              Legacy Konga GitHub Repository
              <ExternalLink className="w-4 h-4 text-text-muted" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
