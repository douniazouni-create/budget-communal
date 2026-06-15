import { useRef, useEffect, useState } from 'react';
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
import { Line } from 'react-chartjs-2';
import { useCommuneData } from '../hooks/useCommuneData';
import { useCommuneManagement } from '../hooks/useCommuneManagement';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  DollarSign,
  BarChart3,
  HelpCircle,
  X,
  Award,
  RefreshCw,
  Download,
  Info,
  Sparkles
} from 'lucide-react';

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

export default function Dashboard() {
  const { currentCommune } = useCommuneManagement();
  const { budgetYears, forecasts, metadata, metriques, historique, getHistoricalData, getForecastData, loading, lastUpdated } = useCommuneData();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour && currentCommune) {
      setShowTour(true);
    }
  }, [currentCommune]);

  const historicalData = getHistoricalData();
  const forecastData = getForecastData();

  const lastYear = historicalData[historicalData.length - 1];
  const prevYear = historicalData[historicalData.length - 2];

  const lastYearRecettes = lastYear?.recettes || 0;
  const prevYearRecettes = prevYear?.recettes || 0;

  const variationPercent = prevYearRecettes > 0
    ? ((lastYearRecettes - prevYearRecettes) / prevYearRecettes) * 100
    : 0;

  const forecast2026 = forecastData[0];
  const forecastVariation = metadata?.synthese.variation_vs_2025_pct || 0;

  // Score from best model
  const bestModelScore = metadata?.meilleur_modele_metriques.score_global || 0;

  // Get top 5 models sorted by score
  const topModels = [...forecasts].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  // Alerts based on real data
  const alerts: { type: 'warning' | 'error' | 'info'; message: string }[] = [];

  // Check for declining years in historique
  const hasDecline = historique.filter(h => h.type === 'Réalisé').some((h, idx, arr) => {
    if (idx === 0) return false;
    return h.valeur < arr[idx - 1].valeur;
  });

  if (hasDecline) {
    alerts.push({
      type: 'info',
      message: 'Des variations annuelles significatives détectées. Consultez l\'analyse de tendance pour plus de détails.'
    });
  }

  if (metadata && bestModelScore > 80) {
    alerts.push({
      type: 'info',
      message: `Le modèle ${metadata.meilleur_modele_metriques.nom} obtient un excellent score de ${bestModelScore.toFixed(1)}%.`
    });
  }

  if (metadata && forecastVariation > 5) {
    alerts.push({
      type: 'warning',
      message: `Prévision positive de +${forecastVariation.toFixed(1)}%. Opportunité de croissance.`
    });
  }

  // Chart data including forecast scenarios
  const chartData = {
    labels: [...historicalData.map(d => d.year.toString()), '2026 (Prévision)'],
    datasets: [
      {
        label: 'Recettes réalisées',
        data: [...historicalData.map(d => d.recettes / 1_000_000), null],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#3B82F6',
      },
      {
        label: 'Scénario pessimiste',
        data: [...Array(historicalData.length).fill(null), forecast2026?.pessimistic ? forecast2026.pessimistic / 1_000_000 : null],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: false,
        borderDash: [5, 5],
        pointRadius: 6,
        pointStyle: 'triangle' as const,
      },
      {
        label: 'Scénario central (médiane)',
        data: [...Array(historicalData.length).fill(null), forecast2026?.central ? forecast2026.central / 1_000_000 : null],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: false,
        pointRadius: 8,
        pointStyle: 'circle' as const,
        pointBackgroundColor: '#10B981',
      },
      {
        label: 'Scénario optimiste',
        data: [...Array(historicalData.length).fill(null), forecast2026?.optimistic ? forecast2026.optimistic / 1_000_000 : null],
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: false,
        borderDash: [5, 5],
        pointRadius: 6,
        pointStyle: 'triangle' as const,
      },
      ...(metadata ? [{
        label: 'IC 95% (Prophet)',
        data: [...Array(historicalData.length).fill(null), metadata.synthese.ic_prophet_haut / 1_000_000],
        borderColor: 'transparent',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: '-2',
        pointRadius: 0,
        borderDash: [2, 2],
      }] : [])
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            const value = context.parsed.y;
            if (value === null) return null;
            return `${context.dataset.label}: ${value.toFixed(2)} M MAD`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number | string) => `${value} M`
        },
        title: {
          display: true,
          text: 'Montants (Millions MAD)'
        }
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' MAD';
  };

  const handleExportPNG = () => {
    alert('Export PNG du graphique disponible dans la version complète');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tour Guide Modal */}
      {showTour && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => {
                setShowTour(false);
                localStorage.setItem('hasSeenTour', 'true');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bienvenue - Commune de {currentCommune?.name}</h3>
              <p className="text-gray-600">BI Recettes Budgétaires</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 text-sm">Indicateurs clés</h4>
                <p className="text-xs text-gray-600">Recettes réalisées, prévisions 2026 et score de fiabilité.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 text-sm">12 modèles de prévision</h4>
                <p className="text-xs text-gray-600">SVR, Prophet, LSTM, Theta, etc. Comparaison et scores.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 text-sm">Scénarios pessimiste/central/optimiste</h4>
                <p className="text-xs text-gray-600">Intervalle de confiance 95% inclus.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTour(false);
                localStorage.setItem('hasSeenTour', 'true');
              }}
              className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Commencer l'exploration
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                alert.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                alert.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              {alert.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              {alert.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Commune de {currentCommune?.name}, {currentCommune?.region}</p>
          <p className="text-sm text-gray-500">Projet: {metadata?.projet}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTour(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Tour guidé
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Recettes réalisées */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 group relative">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-100 rounded-lg p-1">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              variationPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {variationPercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(variationPercent).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Recettes réalisées {lastYear?.year}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(lastYearRecettes)}</p>
          <p className="text-xs text-gray-400 mt-2">vs {prevYear?.year}: {formatCurrency(prevYearRecettes)}</p>
        </div>

        {/* Prévision centrale */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-100 rounded-lg p-1">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
              forecastVariation >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {forecastVariation >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(forecastVariation).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Prévision 2026 (médiane filtrée)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(forecast2026?.central || 0)}</p>
          <p className="text-xs text-gray-400 mt-2">
            [{formatCurrency(forecast2026?.pessimistic || 0)} - {formatCurrency(forecast2026?.optimistic || 0)}]
          </p>
        </div>

        {/* Meilleur modèle */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-100 rounded-lg p-1">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Meilleur modèle: {metadata?.meilleur_modele_metriques.nom}</p>
          <p className="text-2xl font-bold text-gray-900">{bestModelScore.toFixed(1)}%</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${bestModelScore >= 80 ? 'bg-green-500' : bestModelScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${bestModelScore}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">MAPE: {metadata?.meilleur_modele_metriques.mape_pct.toFixed(2)}%</p>
        </div>

        {/* Modèle recommandé */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-100 rounded-lg p-1">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Modèle recommandé</p>
          <p className="text-lg font-bold text-gray-900">{metadata?.synthese.modele_recommande}</p>
          <p className="text-xs text-gray-400 mt-2">Score: {metadata?.synthese.score_modele_recommande.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Évolution des recettes et prévisions 2026</h2>
            <p className="text-sm text-gray-500">Historique {historicalData[0]?.year}-{lastYear?.year} et 3 scénarios</p>
          </div>
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>
        <div ref={chartRef} className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Model Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Models */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 modèles par score</h2>
          <div className="space-y-3">
            {topModels.map((forecast, idx) => {
              const metriqueRow = metriques.find(m => m.modele.replace(/^\d+\.\s*/, '') === forecast.model_name);
              return (
                <div key={forecast.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-gray-200 text-gray-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{forecast.model_name}</p>
                      <p className="text-xs text-gray-500">
                        MAPE: {((forecast.mape || 0) * 100).toFixed(2)}% | R²: {(forecast.r_squared || 0).toFixed(3)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{((forecast.forecast_value || 0) / 1_000_000).toFixed(1)}M MAD</p>
                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      (forecast.score || 0) >= 80 ? 'bg-green-100 text-green-700' :
                      (forecast.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      (forecast.score || 0) >= 40 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      Score: {(forecast.score || 0).toFixed(0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Synthesis */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Synthèse des 12 modèles</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600">Médiane filtrée</p>
                <p className="text-xl font-bold text-blue-900">{((metadata?.synthese.mediane || 0) / 1_000_000).toFixed(1)}M MAD</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-600">Moyenne</p>
                <p className="text-xl font-bold text-emerald-900">{((metadata?.synthese.moyenne || 0) / 1_000_000).toFixed(1)}M MAD</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Écart-type</span>
                <span className="font-medium text-gray-900">{((metadata?.synthese.ecart_type || 0) / 1_000_000).toFixed(2)}M MAD</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Min - Max</span>
                <span className="font-medium text-gray-900">{((metadata?.synthese.mini || 0) / 1_000_000).toFixed(1)}M - {((metadata?.synthese.maxi || 0) / 1_000_000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Modèles cohérents</span>
                <span className="font-medium text-gray-900">{metadata?.synthese.nb_modeles_coherents}/{metadata?.synthese.nb_modeles}</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
              <p className="text-sm text-blue-100">Intervalle de confiance 95% (Prophet)</p>
              <p className="text-lg font-bold">
                [{formatCurrency(metadata?.synthese.ic_prophet_bas || 0)} - {formatCurrency(metadata?.synthese.ic_prophet_haut || 0)}]
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
