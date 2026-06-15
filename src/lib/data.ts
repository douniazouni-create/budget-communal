// Data service for loading real commune data
import metadataJson from '../../public/data/metadata.json';

export interface CommuneMetadata {
  projet: string;
  auteur: string;
  phase: number;
  date_generation: string;
  annee_cible: number;
  historique: Record<string, number>;
  synthese: {
    nb_modeles: number;
    nb_modeles_coherents: number;
    modeles_exclus_mediane: string[];
    mediane: number;
    moyenne: number;
    ecart_type: number;
    mini: number;
    maxi: number;
    scenario_pessimiste: number;
    scenario_central: number;
    scenario_optimiste: number;
    modele_recommande: string;
    prevision_recommandee: number;
    score_modele_recommande: number;
    variation_vs_2025_pct: number;
    ic_prophet_bas: number;
    ic_prophet_haut: number;
  };
  toutes_previsions: Record<string, number>;
  classement_scores: Record<string, number>;
  meilleur_modele_metriques: {
    nom: string;
    score_global: number;
    mape_pct: number;
    r2: number;
    mase: number;
  };
  modeles: Record<string, {
    fichier?: string;
    prevision: number;
    r2?: number;
    type: string;
    ic_bas_95?: number;
    ic_haut_95?: number;
  }>;
}

export interface HistoriqueRow {
  annee: number;
  valeur: number;
  type: string;
}

export interface MetriquesRow {
  rang: number;
  modele: string;
  prevision_2026: number;
  MAE_MAD: number;
  RMSE_MAD: number;
  MAPE_pct: number;
  R2: number;
  MASE: number;
  SMAPE_pct: number;
  score_global: number;
  qualite: string;
  meilleur_modele: number;
}

export interface PrevisionsRow {
  modele: string;
  prevision_2026: number;
  variation_pct: number;
  interpretation: string;
  est_meilleur: number;
  exclu_mediane: number;
  fichier_modele: string;
}

// Parse CSV data
function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Load and parse data from public/data folder
export async function loadCommuneData(): Promise<{
  metadata: CommuneMetadata;
  historique: HistoriqueRow[];
  metriques: MetriquesRow[];
  previsions: PrevisionsRow[];
}> {
  const [historiqueRes, metriquesRes, previsionsRes] = await Promise.all([
    fetch('/data/historique_et_previsions.csv'),
    fetch('/data/metriques_comparaison.csv'),
    fetch('/data/previsions_2026.csv')
  ]);

  const [historiqueText, metriquesText, previsionsText] = await Promise.all([
    historiqueRes.text(),
    metriquesRes.text(),
    previsionsRes.text()
  ]);

  const historiqueRows = parseCSV(historiqueText);
  const metriquesRows = parseCSV(metriquesText);
  const previsionsRows = parseCSV(previsionsText);

  // Parse historique
  const historique: HistoriqueRow[] = historiqueRows.slice(1).map(row => ({
    annee: parseInt(row[0]),
    valeur: parseFloat(row[1]),
    type: row[2]
  }));

  // Parse metriques
  const metriques: MetriquesRow[] = metriquesRows.slice(1).map(row => ({
    rang: parseInt(row[0]),
    modele: row[1],
    prevision_2026: parseFloat(row[2]),
    MAE_MAD: parseFloat(row[3]) || 0,
    RMSE_MAD: parseFloat(row[4]) || 0,
    MAPE_pct: parseFloat(row[5]) || 0,
    R2: parseFloat(row[6]) || 0,
    MASE: parseFloat(row[7]) || 0,
    SMAPE_pct: parseFloat(row[8]) || 0,
    score_global: parseFloat(row[9]) || 0,
    qualite: row[10],
    meilleur_modele: parseInt(row[11]) || 0
  }));

  // Parse previsions
  const previsions: PrevisionsRow[] = previsionsRows.slice(1).map(row => ({
    modele: row[0],
    prevision_2026: parseFloat(row[1]),
    variation_pct: parseFloat(row[2]),
    interpretation: row[3],
    est_meilleur: parseInt(row[4]) || 0,
    exclu_mediane: parseInt(row[5]) || 0,
    fichier_modele: row[6]
  }));

  return {
    metadata: metadataJson as unknown as CommuneMetadata,
    historique,
    metriques,
    previsions
  };
}

// Get formatted forecasts for charts
export function getRealForecasts(metriques: MetriquesRow[]): Array<{
  id: string;
  commune_id: string;
  year: number;
  model_name: string;
  forecast_value: number;
  lower_bound: number | null;
  upper_bound: number | null;
  mape: number | null;
  r_squared: number | null;
  mase: number | null;
  score: number;
  created_at: string;
}> {
  return metriques.map((m, idx) => ({
    id: `forecast-${idx}`,
    commune_id: 'fquih-ben-salah',
    year: 2026,
    model_name: m.modele.replace(/^\d+\.\s*/, ''),
    forecast_value: m.prevision_2026,
    lower_bound: null,
    upper_bound: null,
    mape: m.MAPE_pct / 100,
    r_squared: m.R2,
    mase: m.MASE,
    score: m.score_global,
    created_at: new Date().toISOString()
  }));
}

// Get formatted budget years from historique
export function getRealBudgetYears(historique: HistoriqueRow[]): Array<{
  id: string;
  commune_id: string;
  year: number;
  status: 'draft' | 'validated' | 'imported';
  total_recettes: number;
  total_depenses: number;
  created_at: string;
}> {
  return historique
    .filter(h => h.type === 'Réalisé')
    .map((h, idx) => ({
      id: `budget-${idx}`,
      commune_id: 'fquih-ben-salah',
      year: h.annee,
      status: 'validated' as const,
      total_recettes: h.valeur,
      total_depenses: h.valeur * 0.85,
      created_at: new Date().toISOString()
    }));
}

// Get commune info from metadata
export function getRealCommune(metadata: CommuneMetadata) {
  return {
    id: 'fquih-ben-salah',
    name: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    province: 'Fquih Ben Salah',
    created_at: new Date().toISOString(),
    projet: metadata.projet,
    auteur: metadata.auteur
  };
}
