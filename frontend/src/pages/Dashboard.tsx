import React from 'react';
import { 
  Server, 
  Layers, 
  GitBranch, 
  Users, 
  Puzzle, 
  Cpu, 
  Globe, 
  Clock 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Mock data for premium visuals
  const stats = [
    { label: 'Active Services', value: '12', icon: Layers, color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { label: 'Configured Routes', value: '24', icon: GitBranch, color: 'from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30' },
    { label: 'Registered Consumers', value: '158', icon: Users, color: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30' },
    { label: 'Active Plugins', value: '8', icon: Puzzle, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative p-8 rounded-3xl overflow-hidden glass-panel border border-border-dark">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 via-brand-secondary/5 to-transparent" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Konga</h2>
          <p className="text-text-secondary mt-2 max-w-xl">
            Monitor and manage your API gateways, configure routing rules, and view real-time logs from one central console.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl border bg-gradient-to-br ${stat.color} transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold opacity-95">{stat.label}</span>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Node Info & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Node details */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-border-dark space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border-dark pb-4">
            <Server className="w-5 h-5 text-brand-primary" /> Active Gateway Node
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-card-dark text-text-secondary">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Node Name</p>
                <p className="text-sm font-semibold">default-kong-node</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-card-dark text-text-secondary">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Kong Admin URL</p>
                <p className="text-sm font-semibold truncate max-w-[200px]">http://konga-kong-1:8001</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-card-dark text-text-secondary">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Kong Version</p>
                <p className="text-sm font-semibold">3.9.2</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-card-dark text-text-secondary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Database Type</p>
                <p className="text-sm font-semibold">PostgreSQL (13-alpine)</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="glass-panel p-6 rounded-2xl border border-border-dark space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border-dark pb-4">
            <Cpu className="w-5 h-5 text-brand-secondary" /> System Health
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Gateway CPU</span>
                <span className="font-semibold text-brand-primary">12%</span>
              </div>
              <div className="h-1.5 w-full bg-card-dark rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full" style={{ width: '12%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Memory Usage</span>
                <span className="font-semibold text-brand-secondary">42%</span>
              </div>
              <div className="h-1.5 w-full bg-card-dark rounded-full overflow-hidden">
                <div className="h-full bg-brand-secondary rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">API Latency</span>
                <span className="font-semibold text-emerald-400">1.4ms</span>
              </div>
              <div className="h-1.5 w-full bg-card-dark rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '8%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
