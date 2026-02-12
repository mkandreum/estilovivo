import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ShoppingBag, Search, Filter, Tag } from 'lucide-react';
import ProductDetailModal, { ProductDisplayItem } from '../components/ProductDetailModal';
import { api } from '../services/api';
import { Look, Garment } from '../types';

const Community: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'feed' | 'shop'>('feed');
    const [selectedItem, setSelectedItem] = useState<ProductDisplayItem | null>(null);
    const [publicLooks, setPublicLooks] = useState<any[]>([]);
    const [shopItems, setShopItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCommunityData = async () => {
            setIsLoading(true);
            try {
                // Fetch public looks (inspiration)
                const looks = await api.getLooks();
                // Filter only public ones for the community feed
                setPublicLooks(looks.filter(l => l.isPublic).map(l => ({
                    id: l.id,
                    user: "Usuario Beyour", // Placeholder if backend doesn't return user name
                    avatar: `https://ui-avatars.com/api/?name=User&background=random`,
                    image: `https://picsum.photos/seed/${l.id}/400/500`,
                    mood: l.tags?.[0] || "Inspirado",
                    desc: l.name,
                    likes: Math.floor(Math.random() * 50),
                    comments: Math.floor(Math.random() * 10),
                    isLiked: false
                })));

                // Fetch all garments and filter for those for sale
                const garments = await api.getGarments();
                setShopItems(garments.filter(g => g.forSale).map(g => ({
                    id: g.id,
                    user: "Vendedor",
                    avatar: `https://ui-avatars.com/api/?name=Seller&background=random`,
                    image: g.imageUrl,
                    title: g.type,
                    price: g.price || 0,
                    size: "M", // Mock size if not in garment type
                    brand: "Marca Beyour"
                })));
            } catch (error) {
                console.error("Error loading community data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCommunityData();
    }, [activeTab]);

    const toggleLike = (id: string | number) => {
        setPublicLooks(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
            }
            return p;
        }));
    };

    const handleItemClick = (item: any) => {
        setSelectedItem({
            id: item.id,
            title: item.title,
            price: item.price,
            image: item.image,
            user: item.user,
            avatar: item.avatar,
            brand: item.brand,
            size: item.size
        });
    };

    return (
        <div className="pb-24 bg-gray-50 min-h-full">
            {/* Header with Tabs */}
            <div className="bg-white p-5 rounded-b-3xl shadow-sm mb-6 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Comunidad</h1>
                    <div className="flex bg-gray-100 rounded-full p-1">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                        >
                            Inspiración
                        </button>
                        <button
                            onClick={() => setActiveTab('shop')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'shop' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                        >
                            Tienda
                        </button>
                    </div>
                </div>

                {activeTab === 'feed' && (
                    <div className="bg-gradient-to-r from-primary to-teal-800 rounded-2xl p-4 text-white relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                        <span className="inline-block px-2 py-1 bg-accent text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">Reto Semanal</span>
                        <h3 className="font-bold text-lg mb-1">Color Block</h3>
                        <p className="text-sm text-teal-100 opacity-90 mb-3">Combina colores vibrantes y gana visibilidad en la tienda.</p>
                        <button className="text-xs font-semibold bg-white text-primary px-3 py-1.5 rounded-full">Participar</button>
                    </div>
                )}

                {activeTab === 'shop' && (
                    <div className="flex space-x-2 animate-fade-in">
                        <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-center text-gray-400">
                            <Search size={16} className="mr-2" />
                            <input type="text" placeholder="Buscar prendas..." className="bg-transparent border-none outline-none text-sm w-full" />
                        </div>
                        <button className="bg-gray-100 p-2 rounded-xl text-gray-600">
                            <Filter size={20} />
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* --- VIEW: FEED --- */}
                    {activeTab === 'feed' && (
                        <div className="space-y-6 px-4">
                            {publicLooks.map(post => (
                                <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
                                    <div className="p-4 flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <img src={post.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-800">{post.user}</h4>
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 rounded-full bg-accent" />
                                                    <span className="text-xs text-gray-500">{post.mood}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-gray-400">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </div>

                                    <div className="aspect-[4/5] bg-gray-100 relative">
                                        <img src={post.image} className="w-full h-full object-cover" loading="lazy" />
                                    </div>

                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex space-x-4">
                                                <button
                                                    onClick={() => toggleLike(post.id)}
                                                    className={`flex items-center space-x-1 transition-colors ${post.isLiked ? 'text-rose-500' : 'text-gray-600 hover:text-rose-500'}`}
                                                >
                                                    <Heart size={24} fill={post.isLiked ? "currentColor" : "none"} />
                                                    <span className="text-xs font-bold">{post.likes}</span>
                                                </button>
                                                <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
                                                    <MessageCircle size={24} />
                                                    <span className="text-xs font-bold">{post.comments}</span>
                                                </button>
                                            </div>
                                            <button className="text-gray-600 hover:text-amber-500">
                                                <Bookmark size={24} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            <span className="font-bold mr-1">{post.user}</span>
                                            {post.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {publicLooks.length === 0 && (
                                <div className="text-center py-20 text-gray-400">
                                    <p>Aún no hay looks compartidos por la comunidad.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- VIEW: SHOP (Grid) --- */}
                    {activeTab === 'shop' && (
                        <div className="px-4 pb-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                {shopItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-pointer"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                            {item.price}€
                                        </div>

                                        <div className="aspect-square bg-gray-50 relative">
                                            <img src={item.image} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button className="bg-white text-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                    <ShoppingBag size={12} className="mr-1" /> Ver
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-gray-700 capitalize line-clamp-1">{item.title}</p>
                                            </div>
                                            <div className="flex items-center text-[10px] text-gray-400 mb-2">
                                                <Tag size={10} className="mr-1" />
                                                <span>{item.brand} • Talla {item.size}</span>
                                            </div>

                                            <div className="flex items-center pt-2 border-t border-gray-50">
                                                <img src={item.avatar} className="w-5 h-5 rounded-full object-cover border border-gray-100 mr-1.5" />
                                                <span className="text-[10px] text-gray-500 truncate">{item.user}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {shopItems.length === 0 && (
                                    <p className="col-span-2 text-center py-20 text-gray-400">No hay artículos a la venta en este momento.</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedItem && (
                <ProductDetailModal
                    product={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

export default Community;