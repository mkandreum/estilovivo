import React, { useState } from 'react';
import { Garment, Look } from '../types';
import { X, Save, Wand2, Share2, Shuffle, Plus, Layers } from 'lucide-react';

interface CreateLookProps {
    garments: Garment[];
    onSaveLook: (look: Look) => void;
}

const CreateLook: React.FC<CreateLookProps> = ({ garments, onSaveLook }) => {
  const [selectedItems, setSelectedItems] = useState<Garment[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lookName, setLookName] = useState('');

  const toggleItem = (item: Garment) => {
    if (selectedItems.find(i => i.id === item.id)) {
        setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
        setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSave = () => {
      const newLook: Look = {
          id: `l-${Date.now()}`,
          name: lookName || 'Sin título',
          garmentIds: selectedItems.map(g => g.id),
          tags: ['custom'],
          createdAt: new Date().toISOString()
      };
      onSaveLook(newLook);
      // Reset
      setSelectedItems([]);
      setLookName('');
      setIsSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white z-20">
        <button onClick={() => setSelectedItems([])} className="text-gray-400 hover:text-red-500">
            <X size={24} />
        </button>
        <div className="flex space-x-4">
            <button className="text-gray-400 hover:text-primary transition-colors">
                <Share2 size={22} />
            </button>
            <button 
                onClick={() => setIsSaving(true)}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${selectedItems.length > 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}
                disabled={selectedItems.length === 0}
            >
                Guardar
            </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-50 relative overflow-hidden p-6 flex items-center justify-center">
        {selectedItems.length === 0 ? (
            <div className="text-center opacity-40">
                <div className="w-24 h-24 border-2 border-dashed border-gray-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">✨</span>
                </div>
                <p className="font-medium text-lg">Tu lienzo está vacío</p>
                <p className="text-sm">Selecciona prendas abajo</p>
            </div>
        ) : (
            <div className="relative w-full h-full max-w-sm mx-auto">
                {selectedItems.map((item, index) => (
                    <div 
                        key={item.id}
                        className="absolute w-40 h-40 shadow-xl rounded-xl bg-white p-1 transition-all duration-300"
                        style={{
                            top: `${10 + (index * 12)}%`,
                            left: `${index % 2 === 0 ? 5 : 45}%`,
                            zIndex: index,
                            transform: `rotate(${index % 2 === 0 ? -3 : 3}deg)`
                        }}
                    >
                        <button 
                            onClick={() => toggleItem(item)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 z-10 shadow-sm"
                        >
                            <X size={12} />
                        </button>
                        <img src={item.imageUrl} className="w-full h-full object-cover rounded-lg" alt="item" />
                    </div>
                ))}
            </div>
        )}
        
        {/* Magic Button */}
        <div className="absolute bottom-32 right-6">
             <button className="bg-white/80 backdrop-blur border border-white p-3 rounded-full shadow-lg text-accent flex items-center space-x-2">
                <Wand2 size={20} />
                <span className="text-xs font-bold uppercase pr-1">AI Mix</span>
             </button>
        </div>
      </div>

      {/* Wardrobe Picker Drawer */}
      <div className={`bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl z-10 transition-all duration-500 ease-in-out flex flex-col ${isPickerOpen ? 'h-64' : 'h-16'}`}>
        <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="w-full flex justify-center py-2"
        >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </button>

        <div className="px-5 pb-2 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Tu Armario</h3>
            <button className="p-2 bg-gray-50 rounded-full text-gray-500">
                <Shuffle size={16} />
            </button>
        </div>
        
        <div className="flex-1 overflow-x-auto no-scrollbar px-4 pb-4">
            <div className="flex space-x-3">
                {garments.map((item) => {
                    const isSelected = selectedItems.some(i => i.id === item.id);
                    return (
                        <button 
                            key={item.id}
                            onClick={() => toggleItem(item)}
                            className={`flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden relative group border-2 transition-all ${isSelected ? 'border-primary opacity-50' : 'border-transparent'}`}
                        >
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="suggestion" />
                            {!isSelected && (
                                <div className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-sm">
                                    <Plus size={14} className="text-primary" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Save Modal */}
      {isSaving && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white w-full rounded-3xl p-6 shadow-2xl">
                  <h2 className="text-xl font-bold mb-4">Guardar Look</h2>
                  <input 
                    type="text" 
                    placeholder="Nombre del look (ej: Noche de chicas)" 
                    className="w-full border border-gray-200 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-primary outline-none"
                    value={lookName}
                    onChange={(e) => setLookName(e.target.value)}
                  />
                  <div className="flex space-x-3">
                      <button onClick={() => setIsSaving(false)} className="flex-1 py-3 text-gray-500 font-medium">Cancelar</button>
                      <button onClick={handleSave} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Guardar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CreateLook;