'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  userRole: 'PENGAWAS' | 'PENJAGA' | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'PENGAWAS' | 'PENJAGA' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('entok_jwt_token');
    const savedRole = localStorage.getItem('entok_user_role') as 'PENGAWAS' | 'PENJAGA' | null;
    const savedUserStr = localStorage.getItem('entok_user_profile');

    if (token && savedRole) {
      setIsLoggedIn(true);
      setUserRole(savedRole);
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch (e) {
          setUser(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(username, password);
      if (res.status === 'success' && res.data && res.data.token) {
        const { token, user: userData } = res.data;
        localStorage.setItem('entok_jwt_token', token);
        localStorage.setItem('entok_is_logged_in', 'true');
        localStorage.setItem('entok_user_role', userData.role);
        
        const mappedUser: User = {
          id: userData.id,
          nama: userData.nama || userData.name || userData.username,
          username: userData.username,
          role: userData.role,
        };
        
        localStorage.setItem('entok_user_profile', JSON.stringify(mappedUser));
        
        // If keeper, also cache keeper name for Checklist harian
        if (userData.role === 'PENJAGA') {
          localStorage.setItem('entok_logged_in_keeper_name', userData.nama || userData.name || userData.username);
        }

        setIsLoggedIn(true);
        setUserRole(userData.role);
        setUser(mappedUser);

        // Redirect based on role
        if (userData.role === 'PENGAWAS') {
          router.push('/dashboard');
        } else {
          router.push('/penjaga');
        }
      } else {
        throw new Error('Login failed: Invalid server response');
      }
    } catch (error) {
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('entok_jwt_token');
    localStorage.setItem('entok_is_logged_in', 'false');
    localStorage.removeItem('entok_user_role');
    localStorage.removeItem('entok_user_profile');
    localStorage.removeItem('entok_logged_in_keeper_name');
    
    setIsLoggedIn(false);
    setUserRole(null);
    setUser(null);
    setIsLoading(false);
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, userRole, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
