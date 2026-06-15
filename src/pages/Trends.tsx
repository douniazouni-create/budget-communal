import { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useCommuneData } from '../hooks/useCommuneData';
import { useCommuneManagement } from '../hooks/useCommuneManagement';
import {
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Trends() {
  const { currentCommune } = useCommuneManagement();
  const { historique, metadata, getHistoricalData, getForecastData, loading } = useCommuneData();
  const [filters, setFilters] = useState({
    showTrendline: true,
    showForecasts: true
  });
  const chartRef = useRef<HTMLDivElement>(null);

  const historicalData = getHistoricalData();
  const forecastData = getForecastData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' MAD';
  };

  // Get all data including 2020 previsionnel
  const allHistorique = historique.filter(h => h.type === 'Réalisé' || h.type === 'Prévisionnel');

  // Calculate trendline (simple moving average)
  const calculateTrendline = () => {
    const recettes = historicalData.map(d => d.recettes);
    const window = 3;
    const trend: (number | null)[] = [];

    for (let i = 0; i < recettes.length; i++) {
      if (i < window - 1) {
        trend.push(null);
      } else {
        const sum = recettes.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        trend.push(sum / window);
      }
    }

    return trend;
  };

  const trendline = calculateTrendline();

  // Identify inflection points (significant changes > 5%)
  const inflectionPoints: { year: number; type: 'increase' | 'decrease'; change: number; prev: number; curr: number }[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    const change = ((historicalData[i].recettes - historicalData[i-1].recettes) / historicalData[i-1].recettes) * 100;
    if (Math.abs(change) > 5) {
      inflectionPoints.push({
        year: historicalData[i].year,
        type: change > 0 ? 'increase' : 'decrease',
        change,
        prev: historicalData[i-1].recettes,
        curr: historicalData[i].recettes
      });
    }
  }

  // Calculate CAGR from metadata
  const cagr4ans = metadata?.modeles.cagr.cagr_4ans_pct || 6.93;
  const cagr2ans = metadata?.modeles.cagr.cagr_2ans_pct || 6.76;

  // Chart data
  const forecast2026 = forecastData[0];
  const chartData = {
    labels: [
      ...historicalData.map(d => d.year.toString()),
      ...(filters.showForecasts ? ['2026 (Prévision)'] : [])
    ],
    datasets: [
      {
        label: 'Recettes réalisées',
        data: historicalData.map(d => d.recettes / 1_000_000),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointBackgroundColor: historicalData.map((d, idx) => {
          const isInflection = inflectionPoints.some(ip => ip.year === d.year);
          return isInflection ? '#EF4444' : '#3B82F6';
        }),
        pointBorderWidth: 2,
      },
      ...(filters.showTrendline ? [{
        label: 'Courbe de tendance (MA 3 ans)',
        data: trendline.map(v => v ? v / 1_000_000 : null),
        borderColor: '#9CA3AF',
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
      }] : []),
      ...(filters.showForecasts && forecast2026 ? [
        {
          label: 'Scénario pessimiste',
          data: [...Array(historicalData.length).fill(null), forecast2026.pessimistic / 1_000_000],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          borderDash: [5, 5],
          pointRadius: 8,
          pointStyle: 'triangle' as const,
          pointBackgroundColor: '#EF4444',
        },
        {
          label: 'Scénario central (médiane)',
          data: [...Array(historicalData.length).fill(null), forecast2026.central / 1_000_000],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: false,
          pointRadius: 10,
          pointStyle: 'circle' as const,
          pointBackgroundColor: '#10B981',
        },
        {
          label: 'Scénario optimiste',
          data: [...Array(historicalData.length).fill(null), forecast2026.optimistic / 1_000_000],
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: false,
          borderDash: [5, 5],
          pointRadius: 8,
          pointStyle: 'triangle' as const,
          pointBackgroundColor: '#8B5CF6',
        }
      ] : [])
    ].filter(Boolean)
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
          text: 'Recettes (Millions MAD)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const handleExportCSV = () => {
    const headers = ['Année', 'Valeur (MAD)', 'Type'];
    const rows = historique.map(h => [
      h.annee.toString(),
      h.valeur.toFixed(2),
      h.type
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `evolution_${currentCommune?.name}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Évolution et Tendances</h1>
          <p className="text-gray-600">Analyse des recettes budgétaires - {currentCommune?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.showTrendline}
              onChange={(e) => setFilters({ ...filters, showTrendline: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Courbe de tendance</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.showForecasts}
              onChange={(e) => setFilters({ ...filters, showForecasts: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Prévisions 2026</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div ref={chartRef} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Évolution historique des recettes (2021-2025)</h2>
        <p className="text-sm text-gray-500 mb-4">Les points rouges marquent les variations significatives ({'>'} 5%)</p>
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Inflection Points */}
      {inflectionPoints.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Points d'inflexion détectés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inflectionPoints.map((point, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  point.type === 'increase'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {point.type === 'increase' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">{point.year}</span>
                </div>
                <p className={`text-2xl font-bold ${
                  point.type === 'increase' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {point.type === 'increase' ? '+' : ''}{point.change.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(point.prev)} → {formatCurrency(point.curr)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">TCAC 4 ans</p>
              <p className="text-xl font-bold text-gray-900">{cagr4ans.toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Taux de croissance annuel composé (2021-2025)</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">TCAC 2 ans</p>
              <p className="text-xl font-bold text-gray-900">{cagr2ans.toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Croissance récente (2023-2025)</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Meilleure année</p>
              <p className="text-xl font-bold text-gray-900">
                {historicalData.sort((a, b) => b.recettes - a.recettes)[0]?.year || '-'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Max: {formatCurrency(Math.max(...historicalData.map(d => d.recettes)))}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              {historicalData[historicalData.length - 1].recettes > historicalData[historicalData.length - 2].recettes ? (
                <TrendingUp className="w-5 h-5 text-orange-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Variation 2024-2025</p>
              <p className="text-xl font-bold text-gray-900">
                {((historicalData[historicalData.length - 1].recettes - historicalData[historicalData.length - 2].recettes) / historicalData[historicalData.length - 2].recettes * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {formatCurrency(historicalData[historicalData.length - 2].recettes)} → {formatCurrency(historicalData[historicalData.length - 1].recettes)}
          </p>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Données historiques complètes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Année</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Valeur</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Variation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historique.filter(h => h.type !== 'Scénario pessimiste' && h.type !== 'Scénario central' && h.type !== 'Scénario optimiste' && !h.type.includes('IC')).map((row, idx, arr) => {
                const prevValue = idx > 0 ? arr[idx - 1]?.valeur : null;
                const variation = prevValue ? ((row.valeur - prevValue) / prevValue) * 100 : null;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{row.annee}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.type === 'Réalisé' ? 'bg-blue-100 text-blue-700' :
                        row.type === 'Prévisionnel' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(row.valeur)}
                    </td>
                    <td className={`px-6 py-3 text-right ${
                      variation === null ? 'text-gray-400' :
                      variation >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {variation === null ? '-' : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
