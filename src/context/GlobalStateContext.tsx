import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserState, Garment, Look, PlannerEntry, Trip } from '../../types';
import { api, loadAuthToken, refreshAccessToken, getSocketOrigin } from '../../services/api';
import { useNotification } from './NotificationContext';
import { useLanguage } from './LanguageContext';
import { prepareGarmentUpload } from '../utils/garmentProcessor';
import { syncGet, syncSet, syncClearMemoryCache, SYNC_KEYS } from '../utils/syncStore';
import { removeSecureItem } from '../utils/secureStorage';
import { analytics, crashlytics } from '../utils/firebase';
import { trackSession } from '../utils/review';
import { registerForPushNotifications, setupNotificationListeners } from '../utils/notifications';

const AUTH_TOKEN_KEY = 'beyour_token';
const REFRESH_TOKEN_KEY = 'beyour_refresh_token';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalStateContextValue {
    // State
    user: UserState | null;
    garments: Garment[];
    looks: Look[];
    planner: PlannerEntry[];
    trips: Trip[];
    isLoading: boolean;

    // User
    setUser: React.Dispatch<React.SetStateAction<UserState | null>>;
    handleAuthSuccess: (userData: UserState, remember?: boolean) => void;
    handleMoodChange: (mood: string) => Promise<void>;
    handleUpdateUser: (updatedUser: UserState, options?: { persist?: boolean }) => Promise<void>;

    // Garments
    addGarment: (garment: Garment, file?: File) => Promise<boolean>;
    removeGarment: (id: string) => Promise<void>;
    updateGarment: (g: Garment) => Promise<void>;
    copyProductToWardrobe: (product: any) => Promise<boolean>;

    // Looks
    saveLook: (look: Look, onAfterSave?: () => void) => Promise<void>;
    deleteLook: (id: string) => Promise<void>;

    // Planner
    updatePlannerEntry: (entry: PlannerEntry) => Promise<void>;

    // Trips
    addTrip: (newTrip: Trip) => Promise<Trip | undefined>;
    deleteTrip: (id: string) => Promise<void>;
    updateTrip: (trip: Trip) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const GlobalStateContext = createContext<GlobalStateContextValue | null>(null);

// ─── Helper ──────────────────────────────────────────────────────────────────

const sanitize = <T,>(data: any[]): T[] => {
    if (!Array.isArray(data)) return [];
    return data.filter(item => item && (item.id || item.date)) as T[];
};

const SESSION_KEYS = [
    'beyour_user',
    'beyour_garments',
    'beyour_looks',
    'beyour_planner',
    'beyour_trips',
    'beyour_token',
    'beyour_remember_me',
    'beyour_refresh_token'
];

const clearPersistedSession = async () => {
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    Object.values(SYNC_KEYS).forEach(key => {
        syncClearMemoryCache();
        localStorage.removeItem(key);
    });
    await removeSecureItem('beyour_token');
    await removeSecureItem('beyour_refresh_token');
};

// Mensaje de error útil del servidor (validación, límites…) o null si es técnico
const serverMessage = (error: unknown): string | null => {
    const msg = (error as any)?.message;
    if (typeof msg !== 'string' || !msg || msg.length > 160) return null;
    if (/^(Error \d+|Request failed|Failed to fetch|NetworkError|Load failed)/i.test(msg) || msg.includes('aborted')) return null;
    if (msg === 'Error de validación') return 'Revisa los datos introducidos';
    return msg;
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { notify } = useNotification();
    const { t } = useLanguage();

    const [user, setUser] = useState<UserState | null>(null);
    const [garments, setGarments] = useState<Garment[]>([]);
    const [looks, setLooks] = useState<Look[]>([]);
    const [planner, setPlanner] = useState<PlannerEntry[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const tripsRef = useRef<Trip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { tripsRef.current = trips; }, [trips]);

    // ── Init ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;
        const handleAuthExpired = () => {
            clearPersistedSession();
            setUser(null);
            setGarments([]);
            setLooks([]);
            setPlanner([]);
            setTrips([]);
        };

        window.addEventListener('auth:expired', handleAuthExpired as EventListener);

        const init = async () => {
            try {
                await loadAuthToken();
                const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';
                const hasRefreshToken = !!localStorage.getItem(REFRESH_TOKEN_KEY);
                const hasSession = !!token || hasRefreshToken;

                if (!hasSession) {
                    setIsLoading(false);
                    return;
                }

                // If access token is missing/expired but we have a refresh token, refresh first
                if (!token && hasRefreshToken) {
                    const newToken = await refreshAccessToken();
                    if (!newToken) {
                        setIsLoading(false);
                        return;
                    }
                }

                let userData: UserState;
                try {
                    userData = await api.getMe();
                    if (cancelled) return;
                    setUser(userData);
                    await syncSet(SYNC_KEYS.USER, userData);
                    window.dispatchEvent(new CustomEvent('ev:user-loaded', { detail: userData }));

                    try {
                        const fs = userData.fontSize;
                        if (fs === 'small' || fs === 'large') {
                            document.documentElement.style.fontSize = fs === 'small' ? '14px' : '18px';
                            localStorage.setItem('ev_font_size', fs);
                        }
                        if (userData.highContrast !== undefined) {
                            document.documentElement.classList.toggle('high-contrast', userData.highContrast);
                            localStorage.setItem('ev_high_contrast', userData.highContrast ? 'on' : 'off');
                        }
                    } catch {}
                } catch (error: any) {
                    if (cancelled) return;

                    // If getMe failed and we have a refresh token, try refreshing
                    if (hasRefreshToken && (error?.message?.includes('expired') || error?.message?.includes('Invalid'))) {
                        const newToken = await refreshAccessToken();
                        if (newToken && !cancelled) {
                            try {
                                userData = await api.getMe();
                                setUser(userData);
                                await syncSet(SYNC_KEYS.USER, userData);
                                window.dispatchEvent(new CustomEvent('ev:user-loaded', { detail: userData }));
                            } catch {
                                clearPersistedSession();
                                setUser(null);
                                setIsLoading(false);
                                return;
                            }
                        } else {
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        clearPersistedSession();
                        setUser(null);
                        setIsLoading(false);
                        return;
                    }
                }

                api.gamificationLogin().catch(() => {});
                // Sesión restaurada: también hay que registrar push/analytics (antes sólo se hacía al hacer login)
                try {
                    analytics.setUserId(userData!.id);
                    crashlytics.setUserId(userData!.id);
                    trackSession();
                    registerForPushNotifications();
                    setupNotificationListeners(
                        () => {},
                        (data: any) => {
                            if (data?.tab) window.dispatchEvent(new CustomEvent('navigateTo', { detail: { tab: data.tab, subTab: data.subTab } }));
                        }
                    );
                } catch { /* plugins nativos opcionales */ }

                const [fetchedGarments, fetchedLooks, fetchedPlanner, fetchedTrips] =
                    await Promise.allSettled([
                        api.getGarments(),
                        api.getLooks(),
                        api.getPlanner(),
                        api.getTrips(),
                    ]);

                if (fetchedGarments.status === 'fulfilled') {
                    const sanitized = sanitize<Garment>(fetchedGarments.value);
                    setGarments(sanitized);
                    syncSet(SYNC_KEYS.GARMENTS, sanitized);
                }

                if (fetchedLooks.status === 'fulfilled') {
                    const sanitized = sanitize<Look>(fetchedLooks.value);
                    setLooks(sanitized);
                    syncSet(SYNC_KEYS.LOOKS, sanitized);
                }

                if (fetchedPlanner.status === 'fulfilled') {
                    const sanitized = sanitize<PlannerEntry>(fetchedPlanner.value);
                    setPlanner(sanitized);
                    syncSet(SYNC_KEYS.PLANNER, sanitized);
                }

                if (fetchedTrips.status === 'fulfilled') {
                    const sanitized = sanitize<Trip>(fetchedTrips.value);
                    setTrips(sanitized);
                    syncSet(SYNC_KEYS.TRIPS, sanitized);
                }

                const syncFailures: string[] = [];
                if (fetchedGarments.status === 'rejected') syncFailures.push('armario');
                if (fetchedLooks.status === 'rejected') syncFailures.push('looks');
                if (fetchedPlanner.status === 'rejected') syncFailures.push('planificador');
                if (fetchedTrips.status === 'rejected') syncFailures.push('maletas');
                if (syncFailures.length > 0) {
                    console.warn(
                        `No se pudo sincronizar con el servidor: ${syncFailures.join(', ')}. Se muestran datos en caché si están disponibles.`
                    );
                }
            } catch (error) {
                if (cancelled) return;
                console.error('Critical error during initialization:', error);
                clearPersistedSession();
                setUser(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        init();

        return () => {
            cancelled = true;
            window.removeEventListener('auth:expired', handleAuthExpired as EventListener);
        };
    }, []);

    // ── Auto-refresh token before expiry ─────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const getMsUntilRefresh = (): number | null => {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (!token) return null;
            try {
                const parts = token.split('.');
                if (parts.length !== 3) return null;
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                if (typeof payload?.exp !== 'number') return null;
                const expiresAt = payload.exp * 1000;
                const refreshAt = expiresAt - 6 * 24 * 60 * 60 * 1000; // 6 days for 7-day token
                const msUntilRefresh = refreshAt - Date.now();
                return msUntilRefresh > 0 ? msUntilRefresh : 0;
            } catch {
                return null;
            }
        };

        const ms = getMsUntilRefresh();
        if (ms === null) return;

        let timer: ReturnType<typeof setTimeout>;

        const scheduleRefresh = (delayMs: number) => {
            timer = setTimeout(async () => {
                try {
                    await refreshAccessToken();
                } catch { /* ignore */ }
                const nextMs = getMsUntilRefresh();
                if (nextMs !== null && nextMs > 0) {
                    scheduleRefresh(nextMs);
                }
            }, delayMs);
        };

        scheduleRefresh(ms);

        return () => clearTimeout(timer);
    }, [user]);

    const handleAuthSuccess = useCallback(async (userData: UserState, remember: boolean = true) => {
        setUser(userData);
        window.dispatchEvent(new CustomEvent('ev:user-loaded', { detail: userData }));

        analytics.setUserId(userData.id);
        analytics.logEvent('login', { method: 'email' });
        crashlytics.setUserId(userData.id);
        trackSession();
        registerForPushNotifications();
        setupNotificationListeners(
            () => {},
            (data: any) => {
                if (data?.tab) window.dispatchEvent(new CustomEvent('navigateTo', { detail: { tab: data.tab, subTab: data.subTab } }));
            }
        );
        api.gamificationLogin().catch(() => {});

        if (remember) {
            syncSet(SYNC_KEYS.USER, userData);
        } else {
            clearPersistedSession();
        }

        try {
            const [fetchedGarments, fetchedLooks, fetchedPlanner, fetchedTrips] =
                await Promise.allSettled([
                    api.getGarments(),
                    api.getLooks(),
                    api.getPlanner(),
                    api.getTrips(),
                ]);

            if (fetchedGarments.status === 'fulfilled') {
                const sanitized = sanitize<Garment>(fetchedGarments.value);
                setGarments(sanitized);
                syncSet(SYNC_KEYS.GARMENTS, sanitized);
            }
            if (fetchedLooks.status === 'fulfilled') {
                const sanitized = sanitize<Look>(fetchedLooks.value);
                setLooks(sanitized);
                syncSet(SYNC_KEYS.LOOKS, sanitized);
            }
            if (fetchedPlanner.status === 'fulfilled') {
                const sanitized = sanitize<PlannerEntry>(fetchedPlanner.value);
                setPlanner(sanitized);
                syncSet(SYNC_KEYS.PLANNER, sanitized);
            }
            if (fetchedTrips.status === 'fulfilled') {
                const sanitized = sanitize<Trip>(fetchedTrips.value);
                setTrips(sanitized);
                syncSet(SYNC_KEYS.TRIPS, sanitized);
            }
        } catch (e) {
            console.warn('Failed to fetch data after auth:', e);
        }
    }, []);

    const handleMoodChange = useCallback(async (mood: string) => {
        let prevUser: UserState | null = null;
        setUser(prev => { prevUser = prev; return prev ? { ...prev, mood } : prev; });
        try {
            await api.updateProfile({ mood });
        } catch (e) {
            console.warn('Failed to save mood:', e);
            if (prevUser) setUser(prevUser);
        }
    }, []);

    // persist=false cuando el llamador ya guardó en el servidor (evita un PUT redundante con el usuario completo)
    const handleUpdateUser = useCallback(async (updatedUser: UserState, options?: { persist?: boolean }) => {
        let prevUser: UserState | null = null;
        setUser(prev => { prevUser = prev; return updatedUser; });
        syncSet(SYNC_KEYS.USER, updatedUser);
        window.dispatchEvent(new CustomEvent('ev:user-loaded', { detail: updatedUser }));
        if (options?.persist === false) return;
        try {
            await api.updateProfile(updatedUser);
        } catch (error) {
            console.warn('Error saving profile:', error);
            if (prevUser) {
                setUser(prevUser);
                syncSet(SYNC_KEYS.USER, prevUser);
                window.dispatchEvent(new CustomEvent('ev:user-loaded', { detail: prevUser }));
            }
        }
    }, []);

    // El servidor otorga XP de forma asíncrona: refrescamos nivel/XP poco después de la acción
    const refreshXpSoon = useCallback(() => {
        window.setTimeout(() => {
            api.getMe().then(fresh => {
                setUser(prev => prev ? { ...prev, experiencePoints: fresh.experiencePoints, level: fresh.level } : prev);
            }).catch(() => {});
        }, 800);
    }, []);

    // ── Garments ─────────────────────────────────────────────────────────────

    const addGarment = useCallback(async (garment: Garment, file?: File) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticGarment = { ...garment, id: tempId };

        setGarments(prev => {
            const updated = sanitize<Garment>([optimisticGarment, ...prev]);
            syncSet(SYNC_KEYS.GARMENTS, updated);
            return updated;
        });

        try {
            let uploadFile = file;
            if (uploadFile && typeof window !== 'undefined') {
                try {
                    const prepared = await prepareGarmentUpload(uploadFile, { maxSize: 1600 });
                    uploadFile = prepared.file;
                } catch (prepError) {
                    console.warn('No se pudo preparar la prenda para el probador', prepError);
                }
            }

            const saved = await api.addGarment({
                file: uploadFile,
                name: garment.name || garment.type,
                category: garment.type,
                color: garment.color,
                season: garment.season,
                forSale: garment.forSale,
                price: garment.price,
                condition: garment.condition,
                description: garment.description,
                size: garment.size,
                brand: garment.brand,
            });

            setGarments(prev => {
                const updated = sanitize<Garment>(prev.map(g => g.id === tempId ? saved : g));
                syncSet(SYNC_KEYS.GARMENTS, updated);
                return updated;
            });

            analytics.logEvent('add_garment', { category: garment.type });
            notify(`✓ ${t('garmentAdded')}`, 'success');
            refreshXpSoon();
            return true;
        } catch (error) {
            setGarments(prev => {
                const filtered = prev.filter(g => g.id !== tempId);
                syncSet(SYNC_KEYS.GARMENTS, filtered);
                return filtered;
            });
            notify(`✗ ${serverMessage(error) || t('garmentAddError')}`, 'error');
            console.error('Error adding garment:', error);
            return false;
        }
    }, [notify, t]);

    const removeGarment = useCallback(async (id: string) => {
        let previousGarments: Garment[] = [];

        setGarments(prev => {
            previousGarments = [...prev];
            const filtered = sanitize<Garment>(prev.filter(g => g.id !== id));
            syncSet(SYNC_KEYS.GARMENTS, filtered);
            return filtered;
        });

        try {
            await api.deleteGarment(id);
            notify(`✓ ${t('garmentDeleted')}`, 'success');
        } catch (error) {
            setGarments(previousGarments);
            syncSet(SYNC_KEYS.GARMENTS, previousGarments);
            notify(`✗ ${t('garmentDeleteError')}`, 'error');
            console.error('Error deleting garment:', error);
        }
    }, [notify, t]);

    const updateGarment = useCallback(async (g: Garment) => {
        let previousGarments: Garment[] = [];

        setGarments(prev => {
            previousGarments = [...prev];
            const updated = sanitize<Garment>(prev.map(item => item.id === g.id ? g : item));
            syncSet(SYNC_KEYS.GARMENTS, updated);
            return updated;
        });

        try {
            const saved = await api.updateGarment(g.id, g);
            // Update state with server-returned garment (has new imageUrl after image upload)
            setGarments(prev => {
                const updated = sanitize<Garment>(prev.map(item => item.id === g.id ? saved : item));
                syncSet(SYNC_KEYS.GARMENTS, updated);
                return updated;
            });
            notify(`✓ ${t('garmentUpdated')}`, 'success');
        } catch (error) {
            setGarments(previousGarments);
            syncSet(SYNC_KEYS.GARMENTS, previousGarments);
            notify(`✗ ${serverMessage(error) || t('garmentUpdateError')}`, 'error');
            console.error('Error updating garment:', error);
        }
    }, [notify, t]);

    // Copia una prenda de la tienda/favoritos al armario propio, incluida su foto
    const copyProductToWardrobe = useCallback(async (product: any): Promise<boolean> => {
        if (!product) return false;
        let file: File | undefined;
        const imgUrl: string | undefined = product.images?.[0]?.url || product.imageUrl;
        if (imgUrl) {
            try {
                const absolute = /^(https?:|data:|blob:)/.test(imgUrl) ? imgUrl : `${getSocketOrigin()}${imgUrl}`;
                const blob = await fetch(absolute).then(r => { if (!r.ok) throw new Error('img'); return r.blob(); });
                file = new File([blob], `garment-${Date.now()}.webp`, { type: blob.type || 'image/webp' });
            } catch { /* se copia sin imagen */ }
        }
        return addGarment({
            id: '',
            name: product.name || product.title || 'Prenda',
            type: product.category || product.type || 'top',
            color: product.color || 'varios',
            season: product.season || 'all',
            brand: product.brand || undefined,
            size: product.size || undefined,
            imageUrl: imgUrl || '',
            usageCount: 0,
        } as Garment, file);
    }, [addGarment]);

    // ── Looks ─────────────────────────────────────────────────────────────────

    const saveLook = useCallback(async (look: Look, onAfterSave?: () => void) => {
        const isEdit = !look.id.startsWith('l-') && !look.id.startsWith('temp-');
        const tempId = isEdit ? look.id : `temp-${Date.now()}`;
        const optimisticLook = { ...look, id: tempId };

        setLooks(prev => {
            const updated = isEdit
                ? sanitize<Look>(prev.map(l => l.id === tempId ? optimisticLook : l))
                : sanitize<Look>([optimisticLook, ...prev]);
            syncSet(SYNC_KEYS.LOOKS, updated);
            return updated;
        });

        try {
            const savedLook = isEdit
                ? await api.updateLook(look.id, look)
                : await api.saveLook(look);

            setLooks(prev => {
                const updated = prev.map(l => l.id === tempId ? savedLook : l);
                syncSet(SYNC_KEYS.LOOKS, updated);
                return updated;
            });

            analytics.logEvent('save_look', { garment_count: look.garments?.length || 0 });
            notify(`✓ ${t('lookSaved')}`, 'success');
            if (!isEdit) refreshXpSoon();
            onAfterSave?.();
        } catch (error) {
            setLooks(prev => {
                const filtered = isEdit ? prev : prev.filter(l => l.id !== tempId);
                syncSet(SYNC_KEYS.LOOKS, filtered);
                return filtered;
            });
            notify(`✗ ${serverMessage(error) || t('lookSaveError')}`, 'error');
            console.error('Error saving look:', error);
        }
    }, [notify, t]);

    const deleteLook = useCallback(async (id: string) => {
        let previousLooks: Look[] = [];

        setLooks(prev => {
            previousLooks = [...prev];
            const filtered = prev.filter(l => l.id !== id);
            syncSet(SYNC_KEYS.LOOKS, filtered);
            return filtered;
        });

        try {
            await api.deleteLook(id);
            notify(`✓ ${t('lookDeleted')}`, 'success');
        } catch (error) {
            setLooks(previousLooks);
            syncSet(SYNC_KEYS.LOOKS, previousLooks);
            notify(`✗ ${t('lookDeleteError')}`, 'error');
            console.error('Error deleting look:', error);
        }
    }, [notify, t]);

    // ── Planner ───────────────────────────────────────────────────────────────

    const updatePlannerEntry = useCallback(async (entry: PlannerEntry) => {
        let previous: PlannerEntry[] = [];
        // Un día sin look ni nota se elimina en lugar de guardar una entrada vacía
        const isEmpty = !entry.lookId && !entry.eventNote?.trim();
        setPlanner(prev => {
            previous = prev;
            const updated = isEmpty
                ? prev.filter(p => p.date !== entry.date)
                : [...prev.filter(p => p.date !== entry.date), entry];
            syncSet(SYNC_KEYS.PLANNER, updated);
            return updated;
        });
        try {
            if (isEmpty) {
                if (previous.some(p => p.date === entry.date)) await api.deletePlannerEntry(entry.date);
                return;
            }
            const saved = await api.updatePlanner(entry);
            setPlanner(prev => {
                const final = [...prev.filter(p => p.date !== entry.date), saved];
                syncSet(SYNC_KEYS.PLANNER, final);
                return final;
            });
        } catch (error) {
            setPlanner(previous);
            syncSet(SYNC_KEYS.PLANNER, previous);
            notify('✗ No se pudo guardar el planificador', 'error');
            console.error('Error updating planner:', error);
        }
    }, [notify]);

    // ── Trips ─────────────────────────────────────────────────────────────────

const addTrip = useCallback(async (newTrip: Trip) => {
    const previousTrips = [...tripsRef.current];

    setTrips(prev => {
        const updated = [newTrip, ...prev];
        syncSet(SYNC_KEYS.TRIPS, updated);
        return updated;
    });

    try {
        const saved = await api.saveTrip(newTrip);
        setTrips(prev => {
            const updated = [saved, ...prev.filter(t => t.id !== newTrip.id)];
            syncSet(SYNC_KEYS.TRIPS, updated);
            return updated;
        });
        notify('✓ Viaje creado', 'success');
        return saved;
    } catch (error) {
        setTrips(previousTrips);
        syncSet(SYNC_KEYS.TRIPS, previousTrips);
        notify(`✗ ${serverMessage(error) || 'Error al crear viaje'}`, 'error');
        console.error('Error saving trip:', error);
        return undefined;
    }
}, [notify]);

    const deleteTrip = useCallback(async (id: string) => {
        const previousTrips = [...tripsRef.current];
        setTrips(prev => {
            const filtered = prev.filter(t => t.id !== id);
            syncSet(SYNC_KEYS.TRIPS, filtered);
            return filtered;
        });
        try {
            await api.deleteTrip(id);
            notify('✓ Viaje eliminado', 'success');
        } catch (error) {
            setTrips(previousTrips);
            syncSet(SYNC_KEYS.TRIPS, previousTrips);
            notify('✗ Error al eliminar el viaje', 'error');
            console.error('Error deleting trip:', error);
        }
    }, [notify]);

const updateTrip = useCallback(async (trip: Trip) => {
    let previousTrip: Trip | undefined;
    setTrips(prev => {
        previousTrip = prev.find(t => t.id === trip.id);
        const updated = prev.map(t => t.id === trip.id ? trip : t);
        syncSet(SYNC_KEYS.TRIPS, updated);
        return updated;
    });

    try {
        const prev = previousTrip;
        const prevItems = prev?.items || [];
        const finalItems = [];
        // Items nuevos (id local) → POST; modificados → PUT; eliminados → DELETE
        for (const item of trip.items || []) {
            const old = prevItems.find(i => i.id === item.id);
            if (!old) {
                const created = await api.addTripItem(trip.id, item.label, item.isEssential);
                if (item.checked) await api.updateTripItem(trip.id, created.id, { checked: true });
                finalItems.push({ ...item, id: created.id });
            } else {
                if (old.checked !== item.checked || old.label !== item.label) {
                    await api.updateTripItem(trip.id, item.id, { checked: item.checked, label: item.label });
                }
                finalItems.push(item);
            }
        }
        for (const old of prevItems) {
            if (!(trip.items || []).some(i => i.id === old.id)) await api.deleteTripItem(trip.id, old.id);
        }
        const garmentKey = (t?: Trip) => (t?.garments || []).map(g => g.id).sort().join(',');
        const metaChanged = !prev || prev.destination !== trip.destination || prev.dateStart !== trip.dateStart
            || prev.dateEnd !== trip.dateEnd || garmentKey(prev) !== garmentKey(trip);
        let saved: Trip = { ...trip, items: finalItems };
        if (metaChanged) {
            const server = await api.updateTrip(trip);
            saved = { ...server, items: finalItems };
            notify('✓ Viaje actualizado', 'success');
        }
        setTrips(prevTrips => {
            const updated = prevTrips.map(t => t.id === trip.id ? saved : t);
            syncSet(SYNC_KEYS.TRIPS, updated);
            return updated;
        });
    } catch (error) {
        if (previousTrip) {
            setTrips(prev => {
                const updated = prev.map(t => t.id === trip.id ? previousTrip! : t);
                syncSet(SYNC_KEYS.TRIPS, updated);
                return updated;
            });
        }
        notify('✗ Error al actualizar viaje', 'error');
        console.error('Error updating trip:', error);
    }
}, [notify]);

    // ── Context value ─────────────────────────────────────────────────────────

    const value: GlobalStateContextValue = {
        user, garments, looks, planner, trips, isLoading,
        setUser,
        handleAuthSuccess, handleMoodChange, handleUpdateUser,
        addGarment, removeGarment, updateGarment, copyProductToWardrobe,
        saveLook, deleteLook,
        updatePlannerEntry,
        addTrip, deleteTrip, updateTrip,
    };

    return (
        <GlobalStateContext.Provider value={value}>
            {children}
        </GlobalStateContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useGlobalState = (): GlobalStateContextValue => {
    const ctx = useContext(GlobalStateContext);
    if (!ctx) {
        throw new Error('useGlobalState must be used inside <GlobalStateProvider>');
    }
    return ctx;
};
