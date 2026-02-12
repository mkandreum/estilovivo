import React, { useState } from 'react';
import { Garment, Look, PlannerEntry } from '../types';
import { Filter, Plus, Search, Trash2, X, Camera, Tag, DollarSign, ShoppingBag, ChevronRight } from 'lucide-react';
import Suitcase from './Suitcase';
import ProductDetailModal, { ProductDisplayItem } from '../components/ProductDetailModal';

interface WardrobeProps {
    garments: Garment[];
    onAddGarment: (g: Garment) => void;
    onRemoveGarment: (id: string) => void;
    onUpdateGarment: (g: Garment) => void;
    looks: Look[];
    planner: PlannerEntry[];
    onUpdatePlanner: (e: PlannerEntry) => void;
    onNavigate: (tab: string) => void;
}

type ViewType = 'closet' | 'suitcase' | 'sales';

const Wardrobe: React.FC<WardrobeProps> = ({
    garments,
    onAddGarment,
    onRemoveGarment,
    onUpdateGarment,
    looks,
    planner,
    onUpdatePlanner,
    onNavigate
}) => {
    const [activeView, setActiveView] = useState<ViewType>('closet');
    const [filter, setFilter] = useState<'all' | 'top' | 'bottom' | 'shoes' | 'outerwear'>('all');

    // State for Add Modal
    const [isAdding, setIsAdding] = useState(false);
    const [newImage, setNewImage] = useState<string | null>(null);

    // State for Sell Flow
    const [isSelling, setIsSelling] = useState(false);
    const [selectedForSale, setSelectedForSale] = useState<Garment | null>(null);
    const [salePrice, setSalePrice] = useState('');

    // State for Product Detail Modal
    const [detailItem, setDetailItem] = useState<ProductDisplayItem | null>(null);

    // Filter logic
    const filteredItems = filter === 'all'
        ? garments
        : garments.filter(g => g.type === filter);

    // Items currently on sale
    const salesItems = garments.filter(g => g.forSale);
    const totalSalesValue = salesItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

    // --- Handlers ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const confirmAdd = () => {
        if (!newImage) return;
        const newGarment: Garment = {
            id: `g-${Date.now()}`,
            imageUrl: newImage,
            type: filter === 'all' ? 'top' : filter,
            color: 'new',
            season: 'all',
            usageCount: 0,
            forSale: false
        };
        onAddGarment(newGarment);
        setIsAdding(false);
        setNewImage(null);
    };

    const startSelling = () => {
        setIsSelling(true);
        setSelectedForSale(null);
        setSalePrice('');
    };

    const handleSelectForSale = (garment: Garment) => {
        setSelectedForSale(garment);
    };

    const confirmSale = () => {
        if (selectedForSale && salePrice) {
            onUpdateGarment({
                ...selectedForSale,
                forSale: true,
                price: parseFloat(salePrice)
            });
            setIsSelling(false);
            setSelectedForSale(null);
            setSalePrice('');
            setActiveView('sales');
        }
    };

    const openDetailModal = (item: Garment) => {
        setDetailItem({
            id: item.id,
            title: item.type,
            price: item.price || 0,
            image: item.imageUrl,
            user: "Tú",
            avatar: "https://ui-avatars.com/api/?name=You&background=0F4C5C&color=fff",
            description: "Esta prenda es de tu armario personal.",
            isOwnItem: true
        });
    };

    return (
        <div className="h-full flex flex-col relative bg-gray-50">

            {/* Top Section */}
            <div className="bg-white pb-2 pt-6 sticky top-0 z-20 shadow-sm rounded-b-3xl mb-4">
                <div className="flex justify-between items-center px-6 mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Mi Espacio</h1>
                    {activeView === 'closet' && (
                        <div className="flex space-x-2">
                            <button className="p-2 bg-gray-50 rounded-full border border-gray-100 text-gray-600">
                                <Search size={20} />
                            </button>
                            <button className="p-2 bg-gray-50 rounded-full border border-gray-100 text-gray-600">
                                <Filter size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* PILL SELECTOR */}
                <div className="px-6">
                    <div className="bg-gray-100 p-1.5 rounded-2xl flex relative font-medium text-sm">
                        {(['closet', 'suitcase', 'sales'] as ViewType[]).map((view) => (
                            <button
                                key={view}
                                onClick={() => setActiveView(view)}
                                className={`flex-1 py-2 rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center space-x-1 ${activeView === view
                                        ? 'bg-white text-primary shadow-sm transform scale-100'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {view === 'closet' && <span>Armario</span>}
                                {view === 'suitcase' && <span>Maleta</span>}
                                {view === 'sales' && <span>Ventas</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- VIEW: CLOSET --- */}
            {activeView === 'closet' && (
                <div className="px-6 flex-1 overflow-y-auto no-scrollbar pb-24">
                    <div className="flex space-x-2 overflow-x-auto no-scrollbar mb-4 pb-2">
                        {['all', 'top', 'bottom', 'shoes', 'outerwear'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat as any)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filter === cat
                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                        : 'bg-white text-gray-500 border-gray-200'
                                    }`}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-between items-center px-1 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span>{filteredItems.length} Prendas</span>
                        <span>Orden: Recientes</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {filteredItems.map((garment) => (
                            <div key={garment.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="aspect-[3/4] overflow-hidden bg-gray-50 relative">
                                    <img
                                        src={garment.imageUrl}
                                        alt={garment.type}
                                        className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ${garment.forSale ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                    />
                                    {!garment.forSale && (
                                        <button
                                            onClick={() => onRemoveGarment(garment.id)}
                                            className="absolute top-2 left-2 bg-white/80 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}

                                    {garment.forSale && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                                En venta
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {!garment.forSale && (
                                    <div className="absolute bottom-14 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-primary shadow-sm">
                                        {garment.usageCount} usos
                                    </div>
                                )}

                                <div className="p-3">
                                    <p className="text-sm font-semibold text-gray-800 capitalize">{garment.type}</p>
                                    <p className="text-xs text-gray-400 capitalize">{garment.season}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform z-40"
                    >
                        <Plus size={28} />
                    </button>
                </div>
            )}

            {/* --- VIEW: SUITCASE --- */}
            {activeView === 'suitcase' && (
                <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                    {/* Inherit from parent logic but specific for this tab if needed */}
                    <p className="sr-only">Suitcase view is handled via embedding or props</p>
                </div>
            )}

            {/* --- VIEW: SALES --- */}
            {activeView === 'sales' && (
                <div className="px-6 flex-1 overflow-y-auto no-scrollbar pb-24 animate-fade-in">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white mb-6 shadow-lg shadow-emerald-900/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-100 text-xs font-medium mb-1">Valor en armario</p>
                                <h3 className="text-3xl font-bold">{totalSalesValue}€</h3>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl">
                                <DollarSign size={20} className="text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex space-x-3 text-xs font-medium">
                            <span className="bg-white/20 px-2 py-1 rounded-lg">{salesItems.length} en venta</span>
                            <span className="bg-white/20 px-2 py-1 rounded-lg">0 vendidos</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">En tu escaparate</h3>
                        <button
                            onClick={startSelling}
                            className="text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full"
                        >
                            Nueva Venta
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {salesItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative cursor-pointer"
                                onClick={() => openDetailModal(item)}
                            >
                                <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                    {item.price}€
                                </div>
                                <div className="aspect-square bg-gray-50">
                                    <img src={item.imageUrl} className="w-full h-full object-cover opacity-90" />
                                </div>
                                <div className="p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-gray-700 capitalize">{item.type}</p>
                                        <Tag size={12} className="text-gray-400" />
                                    </div>
                                    <div className="flex items-center space-x-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-md w-max">
                                        <ShoppingBag size={10} />
                                        <span>En venta</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={startSelling}
                            className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                <Camera size={20} />
                            </div>
                            <span className="text-xs font-medium">Vender prenda</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            {isAdding && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Nueva Prenda</h2>
                            <button onClick={() => { setIsAdding(false); setNewImage(null); }}><X size={24} className="text-gray-400" /></button>
                        </div>

                        <div className="mb-6">
                            {!newImage ? (
                                <label className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                    <Camera size={48} className="text-gray-300 mb-2" />
                                    <span className="text-sm text-gray-500 font-medium">Subir foto</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            ) : (
                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                                    <img src={newImage} className="w-full h-full object-cover" />
                                    <button onClick={() => setNewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><X size={16} /></button>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={!newImage}
                            onClick={confirmAdd}
                            className="w-full bg-primary disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-colors"
                        >
                            Añadir al Armario
                        </button>
                    </div>
                </div>
            )}

            {isSelling && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full max-w-md h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in-up flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {selectedForSale ? 'Ponle precio' : '¿Qué quieres vender?'}
                                </h2>
                            </div>
                            <button onClick={() => { setIsSelling(false); setSelectedForSale(null); }}><X size={24} className="text-gray-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            {!selectedForSale ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {garments.filter(g => !g.forSale).map(garment => (
                                        <button
                                            key={garment.id}
                                            onClick={() => handleSelectForSale(garment)}
                                            className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:border-primary transition-all text-left"
                                        >
                                            <div className="aspect-square bg-gray-50">
                                                <img src={garment.imageUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm font-semibold text-gray-800 capitalize">{garment.type}</p>
                                                <div className="mt-2 flex justify-end">
                                                    <span className="text-xs font-bold text-primary flex items-center bg-primary/5 px-2 py-1 rounded-lg">
                                                        Vender <ChevronRight size={12} />
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-32 h-32 rounded-2xl overflow-hidden mb-6 shadow-md border-2 border-white">
                                        <img src={selectedForSale.imageUrl} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="w-full mb-8">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Precio (€)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="number"
                                                value={salePrice}
                                                onChange={(e) => setSalePrice(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl text-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedForSale(null)} className="text-sm text-gray-500 mb-6 underline">Elegir otra prenda</button>
                                    <button
                                        disabled={!salePrice}
                                        onClick={confirmSale}
                                        className="w-full bg-emerald-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg transition-colors"
                                    >
                                        Publicar Venta
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {detailItem && (
                <ProductDetailModal
                    product={detailItem}
                    onClose={() => setDetailItem(null)}
                />
            )}
        </div>
    );
};

export default Wardrobe;