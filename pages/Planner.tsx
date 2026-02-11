import React, { useState } from 'react';
import { Look, PlannerEntry } from '../types';
import { Calendar as CalendarIcon, MoreVertical, Plus, X, Shirt } from 'lucide-react';

interface PlannerProps {
    looks: Look[];
    plannerEntries: PlannerEntry[];
    onUpdateEntry: (entry: PlannerEntry) => void;
}

const Planner: React.FC<PlannerProps> = ({ looks, plannerEntries, onUpdateEntry }) => {
    // Generate dates for demo (Static for now, usually dynamic)
    const dates = ['2023-10-12', '2023-10-13', '2023-10-14', '2023-10-15', '2023-10-16', '2023-10-17', '2023-10-18'];
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const getEntry = (date: string) => plannerEntries.find(p => p.date === date);
    const getLook = (id: string | null) => looks.find(l => l.id === id);

    const handleAssign = (lookId: string) => {
        if (selectedDate) {
            onUpdateEntry({
                date: selectedDate,
                lookId: lookId,
                eventNote: getEntry(selectedDate)?.eventNote
            });
            setSelectedDate(null);
        }
    };

    return (
        <div className="p-6 pb-24 relative h-full">
            <header className="flex justify-between items-center mb-8 mt-4">
                <h1 className="text-2xl font-bold text-gray-800">Planificador</h1>
                <div className="flex space-x-2 text-gray-500 text-sm font-medium bg-white px-3 py-1 rounded-full border">
                    <span>Octubre 2023</span>
                    <CalendarIcon size={16} />
                </div>
            </header>

            <div className="space-y-4">
                {dates.map((date, idx) => {
                    const entry = getEntry(date);
                    const look = entry ? getLook(entry.lookId) : null;
                    const dayNum = date.split('-')[2];

                    return (
                        <div key={date} className="flex group">
                            {/* Date Col */}
                            <div className="flex flex-col items-center mr-4 w-12 pt-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase">{weekDays[idx]}</span>
                                <span className={`text-lg font-bold ${idx === 0 ? 'text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center' : 'text-gray-800'}`}>
                                    {dayNum}
                                </span>
                                {idx !== dates.length - 1 && <div className="w-px h-full bg-gray-200 my-2" />}
                            </div>

                            {/* Card */}
                            <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex justify-between items-center min-h-[5rem]">
                                {look ? (
                                    <div className="flex items-center space-x-4">
                                        {/* Placeholder for look image since Look type only has IDs currently */}
                                        <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-300">
                                            <Shirt size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{look.name}</h4>
                                            {entry?.eventNote && (
                                                <span className="text-xs text-accent font-medium bg-orange-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                                                    {entry.eventNote}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-4 w-full opacity-60">
                                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                                            <Plus size={20} className="text-gray-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-500">Sin planificar</span>
                                            {entry?.eventNote && <span className="text-xs text-gray-400">{entry.eventNote}</span>}
                                        </div>
                                        <button 
                                            onClick={() => setSelectedDate(date)}
                                            className="ml-auto text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/5"
                                        >
                                            Asignar
                                        </button>
                                    </div>
                                )}
                                
                                {look && (
                                    <button onClick={() => setSelectedDate(date)} className="text-gray-300 hover:text-gray-500">
                                        <MoreVertical size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection Modal */}
            {selectedDate && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-fade-in-up h-[70vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Seleccionar Look</h3>
                                <p className="text-xs text-gray-500">Para el {selectedDate}</p>
                            </div>
                            <button onClick={() => setSelectedDate(null)}><X size={24} className="text-gray-400"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                            {looks.length === 0 ? (
                                <p className="text-center text-gray-400 mt-10">No tienes looks guardados aún.</p>
                            ) : (
                                looks.map(look => (
                                    <button 
                                        key={look.id}
                                        onClick={() => handleAssign(look.id)}
                                        className="w-full flex items-center space-x-4 p-3 rounded-2xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-all text-left"
                                    >
                                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                            <Shirt size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{look.name}</p>
                                            <p className="text-xs text-gray-500">{look.tags.join(', ')}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planner;