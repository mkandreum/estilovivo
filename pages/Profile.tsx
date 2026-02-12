import React, { useState } from 'react';
import { User as UserIcon, Settings, Calendar, ShoppingBag, LogOut, Edit2, Music, Moon, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { UserState, PlannerEntry, Look, Garment } from '../types';

interface ProfileProps {
    user: UserState;
    plannerEntries: PlannerEntry[];
    looks: Look[];
    garments: Garment[];
    onUpdateUser: (user: UserState) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, plannerEntries, looks, garments, onUpdateUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: user.name, bio: user.bio || '' });

    const handleSaveProfile = () => {
        onUpdateUser({ ...user, name: editForm.name, bio: editForm.bio });
        setIsEditing(false);
    };

    const toggleSetting = (key: keyof UserState) => {
        // @ts-ignore
        onUpdateUser({ ...user, [key]: !user[key] });
    };

    const handleLogout = () => {
        api.logout();
        window.location.reload();
    };

    const getLookName = (lookId: string | null) => {
        if (!lookId) return 'Sin asignar';
        return looks.find(l => l.id === lookId)?.name || 'Look';
    };

    const garmentCount = garments.length;
    const lookCount = looks.length;
    const saleCount = garments.filter(g => g.forSale).length;

    return (
        <div className="pb-24 bg-white min-h-full">
            <div className="p-8 pb-12 rounded-b-[3rem] bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
                <button
                    onClick={handleLogout}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                    <LogOut size={20} />
                </button>

                <div className="flex items-center space-x-4 mt-4">
                    <div className="w-20 h-20 rounded-full border-2 border-primary p-1 flex-shrink-0">
                        <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0F4C5C&color=fff`} className="w-full h-full rounded-full object-cover" alt="Profile" />
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    className="w-full text-lg font-bold text-gray-800 border-b border-primary outline-none bg-transparent"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                                <textarea
                                    className="w-full text-sm text-gray-500 border rounded-lg p-2 outline-none bg-transparent"
                                    value={editForm.bio}
                                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                    rows={2}
                                />
                                <div className="flex space-x-2">
                                    <button onClick={handleSaveProfile} className="text-[10px] font-bold bg-primary text-white px-3 py-1 rounded-full">Guardar</button>
                                    <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start">
                                    <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                                    <button onClick={() => setIsEditing(true)} className="text-gray-300 p-1 hover:text-primary transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-2">{user.bio || 'Sin bio'}</p>
                                <div className="flex space-x-2">
                                    <span className="text-xs bg-lavender-50 text-indigo-600 px-2 py-1 rounded-md font-medium">✨ Creativa</span>
                                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-medium">🌱 Sostenible</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-3 gap-3 mb-6 -mt-8 relative z-10">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-primary">{garmentCount}</span>
                    <span className="text-xs text-gray-400">Prendas</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-primary">{lookCount}</span>
                    <span className="text-xs text-gray-400">Looks</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-primary">{saleCount}</span>
                    <span className="text-xs text-gray-400">Ventas</span>
                </div>
            </div>

            <div className="px-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Tu Agenda</h3>
                </div>
                <div className="bg-gray-50 rounded-[2rem] p-4 flex space-x-3 overflow-x-auto no-scrollbar">
                    {plannerEntries.slice(0, 3).map(entry => (
                        <div key={entry.date} className="flex-shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-32">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">{entry.date}</span>
                            <p className="text-xs font-bold text-gray-800 truncate">{getLookName(entry.lookId)}</p>
                        </div>
                    ))}
                    {plannerEntries.length === 0 && (
                        <p className="text-[10px] text-gray-400 py-4 italic">No hay planes próximos.</p>
                    )}
                </div>
            </div>

            <div className="px-6 space-y-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-2">Personalización</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button onClick={() => toggleSetting('cycleTracking')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <div className="bg-pink-100 p-2 rounded-lg text-pink-600"><Moon size={18} /></div>
                            <div className="text-left">
                                <p className="font-medium text-gray-800 text-sm">Ciclo Hormonal</p>
                            </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${user.cycleTracking ? 'bg-primary' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${user.cycleTracking ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>
                    <button onClick={() => toggleSetting('musicSync')} className="w-full p-4 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Music size={18} /></div>
                            <div className="text-left">
                                <p className="font-medium text-gray-800 text-sm">Vibe Musical</p>
                            </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${user.musicSync ? 'bg-primary' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${user.musicSync ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;