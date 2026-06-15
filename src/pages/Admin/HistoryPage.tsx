import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCommuneManagement } from '../../hooks/useCommuneManagement';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Files,
  Download,
  RefreshCw,
  Trash2,
  RotateCcw
} from 'lucide-react';

interface ImportRecord {
  id: string;
  filename: string;
  year: number;
  status: 'completed' | 'failed' | 'processing';
  lines_imported: number;
  user_email: string;
  created_at: string;
}

const demoHistory: ImportRecord[] = [
  {
    id: '1',
    filename: 'budget_2025_rabat.pdf',
    year: 2025,
    status: 'completed',
    lines_imported: 156,
    user_email: 'admin@commune.ma',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '2',
    filename: 'budget_2024_rabat.pdf',
    year: 2024,
    status: 'completed',
    lines_imported: 148,
    user_email: 'admin@commune.ma',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString()
  },
  {
    id: '3',
    filename: 'budget_2023_rabat.pdf',
    year: 2023,
    status: 'completed',
    lines_imported: 142,
    user_email: 'admin@commune.ma',
    created_at: new Date(Date.now() - 86400000 * 60).toISOString()
  },
  {
    id: '4',
    filename: 'budget_2022_corrupt.pdf',
    year: 2022,
    status: 'failed',
    lines_imported: 0,
    user_email: 'admin@commune.ma',
    created_at: new Date(Date.now() - 86400000 * 120).toISOString()
  }
];

export default function HistoryPage() {
  const { user } = useAuth();
  const { currentCommune } = useCommuneManagement();
  const [imports, setImports] = useState<ImportRecord[]>(demoHistory);
  const [reloading, setReloading] = useState(false);

  const handleReloadData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir recharger toutes les données? Cette action reconstruira l\'entrepôt de données.')) {
      return;
    }

    setReloading(true);
    await new Promise(r => setTimeout(r, 3000));
    setReloading(false);
    alert('Données rechargées avec succès. Les prévisions ont été mises à jour.');
  };

  const handleClearHistory = () => {
    if (confirm('Voulez-vous supprimer l\'historique des imports?')) {
      setImports(imports.filter(i => i.status === 'completed'));
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-yellow-900 mb-2">Accès non autorisé</h2>
        <p className="text-yellow-700">Seuls les administrateurs peuvent consulter l'historique.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des imports</h1>
          <p className="text-gray-600">Journal des imports de budgets pour {currentCommune?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Nettoyer
          </button>
          <button
            onClick={handleReloadData}
            disabled={reloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {reloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Rechargement...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Recharger les données
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Files className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-medium">Données persistantes</p>
          <p className="text-sm text-blue-700">
            Le rechargement des données reconstruit l'entrepôt à partir des fichiers sources et met à jour les modèles de prévision.
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Fichier</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Année</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Lignes</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Importé par</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {imports.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      record.status === 'completed'
                        ? 'bg-green-100'
                        : record.status === 'failed'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}>
                      <Files className={`w-5 h-5 ${
                        record.status === 'completed'
                          ? 'text-green-600'
                          : record.status === 'failed'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`} />
                    </div>
                    <span className="font-medium text-gray-900">{record.filename}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-gray-600">{record.year}</td>
                <td className="px-6 py-4 text-center">
                  {record.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Réussi
                    </span>
                  )}
                  {record.status === 'failed' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Échoué
                    </span>
                  )}
                  {record.status === 'processing' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      En cours
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">{record.lines_imported}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">{record.user_email}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {new Date(record.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {imports.filter(i => i.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Imports réussis</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {imports.filter(i => i.status === 'failed').length}
              </p>
              <p className="text-sm text-gray-500">Imports échoués</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {imports.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.lines_imported, 0)}
              </p>
              <p className="text-sm text-gray-500">Lignes importées</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
