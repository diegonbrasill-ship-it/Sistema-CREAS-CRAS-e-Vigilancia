// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { login as apiLogin } from '../services/api';

// 1. ATUALIZADO: Adicionamos os novos campos ao perfil do usuário.
// O '?' os torna opcionais, uma boa prática para evitar quebras caso a API não os envie por algum motivo.
interface User {
  id: number;
  username: string;
  role: string;
  nome_completo?: string;
  cargo?: string;
}

// Define o que nosso contexto vai fornecer para os componentes
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Cria o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cria o componente "Provedor" que vai gerenciar o estado de login
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ao carregar o app, verifica se já existe um usuário logado no localStorage
  useEffect(() => {
    try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setUser(JSON.parse(userData));
        }
    } catch (error) {
        console.error("Falha ao ler dados do localStorage:", error);
        setUser(null);
        localStorage.clear();
    } finally {
        setIsLoading(false);
    }
  }, []);

  // A função de login agora salva o objeto 'user' completo que vem da API
  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setUser(response.user);
  };

  // A função de logout não precisa de alterações
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

// O hook personalizado não precisa de alterações
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};