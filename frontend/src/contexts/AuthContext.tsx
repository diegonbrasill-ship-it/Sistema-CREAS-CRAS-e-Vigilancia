// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { login as apiLogin } from '../services/api';

interface User {
  id: number;
  username: string;
  role: string;
  nome_completo: string;
  cargo: string;
  unit_id: number | null; // Aceita NULL vindo do Gestor Geral
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData && userData !== 'null') {
        const parsedUser = JSON.parse(userData);

        // 🔒 Garante que unit_id nunca seja undefined e converte de string (se necessário) para number.
        const safeUser: User = {
          ...parsedUser,
          unit_id: typeof parsedUser.unit_id === 'number'
            ? parsedUser.unit_id
            : parsedUser.unit_id
              ? Number(parsedUser.unit_id)
              : null,
        };

        setUser(safeUser);
      }
    } catch (error) {
      console.error("Falha ao ler dados do localStorage:", error);
      localStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password);

    // Garante que o unit_id é tratado como number ou null antes de salvar
    const safeUnitId =
      typeof response.user.unit_id === 'number'
        ? response.user.unit_id
        : response.user.unit_id
          ? Number(response.user.unit_id)
          : null;

    const safeUserToStore: User = {
      ...response.user,
      unit_id: safeUnitId,
    };

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(safeUserToStore));

    setUser(safeUserToStore);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};

