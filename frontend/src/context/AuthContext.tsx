import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  admin: boolean;
  active: boolean;
  require_password_change?: boolean;
  node: number | null;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ensure axios sends cookies with all requests
axios.defaults.withCredentials = true;

// CSRF Interceptor
axios.interceptors.request.use((config) => {
  const match = document.cookie.match(new RegExp('(^| )konga_csrf=([^;]+)'));
  if (match) {
    config.headers['X-CSRF-Token'] = match[2];
  }
  return config;
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user on start
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/me');
        setUser(response.data);
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const response = await axios.post('/login', { identifier, password });
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
