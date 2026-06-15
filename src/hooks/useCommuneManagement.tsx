import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Commune {
  id: string;
  name: string;
  region: string | null;
  province: string | null;
  created_at: string;
}

interface CommuneManagementContextType {
  communes: Commune[];
  currentCommune: Commune | null;
  loading: boolean;
  setCurrentCommune: (commune: Commune | null) => void;
  createCommune: (name: string, region: string, province: string) => Promise<{ success: boolean; error?: string; commune?: Commune }>;
  deleteCommune: (id: string) => Promise<boolean>;
  refreshCommunes: () => Promise<void>;
}

const CommuneManagementContext = createContext<CommuneManagementContextType | null>(null);

// Demo communes for the application
const DEMO_COMMUNES: Commune[] = [
  {
    id: 'fquih-ben-salah',
    name: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    province: 'Fquih Ben Salah',
    created_at: new Date().toISOString()
  },
  {
    id: 'rabat',
    name: 'Rabat',
    region: 'Rabat-Salé-Kénitra',
    province: 'Rabat',
    created_at: new Date().toISOString()
  },
  {
    id: 'casablanca',
    name: 'Casablanca',
    region: 'Casablanca-Settat',
    province: 'Casablanca',
    created_at: new Date().toISOString()
  }
];

export function CommuneManagementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [currentCommune, setCurrentCommune] = useState<Commune | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCommunes();
    } else {
      setCommunes([]);
      setCurrentCommune(null);
      setLoading(false);
    }
  }, [user]);

  const loadCommunes = async () => {
    setLoading(true);
    try {
      // Try loading from Supabase first
      const { data, error } = await supabase.from('communes').select('*').order('name');

      if (error || !data || data.length === 0) {
        // Use demo communes
        setCommunes(DEMO_COMMUNES);
        if (!currentCommune) {
          setCurrentCommune(DEMO_COMMUNES[0]);
        }
      } else {
        setCommunes(data);
        if (!currentCommune && data.length > 0) {
          setCurrentCommune(data[0]);
        }
      }
    } catch {
      setCommunes(DEMO_COMMUNES);
      if (!currentCommune) {
        setCurrentCommune(DEMO_COMMUNES[0]);
      }
    }
    setLoading(false);
  };

  const createCommune = async (name: string, region: string, province: string): Promise<{ success: boolean; error?: string; commune?: Commune }> => {
    try {
      const newCommune: Commune = {
        id: `commune-${Date.now()}`,
        name,
        region,
        province,
        created_at: new Date().toISOString()
      };

      // Try inserting into Supabase
      const { error } = await supabase.from('communes').insert(newCommune);

      if (error) {
        // Still add to local state for demo
        setCommunes(prev => [...prev, newCommune]);
        return { success: true, commune: newCommune };
      }

      setCommunes(prev => [...prev, newCommune]);
      return { success: true, commune: newCommune };
    } catch {
      return { success: false, error: 'Erreur lors de la création' };
    }
  };

  const deleteCommune = async (id: string): Promise<boolean> => {
    try {
      await supabase.from('communes').delete().eq('id', id);
      setCommunes(prev => prev.filter(c => c.id !== id));
      if (currentCommune?.id === id) {
        setCurrentCommune(communes.find(c => c.id !== id) || null);
      }
      return true;
    } catch {
      return false;
    }
  };

  const refreshCommunes = () => loadCommunes();

  return (
    <CommuneManagementContext.Provider value={{
      communes,
      currentCommune,
      loading,
      setCurrentCommune,
      createCommune,
      deleteCommune,
      refreshCommunes
    }}>
      {children}
    </CommuneManagementContext.Provider>
  );
}

export function useCommuneManagement() {
  const context = useContext(CommuneManagementContext);
  if (!context) {
    throw new Error('useCommuneManagement must be used within a CommuneManagementProvider');
  }
  return context;
}
