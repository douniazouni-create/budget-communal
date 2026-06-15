import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useCommuneManagement } from '../hooks/useCommuneManagement';
import {
  Building2,
  Plus,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Table,
  BarChart3
} from 'lucide-react';
import { generateSimulatedData } from '../hooks/useCommuneData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CommuneComparison {
  id: string;
  name: string;
  metadata: ReturnType<typeof generateSimulatedData>['metadata'];
  historique: ReturnType<typeof generateSimulatedData>['historique'];
  metriques: ReturnType<typeof generateSimulatedData>['metriques'];
}

export default function Compare() {
  const { communes, currentCommune, setCurrentCommune } = useCommuneManagement();
  const [selectedCommunes, setSelectedCommunes] = useState<CommuneComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-select first 2 communes for comparison
    if (selectedCommunes.length === 0 && communes.length >= 2) {
      const commune1Data = generateSimulatedData(communes[0].id, communes[0].name);
      const commune2Data = generateSimulatedData(communes[1].id, communes[1].name);

      setSelectedCommunes([
        {
          id: communes[0].id,
          name: communes[0].name,
          metadata: commune1Data.metadata,
          historique: commune1Data.historique,
          metriques: commune1Data.metriques
        },
        {
          id: communes[1].id,
          name: communes[1].name,
          metadata: commune2Data.metadata,
          historique: commune2Data.historique,
          metriques: commune2Data.metriques
        }
      ]);
      setLoading(false);
    }
  }, [communes]);

  const addCommuneToComparison = (commune: { id: string; name: string }) => {
    if (selectedCommunes.find(c => c.id === commune.id)) return;
    if (selectedCommunes.length >= 4) {
      alert('Maximum 4 communes peuvent être comparées');
      return;
    }

    const communeData = generateSimulatedData(commune.id, commune.name);
    setSelectedCommunes(prev => [...prev, {
      id: commune.id,
      name: commune.name,
      metadata: communeData.metadata,
      historique: communeData.historique,
      metriques: communeData.metriques
    }]);
  };

  const removeCommuneFromComparison = (communeId: string) => {
    setSelectedCommunes(prev => prev.filter(c => c.id !== communeId));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMillions = (value: number) => {
    return (value / 1_000_000).toFixed(1);
  };

  // Colors for different communes
  const communeColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  // Evolution chart data
  const evolutionChartData = {
    labels: ['2021', '2022', '2023', '2024', '2025'],
    datasets: selectedCommunes.map((commune, idx) => ({
      label: commune.name,
      data: commune.historique
        .filter(h => h.annee >= 2021 && h.annee <= 2025 && h.type === 'Réalisé')
        .sort((a, b) => a.annee - b.annee)
        .map(h => h.valeur / 1_000_000),
      borderColor: communeColors[idx],
      backgroundColor: `${communeColors[idx]}20`,
      fill: false,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
    }))
  };

  // Forecast comparison chart
  const forecastChartData = {
    labels: selectedCommunes.map(c => c.name),
    datasets: [
      {
        label: 'Scénario pessimiste',
        data: selectedCommunes.map(c => c.metadata.synthese.scenario_pessimiste / 1_000_000),
        backgroundColor: '#EF444480',
        borderRadius: 4,
      },
      {
        label: 'Scénario central',
        data: selectedCommunes.map(c => c.metadata.synthese.scenario_central / 1_000_000),
        backgroundColor: '#10B98180',
        borderRadius: 4,
      },
      {
        label: 'Scénario optimiste',
        data: selectedCommunes.map(c => c.metadata.synthese.scenario_optimiste / 1_000_000),
        backgroundColor: '#8B5CF680',
        borderRadius: 4,
      }
    ]
  };

  // Score comparison chart
  const scoreChartData = {
    labels: ['SVR', 'Theta', 'CAGR', 'Poly Reg', 'Lin Reg'],
    datasets: selectedCommunes.map((commune, idx) => ({
      label: commune.name,
      data: commune.metriques.slice(0, 5).map(m => m.score_global),
      borderColor: communeColors[idx],
      backgroundColor: `${communeColors[idx]}40`,
      fill: false,
      tension: 0.3,
      pointRadius: 5,
    }))
  };

  const evolutionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${context.dataset.label}: ${context.parsed.y.toFixed(1)}M MAD`
        }
      }
    },
    scales: {
      y: {
        ticks: { callback: (v: number | string) => `${v}M` },
        title: { display: true, text: 'Recettes (Millions MAD)' }
      }
    }
  };

  const forecastChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${context.dataset.label}: ${context.parsed.y.toFixed(1)}M MAD`
        }
      }
    },
    scales: {
      y: {
        ticks: { callback: (v: number | string) => `${v}M` },
        title: { display: true, text: 'Prévision 2026 (Millions MAD)' }
      }
    }
  };

  const scoreChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (v: number | string) => `${v}%` },
        title: { display: true, text: 'Score global (%)' }
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Commune', 'Recettes 2025', 'Prévision 2026', 'Variation', 'TCAC', 'Meilleur modèle', 'Score'];
    const rows = selectedCommunes.map(c => {
      const recettes2025 = c.metadata.historique['2025'];
      return [
        c.name,
        formatCurrency(recettes2025),
        formatCurrency(c.metadata.synthese.mediane),
        `${c.metadata.synthese.variation_vs_2025_pct.toFixed(1)}%`,
        `${c.metadata.modeles.cagr.cagr_4ans_pct.toFixed(2)}%`,
        c.metadata.synthese.modele_recommande,
        `${c.metadata.synthese.score_modele_recommande.toFixed(1)}%`
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'comparaison_communes.csv';
    link.click();
  };

  const availableCommunes = communes.filter(c => !selectedCommunes.find(s => s.id === c.id));

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
          <h1 className="text-2xl font-bold text-gray-900">Comparaison entre communes</h1>
          <p className="text-gray-600">Analyse comparative des performances budgétaires</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Commune Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Communes sélectionnées ({selectedCommunes.length}/4)</h2>
          <div className="flex items-center gap-2">
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const commune = communes.find(c => c.id === e.target.value);
                  if (commune) addCommuneToComparison(commune);
                }
              }}
            >
              <option value="">+ Ajouter une commune</option>
              {availableCommunes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedCommunes.map((commune, idx) => (
            <div
              key={commune.id}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2"
              style={{ borderColor: communeColors[idx], backgroundColor: `${communeColors[idx]}10` }}
            >
              <Building2 className="w-5 h-5" style={{ color: communeColors[idx] }} />
              <span className="font-medium" style={{ color: communeColors[idx] }}>{commune.name}</span>
              <button
                onClick={() => removeCommuneFromComparison(commune.id)}
                className="ml-1 p-1 hover:bg-white/50 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Comparison Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Tableau comparatif des indicateurs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Indicateur</th>
                {selectedCommunes.map((commune, idx) => (
                  <th key={commune.id} className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase" style={{ color: communeColors[idx] }}>
                    {commune.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Recettes 2025</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center font-medium" style={{ color: communeColors[idx] }}>
                    {formatMillions(commune.metadata.historique['2025'])}M MAD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Prévision 2026</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center font-medium" style={{ color: communeColors[idx] }}>
                    {formatMillions(commune.metadata.synthese.mediane)}M MAD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Variation estimée</td>
                {selectedCommunes.map((commune, idx) => {
                  const variation = commune.metadata.synthese.variation_vs_2025_pct;
                  return (
                    <td key={commune.id} className="px-6 py-4 text-center">
                      <span className={`flex items-center justify-center gap-1 font-medium ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variation >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">TCAC 4 ans</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center font-medium text-gray-900">
                    {commune.metadata.modeles.cagr.cagr_4ans_pct.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Meilleur modèle</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center text-sm text-gray-700">
                    {commune.metadata.meilleur_modele_metriques.nom.replace(/^\d+\.\s*/, '')}
                    <span className="block text-xs text-gray-500">
                      Score: {commune.metadata.meilleur_modele_metriques.score_global.toFixed(1)}%
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Modèle recommandé</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center text-sm text-gray-700">
                    {commune.metadata.synthese.modele_recommande.replace(/^\d+\.\s*/, '')}
                    <span className="block text-xs text-gray-500">
                      Score: {commune.metadata.synthese.score_modele_recommande.toFixed(1)}%
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Écart-type prévisions</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center font-medium text-gray-900">
                    {formatMillions(commune.metadata.synthese.ecart_type)}M MAD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">IC 95% bas</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center text-gray-600">
                    {formatMillions(commune.metadata.synthese.ic_prophet_bas)}M MAD
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">IC 95% haut</td>
                {selectedCommunes.map((commune, idx) => (
                  <td key={commune.id} className="px-6 py-4 text-center text-gray-600">
                    {formatMillions(commune.metadata.synthese.ic_prophet_haut)}M MAD
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Évolution comparative des recettes (2021-2025)</h2>
        <div className="h-80">
          <Line data={evolutionChartData} options={evolutionChartOptions} />
        </div>
      </div>

      {/* Forecast Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Comparaison des prévisions 2026</h2>
        <div className="h-80">
          <Bar data={forecastChartData} options={forecastChartOptions} />
        </div>
      </div>

      {/* Model Scores Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Comparaison des scores des modèles (Top 5)</h2>
        <div className="h-80">
          <Line data={scoreChartData} options={scoreChartOptions} />
        </div>
      </div>

      {/* Individual Model Comparison */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">Détail des modèles par commune</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Modèle</th>
                {selectedCommunes.map((commune, idx) => (
                  <th key={commune.id} className="px-4 py-3 text-center text-xs font-semibold" style={{ color: communeColors[idx] }}>
                    {commune.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {['SVR (RBF)', 'Theta Method', 'CAGR', 'Régression polynomiale', 'Régression linéaire', 'Ridge Regression', 'Prophet'].map((modelName, rowIdx) => (
                <tr key={modelName} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{modelName}</td>
                  {selectedCommunes.map((commune, idx) => {
                    const metrique = commune.metriques.find(m => m.modele.includes(modelName.split(' ')[0]) || m.modele.includes(modelName));
                    return (
                      <td key={commune.id} className="px-4 py-3 text-center">
                        {metrique ? (
                          <div>
                            <p className="text-sm font-medium" style={{ color: communeColors[idx] }}>
                              {formatMillions(metrique.prevision_2026)}M
                            </p>
                            <p className={`text-xs ${metrique.score_global >= 70 ? 'text-green-600' : metrique.score_global >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              Score: {metrique.score_global.toFixed(0)}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
