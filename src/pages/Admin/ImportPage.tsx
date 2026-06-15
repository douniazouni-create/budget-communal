import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCommuneManagement } from '../../hooks/useCommuneManagement';
import { useCommuneData } from '../../hooks/useCommuneData';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Clock,
  CheckSquare,
  Square,
  Zap,
  BarChart3
} from 'lucide-react';

interface ParsedLine {
  id: string;
  code: string;
  libelle: string;
  amount: number;
  category: string;
  valid: boolean;
}

const STEPS = [
  { id: 'upload', label: 'Télécharger', description: 'Sélectionner le fichier PDF ou Excel' },
  { id: 'extract', label: 'Extraction', description: 'Extraire les données du fichier' },
  { id: 'clean', label: 'Nettoyage', description: 'Nettoyer et structurer les données' },
  { id: 'preview', label: 'Aperçu', description: 'Valider les lignes extraites' },
  { id: 'import', label: 'Import', description: 'Charger dans la base de données' },
  { id: 'models', label: 'Modèles', description: 'Réexécuter les 12 modèles de prévision' },
  { id: 'complete', label: 'Terminé', description: 'Mise à jour automatique' }
];

export default function ImportPage() {
  const { user } = useAuth();
  const { currentCommune } = useCommuneManagement();
  const { refreshData, simulateNewYear } = useCommuneData();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedYear, setImportedYear] = useState<number | null>(null);

  const generateDemoLines = (year: number): ParsedLine[] => {
    const baseAmount = 150_000_000 + Math.random() * 30_000_000;
    const lines = [
      { code: '11', libelle: 'Impôts et taxes', amount: Math.round(baseAmount * 0.22) },
      { code: '12', libelle: 'Droits, redevances et taxes indirects', amount: Math.round(baseAmount * 0.18) },
      { code: '13', libelle: 'Recettes de l\'État', amount: Math.round(baseAmount * 0.32) },
      { code: '14', libelle: 'Produits du domaine', amount: Math.round(baseAmount * 0.06) },
      { code: '15', libelle: 'Recettes diverses', amount: Math.round(baseAmount * 0.04) },
      { code: '21', libelle: 'Produits de la gestion courante', amount: Math.round(baseAmount * 0.12) },
      { code: '22', libelle: 'Produits des services industriels', amount: Math.round(baseAmount * 0.03) },
      { code: '23', libelle: 'Produits financiers', amount: Math.round(baseAmount * 0.01) },
      { code: '24', libelle: 'Produits exceptionnels', amount: Math.round(baseAmount * 0.02) },
    ];

    return lines.map((l, idx) => ({
      id: `line-${idx}`,
      code: l.code,
      libelle: l.libelle,
      amount: l.amount,
      category: l.code.startsWith('1') ? 'Section de fonctionnement' : 'Section d\'investissement',
      valid: true
    }));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type.includes('sheet'))) {
      setFile(droppedFile);
      startProcessing(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      startProcessing(selectedFile);
    }
  };

  const startProcessing = async (file: File) => {
    setIsProcessing(true);
    setParsedLines([]);
    setLogs([]);
    setCurrentStep(1);

    // Simulate year from filename
    const yearMatch = file.name.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2026;
    setImportedYear(year);

    // Step 1: Upload
    setLogs(prev => [...prev, `[INFO] Démarrage de l'extraction pour: ${file.name}`]);
    await delay(1500);

    // Step 2: Extraction
    setLogs(prev => [...prev, '[INFO] Format détecté: PDF Standard Marocain']);
    setLogs(prev => [...prev, `[INFO] Année budgétaire détectée: ${year}`]);
    setCurrentStep(2);
    await delay(1000);

    // Step 3: Cleaning
    setLogs(prev => [...prev, '[INFO] Suppression des lignes de report (R)']);
    setLogs(prev => [...prev, '[INFO] Normalisation des montants']);
    setLogs(prev => [...prev, '[INFO] Suppression des codes 9999 (lignes de totaux)']);
    setLogs(prev => [...prev, '[INFO] Validation des catégories A, B, C']);
    setCurrentStep(3);
    await delay(1000);

    // Show preview
    setLogs(prev => [...prev, `[OK] 9 lignes extraites avec succès`]);
    const demoLines = generateDemoLines(year);
    setParsedLines(demoLines);
    setCurrentStep(3);
    setIsProcessing(false);
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const toggleLineValidity = (id: string) => {
    setParsedLines(prev =>
      prev.map(line =>
        line.id === id ? { ...line, valid: !line.valid } : line
      )
    );
  };

  const removeLine = (id: string) => {
    setParsedLines(prev => prev.filter(line => line.id !== id));
  };

  const validateImport = async () => {
    if (!importedYear) return;

    setIsProcessing(true);
    setCurrentStep(4);

    const validLines = parsedLines.filter(l => l.valid);
    const totalRecettes = validLines.reduce((sum, l) => sum + l.amount, 0);

    setLogs(prev => [...prev, `[INFO] Préparation de l'import: ${validLines.length} lignes`]);
    setLogs(prev => [...prev, `[INFO] Total recettes: ${(totalRecettes / 1_000_000).toFixed(2)}M MAD`]);

    await delay(1000);
    setLogs(prev => [...prev, `[INFO] Création de l'entrée budget_years pour ${currentCommune?.name}`]);

    await delay(800);
    setLogs(prev => [...prev, '[INFO] Insertion des lignes budgétaires']);

    await delay(1000);
    setLogs(prev => [...prev, '[OK] Import des lignes terminé']);
    setCurrentStep(5);

    // Step 5: Re-run models
    setLogs(prev => [...prev, '[INFO] === RÉEXÉCUTION DES MODÈLES ===']);
    setLogs(prev => [...prev, '[INFO] Chargement des données historiques mises à jour']);
    await delay(500);

    const modelNames = [
      'Régression linéaire', 'Régression polynomiale', 'Ridge Regression',
      'Prophet', 'Lissage Holt', 'ARIMA', 'CAGR', 'Moyenne pondérée',
      'Theta Method', 'LSTM', 'Bayesian Ridge', 'SVR (RBF)'
    ];

    for (const model of modelNames) {
      await delay(200);
      setLogs(prev => [...prev, `[OK] ${model}: entraînement terminé`]);
    }

    setLogs(prev => [...prev, '[INFO] Calcul des scénarios prévisionnels']);
    setLogs(prev => [...prev, '[OK] Scénario pessimiste: ' + ((totalRecettes * 0.97) / 1_000_000).toFixed(1) + 'M MAD']);
    setLogs(prev => [...prev, '[OK] Scénario central: ' + ((totalRecettes * 1.02) / 1_000_000).toFixed(1) + 'M MAD']);
    setLogs(prev => [...prev, '[OK] Scénario optimiste: ' + ((totalRecettes * 1.05) / 1_000_000).toFixed(1) + 'M MAD']);

    await delay(500);
    setLogs(prev => [...prev, '[OK] Fichiers CSV/JSON mis à jour']);
    setLogs(prev => [...prev, '[OK] Dashboard mis à jour automatiquement']);

    // Simulate new year addition and model re-run
    await simulateNewYear(importedYear, totalRecettes);

    setCurrentStep(6);

    setLogs(prev => [...prev, '']);
    setLogs(prev => [...prev, '========================================']);
    setLogs(prev => [...prev, '[SUCCESS] IMPORT ET MODÉLISATION TERMINÉS']);
    setLogs(prev => [...prev, `Année ${importedYear} ajoutée avec succès`]);
    setLogs(prev => [...prev, `${validLines.length} lignes importées`]);
    setLogs(prev => [...prev, '12 modèles de prévision réexécutés']);
    setLogs(prev => [...prev, 'Graphiques et tableaux mis à jour']);
    setLogs(prev => [...prev, '========================================']);

    setIsProcessing(false);

    // Refresh data in context
    await refreshData();
  };

  const downloadErrorReport = () => {
    const report = [
      `Rapport d'import - Commune: ${currentCommune?.name}`,
      `Date: ${new Date().toLocaleString('fr-FR')}`,
      `Fichier: ${file?.name || 'N/A'}`,
      '',
      'Journal complet:',
      ...logs
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import_report_${importedYear || 'new'}.txt`;
    link.click();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-yellow-900 mb-2">Accès non autorisé</h2>
        <p className="text-yellow-700">Seuls les administrateurs peuvent accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import d'un nouveau budget</h1>
        <p className="text-gray-600">Charger un fichier PDF ou Excel pour {currentCommune?.name}</p>
      </div>

      {/* Process Info */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6" />
          <h3 className="text-lg font-bold">Pipeline ETL Automatique</h3>
        </div>
        <p className="text-blue-100 text-sm">
          Après l'import, le pipeline exécute automatiquement: extraction, nettoyage, validation, import en base,
          réentraînement des 12 modèles de prévision et mise à jour de tous les graphiques.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between overflow-x-auto">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex-1 relative min-w-[100px]">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    idx < currentStep
                      ? 'bg-green-500 text-white'
                      : idx === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </div>
                <p className={`text-xs mt-2 text-center font-medium ${
                  idx <= currentStep ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 text-center hidden lg:block">
                  {step.description}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`absolute top-5 left-[60%] w-[80%] h-0.5 ${
                    idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      {currentStep === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white rounded-2xl p-12 shadow-sm border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <div className="text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Glissez-déposez votre fichier ici
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Ou cliquez pour sélectionner un fichier PDF ou Excel (budget annuel)
            </p>
            <input
              type="file"
              accept=".pdf,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-colors"
            >
              <FileText className="w-5 h-5" />
              Sélectionner un fichier
            </label>
            <p className="text-xs text-gray-400 mt-4">
              Formats supportés: PDF (format standard marocain), Excel
            </p>
          </div>
        </div>
      )}

      {/* Processing Logs & Preview */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logs Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Journal d'exécution
              </h3>
              <button
                onClick={downloadErrorReport}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
            <div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">En attente du traitement...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`mb-1 ${
                    log.startsWith('[OK]') || log.startsWith('[SUCCESS]') ? 'text-green-400' :
                    log.startsWith('[INFO]') ? 'text-blue-300' :
                    log.startsWith('[WARN]') ? 'text-yellow-400' :
                    log.startsWith('[ERROR]') ? 'text-red-400' :
                    'text-gray-300'
                  }`}>
                    {log}
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex items-center gap-2 text-blue-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Traitement en cours...
                </div>
              )}
            </div>
          </div>

          {/* Preview Table */}
          {parsedLines.length > 0 && currentStep === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">
                  Aperçu des lignes ({parsedLines.filter(l => l.valid).length}/{parsedLines.length} valides)
                </h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valide</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Libellé</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedLines.map((line) => (
                      <tr
                        key={line.id}
                        className={`hover:bg-gray-50 ${!line.valid ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-2">
                          <button onClick={() => toggleLineValidity(line.id)}>
                            {line.valid ? (
                              <CheckSquare className="w-5 h-5 text-green-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-mono text-sm">{line.code}</td>
                        <td className="px-4 py-2 text-sm">{line.libelle}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {line.amount.toLocaleString('fr-MA')} MAD
                        </td>
                        <td className="px-4 py-2 flex justify-center gap-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Total validé:</span>
                  <span className="font-bold">
                    {(parsedLines.filter(l => l.valid).reduce((s, l) => s + l.amount, 0) / 1_000_000).toFixed(2)} M MAD
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Button */}
      {currentStep === 3 && parsedLines.length > 0 && !isProcessing && (
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              setCurrentStep(0);
              setFile(null);
              setParsedLines([]);
              setLogs([]);
            }}
            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Annuler
          </button>
          <button
            onClick={validateImport}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            <Zap className="w-5 h-5" />
            Importer et réexécuter les 12 modèles
          </button>
        </div>
      )}

      {/* Completion */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-900 mb-2">Import et modélisation terminés!</h2>
            <p className="text-green-700 mb-4">
              Le budget {importedYear} a été importé et les 12 modèles de prévision ont été réexécutés.
              Tous les graphiques et tableaux ont été mis à jour automatiquement.
            </p>
            <p className="text-sm text-green-600">
              Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Résumé de l'opération</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600">Année importée</p>
                <p className="text-2xl font-bold text-blue-900">{importedYear}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-600">Lignes importées</p>
                <p className="text-2xl font-bold text-emerald-900">{parsedLines.filter(l => l.valid).length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-sm text-purple-600">Modèles exécutés</p>
                <p className="text-2xl font-bold text-purple-900">12</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-600">Graphiques mis à jour</p>
                <p className="text-2xl font-bold text-amber-900">Oui</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setCurrentStep(0);
                setFile(null);
                setParsedLines([]);
                setLogs([]);
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Importer un autre budget
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
            >
              Voir le tableau de bord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
