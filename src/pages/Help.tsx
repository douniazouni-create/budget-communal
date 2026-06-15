import { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  FileQuestion,
  Mail,
  Play,
  ChevronDown,
  ChevronRight,
  Search,
  ChevronLeft,
  Lightbulb,
  BarChart3,
  Upload,
  TrendingUp,
  Settings
} from 'lucide-react';

const faqData = [
  {
    question: 'Comment importer un nouveau budget?',
    answer: 'Accédez à l\'onglet Administration > Import Budget. Sélectionnez un fichier PDF ou Excel au format standard marocain. Validez les lignes extraites avant de confirmer l\'import.'
  },
  {
    question: 'Qu\'est-ce que le score de fiabilité?',
    answer: 'Le score de fiabilité mesure la cohérence entre les différents modèles de prévision. Un score élevé (≥80%) indique une forte concordance et donc des prévisions plus fiables.'
  },
  {
    question: 'Comment utiliser le simulateur de scénarios?',
    answer: 'Dans la page Analyse & Prévisions, cliquez sur "Lancer simulation". Modifiez les hypothèses (recettes propres, TVA, recouvrement) pour voir l\'impact sur vos prévisions.'
  },
  {
    question: 'Quelles sont les différences entre les rôles?',
    answer: 'L\'Administrateur peut tout faire. Le Gestionnaire peut consulter, simuler et exporter. L\'Invité a un accès en lecture seule.'
  },
  {
    question: 'Comment exporter un rapport?',
    answer: 'Cliquez sur "Exporter PDF" ou "Exporter CSV" dans les pages Dashboard, Analyse ou Recommandations pour télécharger un rapport complet.'
  },
  {
    question: 'Qu\'est-ce que le TCAC?',
    answer: 'Le Taux de Croissance Annuel Composé mesure la croissance moyenne annuelle sur une période donnée. Il permet d\'extrapoler les tendances futures.'
  },
  {
    question: 'Comment interpréter l\'intervalle de confiance?',
    answer: 'L\'intervalle de confiance à 95% indique la plage dans laquelle la vraie valeur a 95% de chances de se trouver. Plus l\'intervalle est large, plus l\'incertitude est grande.'
  },
  {
    question: 'Puis-je comparer plusieurs communes?',
    answer: 'La fonctionnalité de benchmarking permet de comparer vos indicateurs avec ceux d\'autres communes (données anonymisées). Activez-la dans Administration.'
  }
];

const glossaryData = [
  { term: 'MAPE', definition: 'Mean Absolute Percentage Error - Erreur moyenne absolue en pourcentage. Plus elle est basse, meilleure est la prévision.' },
  { term: 'R²', definition: 'Coefficient de détermination. Mesure la qualité de l\'ajustement du modèle aux données historiques. Varie de 0 à 1.' },
  { term: 'MASE', definition: 'Mean Absolute Scaled Error - Erreur mise à l\'échelle. Permet de comparer les modèles entre eux.' },
  { term: 'TCAC', definition: 'Taux de Croissance Annuel Composé - Moyenne des taux de croissance annuels sur une période.' },
  { term: 'Bayesian Ridge', definition: 'Modèle de régression bayésienne avec régularisation. Fournit des intervalles de confiance probabilistes.' },
  { term: 'Prophet', definition: 'Modèle de prévision développé par Facebook. Gère bien les tendances saisonnières.' },
  { term: 'Recettes propres', definition: 'Recettes générées directement par la commune (taxes, redevances, produits du domaine).' },
  { term: 'Dépendance TVA', definition: 'Pourcentage des recettes provenant de la TVA. Une dépendance élevée limite l\'autonomie budgétaire.' },
  { term: 'Taux de recouvrement', definition: 'Rapport entre les recettes effectivement perçues et les recettes prévues.' },
  { term: 'Équilibre budgétaire', definition: 'État où les recettes couvrent les dépenses. Obligatoire pour les communes marocaines.' }
];

const guideSteps = [
  {
    title: 'Bienvenue',
    content: 'Budget Communal est une application web interactive pour le pilotage et l\'optimisation des recettes budgétaires des collectivités territoriales marocaines.',
    image: null,
    icon: Lightbulb
  },
  {
    title: 'Tableau de bord',
    content: 'Le tableau de bord affiche les indicateurs clés: recettes réalisées, prévisions, score de fiabilité et alertes automatiques. Survolez chaque KPI pour plus d\'informations.',
    image: 'dashboard',
    icon: BarChart3
  },
  {
    title: 'Import de budgets',
    content: 'Importez vos budgets PDF ou Excel via l\'onglet Administration. L\'application extrait, nettoie et structure automatiquement les données.',
    image: 'import',
    icon: Upload
  },
  {
    title: 'Analyse et prévisions',
    content: 'Consultez les 12 modèles de prévision, comparez leurs performances et lancez des scénarios "what-if" pour explorer différentes hypothèses.',
    image: 'analysis',
    icon: TrendingUp
  },
  {
    title: 'Recommandations',
    content: 'Recevez des recommandations personnalisées basées sur vos indicateurs. Utilisez le simulateur d\'impact pour évaluer les gains financiers potentiels.',
    image: 'recommendations',
    icon: Settings
  }
];

export default function Help() {
  const [activeTab, setActiveTab] = useState<'guide' | 'faq' | 'glossary'>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const filteredFaq = faqData.filter(
    item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGlossary = glossaryData.filter(
    item =>
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aide & Documentation</h1>
          <p className="text-gray-600">Guides, FAQ et glossaire</p>
        </div>
        <button
          onClick={() => {
            setShowTour(true);
            setTourStep(0);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Play className="w-5 h-5" />
          Lancer le tour guidé
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'guide'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-2" />
            Guide d'utilisation
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'faq'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileQuestion className="w-4 h-4 inline-block mr-2" />
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'glossary'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <HelpCircle className="w-4 h-4 inline-block mr-2" />
            Glossaire
          </button>
        </div>

        <div className="p-6">
          {/* Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {guideSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans la FAQ..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredFaq.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 text-left">{item.question}</span>
                    {expandedFaq === idx ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Glossary */}
          {activeTab === 'glossary' && (
            <div className="space-y-4">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un terme..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <dl className="grid gap-4">
                {filteredGlossary.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                    <dt className="font-semibold text-gray-900">{item.term}</dt>
                    <dd className="text-gray-600 mt-1">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2">Besoin d\'aide supplémentaire?</h3>
            <p className="text-blue-100 mb-4">
              Notre équipe support est disponible pour vous accompagner dans l\'utilisation de l\'application.
            </p>
            <a
              href="mailto:support@commune.ma"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contacter le support
            </a>
          </div>
        </div>
      </div>

      {/* Tour Modal */}
      {showTour && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                {tourStep < guideSteps.length && (() => {
                  const IconComponent = guideSteps[tourStep].icon;
                  return <IconComponent className="w-6 h-6 text-blue-600" />;
                })()}
              </div>
              <div>
                <p className="text-sm text-gray-500">Étape {tourStep + 1} sur {guideSteps.length}</p>
                <h3 className="text-xl font-bold text-gray-900">
                  {guideSteps[tourStep]?.title || 'Terminé'}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {guideSteps[tourStep]?.content || 'Vous avez terminé le tour guidé!'}
            </p>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {guideSteps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${idx === tourStep ? 'bg-blue-600' : idx < tourStep ? 'bg-blue-300' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                {tourStep > 0 && (
                  <button
                    onClick={() => setTourStep(tourStep - 1)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                    Précédent
                  </button>
                )}
                {tourStep < guideSteps.length - 1 ? (
                  <button
                    onClick={() => setTourStep(tourStep + 1)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowTour(false);
                      setTourStep(0);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    Terminer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
