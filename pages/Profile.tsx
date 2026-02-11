import React from 'react';
import { Settings, LogOut, Music, Moon, Edit2, Calendar, ChevronRight } from 'lucide-react';
import { UserState, PlannerEntry, Look } from '../types';

interface ProfileProps {
    user: UserState;
    onUpdateUser: (u: UserState) => void;
    garmentCount: number;
    lookCount: number;
    plannerEntries: PlannerEntry[];
    looks: Look[];
    onNavigate: (tab: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ 
    user, 
    onUpdateUser, 
    garmentCount, 
    lookCount, 
    plannerEntries, 
    looks, 
    onNavigate 
}) => {
    
    const toggleSetting = (key: keyof UserState) => {
        onUpdateUser({ ...user, [key]: !user[key] });
    };

    // Helper to get look name for planner summary
    const getLookName = (lookId: string | null) => {
        if (!lookId) return 'Sin asignar';
        const look = looks.find(l => l.id === lookId);
        return look ? look.name : 'Desconocido';
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mt-4 mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
                <button className="text-gray-400 hover:text-gray-600">
                    <Settings size={24} />
                </button>
            </div>

            {/* Header */}
            <div className="flex items-center space-x-4 mb-8">
                <div className="w-20 h-20 rounded-full border-2 border-primary p-1">
                    <img src="https://picsum.photos/seed/profile/200/200" className="w-full h-full rounded-full object-cover" alt="Profile" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                        <button className="text-gray-300 p-1"><Edit2 size={14}/></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{user.bio}</p>
                    <div className="flex space-x-2">
                        <span className="text-xs bg-lavender-50 text-indigo-600 px-2 py-1 rounded-md font-medium">✨ Creativa</span>
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-medium">🌱 Sostenible</span>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-primary">{garmentCount}</span>
                    <span className="text-xs text-gray-400">Prendas</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-primary">{lookCount}</span>
                    <span className="text-xs text-gray-400">Looks</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <span className="block text-2xl font-bold text-accent">3</span>
                    <span className="text-xs text-gray-400">Vendidas</span>
                </div>
            </div>

            {/* Agenda Summary */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Tu Agenda</h3>
                    <button 
                        onClick={() => onNavigate('planner')}
                        className="text-xs font-bold text-primary flex items-center hover:underline"
                    >
                        Ver todo <ChevronRight size={14} />
                    </button>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-primary">
                            <Calendar size={18} />
                        </div>
                        <div>
                            {plannerEntries.length > 0 ? (
                                <>
                                    <p className="font-bold text-gray-800 text-sm">Próximo: {plannerEntries[0].date.split('-')[2]} Oct</p>
                                    <p className="text-xs text-gray-500">{getLookName(plannerEntries[0].lookId)}</p>
                                    {plannerEntries[0].eventNote && (
                                        <span className="inline-block mt-1 text-[10px] bg-orange-50 text-orange-600 px-1.5 rounded">
                                            {plannerEntries[0].eventNote}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Nada planificado aún.</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Mini visuals of next 3 days */}
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">
                                {i + 13}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-2">Personalización</h3>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                        onClick={() => toggleSetting('cycleTracking')}
                        className="w-full p-4 border-b border-gray-50 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="bg-pink-100 p-2 rounded-lg text-pink-600">
                                <Moon size={18} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-800 text-sm">Ciclo Hormonal</p>
                                <p className="text-xs text-gray-400">Sugerencias basadas en tu ciclo</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${user.cycleTracking ? 'bg-primary' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${user.cycleTracking ? 'right-1' : 'left-1'}`} />
                        </div>
                    </button>

                    <button 
                        onClick={() => toggleSetting('musicSync')}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <Music size={18} />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-800 text-sm">Vibe Musical</p>
                                <p className="text-xs text-gray-400">Conectar Spotify</p>
                            </div>
                        </div>
                        <span className={`text-xs font-bold transition-colors ${user.musicSync ? 'text-primary' : 'text-gray-300'}`}>
                            {user.musicSync ? 'ON' : 'OFF'}
                        </span>
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                     <button className="w-full p-4 flex items-center space-x-3 text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={18} />
                        <span className="font-medium text-sm">Cerrar Sesión</span>
                     </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;