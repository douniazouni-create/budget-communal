-- Communes table
CREATE TABLE communes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  province TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'manager', 'guest')),
  commune_id UUID REFERENCES communes(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}'
);

-- Budget years/records
CREATE TABLE budget_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID REFERENCES communes(id) NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'imported')),
  total_recettes REAL DEFAULT 0,
  total_depenses REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(commune_id, year)
);

-- Budget line items
CREATE TABLE budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_year_id UUID REFERENCES budget_years(id) NOT NULL,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  type TEXT CHECK (type IN ('recette', 'depense')),
  amount REAL NOT NULL DEFAULT 0,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Forecasts table
CREATE TABLE forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID REFERENCES communes(id) NOT NULL,
  year INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  forecast_value REAL,
  lower_bound REAL,
  upper_bound REAL,
  mape REAL,
  r_squared REAL,
  mase REAL,
  score REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(commune_id, year, model_name)
);

-- Import history
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID REFERENCES communes(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  lines_imported INTEGER DEFAULT 0,
  error_message TEXT,
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Action logs
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  commune_id UUID REFERENCES communes(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID REFERENCES communes(id) NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact REAL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;