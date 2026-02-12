import React from 'react';
import { UserState, MoodOption, Look, PlannerEntry, Garment } from '../types';
import { Sun, Sparkles, Wind, Briefcase, ChevronRight, RefreshCcw } from 'lucide-react';

interface HomeProps {
  user: UserState;
  onMoodChange: (mood: string) => void;
  onNavigate: (tab: string) => void;
  plannerEntries: PlannerEntry[];
  looks: Look[];
  garments: Garment[];
}

const moods: MoodOption[] = [
  { id: 'confident', label: 'Segura', emoji: '🦁', colorClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'creative', label: 'Creativa', emoji: '🎨', colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'relaxed', label: 'Relajada', emoji: '🧘‍♀️', colorClass: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'powerful', label: 'Poderosa', emoji: '⚡', colorClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

const Home: React.FC<HomeProps> = ({ user, onMoodChange, onNavigate, plannerEntries, looks, garments }) => {
  // Real stats
  const mostUsedGarment = [...garments].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
  const lowUsageCount = garments.filter(g => (g.usageCount || 0) < 2).length;

  // Weekly Planner logic
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();

  const weeklyPlanner = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - today.getDay() + i); // Start from Sunday
    const dateStr = d.toISOString().split('T')[0];
    const entry = plannerEntries.find(e => e.date === dateStr);
    const look = entry ? looks.find(l => l.id === entry.lookId) : null;
    return {
      day: days[i],
      date: dateStr,
      isToday: d.toDateString() === today.toDateString(),
      lookImage: look ? "https://picsum.photos/100/100?random=" + look.id : null,
      hasEntry: !!entry
    };
  });

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header & Welcome */}
      <header className="space-y-2 mt-4">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          Hola, <span className="text-primary">{user.name}</span>
        </h1>
        <p className="text-gray-500 text-lg font-light">¿Cómo te sientes hoy?</p>
      </header>

      {/* Mood Selector */}
      <section className="flex space-x-3 overflow-x-auto no-scrollbar py-2">
        {moods.map((m) => (
          <button
            key={m.id}
            onClick={() => onMoodChange(m.id)}
            className={`flex-shrink-0 px-4 py-3 rounded-2xl border flex items-center space-x-2 transition-all transform active:scale-95 ${user.mood === m.id
                ? 'bg-primary text-white border-primary shadow-lg ring-2 ring-offset-2 ring-primary/30'
                : 'bg-white border-gray-100 text-gray-600 shadow-sm hover:border-gray-200'
              }`}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className="font-medium text-sm">{m.label}</span>
          </button>
        ))}
      </section>

      {/* Main CTA */}
      <section>
        <button
          onClick={() => onNavigate('create')}
          className="w-full bg-primary text-white p-5 rounded-3xl shadow-xl shadow-primary/20 flex items-center justify-between group hover:bg-teal-900 transition-colors"
        >
          <div className="flex flex-col items-start">
            <span className="font-bold text-lg">Crear Look de Hoy</span>
            <span className="text-primary-100 text-sm opacity-80">Basado en tu mood {user.mood ? `"${moods.find(m => m.id === user.mood)?.label}"` : ''}</span>
          </div>
          <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
            <Sparkles size={24} className="text-accent" />
          </div>
        </button>
      </section>

      {/* Weekly Summary */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-gray-800">Tu Semana</h2>
          <button onClick={() => onNavigate('planner')} className="text-xs text-primary font-semibold flex items-center">
            Ver todo <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
          {weeklyPlanner.map((day) => (
            <div key={day.date} className="flex flex-col items-center space-y-2">
              <span className={`text-xs font-medium ${day.isToday ? 'text-primary' : 'text-gray-400'}`}>{day.day}</span>
              <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center relative overflow-hidden ${day.isToday ? 'border-accent shadow-md' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                {day.lookImage ? (
                  <img src={day.lookImage} className="w-full h-full object-cover" alt="Look" />
                ) : day.isToday ? (
                  <span className="text-gray-300 text-[10px] text-center leading-none px-1">Planear</span>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sustainability / Usage Stats */}
      <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-primary">
          <RefreshCcw size={18} />
          <h3 className="font-bold">Armario Consciente</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-lavender-50 p-3 rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Más usada</p>
            <div className="flex items-center space-x-2">
              {mostUsedGarment ? (
                <>
                  <img src={mostUsedGarment.imageUrl} className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-[10px] font-semibold text-gray-700 line-clamp-2 capitalize">{mostUsedGarment.type}</span>
                </>
              ) : (
                <span className="text-[10px] text-gray-400">Sin datos</span>
              )}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Baja rotación</p>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-accent">{lowUsageCount}</span>
              <span className="text-[10px] text-gray-600 leading-tight">prendas olvidadas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={() => onNavigate('suitcase')} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-left hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Briefcase size={16} />
          </div>
          <span className="font-medium text-gray-700 text-sm">Próximo Viaje</span>
        </button>
        <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-left hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mb-2">
            <Sun size={16} />
          </div>
          <span className="font-medium text-gray-700 text-sm">Reto del Día</span>
        </button>
      </div>
    </div>
  );
};

export default Home;