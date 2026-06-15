import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { useCommuneManagement } from './useCommuneManagement';
import { useAuth } from './useAuth';
import {
  loadCommuneData,
  getRealForecasts,
  getRealBudgetYears,
  type CommuneMetadata,
  type MetriquesRow,
  type HistoriqueRow,
  type PrevisionsRow
} from '../lib/data';
import metadataJson from '../../public/data/metadata.json';

interface CommuneData {
  metadata: CommuneMetadata | null;
  metriques: MetriquesRow[];
  historique: HistoriqueRow[];
  previsions: PrevisionsRow[];
  budgetYears: ReturnType<typeof getRealBudgetYears>;
  forecasts: ReturnType<typeof getRealForecasts>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface CommuneDataContextType extends CommuneData {
  refreshData: () => Promise<void>;
  getHistoricalData: () => { year: number; recettes: number; depenses: number }[];
  getForecastData: () => { year: number; pessimistic: number; central: number; optimistic: number }[];
  simulateNewYear: (year: number, recettes: number) => Promise<{ success: boolean; message: string }>;
}

const CommuneDataContext = createContext<CommuneDataContextType | null>(null);

// Base metadata from JSON file
const baseMetadata = metadataJson as unknown as CommuneMetadata;

// Generate simulated data for other communes based on Fquih Ben Salah template
export function generateSimulatedData(communeId: string, communeName: string): {
  metadata: CommuneMetadata;
  metriques: MetriquesRow[];
  historique: HistoriqueRow[];
  previsions: PrevisionsRow[];
} {
  // Base multipliers for different communes
  const multipliers: Record<string, number> = {
    'fquih-ben-salah': 1.0,
    'rabat': 3.5,
    'casablanca': 8.0
  };

  const multiplier = multipliers[communeId] || 1.0;

  // Scale the metadata
  const scaledHistorique: Record<string, number> = {};
  Object.entries(baseMetadata.historique).forEach(([year, value]) => {
    scaledHistorique[year] = (value as number) * multiplier;
  });

  const scaledPrevisions: Record<string, number> = {};
  Object.entries(baseMetadata.toutes_previsions).forEach(([modele, value]) => {
    scaledPrevisions[modele] = (value as number) * multiplier;
  });

  const metadata: CommuneMetadata = {
    ...baseMetadata,
    projet: `BI Recettes Budgétaires — ${communeName}`,
    historique: scaledHistorique,
    toutes_previsions: scaledPrevisions,
    synthese: {
      ...baseMetadata.synthese,
      mediane: baseMetadata.synthese.mediane * multiplier,
      moyenne: baseMetadata.synthese.moyenne * multiplier,
      ecart_type: baseMetadata.synthese.ecart_type * multiplier,
      mini: baseMetadata.synthese.mini * multiplier,
      maxi: baseMetadata.synthese.maxi * multiplier,
      scenario_pessimiste: baseMetadata.synthese.scenario_pessimiste * multiplier,
      scenario_central: baseMetadata.synthese.scenario_central * multiplier,
      scenario_optimiste: baseMetadata.synthese.scenario_optimiste * multiplier,
      prevision_recommandee: baseMetadata.synthese.prevision_recommandee * multiplier,
      ic_prophet_bas: baseMetadata.synthese.ic_prophet_bas * multiplier,
      ic_prophet_haut: baseMetadata.synthese.ic_prophet_haut * multiplier
    }
  };

  // Base metadata for scaling
  const baseMeta = baseMetadata;

  // Generate historique with specific commune variations
  const historique: HistoriqueRow[] = [
    { annee: 2020, valeur: 143310709.36 * multiplier, type: 'Prévisionnel' },
    { annee: 2021, valeur: 123353679.35 * multiplier, type: 'Réalisé' },
    { annee: 2022, valeur: 143356486.3 * multiplier, type: 'Réalisé' },
    { annee: 2023, valeur: 141497575.33 * multiplier, type: 'Réalisé' },
    { annee: 2024, valeur: 140916498.92 * multiplier, type: 'Réalisé' },
    { annee: 2025, valeur: 161273528.07 * multiplier, type: 'Réalisé' },
    { annee: 2026, valeur: metadata.synthese.scenario_pessimiste, type: 'Scénario pessimiste' },
    { annee: 2026, valeur: metadata.synthese.scenario_central, type: 'Scénario central' },
    { annee: 2026, valeur: metadata.synthese.scenario_optimiste, type: 'Scénario optimiste' }
  ];

  // Generate metriques scaled
  const metriques: MetriquesRow[] = [
    { rang: 1, modele: '9. SVR (RBF)', prevision_2026: 176666242.76 * multiplier, MAE_MAD: 3563718.26, RMSE_MAD: 5527042.05, MAPE_pct: 2.5074, R2: 0.7886, MASE: 0.3331, SMAPE_pct: 2.5141, score_global: 84.65, qualite: 'Excellent', meilleur_modele: 1 },
    { rang: 2, modele: '12. Theta Method', prevision_2026: 165597837.54 * multiplier, MAE_MAD: 4643522.11, RMSE_MAD: 5672319.87, MAPE_pct: 3.4181, R2: 0.7773, MASE: 0.434, SMAPE_pct: 3.334, score_global: 81.01, qualite: 'Excellent', meilleur_modele: 0 },
    { rang: 3, modele: '7. CAGR', prevision_2026: 172313030.57 * multiplier, MAE_MAD: 4362005.62, RMSE_MAD: 6774584.21, MAPE_pct: 3.0675, R2: 0.6823, MASE: 0.4077, SMAPE_pct: 3.0864, score_global: 80.32, qualite: 'Excellent', meilleur_modele: 0 },
    { rang: 4, modele: '2. Régression polynomiale', prevision_2026: 165092606.09 * multiplier, MAE_MAD: 5195623.64, RMSE_MAD: 6055665.5, MAPE_pct: 3.6774, R2: 0.7462, MASE: 0.4856, SMAPE_pct: 3.6765, score_global: 79.09, qualite: 'Excellent', meilleur_modele: 0 },
    { rang: 5, modele: '1. Régression linéaire', prevision_2026: 164099466.61 * multiplier, MAE_MAD: 5252374.47, RMSE_MAD: 6060317.33, MAPE_pct: 3.707, R2: 0.7458, MASE: 0.4909, SMAPE_pct: 3.7061, score_global: 78.95, qualite: 'Excellent', meilleur_modele: 0 },
    { rang: 6, modele: '3. Ridge Regression', prevision_2026: 162097656.34 * multiplier, MAE_MAD: 5519282.51, RMSE_MAD: 6133346.96, MAPE_pct: 3.9011, R2: 0.7396, MASE: 0.5158, SMAPE_pct: 3.8973, score_global: 78.05, qualite: 'Excellent', meilleur_modele: 0 },
    { rang: 7, modele: '4. Prophet', prevision_2026: 156351273.55 * multiplier, MAE_MAD: 7698431.15, RMSE_MAD: 8573580.54, MAPE_pct: 5.5174, R2: 0.3905, MASE: 0.6134, SMAPE_pct: 5.4872, score_global: 66.56, qualite: 'Acceptable', meilleur_modele: 0 },
    { rang: 8, modele: '8. Moyenne pondérée', prevision_2026: 169305830.04 * multiplier, MAE_MAD: 8109958.32, RMSE_MAD: 11934931.87, MAPE_pct: 5.3499, R2: 0.0141, MASE: 0.7579, SMAPE_pct: 5.4637, score_global: 58.61, qualite: 'Acceptable', meilleur_modele: 0 },
    { rang: 9, modele: '11. Bayesian Ridge', prevision_2026: 142079553.59 * multiplier, MAE_MAD: 8188362.87, RMSE_MAD: 12019891.63, MAPE_pct: 5.8419, R2: 0.0, MASE: 0.7653, SMAPE_pct: 5.7783, score_global: 57.12, qualite: 'Acceptable', meilleur_modele: 0 },
    { rang: 10, modele: '5. Lissage Holt', prevision_2026: 158220754.06 * multiplier, MAE_MAD: 11184488.05, RMSE_MAD: 12477938.09, MAPE_pct: 7.8344, R2: -0.0777, MASE: 1.0453, SMAPE_pct: 7.8624, score_global: 48.58, qualite: 'Acceptable', meilleur_modele: 0 },
    { rang: 11, modele: '6. ARIMA', prevision_2026: 164710799.04 * multiplier, MAE_MAD: 29211954.33, RMSE_MAD: 55921129.97, MAPE_pct: 22.8555, R2: -20.6447, MASE: 2.7301, SMAPE_pct: 43.0247, score_global: 0.0, qualite: 'À améliorer', meilleur_modele: 0 },
    { rang: 12, modele: '10. LSTM', prevision_2026: 164798123.25 * multiplier, MAE_MAD: 0, RMSE_MAD: 0, MAPE_pct: 0, R2: 0, MASE: 0, SMAPE_pct: 0, score_global: 0.0, qualite: 'À améliorer', meilleur_modele: 0 }
  ];

  // Generate previsions
  const previsions: PrevisionsRow[] = [
    { modele: '1. Régression linéaire', prevision_2026: 164099466.61 * multiplier, variation_pct: 1.75, interpretation: 'Croissance linéaire', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'linear_regression.joblib' },
    { modele: '2. Régression polynomiale', prevision_2026: 165092606.09 * multiplier, variation_pct: 2.37, interpretation: 'Courbe parabolique', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'polynomial_regression.joblib' },
    { modele: '3. Ridge Regression', prevision_2026: 162097656.34 * multiplier, variation_pct: 0.51, interpretation: 'Régression pénalisée', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'ridge_regression.joblib' },
    { modele: '9. SVR (RBF)', prevision_2026: 176666242.76 * multiplier, variation_pct: 9.54, interpretation: 'Noyau RBF', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'svr_model.joblib' },
    { modele: '11. Bayesian Ridge', prevision_2026: 142079553.59 * multiplier, variation_pct: -11.9, interpretation: 'IC 95%', est_meilleur: 0, exclu_mediane: 1, fichier_modele: 'bayesian_ridge.joblib' },
    { modele: '4. Prophet', prevision_2026: 156351273.55 * multiplier, variation_pct: -3.05, interpretation: 'IC 95%', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'prophet_model.pkl' },
    { modele: '5. Lissage Holt', prevision_2026: 158220754.06 * multiplier, variation_pct: -1.89, interpretation: 'alpha=0.65', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'holt_model.pkl' },
    { modele: '6. ARIMA', prevision_2026: 164710799.04 * multiplier, variation_pct: 2.13, interpretation: 'Ordre (0,1,1)', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'arima_model.pkl' },
    { modele: '7. CAGR', prevision_2026: 172313030.57 * multiplier, variation_pct: 6.85, interpretation: 'CAGR 4ans=6.9%', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'analytique' },
    { modele: '8. Moyenne pondérée', prevision_2026: 169305830.04 * multiplier, variation_pct: 4.98, interpretation: 'Tendance récente', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'analytique' },
    { modele: '12. Theta Method', prevision_2026: 165597837.54 * multiplier, variation_pct: 2.68, interpretation: 'Theta fallback', est_meilleur: 1, exclu_mediane: 0, fichier_modele: 'analytique' },
    { modele: '10. LSTM', prevision_2026: 164798123.25 * multiplier, variation_pct: 2.19, interpretation: 'Deep Learning', est_meilleur: 0, exclu_mediane: 0, fichier_modele: 'analytique' },
    { modele: 'Scénario pessimiste', prevision_2026: metadata.synthese.scenario_pessimiste, variation_pct: 1.13, interpretation: '1er quartile', est_meilleur: 0, exclu_mediane: 0, fichier_modele: '' },
    { modele: 'Scénario central', prevision_2026: metadata.synthese.scenario_central, variation_pct: metadata.synthese.variation_vs_2025_pct, interpretation: 'Médiane', est_meilleur: 0, exclu_mediane: 0, fichier_modele: '' },
    { modele: 'Scénario optimiste', prevision_2026: metadata.synthese.scenario_optimiste, variation_pct: 3.83, interpretation: '3ème quartile', est_meilleur: 0, exclu_mediane: 0, fichier_modele: '' }
  ];

  return { metadata, metriques, historique, previsions };
}

export function CommuneDataProvider({ children }: { children: ReactNode }) {
  const { currentCommune } = useCommuneManagement();
  const { user } = useAuth();
  const [data, setData] = useState<CommuneData>({
    metadata: null,
    metriques: [],
    historique: [],
    previsions: [],
    budgetYears: [],
    forecasts: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  useEffect(() => {
    if (user && currentCommune) {
      loadCommuneDataForCurrentCommune();
    } else {
      setData({
        metadata: null,
        metriques: [],
        historique: [],
        previsions: [],
        budgetYears: [],
        forecasts: [],
        loading: false,
        error: null,
        lastUpdated: null
      });
    }
  }, [user, currentCommune]);

  const loadCommuneDataForCurrentCommune = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      let metadata: CommuneMetadata;
      let metriques: MetriquesRow[];
      let historique: HistoriqueRow[];
      let previsions: PrevisionsRow[];

      // For Fquih Ben Salah, load actual data
      if (currentCommune?.id === 'fquih-ben-salah') {
        const loadedData = await loadCommuneData();
        metadata = loadedData.metadata;
        metriques = loadedData.metriques;
        historique = loadedData.historique;
        previsions = loadedData.previsions;
      } else {
        // For other communes, generate simulated data
        const simulatedData = generateSimulatedData(currentCommune?.id || '', currentCommune?.name || '');
        metadata = simulatedData.metadata;
        metriques = simulatedData.metriques;
        historique = simulatedData.historique;
        previsions = simulatedData.previsions;
      }

      const budgetYears = getRealBudgetYears(historique);
      const forecasts = getRealForecasts(metriques);

      setData({
        metadata,
        metriques,
        historique,
        previsions,
        budgetYears,
        forecasts,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error loading commune data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur lors du chargement des données'
      }));
    }
  };

  const refreshData = () => loadCommuneDataForCurrentCommune();

  const getHistoricalData = () => {
    return data.budgetYears
      .filter(b => b.status === 'validated' || b.status === 'imported')
      .map(b => ({
        year: b.year,
        recettes: b.total_recettes,
        depenses: b.total_depenses
      }))
      .sort((a, b) => a.year - b.year);
  };

  const getForecastData = () => {
    const metadata = data.metadata;
    if (!metadata) return [];

    return [{
      year: metadata.synthese.annee_cible,
      pessimistic: metadata.synthese.scenario_pessimiste,
      central: metadata.synthese.scenario_central,
      optimistic: metadata.synthese.scenario_optimiste
    }];
  };

  const simulateNewYear = async (year: number, recettes: number): Promise<{ success: boolean; message: string }> => {
    // Simulate adding a new year of data and re-running models
    await new Promise(r => setTimeout(r, 2000));

    // Update historique with new year
    const newHistoriqueEntry: HistoriqueRow = {
      annee: year,
      valeur: recettes,
      type: 'Réalisé'
    };

    setData(prev => ({
      ...prev,
      historique: [...prev.historique.filter(h => h.annee !== year || h.type !== 'Réalisé'), newHistoriqueEntry],
      lastUpdated: new Date()
    }));

    // Recalculate forecasts based on new data
    const lastRecettes = recettes;
    const avgGrowth = metadata?.modeles.cagr.cagr_4ans_pct || 6.93;
    const newForecast = lastRecettes * (1 + avgGrowth / 100);

    // Update previsions for new year
    setData(prev => ({
      ...prev,
      metadata: prev.metadata ? {
        ...prev.metadata,
        synthese: {
          ...prev.metadata.synthese,
          scenario_central: newForecast,
          mediane: newForecast,
          scenario_pessimiste: newForecast * 0.97,
          scenario_optimiste: newForecast * 1.03
        }
      } : null
    }));

    return { success: true, message: `Année ${year} ajoutée. Prévisions mises à jour: ${(newForecast / 1_000_000).toFixed(1)}M MAD` };
  };

  return (
    <CommuneDataContext.Provider value={{
      ...data,
      refreshData,
      getHistoricalData,
      getForecastData,
      simulateNewYear
    }}>
      {children}
    </CommuneDataContext.Provider>
  );
}

export function useCommuneData() {
  const context = useContext(CommuneDataContext);
  if (!context) {
    throw new Error('useCommuneData must be used within a CommuneDataProvider');
  }
  return context;
}
