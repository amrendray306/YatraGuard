import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  quickLogin: (role: 'TRAVELER' | 'ADMIN' | 'MODERATOR') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('travel_guardian_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch {
          localStorage.removeItem('travel_guardian_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('travel_guardian_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('travel_guardian_token');
    setToken(null);
    setUser(null);
  };

  const quickLogin = async (role: 'TRAVELER' | 'ADMIN' | 'MODERATOR') => {
    setIsLoading(true);
    try {
      const emailMap = {
        TRAVELER: 'traveler@example.com',
        ADMIN: 'admin@travelguardian.in',
        MODERATOR: 'mod@travelguardian.in',
      };
      const passMap = {
        TRAVELER: 'Traveler@123',
        ADMIN: 'Admin@123',
        MODERATOR: 'Mod@123',
      };

      const res = await api.post('/auth/login', {
        email: emailMap[role],
        password: passMap[role],
      });

      login(res.data.token, res.data.user);
    } catch (err) {
      console.error('Quick login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
