import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserState, Look, Garment, PlannerEntry } from '../types';
import { api } from '../services/api';
import {
  User, Settings, LogOut, Heart, Camera, Edit3, Save, X,
  ShoppingBag, Shirt, Calendar, Star, TrendingUp, ChevronRight,
  Eye, Bookmark, Bell, Shield, Moon, Music, BarChart3
} from 'lucide-react';

interface ProfileProps {
  user: UserState;
  plannerEntries: PlannerEntry[];
  looks: Look[];
  onUpdateUser: (user: UserState) => void;
  garments: Garment[];
  onNavigate: (tab: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, plannerEntries, looks, onUpdateUser, garments, onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'stats' | 'favorites' | 'settings'>('stats');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editBio, setEditBio] = useState(user.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingFavs, setLoadingFavs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [cycleTracking, setCycleTracking] = useState(user.cycleTracking || false);
  const [musicSync, setMusicSync] = useState(user.musicSync || false);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await api.getStats();
        setStats(s);
      } catch (e) {
        console.warn('Could not load stats:', e);
      }
    };
    loadStats();
  }, []);

  // Load favorites when tab selected
  useEffect(() => {
    if (activeSection === 'favorites' && favorites.length === 0) {
      setLoadingFavs(true);
      api.getFavorites()
        .then(data => setFavorites(data))
        .catch(e => console.warn('Could not load favorites:', e))
        .finally(() => setLoadingFavs(false));
    }
  }, [activeSection]);

  // Computed stats
  const totalGarments = garments.length;
  const totalLooks = looks.length;
  const plannedDays = plannerEntries.filter(p => p.lookId).length;
  const avgUsage = useMemo(() => {
    if (garments.length === 0) return 0;
    return Math.round(garments.reduce((sum, g) => sum + (g.usageCount || 0), 0) / garments.length);
  }, [garments]);

  const mostWornGarment = useMemo(() => {
    if (garments.length === 0) return null;
    return [...garments].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
  }, [garments]);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    garments.forEach(g => {
      cats[g.type] = (cats[g.type] || 0) + 1;
    });
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [garments]);

  const seasonBreakdown = useMemo(() => {
    const seasons: Record<string, number> = {};
    garments.forEach(g => {
      const s = g.season || 'all';
      seasons[s] = (seasons[s] || 0) + 1;
    });
    return seasons;
  }, [garments]);

  // Avatar selection
  const handleAvatarClick = () => {
    if (editing) fileInputRef.current?.click();
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Save profile
  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedUser: UserState;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('name', editName);
        formData.append('bio', editBio);
        updatedUser = await api.updateProfileWithAvatar(formData);
      } else {
        updatedUser = await api.updateProfile({ name: editName, bio: editBio });
      }
      onUpdateUser(updatedUser);
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      // Fallback local
      onUpdateUser({ ...user, name: editName, bio: editBio });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // Save settings
  const handleToggleSetting = async (setting: 'cycleTracking' | 'musicSync', value: boolean) => {
    if (setting === 'cycleTracking') setCycleTracking(value);
    else setMusicSync(value);

    try {
      await api.updateProfile({ [setting]: value });
      onUpdateUser({ ...user, [setting]: value });
    } catch (e) {
      console.warn('Error saving setting:', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('beyour_token');
    localStorage.removeItem('beyour_user');
    window.location.reload();
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(user.name);
    setEditBio(user.bio || '');
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const seasonLabels: Record<string, string> = {
    summer: 'Verano',
    winter: 'Invierno',
    all: 'Todo el año',
    transition: 'Entretiempo'
  };

  const avatarUrl = avatarPreview || user.avatar;

  return (
    <div className="max-w-md mx-auto pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-400 to-orange-300 rounded-b-3xl p-6 pb-20 relative">
        <div className="flex justify-between items-start">
          <h1 className="text-white text-xl font-bold">Mi Perfil</h1>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-white/30 p-2 rounded-full text-white hover:bg-white/50 transition"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-white/30 p-2 rounded-full text-white hover:bg-white/50 transition"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-white/30 p-2 rounded-full text-white hover:bg-white/50 transition"
              >
                <Edit3 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar & Info */}
      <div className="px-6 -mt-14 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 -mt-12 mb-4">
            <div
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white ${editing ? 'cursor-pointer ring-2 ring-pink-400' : ''}`}
              onClick={handleAvatarClick}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-white" />
              )}
              {editing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 pt-6">
              {editing ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="text-lg font-bold w-full border-b-2 border-pink-300 focus:border-pink-500 outline-none pb-1"
                  placeholder="Tu nombre"
                />
              ) : (
                <h2 className="text-lg font-bold">{user.name}</h2>
              )}
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Bio */}
          {editing ? (
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              className="w-full border rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-pink-300 outline-none"
              rows={2}
              placeholder="Escribe algo sobre ti..."
              maxLength={160}
            />
          ) : (
            <p className="text-sm text-gray-500">{user.bio || 'Sin bio todavía...'}</p>
          )}

          {/* Follow Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold">{user.followersCount || 0}</p>
              <p className="text-xs text-gray-400">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{user.followingCount || 0}</p>
              <p className="text-xs text-gray-400">Siguiendo</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{totalLooks}</p>
              <p className="text-xs text-gray-400">Looks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{totalGarments}</p>
              <p className="text-xs text-gray-400">Prendas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 px-6 mt-4">
        {[
          { id: 'stats' as const, icon: <BarChart3 size={16} />, label: 'Estadísticas' },
          { id: 'favorites' as const, icon: <Bookmark size={16} />, label: 'Favoritos' },
          { id: 'settings' as const, icon: <Settings size={16} />, label: 'Ajustes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeSection === tab.id
                ? 'bg-pink-500 text-white shadow'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Section */}
      {activeSection === 'stats' && (
        <div className="px-6 mt-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Shirt size={16} className="text-pink-500" />
                <span className="text-xs text-gray-400">Prendas</span>
              </div>
              <p className="text-2xl font-bold">{totalGarments}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} className="text-purple-500" />
                <span className="text-xs text-gray-400">Looks creados</span>
              </div>
              <p className="text-2xl font-bold">{totalLooks}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-blue-500" />
                <span className="text-xs text-gray-400">Días planificados</span>
              </div>
              <p className="text-2xl font-bold">{plannedDays}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-500" />
                <span className="text-xs text-gray-400">Uso promedio</span>
              </div>
              <p className="text-2xl font-bold">{avgUsage}<span className="text-sm text-gray-400">x</span></p>
            </div>
          </div>

          {/* Most Worn */}
          {mostWornGarment && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" /> Prenda más usada
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {mostWornGarment.imageUrl ? (
                    <img src={mostWornGarment.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shirt size={24} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{mostWornGarment.name || mostWornGarment.type}</p>
                  <p className="text-sm text-gray-400">{mostWornGarment.color} · Usado {mostWornGarment.usageCount || 0} veces</p>
                </div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold mb-3">Distribución por categoría</h3>
              <div className="space-y-2">
                {categoryBreakdown.map(([cat, count]) => {
                  const pct = Math.round((count / totalGarments) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{cat}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-400 to-rose-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Season Breakdown */}
          {Object.keys(seasonBreakdown).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold mb-3">Prendas por temporada</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(seasonBreakdown).map(([season, count]) => (
                  <span key={season} className="px-3 py-1.5 bg-gray-50 rounded-full text-sm">
                    {seasonLabels[season] || season}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Server stats */}
          {stats && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" /> Estadísticas avanzadas
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {stats.mostWorn && (
                  <div>
                    <p className="text-gray-400">Más usada (server)</p>
                    <p className="font-medium">{stats.mostWorn.name || stats.mostWorn.category}</p>
                    <p className="text-xs text-gray-400">{stats.mostWorn.usageCount}x</p>
                  </div>
                )}
                {stats.leastWorn && (
                  <div>
                    <p className="text-gray-400">Menos usada</p>
                    <p className="font-medium">{stats.leastWorn.name || stats.leastWorn.category}</p>
                    <p className="text-xs text-gray-400">{stats.leastWorn.usageCount}x</p>
                  </div>
                )}
                {stats.favoriteColor && (
                  <div>
                    <p className="text-gray-400">Color favorito</p>
                    <p className="font-medium capitalize">{stats.favoriteColor}</p>
                  </div>
                )}
                {stats.favoriteCategory && (
                  <div>
                    <p className="text-gray-400">Categoría favorita</p>
                    <p className="font-medium capitalize">{stats.favoriteCategory}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('wardrobe')}
              className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <Shirt size={20} className="text-pink-500" />
                <span className="font-medium">Mi Armario</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button
              onClick={() => onNavigate('suitcase')}
              className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-purple-500" />
                <span className="font-medium">Mis Maletas</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button
              onClick={() => onNavigate('planner')}
              className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-blue-500" />
                <span className="font-medium">Mi Planificador</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Favorites Section */}
      {activeSection === 'favorites' && (
        <div className="px-6 mt-4 space-y-4">
          {loadingFavs ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-10">
              <Bookmark size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No tienes favoritos aún</p>
              <p className="text-xs text-gray-300 mt-1">Explora la comunidad y guarda los looks que más te gusten</p>
              <button
                onClick={() => onNavigate('community')}
                className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-full text-sm font-medium hover:bg-pink-600 transition"
              >
                Explorar Comunidad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav: any) => (
                <div key={fav.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {fav.look && (
                    <>
                      <div className="aspect-square bg-gray-100 relative">
                        {fav.look.imageUrl || (fav.look.garments && fav.look.garments[0]?.imageUrl) ? (
                          <img
                            src={fav.look.imageUrl || fav.look.garments[0].imageUrl}
                            alt={fav.look.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Eye size={24} className="text-gray-300" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                          <Heart size={14} className="text-pink-500 fill-pink-500" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{fav.look.name}</p>
                        <p className="text-xs text-gray-400">{fav.look.user?.name || 'Usuario'}</p>
                      </div>
                    </>
                  )}
                  {fav.product && (
                    <>
                      <div className="aspect-square bg-gray-100 relative">
                        {fav.product.imageUrl ? (
                          <img
                            src={fav.product.imageUrl}
                            alt={fav.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Shirt size={24} className="text-gray-300" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                          <Bookmark size={14} className="text-pink-500 fill-pink-500" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">{fav.product.name}</p>
                        {fav.product.price && (
                          <p className="text-xs text-pink-500 font-semibold">{fav.product.price} €</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div className="px-6 mt-4 space-y-3">
          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Preferencias</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="p-4">
                <p className="text-sm font-medium mb-3">Sexo</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'female', label: 'Mujer', emoji: '♀️' },
                    { id: 'male', label: 'Hombre', emoji: '♂️' },
                    { id: 'other', label: 'Otro', emoji: '✨' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={async () => {
                        try {
                          await api.updateProfile({ gender: option.id as any });
                          onUpdateUser({ ...user, gender: option.id as any });
                        } catch (e) {
                          console.warn('Error saving gender:', e);
                        }
                      }}
                      className={`py-2.5 rounded-lg text-xs font-medium transition ${
                        user.gender === option.id
                          ? 'bg-pink-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <p className="mt-0.5">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Moon size={18} className="text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium">Seguimiento del ciclo</p>
                    <p className="text-xs text-gray-400">Ajusta sugerencias según tu ciclo</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleSetting('cycleTracking', !cycleTracking)}
                  className={`w-11 h-6 rounded-full transition-colors ${cycleTracking ? 'bg-pink-500' : 'bg-gray-200'} ${user.gender === 'male' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={user.gender === 'male'}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${cycleTracking ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Music size={18} className="text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Sincronización musical</p>
                    <p className="text-xs text-gray-400">Conecta música con tu mood</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleSetting('musicSync', !musicSync)}
                  className={`w-11 h-6 rounded-full transition-colors ${musicSync ? 'bg-pink-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${musicSync ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Cuenta</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center gap-3 p-4">
                <Shield size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-4 w-full text-left hover:bg-red-50 transition"
              >
                <LogOut size={18} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Cerrar sesión</span>
              </button>
            </div>
          </div>

          {/* App Info */}
          <div className="text-center pt-4 pb-2">
            <p className="text-xs text-gray-300">Beyour v1.0.0</p>
            <p className="text-xs text-gray-300 mt-1">Hecho con amor en España</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
