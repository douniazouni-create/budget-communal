import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase, type User } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  signup: (email: string, password: string, fullName: string, communeId: string, role: 'admin' | 'manager' | 'guest') => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER = {
  id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
  email: 'admin@commune.ma',
  password: 'demo',
  full_name: 'Administrateur Demo',
  role: 'admin' as const,
  commune_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  created_at: new Date().toISOString(),
  last_login: null,
  preferences: { theme: 'light', notifications: true }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('municipal_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('municipal_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      // Demo credentials check
      if (email === DEMO_USER.email && password === DEMO_USER.password) {
        const demoUser: User = {
          ...DEMO_USER,
          last_login: new Date().toISOString()
        };
        setUser(demoUser);
        localStorage.setItem('municipal_user', JSON.stringify(demoUser));
        return { success: true };
      }

      // Real authentication with Supabase
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !users) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      const isValid = await bcrypt.compare(password, users.password_hash);
      if (!isValid) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      const updatedUser = { ...users, last_login: new Date().toISOString() };
      await supabase.from('users').update({ last_login: updatedUser.last_login }).eq('id', users.id);

      setUser(updatedUser);
      localStorage.setItem('municipal_user', JSON.stringify(updatedUser));
      return { success: true };
    } catch {
      return { success: false, error: 'Une erreur est survenue' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('municipal_user');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('municipal_user', JSON.stringify(updatedUser));
    await supabase.from('users').update(updates).eq('id', user.id);
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    communeId: string,
    role: 'admin' | 'manager' | 'guest'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('users').insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        commune_id: communeId,
        role
      });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Cet email est déjà utilisé' };
        }
        return { success: false, error: 'Erreur lors de la création du compte' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Une erreur est survenue' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
