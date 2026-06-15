import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Lightbulb,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
  ChevronDown,
  FileText,
  Upload,
  GitCompare,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCommuneManagement } from '../../hooks/useCommuneManagement';
import { useCommuneData } from '../../hooks/useCommuneData';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/analysis', label: 'Analyse & Prévisions', icon: TrendingUp },
  { path: '/trends', label: 'Évolution & Tendances', icon: LineChart },
  { path: '/compare', label: 'Comparaison', icon: GitCompare },
  { path: '/recommendations', label: 'Recommandations', icon: Lightbulb },
  { path: '/profile', label: 'Mon Profil', icon: User },
  { path: '/help', label: 'Aide', icon: HelpCircle },
];

const adminNavItems = [
  { path: '/admin/import', label: 'Import Budget', icon: Upload },
  { path: '/admin/communes', label: 'Gestion Communes', icon: Building2 },
  { path: '/admin/users', label: 'Gestion Utilisateurs', icon: Settings },
  { path: '/admin/history', label: 'Historique Imports', icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { communes, currentCommune, setCurrentCommune } = useCommuneManagement();
  const { lastUpdated } = useCommuneData();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCommuneMenu, setShowCommuneMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCommuneChange = (communeId: string) => {
    const commune = communes.find(c => c.id === communeId);
    if (commune) {
      setCurrentCommune(commune);
      setShowCommuneMenu(false);
    }
  };

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

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Commune Selector */}
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900">Budget Communal</h1>
                  {lastUpdated && (
                    <p className="text-xs text-gray-400">
                      MAJ: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </Link>

              {/* Commune Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowCommuneMenu(!showCommuneMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">{currentCommune?.name || 'Sélectionner'}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {showCommuneMenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                    {communes.map((commune) => (
                      <button
                        key={commune.id}
                        onClick={() => handleCommuneChange(commune.id)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                          currentCommune?.id === commune.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{commune.name}</span>
                        {currentCommune?.id === commune.id && (
                          <span className="ml-auto text-xs text-blue-500">Actif</span>
                        )}
                      </button>
                    ))}
                    {user.role === 'admin' && (
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <Link
                          to="/admin/communes"
                          onClick={() => setShowCommuneMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4" />
                          Gérer les communes
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {user.role === 'admin' && (
                <div className="relative group">
                  <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                    <Settings className="w-4 h-4" />
                    Administration
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    {adminNavItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || 'Utilisateur'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      Mon profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-2 py-3 space-y-1">
              {/* Mobile commune selector */}
              <div className="px-3 py-2 mb-2">
                <select
                  value={currentCommune?.id || ''}
                  onChange={(e) => handleCommuneChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {user.role === 'admin' && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">Administration</p>
                  {adminNavItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500">
            <p>
              Version 1.0.0 - Commune: {currentCommune?.name || 'Non sélectionnée'}
              {lastUpdated && (
                <> | Dernière mise à jour: {lastUpdated.toLocaleString('fr-FR')}</>
              )}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/help" className="hover:text-gray-700">Aide</Link>
              <Link to="/help#glossary" className="hover:text-gray-700">Glossaire</Link>
              <a href="mailto:support@commune.ma" className="hover:text-gray-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
