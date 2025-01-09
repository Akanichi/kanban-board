import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData, RegisterData } from '../types/auth';
import * as authService from '../services/auth';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginData) => {
    try {
      const response = await authService.login(data);
      setUser(response.user);
      localStorage.setItem('token', response.access_token);
      if (data.remember_me) {
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        sessionStorage.setItem('user', JSON.stringify(response.user));
      }
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error('Failed to login. Please check your credentials.');
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await authService.register(data);
      // Automatically log in after registration
      await login({
        username: data.email,
        password: data.password,
        remember_me: true
      });
      toast.success('Registered and logged in successfully!');
    } catch (error) {
      toast.error('Failed to register. Please try again.');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    toast.success('Logged out successfully!');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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