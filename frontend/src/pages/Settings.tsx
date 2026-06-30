import React, { useState, useEffect } from 'react';
import { Save, Clock } from 'lucide-react';

export const Settings: React.FC = () => {
  const [interval, setIntervalVal] = useState('30000');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedInterval = localStorage.getItem('noka_refresh_interval');
    if (savedInterval) {
      setIntervalVal(savedInterval);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('noka_refresh_interval', interval);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="p-8 rounded-lg bg-white border border-border-light shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h2>
          <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
            Configure application preferences and global settings.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm max-w-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-light pb-4 mb-4">
          <Clock className="w-4 h-4 text-brand-primary" /> Auto-Refresh
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Dashboard Refresh Interval (ms)
            </label>
            <input 
              type="number" 
              value={interval}
              onChange={(e) => setIntervalVal(e.target.value)}
              className="w-full px-3 py-2 border border-border-light rounded text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
            <p className="text-[10px] text-text-muted mt-1">Default is 30000 (30 seconds). Set to 0 to disable auto-refresh. Note: Refresh the dashboard page after saving to apply changes.</p>
          </div>

          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded hover:bg-brand-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
          
          {saved && (
            <p className="text-xs text-emerald-600 font-semibold mt-2">Settings saved successfully!</p>
          )}
        </div>
      </div>
    </div>
  );
};
