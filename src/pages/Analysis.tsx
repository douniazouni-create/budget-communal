import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useCommuneData } from '../hooks/useCommuneData';
import { useCommuneManagement } from '../hooks/useCommuneManagement';
import {
  Download,
  Info,
  Play,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  XCircle
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Analysis() {
  const { currentCommune } = useCommuneManagement();
  const { forecasts, metriques, metadata, previsions, loading } = useCommuneData();
  const [simulationParams, setSimulationParams] = useState({
    recettesPropresModifier: 0,
    tvaModifier: 0,
    recouvrementModifier: 0
  });
  const [showSimulation, setShowSimulation] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' MAD';
  };

  const getQualiteColor = (qualite: string) => {
    switch (qualite) {
      case 'Excellent': return 'bg-green-100 text-green-700 border-green-200';
      case 'Acceptable': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getQualiteIcon = (qualite: string) => {
    switch (qualite) {
      case 'Excellent': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Acceptable': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // Sort metriques by score
  const sortedMetriques = [...metriques].sort((a, b) => b.score_global - a.score_global);

  // Chart colors for models
  const getModelColor = (rang: number) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
      '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6',
      '#EF4444', '#64748B'
    ];
    return colors[(rang - 1) % colors.length];
  };

  // Chart data for forecasts comparison
  const chartData = {
    labels: sortedMetriques.map(m => m.modele.replace(/^\d+\.\s*/, '')),
    datasets: [
      {
        label: 'Prévision 2026',
        data: sortedMetriques.map(m => m.prevision_2026 / 1_000_000),
        backgroundColor: sortedMetriques.map(m => getModelColor(m.rang)),
        borderRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { x: number } }) => `${context.parsed.x.toFixed(1)} M MAD`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          callback: (value: number | string) => `${value} M`
        },
        title: {
          display: true,
          text: 'Prévision 2026 (Millions MAD)'
        }
      }
    }
  };

  // Simulation calculation based on real data
  const baseForecast = metadata?.synthese.mediane || 164_798_123;

  const simulatedResult = baseForecast * (1 + simulationParams.recettesPropresModifier / 100)
    * (1 + simulationParams.tvaModifier / 100)
    * (1 + simulationParams.recouvrementModifier / 100);

  const balanceImpact = simulatedResult - baseForecast;

  const handleExportCSV = () => {
    const headers = ['Rang', 'Modèle', 'Prévision 2026 (MAD)', 'MAE (MAD)', 'RMSE (MAD)', 'MAPE (%)', 'R²', 'MASE', 'Score', 'Qualité'];
    const rows = sortedMetriques.map(m => [
      m.rang.toString(),
      m.modele,
      m.prevision_2026.toFixed(2),
      m.MAE_MAD.toFixed(2),
      m.RMSE_MAD.toFixed(2),
      m.MAPE_pct.toFixed(2),
      m.R2.toFixed(4),
      m.MASE.toFixed(4),
      m.score_global.toFixed(2),
      m.qualite
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metriques_comparaison_${currentCommune?.name}_2026.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse et Prévisions</h1>
          <p className="text-gray-600">Comparaison des 12 modèles - {currentCommune?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Best Model Highlight */}
      {metadata && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm">Meilleur modèle: {metadata.meilleur_modele_metriques.nom}</p>
              <p className="text-3xl font-bold">{metadata.meilleur_modele_metriques.score_global.toFixed(2)}%</p>
              <div className="flex gap-4 text-sm text-emerald-100 mt-1">
                <span>MAPE: {metadata.meilleur_modele_metriques.mape_pct.toFixed(2)}%</span>
                <span>R²: {metadata.meilleur_modele_metriques.r2.toFixed(4)}</span>
                <span>MASE: {metadata.meilleur_modele_metriques.mase.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-medium">12 modèles de prévision comparés</p>
          <p className="text-sm text-blue-700">
            Les scores tiennent compte du MAPE (erreur relative), R² (qualité d'ajustement) et MASE (erreur mise à l'échelle).
            {metadata?.synthese.modeles_exclus_mediane.length! > 0 && (
              <> Modèles exclus de la médiane: {metadata?.synthese.modeles_exclus_mediane.join(', ')}</>
            )}
          </p>
        </div>
      </div>

      {/* Model Comparison Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Comparaison des prévisions par modèle</h2>
            <p className="text-sm text-gray-500">Prévisions pour 2026 (classées par score)</p>
          </div>
        </div>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Tableau comparatif détaillé des 12 modèles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rang</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Modèle</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Prévision 2026</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">MAE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">MAPE%</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">R²</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">MASE</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Qualité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMetriques.map((metrique) => {
                const previsionRow = previsions.find(p => p.modele === metrique.modele);
                return (
                  <tr key={metrique.modele} className={`hover:bg-gray-50 transition-colors ${metrique.meilleur_modele ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        metrique.rang === 1 ? 'bg-amber-100 text-amber-700' :
                        metrique.rang === 2 ? 'bg-gray-200 text-gray-600' :
                        metrique.rang === 3 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {metrique.rang}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getModelColor(metrique.rang) }}
                        />
                        <span className="font-medium text-gray-900">{metrique.modele.replace(/^\d+\.\s*/, '')}</span>
                        {metrique.meilleur_modele === 1 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">MEILLEUR</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(metrique.prevision_2026)}
                      <p className="text-xs text-gray-500">+{previsionRow?.variation_pct.toFixed(1)}%</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(metrique.MAE_MAD / 1_000_000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {metrique.MAPE_pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {metrique.R2.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {metrique.MASE.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getQualiteColor(metrique.qualite)}`}>
                          {metrique.score_global.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {getQualiteIcon(metrique.qualite)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* What-if Simulation */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Simulateur de scénarios "What-If"</h2>
            <p className="text-sm text-gray-500">Modifiez les hypothèses pour voir l'impact sur les prévisions</p>
          </div>
          <button
            onClick={() => setShowSimulation(!showSimulation)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              showSimulation
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Play className="w-4 h-4" />
            {showSimulation ? 'Masquer' : 'Lancer simulation'}
          </button>
        </div>

        {showSimulation && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Sliders className="w-4 h-4" />
                  Recettes propres
                </label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={simulationParams.recettesPropresModifier}
                  onChange={(e) => setSimulationParams({
                    ...simulationParams,
                    recettesPropresModifier: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-30%</span>
                  <span className="font-medium text-gray-900">
                    {simulationParams.recettesPropresModifier >= 0 ? '+' : ''}{simulationParams.recettesPropresModifier}%
                  </span>
                  <span>+30%</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Sliders className="w-4 h-4" />
                  Variation TVA
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={simulationParams.tvaModifier}
                  onChange={(e) => setSimulationParams({
                    ...simulationParams,
                    tvaModifier: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-20%</span>
                  <span className="font-medium text-gray-900">
                    {simulationParams.tvaModifier >= 0 ? '+' : ''}{simulationParams.tvaModifier}%
                  </span>
                  <span>+20%</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Sliders className="w-4 h-4" />
                  Taux de recouvrement
                </label>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  value={simulationParams.recouvrementModifier}
                  onChange={(e) => setSimulationParams({
                    ...simulationParams,
                    recouvrementModifier: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-25%</span>
                  <span className="font-medium text-gray-900">
                    {simulationParams.recouvrementModifier >= 0 ? '+' : ''}{simulationParams.recouvrementModifier}%
                  </span>
                  <span>+25%</span>
                </div>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Prévision médiane</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(baseForecast)}</p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-sm text-indigo-600 mb-1">Prévision simulée</p>
                <p className="text-xl font-bold text-indigo-900">{formatCurrency(simulatedResult)}</p>
              </div>

              <div className={`p-4 rounded-xl border ${
                balanceImpact >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm mb-1 ${balanceImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Impact sur l'équilibre
                </p>
                <p className={`text-xl font-bold ${balanceImpact >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {balanceImpact >= 0 ? '+' : ''}{formatCurrency(balanceImpact)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
