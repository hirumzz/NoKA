import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface KongCacheService {
  id: string;
  name: string;
  host?: string;
  port?: number;
  protocol?: string;
  path?: string;
  tags?: string[];
  created_at?: number;
}

export interface KongCacheRoute {
  id: string;
  name?: string;
  paths: string[];
  hosts?: string[];
  methods?: string[];
  protocols?: string[];
  service?: { id: string };
  tags?: string[];
  created_at?: number;
}

export interface KongCachePlugin {
  id: string;
  name: string;
  enabled: boolean;
  service?: { id: string };
  route?: { id: string };
  consumer?: { id: string };
  config: Record<string, any>;
  created_at: number;
  tags?: string[];
}

interface KongDataContextType {
  services: KongCacheService[];
  routes: KongCacheRoute[];
  plugins: KongCachePlugin[];
  isEnriching: boolean;
  hasLoadedInitial: boolean;
  refreshKongData: () => Promise<void>;
  setPlugins: React.Dispatch<React.SetStateAction<KongCachePlugin[]>>;
}

const KongDataContext = createContext<KongDataContextType | undefined>(undefined);

export const KongDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [services, setServices] = useState<KongCacheService[]>([]);
  const [routes, setRoutes] = useState<KongCacheRoute[]>([]);
  const [plugins, setPlugins] = useState<KongCachePlugin[]>([]);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState<boolean>(false);

  const refreshKongData = useCallback(async () => {
    if (!user?.node) {
      setServices([]);
      setRoutes([]);
      setPlugins([]);
      setHasLoadedInitial(false);
      return;
    }

    setIsEnriching(true);
    try {
      const [svcResp, routesResp, pluginsResp] = await Promise.allSettled([
        axios.get('/api/kong/services?size=1000'),
        axios.get('/api/kong/routes?size=1000'),
        axios.get('/api/kong/plugins?size=1000')
      ]);

      if (svcResp.status === 'fulfilled') {
        setServices(svcResp.value.data?.data || []);
      }
      if (routesResp.status === 'fulfilled') {
        setRoutes(routesResp.value.data?.data || []);
      }
      if (pluginsResp.status === 'fulfilled') {
        setPlugins(pluginsResp.value.data?.data || []);
      }
      setHasLoadedInitial(true);
    } catch (err) {
      console.error('Background Kong data prefetch error:', err);
    } finally {
      setIsEnriching(false);
    }
  }, [user?.node]);

  useEffect(() => {
    refreshKongData();
  }, [refreshKongData]);

  return (
    <KongDataContext.Provider value={{ services, routes, plugins, isEnriching, hasLoadedInitial, refreshKongData, setPlugins }}>
      {children}
    </KongDataContext.Provider>
  );
};

export const useKongData = () => {
  const context = useContext(KongDataContext);
  if (!context) {
    throw new Error('useKongData must be used within a KongDataProvider');
  }
  return context;
};
