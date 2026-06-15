import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCommuneManagement } from '../../hooks/useCommuneManagement';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function CommunesPage() {
  const { user } = useAuth();
  const { communes, currentCommune, setCurrentCommune, createCommune, deleteCommune } = useCommuneManagement();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCommune, setEditingCommune] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    province: ''
  });
  const [saving, setSaving] = useState(false);

  const handleAddCommune = async () => {
    if (!formData.name || !formData.region || !formData.province) return;

    setSaving(true);
    const result = await createCommune(formData.name, formData.region, formData.province);
    setSaving(false);

    if (result.success) {
      setShowAddModal(false);
      setFormData({ name: '', region: '', province: '' });
    }
  };

  const handleDeleteCommune = async (id: string) => {
    if (communes.length <= 1) {
      alert('Impossible de supprimer la dernière commune');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer cette commune? Toutes les données associées seront perdues.')) {
      await deleteCommune(id);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-yellow-900 mb-2">Accès non autorisé</h2>
        <p className="text-yellow-700">Seuls les administrateurs peuvent gérer les communes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des communes</h1>
          <p className="text-gray-600">Créez et gérez les communes pour l'isolation des données</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle commune
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Multi-communes isolées</p>
          <p>Chaque commune dispose de ses propres données (budgets, prévisions, historique). Les données sont complètement isolées entre communes.</p>
        </div>
      </div>

      {/* Communes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communes.map((commune) => (
          <div
            key={commune.id}
            className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all ${
              currentCommune?.id === commune.id
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  currentCommune?.id === commune.id
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-6 h-6 ${
                    currentCommune?.id === commune.id
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{commune.name}</h3>
                  <p className="text-sm text-gray-500">{commune.province}</p>
                </div>
              </div>
              {currentCommune?.id === commune.id && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  Active
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{commune.region}</span>
              </div>
              <p className="text-xs text-gray-400">
                Créée le: {new Date(commune.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="flex gap-2">
              {currentCommune?.id !== commune.id && (
                <button
                  onClick={() => setCurrentCommune(commune)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Sélectionner
                </button>
              )}
              <button
                onClick={() => handleDeleteCommune(commune.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Commune Modal */}
      {(showAddModal || editingCommune) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCommune ? 'Modifier la commune' : 'Nouvelle commune'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCommune(null);
                  setFormData({ name: '', region: '', province: '' });
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la commune</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Commune de Tanger"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Tanger-Tétouan-Al Hoceïma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Tanger-Assilah"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCommune(null);
                  setFormData({ name: '', region: '', province: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCommune}
                disabled={saving || !formData.name || !formData.region || !formData.province}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Créer la commune
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
