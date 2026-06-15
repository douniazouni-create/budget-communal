import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCommuneManagement } from '../hooks/useCommuneManagement';
import {
  User,
  Mail,
  Lock,
  Building2,
  Shield,
  Sun,
  Moon,
  Bell,
  BellOff,
  Save,
  CheckCircle
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { currentCommune } = useCommuneManagement();
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'preferences'>('info');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    theme: (user?.preferences?.theme as string) || 'light',
    notifications: (user?.preferences?.notifications as boolean) ?? true
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));

    await updateUser({
      full_name: formData.fullName,
      preferences: {
        ...user?.preferences,
        theme: formData.theme,
        notifications: formData.notifications
      }
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'guest': return 'Invité';
      default: return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Accès complet : import, gestion des utilisateurs, configuration';
      case 'manager': return 'Consultation, simulation et export des données';
      case 'guest': return 'Lecture seule, pas d\'import ni de simulation';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-600">Gérez vos informations personnelles et préférences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* User Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user?.full_name || 'Utilisateur'}</h2>
              <p className="text-blue-100">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {getRoleLabel(user?.role || 'guest')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Informations
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'security'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sécurité
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Préférences
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4" />
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4" />
                    Rôle
                  </label>
                  <input
                    type="text"
                    value={getRoleLabel(user?.role || 'guest')}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4" />
                    Commune
                  </label>
                  <input
                    type="text"
                    value={currentCommune?.name || 'Non assigné'}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>Vos permissions:</strong> {getRoleDescription(user?.role || 'guest')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  La modification du mot de passe nécessite une intégration avec le système d'authentification interne.
                  Cette fonctionnalité sera activée dans une prochaine version.
                </p>
              </div>

              <div className="space-y-4 opacity-50">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>
              </div>

              {user?.email === 'admin@commune.ma' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-800">
                    <strong>Compte démo:</strong> Le mot de passe par défaut est <code className="bg-green-100 px-2 py-0.5 rounded">demo</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Thème d'affichage</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      formData.theme === 'light'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun className={`w-6 h-6 mx-auto mb-2 ${formData.theme === 'light' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${formData.theme === 'light' ? 'text-blue-900' : 'text-gray-600'}`}>
                      Clair
                    </p>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      formData.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon className={`w-6 h-6 mx-auto mb-2 ${formData.theme === 'dark' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${formData.theme === 'dark' ? 'text-blue-900' : 'text-gray-600'}`}>
                      Sombre
                    </p>
                  </button>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.notifications ? (
                      <Bell className="w-5 h-5 text-blue-600" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Notifications par email</p>
                      <p className="text-sm text-gray-500">Recevoir les alertes et rappels par email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, notifications: !formData.notifications })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.notifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        formData.notifications ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Enregistré!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
