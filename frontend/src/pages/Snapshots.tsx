import React, { useState } from 'react';

export const Snapshots: React.FC = () => {
  const [fileContent, setFileContent] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleBackup = async () => {
    setIsBackingUp(true);
    setMessage('');
    try {
      const endpoints = ['services', 'routes', 'consumers', 'upstreams', 'plugins'];
      const results = await Promise.all(
        endpoints.map(ep => fetch(`/api/kong/${ep}`).then(res => res.json()))
      );

      const backupData: any = {};
      endpoints.forEach((ep, i) => {
        // Assume endpoints return arrays or objects with a 'data' array
        backupData[ep] = results[i]?.data || results[i] || []; 
      });

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kong-backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage('Backup downloaded successfully.');
    } catch (error) {
      console.error('Backup failed:', error);
      setMessage('Backup failed. Check console for details.');
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
          setMessage('Invalid JSON file.');
          setFileContent(null);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleRestore = async () => {
    if (!fileContent) {
      setMessage('No valid backup file loaded.');
      return;
    }

    setIsRestoring(true);
    setMessage('Restoring...');
    try {
      const endpoints = ['services', 'routes', 'consumers', 'upstreams', 'plugins'];
      for (const ep of endpoints) {
        const items = fileContent[ep];
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
      setMessage('Restore completed.');
    } catch (error) {
      console.error('Restore failed:', error);
      setMessage('Restore encountered errors. Check console.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Snapshots</h1>
      
      {message && (
        <div className="mb-4 p-4 rounded bg-blue-100 text-blue-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-6 rounded shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Backup</h2>
          <p className="text-gray-600 mb-4">
            Download a full snapshot of your Kong configuration.
          </p>
          <button 
            onClick={handleBackup}
            disabled={isBackingUp}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isBackingUp ? 'Creating Backup...' : 'Download Snapshot'}
          </button>
        </div>

        <div className="border p-6 rounded shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Restore</h2>
          <p className="text-gray-600 mb-4">
            Upload a snapshot JSON file to restore the Kong configuration.
          </p>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileChange} 
            className="block w-full mb-4"
          />
          
          {fileContent && (
            <div className="mb-4 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border text-xs">
              <pre>{JSON.stringify(fileContent, null, 2)}</pre>
            </div>
          )}

          <button 
            onClick={handleRestore}
            disabled={!fileContent || isRestoring}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isRestoring ? 'Restoring...' : 'Restore from Snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
};
