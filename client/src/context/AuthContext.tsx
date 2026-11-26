import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import {
  api,
  apiLogin,
  apiRegister,
  apiGoogleAuth,
  apiForgotPassword,
  apiResetPassword,
  apiGetProfile,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  loginWithCredentials: (email: string, password: string) => Promise<any>;
  registerWithCredentials: (name: string, email: string, password: string, phone?: string) => Promise<any>;
  loginWithGoogle: (payload: {
    idToken?: string;
    email?: string;
    name?: string;
    photoUrl?: string;
    googleId?: string;
  }) => Promise<any>;
  requestPasswordReset: (email: string) => Promise<any>;
  resetPasswordWithToken: (resetToken: string, newPassword: string) => Promise<any>;
  updateUser: (updatedUser: Partial<User>) => void;
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
          const res = await apiGetProfile();
          setUser(res.user);
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

  const loginWithCredentials = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ email, password });
      login(res.token, res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithCredentials = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    try {
      const res = await apiRegister({ name, email, password, phone });
      login(res.token, res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (payload: {
    idToken?: string;
    email?: string;
    name?: string;
    photoUrl?: string;
    googleId?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiGoogleAuth(payload);
      login(res.token, res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    return await apiForgotPassword(email);
  };

  const resetPasswordWithToken = async (resetToken: string, newPassword: string) => {
    return await apiResetPassword({ resetToken, newPassword });
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
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
        loginWithCredentials,
        registerWithCredentials,
        loginWithGoogle,
        requestPasswordReset,
        resetPasswordWithToken,
        updateUser,
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

