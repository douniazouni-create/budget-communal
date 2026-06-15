import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'manager' | 'guest';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  commune_id: string | null;
  created_at: string;
  last_login: string | null;
  preferences: Record<string, unknown>;
}

export interface Commune {
  id: string;
  name: string;
  region: string | null;
  province: string | null;
  created_at: string;
}

export interface BudgetYear {
  id: string;
  commune_id: string;
  year: number;
  status: 'draft' | 'validated' | 'imported';
  total_recettes: number;
  total_depenses: number;
  created_at: string;
}

export interface BudgetLine {
  id: string;
  budget_year_id: string;
  code: string;
  libelle: string;
  category: string | null;
  subcategory: string | null;
  type: 'recette' | 'depense';
  amount: number;
  rank: number;
  created_at: string;
}

export interface Forecast {
  id: string;
  commune_id: string;
  year: number;
  model_name: string;
  forecast_value: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  mape: number | null;
  r_squared: number | null;
  mase: number | null;
  score: number | null;
  created_at: string;
}

export interface ImportHistory {
  id: string;
  commune_id: string;
  user_id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lines_imported: number;
  error_message: string | null;
  logs: string[];
  created_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  commune_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  commune_id: string;
  category: string;
  title: string;
  description: string | null;
  impact: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}
