import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Camera, 
  Download, 
  RefreshCw, 
  Trash2, 
  Clock, 
  AlertCircle,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface SnapshotHistory {
  id: number;
  name: string;
  data: string;
  node_name: string;
  createdAt: string;
}

export const Snapshots: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [fileContent, setFileContent] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [message, setMessage] = useState('');
  
  const [history, setHistory] = useState<SnapshotHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [user?.node]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get('/api/snapshots');
      setHistory(response.data?.data || []);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Failed to fetch snapshot history', 'Error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleBackup = async (saveToHistory: boolean) => {
    setIsBackingUp(true);
    setMessage('');
    try {
      const endpoints = ['services', 'routes', 'consumers', 'upstreams', 'plugins'];
      const results = await Promise.all(
        endpoints.map(ep => fetch(`/api/kong/${ep}`).then(res => res.json()))
      );

      const backupData: any = {};
      endpoints.forEach((ep, i) => {
        backupData[ep] = results[i]?.data || results[i] || []; 
      });

      const snapshotName = `kong-backup-${new Date().toISOString()}`;

      if (saveToHistory) {
        await axios.post('/api/snapshots', {
          name: snapshotName,
          data: backupData,
          node_name: user?.node ? `Node ${user.node}` : 'Default'
        });
        addToast('success', 'Snapshot saved to history successfully', 'Saved');
        fetchHistory();
      } else {
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${snapshotName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('success', 'Backup downloaded successfully', 'Success');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      addToast('error', 'Backup failed. Check console for details.', 'Error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = JSON.parse(event.target?.result as string);
          setFileContent(content);
        } catch (error) {
          addToast('error', 'Invalid JSON file.', 'Error');
          setFileContent(null);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleRestore = async (data: any) => {
    if (!data) {
      addToast('error', 'No valid backup data loaded.', 'Error');
      return;
    }

    if (!window.confirm('Are you sure you want to restore from this snapshot? This will attempt to recreate all entities.')) {
      return;
    }

    setIsRestoring(true);
    setMessage('Restoring...');
    try {
      const endpoints = ['services', 'routes', 'consumers', 'upstreams', 'plugins'];
      for (const ep of endpoints) {
        const items = data[ep];
        if (Array.isArray(items)) {
          for (const item of items) {
            const { id, created_at, updated_at, ...payload } = item;
            
            await fetch(`/api/kong/${ep}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
          }
        }
      }
      addToast('success', 'Restore completed.', 'Success');
    } catch (error) {
      console.error('Restore failed:', error);
      addToast('error', 'Restore encountered errors. Check console.', 'Error');
    } finally {
      setIsRestoring(false);
      setMessage('');
    }
  };

  const handleDeleteHistory = async (id: number) => {
    if (!window.confirm('Delete this snapshot from history?')) return;
    try {
      await axios.delete(`/api/snapshots/${id}`);
      addToast('success', 'Snapshot deleted', 'Deleted');
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Failed to delete snapshot', 'Error');
    }
  };

  const downloadHistorySnapshot = (snapshot: SnapshotHistory) => {
    const blob = new Blob([snapshot.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-border-light shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Snapshots</h2>
          <p className="text-xs text-text-secondary mt-1">Backup and restore your Kong configuration effortlessly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <Camera className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-text-primary">Create Snapshot</h2>
          </div>
          <p className="text-xs text-text-secondary font-medium leading-relaxed mb-6">
            Generate a full snapshot of your current Kong configuration. You can save it to the history for easy access later, or download it immediately as a JSON file.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => handleBackup(true)}
              disabled={isBackingUp}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-2 text-xs font-bold rounded shadow hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isBackingUp ? 'SAVING...' : 'SAVE TO HISTORY'}
            </button>
            <button 
              onClick={() => handleBackup(false)}
              disabled={isBackingUp}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-text-primary border border-border-light px-4 py-2 text-xs font-bold rounded shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 text-text-muted" />
              {isBackingUp ? 'DOWNLOADING...' : 'DOWNLOAD JSON'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-border-light shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-text-primary">Restore Configuration</h2>
          </div>
          <p className="text-xs text-text-secondary font-medium leading-relaxed mb-6">
            Upload a snapshot JSON file to recreate configurations. Warning: This will attempt to POST entities to Kong and may fail if entities already exist with the same names.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-between px-3 py-2 border border-border-light rounded bg-slate-50 text-xs font-medium text-text-secondary overflow-hidden whitespace-nowrap text-ellipsis">
                {fileContent ? 'File loaded successfully' : 'Choose a JSON file...'}
              </div>
            </div>
            
            <button 
              onClick={() => handleRestore(fileContent)}
              disabled={!fileContent || isRestoring}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 text-xs font-bold rounded shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isRestoring ? 'RESTORING...' : 'RESTORE'}
            </button>
          </div>
          {message && (
            <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-2">
              {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-light shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Clock className="w-4 h-4 text-brand-primary" />
            Snapshot History
          </div>
        </div>

        {loadingHistory ? (
           <div className="p-12 text-center text-text-muted text-xs font-semibold flex items-center justify-center gap-2">
             <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
             Loading history...
           </div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-border-light text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Node</th>
                  <th className="px-6 py-3.5">Date Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-xs font-semibold text-text-primary">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-brand-primary">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 border border-border-light rounded text-[10px] uppercase font-bold text-text-secondary">
                        {item.node_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-medium">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => downloadHistorySnapshot(item)}
                          className="px-3 py-1.5 rounded border border-border-light bg-white hover:bg-slate-50 text-text-primary flex items-center gap-1.5 transition-colors"
                          title="Download JSON"
                        >
                          <Download className="w-3.5 h-3.5 text-text-muted" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(item.data);
                              handleRestore(parsed);
                            } catch (e) {
                              addToast('error', 'Snapshot data is corrupted', 'Error');
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors font-bold"
                          title="Restore directly"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="px-2 py-1.5 rounded border border-border-light bg-white hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-text-secondary transition-colors"
                          title="Delete Snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-border-light mb-3">
               <Clock className="w-6 h-6 text-text-muted" />
             </div>
             <p className="text-text-primary font-bold text-sm">No snapshot history</p>
             <p className="text-text-secondary text-xs mt-1">Create a snapshot and save it to history to see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
