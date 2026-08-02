import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User { id: string; nome: string; email: string; cargo: string; }
interface AuthCtx { user: User | null; login: (email: string, senha: string) => Promise<void>; register: (data: any) => Promise<void>; logout: () => void; loading: boolean; }

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sv_user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('sv_token', data.token);
    localStorage.setItem('sv_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (payload: any) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('sv_token', data.token);
    localStorage.setItem('sv_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
