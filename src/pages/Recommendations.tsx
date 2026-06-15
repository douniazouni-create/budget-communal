import { useState } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Target,
  Download,
  DollarSign,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { useCommuneData } from '../hooks/useCommuneData';
import { useCommuneManagement } from '../hooks/useCommuneManagement';

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: number;
  priority: 1 | 2 | 3;
  action: string;
}

export default function Recommendations() {
  const { currentCommune } = useCommuneManagement();
  const { budgetYears, metadata, loading } = useCommuneData();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [simulatorParams, setSimulatorParams] = useState({
    recouvrementAmelioration: 5,
    redevanceAugmentation: 10,
    newRecette: 500000
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' MAD';
  };

  // Generate dynamic recommendations based on commune data
  const generateRecommendations = (): Recommendation[] => {
    const lastYearRecettes = metadata?.historique['2025'] || 161_273_528;
    const forecast2026 = metadata?.synthese.mediane || 164_798_123;

    const recommendations: Recommendation[] = [];

    // Based on CAGR from data
    const cagr = metadata?.modeles.cagr.cagr_4ans_pct || 6.93;

    // Diversification recommendation (if TVA dependent)
    recommendations.push({
      id: '1',
      category: 'Diversification',
      title: 'Réduire la dépendance aux transferts de l\'État',
      description: `Les transferts représentent une part importante des recettes. Diversifier les recettes propres renforcerait l'autonomie budgétaire. CAGR actuel: ${cagr.toFixed(2)}%`,
      impact: lastYearRecettes * 0.05,
      priority: 1,
      action: 'Développer les recettes propres'
    });

    // Recouvrement improvement
    recommendations.push({
      id: '2',
      category: 'Recouvrement',
      title: 'Améliorer le taux de recouvrement des impôts locaux',
      description: 'Un meilleur recouvrement des taxes locales (taxe professionnelle, taxe d\'habitation) améliore directement les recettes.',
      impact: lastYearRecettes * 0.03,
      priority: 1,
      action: 'Plan de recouvrement'
    });

    // Redevances based on the positive variation
    const variation = metadata?.synthese.variation_vs_2025_pct || 2.19;
    recommendations.push({
      id: '3',
      category: 'Redevances',
      title: 'Revaloriser les redevances de services',
      description: `Les prévisions montrent une croissance de ${variation.toFixed(1)}%. Une revalorisation tarifaire peut accompagner cette tendance.`,
      impact: lastYearRecettes * 0.02,
      priority: 2,
      action: 'Réviser les tarifs'
    });

    // Occupation domaine public
    recommendations.push({
      id: '4',
      category: 'Domaine public',
      title: 'Optimiser l\'occupation du domaine public',
      description: 'L\'occupation du domaine public (terrasses, publicités, enseignes) peut être mieux valorisée.',
      impact: lastYearRecettes * 0.015,
      priority: 2,
      action: 'Recenser les occupations'
    });

    // Économies
    recommendations.push({
      id: '5',
      category: 'Dépenses',
      title: 'Rationaliser les dépenses de fonctionnement',
      description: 'Une révision des postes de dépenses peut dégager des marges de manœuvre pour l\'investissement.',
      impact: lastYearRecettes * 0.04,
      priority: 3,
      action: 'Audit des dépenses'
    });

    // Fiscalité locale
    recommendations.push({
      id: '6',
      category: 'Fiscalité',
      title: 'Élargir l\'assiette de la taxe professionnelle',
      description: 'Identifier et intégrer les entreprises et professions libérales non recensées dans le fichier fiscal.',
      impact: lastYearRecettes * 0.025,
      priority: 2,
      action: 'Recensement fiscal'
    });

    return recommendations;
  };

  const recommendations = generateRecommendations();

  // Simulator calculations
  const lastYearRecettes = metadata?.historique['2025'] || 161_273_528;
  const forecast2026 = metadata?.synthese.mediane || 164_798_123;

  const recouvrementGain = lastYearRecettes * (simulatorParams.recouvrementAmelioration / 100);
  const redevanceGain = lastYearRecettes * 0.04 * (simulatorParams.redevanceAugmentation / 100);
  const totalGain = recouvrementGain + redevanceGain + simulatorParams.newRecette;

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700 border-red-200';
      case 2: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 3: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Diversification': return <Target className="w-4 h-4" />;
      case 'Recouvrement': return <DollarSign className="w-4 h-4" />;
      case 'Redevances': return <ArrowUpCircle className="w-4 h-4" />;
      case 'Domaine public': return <TrendingUp className="w-4 h-4" />;
      case 'Dépenses': return <AlertTriangle className="w-4 h-4" />;
      case 'Fiscalité': return <CheckCircle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Recommandations</h1>
          <p className="text-gray-600">Aide à la décision - {currentCommune?.name}</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter PDF
        </button>
      </div>

      {/* Key Insights from metadata */}
      {metadata && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-3">Synthèse des prévisions 2026</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Variation estimée</p>
              <p className="text-2xl font-bold">+{metadata.synthese.variation_vs_2025_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Prévision médiane</p>
              <p className="text-xl font-bold">{(metadata.synthese.mediane / 1_000_000).toFixed(1)}M MAD</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Modèle recommandé</p>
              <p className="text-lg font-bold">{metadata.synthese.modele_recommande.replace(/^\d+\.\s*/, '')}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">TCAC 4 ans</p>
              <p className="text-xl font-bold">{metadata.modeles.cagr.cagr_4ans_pct.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  rec.priority === 1 ? 'bg-red-100' :
                  rec.priority === 2 ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {getCategoryIcon(rec.category)}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{rec.category}</p>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(rec.priority)}`}>
                Priorité {rec.priority}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{rec.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Impact estimé:</span>
                <span className="font-bold text-green-600">+{formatCurrency(rec.impact)}</span>
              </div>
              <button
                onClick={() => setSelectedAction(selectedAction === rec.id ? null : rec.id)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                {rec.action}
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedAction === rec.id ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Impact Simulator */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Calculator className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Simulateur d'impact des actions</h2>
            <p className="text-sm text-gray-500">Calculez le gain financier de vos mesures</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Amélioration du recouvrement
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="20"
                value={simulatorParams.recouvrementAmelioration}
                onChange={(e) => setSimulatorParams({
                  ...simulatorParams,
                  recouvrementAmelioration: parseInt(e.target.value)
                })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-900 w-12 text-right">
                +{simulatorParams.recouvrementAmelioration}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Gain estimé: {formatCurrency(recouvrementGain)}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Augmentation des redevances
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="30"
                value={simulatorParams.redevanceAugmentation}
                onChange={(e) => setSimulatorParams({
                  ...simulatorParams,
                  redevanceAugmentation: parseInt(e.target.value)
                })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-900 w-12 text-right">
                +{simulatorParams.redevanceAugmentation}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Gain estimé: {formatCurrency(redevanceGain)}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nouvelle source de recettes
            </label>
            <input
              type="number"
              value={simulatorParams.newRecette}
              onChange={(e) => setSimulatorParams({
                ...simulatorParams,
                newRecette: parseInt(e.target.value) || 0
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Montant en MAD"
            />
            <p className="text-xs text-gray-500 mt-2">
              Ex: taxe publicitaire, partenariats
            </p>
          </div>
        </div>

        {/* Simulation Results */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-green-700">Recettes 2025</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(lastYearRecettes)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-700">Gain financier total estimé</p>
              <p className="text-3xl font-bold text-green-900">+{formatCurrency(totalGain)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-700">Impact sur le budget</p>
              <p className="text-2xl font-bold text-green-900">
                +{((totalGain / lastYearRecettes) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Synthèse</h3>
            <p className="text-sm text-blue-800">
              En appliquant les recommandations prioritaires, {currentCommune?.name} pourrait améliorer ses recettes de{' '}
              <strong>{formatCurrency(recommendations.filter(r => r.priority === 1).reduce((sum, r) => sum + r.impact, 0))}</strong> à{' '}
              <strong>{formatCurrency(recommendations.reduce((sum, r) => sum + r.impact, 0))}</strong> selon le niveau d'engagement.
              Basé sur les prévisions {metadata?.synthese.modele_recommande} avec un TCAC de {metadata?.modeles.cagr.cagr_4ans_pct.toFixed(2)}%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
