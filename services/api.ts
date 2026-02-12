import { Garment, Look, PlannerEntry, UserState, Trip } from '../types';

const API_BASE = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('beyour_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    login: async (credentials: any) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json();
        localStorage.setItem('beyour_token', data.token);
        return data;
    },

    register: async (userData: any) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!res.ok) throw new Error('Error creating account');
        const data = await res.json();
        localStorage.setItem('beyour_token', data.token);
        return data;
    },

    logout: () => {
        localStorage.removeItem('beyour_token');
    },

    // Products / Garments
    getGarments: async (): Promise<Garment[]> => {
        const res = await fetch(`${API_BASE}/products`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        return data.map((p: any) => ({
            id: p.id,
            imageUrl: p.images?.[0]?.url || 'https://picsum.photos/300/400',
            type: p.category || 'top',
            color: p.color || 'varios',
            season: 'all',
            usageCount: p.usageCount || 0,
            forSale: p.forSale || false,
            price: p.price || 0
        }));
    },

    addGarment: async (garment: any, userId: string): Promise<Garment> => {
        const formData = new FormData();
        formData.append('name', garment.type);
        formData.append('category', garment.type);
        formData.append('userId', userId);
        if (garment.file) {
            formData.append('images', garment.file);
        }

        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Authorization': getHeaders().Authorization || '' },
            body: formData
        });
        const p = await res.json();
        return {
            id: p.id,
            imageUrl: p.images?.[0]?.url || '',
            type: p.category,
            color: p.color || '',
            season: 'all',
            usageCount: 0,
            forSale: false,
            price: 0
        };
    },

    // Looks
    getLooks: async (): Promise<Look[]> => {
        const res = await fetch(`${API_BASE}/looks`, {
            headers: getHeaders()
        });
        const data = await res.json();
        return data.map((l: any) => ({
            id: l.id,
            name: l.title,
            garmentIds: l.products?.map((p: any) => p.id) || [],
            tags: [],
            createdAt: l.createdAt,
            isPublic: l.isPublic
        }));
    },

    saveLook: async (look: Look, userId: string): Promise<Look> => {
        const res = await fetch(`${API_BASE}/looks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                title: look.name,
                userId: userId,
                productIds: look.garmentIds,
                isPublic: look.isPublic
            })
        });
        const l = await res.json();
        return {
            id: l.id,
            name: l.title,
            garmentIds: l.products?.map((p: any) => p.id) || [],
            tags: [],
            createdAt: l.createdAt,
            isPublic: l.isPublic
        };
    },

    // Planner
    getPlanner: async (userId: string): Promise<PlannerEntry[]> => {
        const res = await fetch(`${API_BASE}/planner/${userId}`, {
            headers: getHeaders()
        });
        return await res.json();
    },

    updatePlanner: async (userId: string, entry: PlannerEntry): Promise<PlannerEntry> => {
        const res = await fetch(`${API_BASE}/planner`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...entry, userId })
        });
        return await res.json();
    },

    // Trips
    getTrips: async (userId: string): Promise<Trip[]> => {
        const res = await fetch(`${API_BASE}/trips/${userId}`, {
            headers: getHeaders()
        });
        return await res.json();
    },

    saveTrip: async (userId: string, trip: Trip): Promise<Trip> => {
        const res = await fetch(`${API_BASE}/trips`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...trip, userId })
        });
        return await res.json();
    },

    // Social
    likeLook: async (userId: string, lookId: string) => {
        await fetch(`${API_BASE}/social/like`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, lookId })
        });
    },

    commentLook: async (userId: string, lookId: string, content: string) => {
        await fetch(`${API_BASE}/social/comment`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, lookId, content })
        });
    }
};
