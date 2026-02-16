import { Garment, Look, PlannerEntry, UserState, Trip, Comment, CommunityPost, ShopItem } from '../types';

const API_BASE = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('beyour_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const getAuthHeader = () => {
    const token = localStorage.getItem('beyour_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return res.json();
};

// Helper: map backend product to frontend Garment
const mapProductToGarment = (p: any): Garment => ({
    id: p.id,
    imageUrl: p.images?.[0]?.url || '/api/uploads/placeholder.png',
    name: p.name || p.category,
    type: p.category || 'top',
    color: p.color || 'varios',
    season: p.season || 'all',
    usageCount: p.usageCount || 0,
    lastWorn: p.lastWorn || undefined,
    forSale: p.forSale || false,
    price: p.price || 0,
    brand: p.brand || undefined,
    size: p.size || undefined,
    condition: p.condition || 'new',
    description: p.description || undefined,
    userId: p.userId || p.user?.id,
    userName: p.user?.name,
    userAvatar: p.user?.avatar,
});

// Helper: map backend look to frontend Look
const mapLook = (l: any): Look => ({
    id: l.id,
    name: l.title,
    garmentIds: l.products?.map((p: any) => p.id) || [],
    garments: l.products?.map(mapProductToGarment) || [],
    tags: l.mood ? [l.mood] : [],
    mood: l.mood,
    createdAt: l.createdAt,
    isPublic: l.isPublic,
    imageUrl: l.images?.[0]?.url || l.products?.[0]?.images?.[0]?.url || undefined,
    userId: l.userId || l.user?.id,
    userName: l.user?.name,
    userAvatar: l.user?.avatar,
    likesCount: l.likesCount ?? l._count?.likes ?? 0,
    commentsCount: l.commentsCount ?? l._count?.comments ?? 0,
    isLiked: l.isLiked || false,
    isFavorited: l.isFavorited || false,
});

export const api = {
    // ============= AUTH =============
    login: async (credentials: { email: string; password: string }) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await handleResponse(res);
        localStorage.setItem('beyour_token', data.token);
        return data;
    },

    register: async (userData: { email: string; password: string; name: string; gender?: 'male' | 'female' | 'other'; birthDate?: string }) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await handleResponse(res);
        localStorage.setItem('beyour_token', data.token);
        return data;
    },

    logout: () => {
        localStorage.removeItem('beyour_token');
        localStorage.removeItem('beyour_user');
    },

    getMe: async (): Promise<UserState> => {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
        return handleResponse(res);
    },

    updateProfile: async (data: Partial<UserState>): Promise<UserState> => {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    updateProfileWithAvatar: async (data: FormData): Promise<UserState> => {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: getAuthHeader() as any,
            body: data
        });
        return handleResponse(res);
    },

    forgotPassword: async (email: string) => {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return handleResponse(res);
    },

    // ============= GARMENTS / PRODUCTS =============
    getGarments: async (): Promise<Garment[]> => {
        const res = await fetch(`${API_BASE}/products`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map(mapProductToGarment);
    },

    addGarment: async (garment: { file?: File; name?: string; category: string; color?: string; season?: string; brand?: string; size?: string }): Promise<Garment> => {
        const formData = new FormData();
        formData.append('name', garment.name || garment.category);
        formData.append('category', garment.category);
        if (garment.color) formData.append('color', garment.color);
        if (garment.season) formData.append('season', garment.season);
        if (garment.brand) formData.append('brand', garment.brand);
        if (garment.size) formData.append('size', garment.size);
        if (garment.file) formData.append('images', garment.file);

        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: getAuthHeader() as any,
            body: formData
        });
        const p = await handleResponse(res);
        return mapProductToGarment(p);
    },

    updateGarment: async (id: string, data: Partial<Garment>): Promise<Garment> => {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                name: data.name || data.type,
                category: data.type,
                color: data.color,
                season: data.season,
                price: data.price,
                forSale: data.forSale,
                usageCount: data.usageCount,
                brand: data.brand,
                size: data.size,
                condition: data.condition,
                description: data.description,
            })
        });
        const p = await handleResponse(res);
        return mapProductToGarment(p);
    },

    deleteGarment: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleResponse(res);
    },

    markAsWorn: async (id: string): Promise<Garment> => {
        const res = await fetch(`${API_BASE}/products/${id}/wear`, {
            method: 'POST',
            headers: getHeaders()
        });
        const p = await handleResponse(res);
        return mapProductToGarment(p);
    },

    getShopProducts: async (search?: string, category?: string): Promise<ShopItem[]> => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category) params.append('category', category);

        const res = await fetch(`${API_BASE}/products/shop?${params.toString()}`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map((p: any): ShopItem => ({
            id: p.id,
            user: p.user?.name || 'Vendedor',
            userId: p.user?.id || '',
            avatar: p.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'V')}&background=0F4C5C&color=fff`,
            image: p.images?.[0]?.url || '/api/uploads/placeholder.png',
            title: p.name || p.category,
            price: p.price || 0,
            size: p.size || 'Única',
            brand: p.brand || 'Sin marca',
            condition: p.condition || 'new',
        }));
    },

    // ============= LOOKS =============
    getLooks: async (): Promise<Look[]> => {
        const res = await fetch(`${API_BASE}/looks`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map(mapLook);
    },

    getCommunityFeed: async (): Promise<Look[]> => {
        const res = await fetch(`${API_BASE}/looks/feed`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map(mapLook);
    },

    saveLook: async (look: Look): Promise<Look> => {
        const res = await fetch(`${API_BASE}/looks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                title: look.name,
                productIds: JSON.stringify(look.garmentIds),
                isPublic: look.isPublic || false,
                mood: look.mood,
            })
        });
        const l = await handleResponse(res);
        return mapLook(l);
    },

    updateLook: async (id: string, data: Partial<Look>): Promise<Look> => {
        const res = await fetch(`${API_BASE}/looks/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                title: data.name,
                isPublic: data.isPublic,
                mood: data.mood,
                productIds: data.garmentIds ? JSON.stringify(data.garmentIds) : undefined,
            })
        });
        const l = await handleResponse(res);
        return mapLook(l);
    },

    deleteLook: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/looks/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleResponse(res);
    },

    // ============= PLANNER =============
    getPlanner: async (): Promise<PlannerEntry[]> => {
        const res = await fetch(`${API_BASE}/planner/me`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map((e: any) => ({
            date: e.date,
            lookId: e.lookId,
            look: e.look ? mapLook(e.look) : undefined,
            eventNote: e.eventNote || undefined,
        }));
    },

    updatePlanner: async (entry: PlannerEntry): Promise<PlannerEntry> => {
        const res = await fetch(`${API_BASE}/planner`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...entry, userId: 'me' })
        });
        const e = await handleResponse(res);
        return {
            date: e.date,
            lookId: e.lookId,
            look: e.look ? mapLook(e.look) : undefined,
            eventNote: e.eventNote || undefined,
        };
    },

    deletePlannerEntry: async (date: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/planner/${date}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleResponse(res);
    },

    // ============= TRIPS =============
    getTrips: async (): Promise<Trip[]> => {
        const res = await fetch(`${API_BASE}/trips/me`, { headers: getHeaders() });
        return handleResponse(res);
    },

    saveTrip: async (trip: Trip): Promise<Trip> => {
        const { garments, ...rest } = trip;
        const payload = {
            ...rest,
            garmentIds: garments ? garments.map(g => g.id) : []
        };
        const res = await fetch(`${API_BASE}/trips`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        return handleResponse(res);
    },

    updateTrip: async (trip: Trip): Promise<Trip> => {
        const { garments, ...rest } = trip;
        const payload = {
            ...rest,
            garmentIds: garments ? garments.map(g => g.id) : []
        };
        const res = await fetch(`${API_BASE}/trips/${trip.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        return handleResponse(res);
    },

    deleteTrip: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/trips/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleResponse(res);
    },

    addTripItem: async (tripId: string, label: string, isEssential: boolean = false) => {
        const res = await fetch(`${API_BASE}/trips/${tripId}/items`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ label, isEssential })
        });
        return handleResponse(res);
    },

    updateTripItem: async (tripId: string, itemId: string, data: { checked?: boolean; label?: string }) => {
        const res = await fetch(`${API_BASE}/trips/${tripId}/items/${itemId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    deleteTripItem: async (tripId: string, itemId: string) => {
        const res = await fetch(`${API_BASE}/trips/${tripId}/items/${itemId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    // ============= SOCIAL =============
    toggleLike: async (lookId: string): Promise<{ liked: boolean; likesCount: number }> => {
        const res = await fetch(`${API_BASE}/social/like`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ lookId })
        });
        return handleResponse(res);
    },

    addComment: async (lookId: string, content: string): Promise<Comment> => {
        const res = await fetch(`${API_BASE}/social/comment`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ lookId, content })
        });
        const c = await handleResponse(res);
        return {
            id: c.id,
            content: c.content,
            userId: c.user?.id || c.userId,
            userName: c.user?.name || 'Usuario',
            userAvatar: c.user?.avatar,
            createdAt: c.createdAt,
        };
    },

    getComments: async (lookId: string): Promise<Comment[]> => {
        const res = await fetch(`${API_BASE}/social/comments/${lookId}`, { headers: getHeaders() });
        const data = await handleResponse(res);
        return data.map((c: any) => ({
            id: c.id,
            content: c.content,
            userId: c.user?.id || c.userId,
            userName: c.user?.name || 'Usuario',
            userAvatar: c.user?.avatar,
            createdAt: c.createdAt,
        }));
    },

    deleteComment: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/social/comment/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleResponse(res);
    },

    toggleFavorite: async (lookId?: string, productId?: string): Promise<{ favorited: boolean }> => {
        const res = await fetch(`${API_BASE}/social/favorite`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ lookId, productId })
        });
        return handleResponse(res);
    },

    getFavorites: async () => {
        const res = await fetch(`${API_BASE}/social/favorites`, { headers: getHeaders() });
        return handleResponse(res);
    },

    toggleFollow: async (targetUserId: string): Promise<{ following: boolean }> => {
        const res = await fetch(`${API_BASE}/social/follow`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ targetUserId })
        });
        return handleResponse(res);
    },

    // ============= STATS =============
    getStats: async () => {
        const res = await fetch(`${API_BASE}/stats`, { headers: getHeaders() });
        return handleResponse(res);
    },
};
