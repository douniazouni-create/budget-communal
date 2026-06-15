import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCommuneManagement } from '../../hooks/useCommuneManagement';
import {
  UserPlus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Ban
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'guest';
  status: 'active' | 'inactive';
  last_login: string | null;
  created_at: string;
}

const demoUsers: UserItem[] = [
  {
    id: '1',
    email: 'admin@commune.ma',
    full_name: 'Administrateur Demo',
    role: 'admin',
    status: 'active',
    last_login: new Date().toISOString(),
    created_at: '2024-01-01'
  },
  {
    id: '2',
    email: 'gestionnaire@commune.ma',
    full_name: 'Ahmed Benali',
    role: 'manager',
    status: 'active',
    last_login: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2024-02-15'
  },
  {
    id: '3',
    email: 'invite@commune.ma',
    full_name: 'Fatima Alami',
    role: 'guest',
    status: 'active',
    last_login: null,
    created_at: '2024-03-01'
  }
];

export default function UsersPage() {
  const { user } = useAuth();
  const { currentCommune } = useCommuneManagement();
  const [users, setUsers] = useState<UserItem[]>(demoUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'guest' as 'admin' | 'manager' | 'guest',
    password: ''
  });

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'guest': return 'Invité';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-emerald-100 text-emerald-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'guest': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddUser = () => {
    if (!formData.email || !formData.full_name) return;

    const newUser: UserItem = {
      id: `user-${Date.now()}`,
      email: formData.email,
      full_name: formData.full_name,
      role: formData.role,
      status: 'active',
      last_login: null,
      created_at: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    setShowAddModal(false);
    setFormData({ email: '', full_name: '', role: 'guest', password: '' });
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    setUsers(users.map(u =>
      u.id === editingUser.id
        ? { ...u, email: formData.email, full_name: formData.full_name, role: formData.role }
        : u
    ));
    setEditingUser(null);
    setFormData({ email: '', full_name: '', role: 'guest', password: '' });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setUsers(users.map(u =>
      u.id === id
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
        : u
    ));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-yellow-900 mb-2">Accès non autorisé</h2>
        <p className="text-yellow-700">Seuls les administrateurs peuvent gérer les utilisateurs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérez les accès pour {currentCommune?.name}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Utilisateur</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Rôle</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Dernière connexion</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium">
                      {u.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                    {getRoleLabel(u.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {u.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                      <Ban className="w-4 h-4" />
                      Inactif
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {u.last_login
                    ? new Date(u.last_login).toLocaleDateString('fr-FR')
                    : 'Jamais'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setFormData({
                          email: u.email,
                          full_name: u.full_name,
                          role: u.role,
                          password: ''
                        });
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    {u.email !== 'admin@commune.ma' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">Types de rôles</h3>
        <div className="flex flex-wrap gap-4 text-sm text-blue-800">
          <div>
            <span className="font-medium">Administrateur:</span> Import, gestion des utilisateurs, configuration
          </div>
          <div>
            <span className="font-medium">Gestionnaire:</span> Consultation, simulation, export
          </div>
          <div>
            <span className="font-medium">Invité:</span> Lecture seule
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="guest">Invité - Lecture seule</option>
                  <option value="manager">Gestionnaire - Consultation et simulation</option>
                  <option value="admin">Administrateur - Accès complet</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe initial</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  setFormData({ email: '', full_name: '', role: 'guest', password: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                {editingUser ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
