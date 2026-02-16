import React, { useState, useEffect } from 'react';
import { X, Share2, Heart, MapPin, CreditCard, MessageCircle, Truck, Store } from 'lucide-react';

export interface ProductDisplayItem {
  id: string | number;
  title: string;
  price: number;
  image: string;
  user: string;
  avatar?: string;
  description?: string;
  brand?: string;
  size?: string;
  condition?: string;
  isOwnItem?: boolean;
}

interface ProductDetailModalProps {
  product: ProductDisplayItem;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddToTrip?: () => void;
  onMessage?: (product: ProductDisplayItem) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onEdit, onDelete, onAddToTrip, onMessage }) => {
  const [showBuyOptions, setShowBuyOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial favorite status
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !product.id) return;
        
        const res = await fetch('/api/social/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const favorites = await res.json();
        const isFavorited = favorites.some((fav: any) => fav.productId === product.id);
        setIsLiked(isFavorited);
      } catch (e) {
        console.warn('Failed to load favorite status:', e);
      }
    };
    loadFavoriteStatus();
  }, [product.id]);

  // Gallery uses the product's main image only (no mock images)
  const galleryImages = [product.image];

  const handleShare = () => {
    // Demo share logic
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `Mira este ${product.title} en Estilo Vivo`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Enlace copiado al portapapeles");
    }
  };

  const handleLike = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/social/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product.id })
      });
      const data = await res.json();
      setIsLiked(data.favorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="bg-white w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden pointer-events-auto animate-fade-in-up transform transition-transform">
        
        {/* Header Actions (Floating) */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/40 to-transparent">
          <button onClick={onClose} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors">
            <X size={20} />
          </button>
          <div className="flex space-x-2">
            <button onClick={handleShare} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors">
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleLike} 
              disabled={isLoading}
              className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-rose-500" : "text-white"} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
          
          {/* Main Image Gallery */}
          <div className="w-full aspect-[4/5] bg-gray-100 relative">
            <img src={product.image} className="w-full h-full object-cover" alt={product.title} />
            
            {/* Thumbnails Overlay */}
            <div className="absolute bottom-4 left-4 flex space-x-2">
              {galleryImages.map((img, idx) => (
                <div key={idx} className={`w-12 h-12 rounded-lg border-2 overflow-hidden shadow-sm ${idx === 0 ? 'border-white' : 'border-white/50'}`}>
                  <img src={img} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="p-6 pb-32">
            <div className="flex justify-between items-start mb-2">
              <div>
                 <h2 className="text-2xl font-bold text-gray-800 capitalize">{product.title}</h2>
                 <p className="text-gray-500 text-sm">
                    {product.brand || 'Marca desconocida'} • {product.size ? `Talla ${product.size}` : 'Talla única'}
                 </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary block">{product.price}€</span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center justify-between py-4 border-y border-gray-100 my-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={product.avatar || "https://ui-avatars.com/api/?name=User&background=random"} 
                  className="w-10 h-10 rounded-full object-cover border border-gray-100" 
                  alt={product.user}
                />
                <div>
                  <p className="text-sm font-bold text-gray-800">{product.user}</p>
                  <div className="flex text-yellow-400 text-[10px] space-x-0.5">
                    {[1,2,3,4,5].map(i => <span key={i}>★</span>)} 
                    <span className="text-gray-400 ml-1">(24)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onMessage?.(product)}
                className="text-primary bg-primary/10 p-2 rounded-full"
              >
                <MessageCircle size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">Descripción</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {product.description || "Esta prenda está en excelentes condiciones. Usada muy pocas veces y cuidada con mucho amor. Perfecta para combinar en cualquier ocasión. Se entrega lavada y planchada."}
              </p>
            </div>

            {/* Tags/Attributes */}
            <div className="mt-4 flex flex-wrap gap-2">
               {product.condition && (
                 <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium capitalize">Estado: {product.condition}</span>
               )}
               {product.brand && (
                 <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">{product.brand}</span>
               )}
               {product.size && (
                 <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">Talla: {product.size}</span>
               )}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-8 sm:pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {product.isOwnItem ? (
            /* Own Item Actions */
            <div className="space-y-3">
              <button 
                onClick={() => {
                  onAddToTrip?.();
                  onClose();
                }}
                className="w-full bg-primary text-white font-bold py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
              >
                <span>✈️ Añadir a Maleta</span>
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    onEdit?.();
                    onClose();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors active:scale-[0.98]"
                >
                  Editar
                </button>
                <button 
                  onClick={() => {
                    onDelete?.();
                    onClose();
                  }}
                  className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 transition-colors active:scale-[0.98]"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            /* Shop Item Actions */
            <button 
              onClick={() => setShowBuyOptions(true)}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
            >
               <CreditCard size={20} />
               <span>Comprar Ahora</span>
            </button>
          )}
        </div>

        {/* --- NESTED MODAL: BUY OPTIONS --- */}
        {showBuyOptions && (
          <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
             <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-fade-in-up shadow-2xl relative">
                <button 
                  onClick={() => setShowBuyOptions(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X size={20}/>
                </button>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {product.isOwnItem ? 'Gestionar Pedido' : 'Elige cómo comprar'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {product.isOwnItem ? 'Selecciona una opción para editar el estado.' : 'Selecciona el método de entrega preferido.'}
                </p>

                <div className="space-y-3">
                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-100">
                      <Store size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-gray-800">En persona</p>
                      <p className="text-xs text-gray-500">Queda con {product.user.split(' ')[0]} y ahórrate el envío</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">Gratis</span>
                  </button>

                  <button className="w-full flex items-center p-4 border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-100">
                      <Truck size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-gray-800">Envío a domicilio</p>
                      <p className="text-xs text-gray-500">Recíbelo en 24-48 horas</p>
                    </div>
                    <span className="text-xs font-bold text-gray-800">3.95€</span>
                  </button>
                </div>

                <button className="w-full mt-6 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                  Continuar
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailModal;