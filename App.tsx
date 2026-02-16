import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import CreateLook from './pages/CreateLook';
import Planner from './pages/Planner';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Suitcase from './pages/Suitcase';
import AuthPage from './pages/AuthPage';
import { UserState, Garment, Look, PlannerEntry, Trip } from './types';
import { api } from './services/api';
import { useLocalStorage, loadFromLocalStorage } from './hooks/useLocalStorage';

// Theme configurations per gender
const THEMES = {
  female: {
    primary: '#ec4899',
    primaryLight: '#fbcfe8',
    primaryDark: '#be185d',
    accent: '#14b8a6',
    secondary: '#f97316',
    name: 'Rosa Femenino'
  },
  male: {
    primary: '#1e40af',
    primaryLight: '#bfdbfe',
    primaryDark: '#001a4d',
    accent: '#334155',
    secondary: '#1f2937',
    name: 'Azul Masculino'
  },
  other: {
    primary: '#16a34a',
    primaryLight: '#dcfce7',
    primaryDark: '#14532d',
    accent: '#8b5cf6',
    secondary: '#6366f1',
    name: 'Verde Neutral'
  }
};

const applyTheme = (gender?: string) => {
  const genderKey = (gender as keyof typeof THEMES) || 'female';
  const theme = THEMES[genderKey] || THEMES.female;
  
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-light', theme.primaryLight);
  root.style.setProperty('--color-primary-dark', theme.primaryDark);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-secondary', theme.secondary);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);

  // GLOBAL STATE
  const [user, setUser] = useState<UserState | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [planner, setPlanner] = useState<PlannerEntry[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  // Fetch initial data & check auth
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('beyour_token');
      if (token) {
        try {
          // Fetch user from API for fresh data
          let userData: UserState;
          try {
            userData = await api.getMe();
            setUser(userData);
            localStorage.setItem('beyour_user', JSON.stringify(userData));
          } catch {
            const savedUser = localStorage.getItem('beyour_user');
            if (savedUser) {
              userData = JSON.parse(savedUser);
              setUser(userData);
            } else {
              throw new Error('No user data');
            }
          }

          // Fetch data in parallel
          const [fetchedGarments, fetchedLooks, fetchedPlanner, fetchedTrips] = await Promise.allSettled([
            api.getGarments(),
            api.getLooks(),
            api.getPlanner(),
            api.getTrips(),
          ]);

          // Use API results if available, fallback to localStorage
          if (fetchedGarments.status === 'fulfilled') {
            setGarments(fetchedGarments.value);
            localStorage.setItem('beyour_garments', JSON.stringify(fetchedGarments.value));
          } else {
            const saved = loadFromLocalStorage('beyour_garments', []);
            setGarments(saved);
          }

          if (fetchedLooks.status === 'fulfilled') {
            setLooks(fetchedLooks.value);
            localStorage.setItem('beyour_looks', JSON.stringify(fetchedLooks.value));
          } else {
            const saved = loadFromLocalStorage('beyour_looks', []);
            setLooks(saved);
          }

          if (fetchedPlanner.status === 'fulfilled') {
            setPlanner(fetchedPlanner.value);
            localStorage.setItem('beyour_planner', JSON.stringify(fetchedPlanner.value));
          } else {
            const saved = loadFromLocalStorage('beyour_planner', []);
            setPlanner(saved);
          }

          if (fetchedTrips.status === 'fulfilled') {
            setTrips(fetchedTrips.value);
            localStorage.setItem('beyour_trips', JSON.stringify(fetchedTrips.value));
          } else {
            const saved = loadFromLocalStorage('beyour_trips', []);
            setTrips(saved);
          }
        } catch (error) {
          console.error("Critical error during initialization:", error);
          localStorage.removeItem('beyour_token');
          localStorage.removeItem('beyour_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleAuthSuccess = (userData: UserState) => {
    setUser(userData);
    localStorage.setItem('beyour_user', JSON.stringify(userData));
    window.location.reload();
  };

  // Apply theme when user changes
  useEffect(() => {
    if (user?.gender) {
      applyTheme(user.gender);
    } else {
      // Default theme if no user
      applyTheme('female');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // HANDLERS
  const handleMoodChange = async (mood: string) => {
    const updated = { ...user, mood: mood };
    setUser(updated);
    try {
      await api.updateProfile({ mood });
    } catch (e) {
      console.warn('Failed to save mood:', e);
    }
  };

  const addGarment = async (garment: Garment, file?: File) => {
    const newGarments = [garment, ...garments];
    setGarments(newGarments);
    localStorage.setItem('beyour_garments', JSON.stringify(newGarments));
    try {
      const saved = await api.addGarment({
        file,
        name: garment.name || garment.type,
        category: garment.type,
        color: garment.color,
        season: garment.season,
      });
      setGarments([saved, ...garments]);
      localStorage.setItem('beyour_garments', JSON.stringify([saved, ...garments]));
    } catch (error) {
      console.error("Error adding garment:", error);
    }
  };

  const removeGarment = async (id: string) => {
    const filtered = garments.filter(g => g.id !== id);
    setGarments(filtered);
    localStorage.setItem('beyour_garments', JSON.stringify(filtered));
    try {
      await api.deleteGarment(id);
    } catch (error) {
      console.error("Error deleting garment:", error);
    }
  };

  const updateGarment = async (g: Garment) => {
    const updated = garments.map(item => item.id === g.id ? g : item);
    setGarments(updated);
    localStorage.setItem('beyour_garments', JSON.stringify(updated));
    try {
      await api.updateGarment(g.id, g);
    } catch (error) {
      console.error("Error updating garment:", error);
    }
  };

  const saveLook = async (look: Look) => {
    const newLooks = [look, ...looks];
    setLooks(newLooks);
    localStorage.setItem('beyour_looks', JSON.stringify(newLooks));
    try {
      const savedLook = await api.saveLook(look);
      const updated = [savedLook, ...looks];
      setLooks(updated);
      localStorage.setItem('beyour_looks', JSON.stringify(updated));
      setActiveTab('wardrobe');
    } catch (error) {
      console.error("Error saving look:", error);
      setActiveTab('wardrobe');
    }
  };

  const deleteLook = async (id: string) => {
    const filtered = looks.filter(l => l.id !== id);
    setLooks(filtered);
    localStorage.setItem('beyour_looks', JSON.stringify(filtered));
    try {
      await api.deleteLook(id);
    } catch (error) {
      console.error("Error deleting look:", error);
    }
  };

  const updatePlannerEntry = async (entry: PlannerEntry) => {
    const filtered = planner.filter(p => p.date !== entry.date);
    const updated = [...filtered, entry];
    setPlanner(updated);
    localStorage.setItem('beyour_planner', JSON.stringify(updated));
    try {
      const saved = await api.updatePlanner(entry);
      const final = [...planner.filter(p => p.date !== entry.date), saved];
      setPlanner(final);
      localStorage.setItem('beyour_planner', JSON.stringify(final));
    } catch (error) {
      console.error("Error updating planner:", error);
    }
  };

  const handleUpdateUser = async (updatedUser: UserState) => {
    setUser(updatedUser);
    localStorage.setItem('beyour_user', JSON.stringify(updatedUser));
    try {
      await api.updateProfile(updatedUser);
    } catch (error) {
      console.warn("Error saving profile:", error);
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            user={user}
            looks={looks}
            onMoodChange={handleMoodChange}
            onNavigate={setActiveTab}
            plannerEntries={planner}
            garments={garments}
          />
        );
      case 'wardrobe':
        return (
          <Wardrobe
            garments={garments}
            onAddGarment={addGarment}
            onRemoveGarment={removeGarment}
            onUpdateGarment={updateGarment}
            looks={looks}
            planner={planner}
            onUpdatePlanner={updatePlannerEntry}
            onNavigate={setActiveTab}
          />
        );
      case 'create':
        return <CreateLook garments={garments} onSaveLook={saveLook} />;
      case 'planner':
        return (
          <Planner
            looks={looks}
            plannerEntries={planner}
            onUpdateEntry={updatePlannerEntry}
          />
        );
      case 'community':
        return <Community user={user} />;
      case 'profile':
        return (
          <Profile
            user={user}
            plannerEntries={planner}
            looks={looks}
            onUpdateUser={handleUpdateUser}
            garments={garments}
            onNavigate={setActiveTab}
          />
        );
      case 'suitcase':
        return (
          <Suitcase
            trips={trips}
            garments={garments}
            onAddTrip={async (newTrip) => {
              const newTrips = [newTrip, ...trips];
              setTrips(newTrips);
              localStorage.setItem('beyour_trips', JSON.stringify(newTrips));
              try {
                const saved = await api.saveTrip(newTrip);
                const updated = [saved, ...trips];
                setTrips(updated);
                localStorage.setItem('beyour_trips', JSON.stringify(updated));
              } catch (error) {
                console.error("Error saving trip:", error);
              }
            }}
            onDeleteTrip={async (id) => {
              const filtered = trips.filter(t => t.id !== id);
              setTrips(filtered);
              localStorage.setItem('beyour_trips', JSON.stringify(filtered));
              try {
                await api.deleteTrip(id);
              } catch (error) {
                console.error("Error deleting trip:", error);
              }
            }}
            onUpdateTrip={async (trip) => {
              const updated = trips.map(t => t.id === trip.id ? trip : t);
              setTrips(updated);
              localStorage.setItem('beyour_trips', JSON.stringify(updated));
              try {
                await api.updateTrip(trip);
              } catch (error) {
                console.error("Error updating trip:", error);
              }
            }}
          />
        );
      default:
        return (
          <Home
            user={user}
            looks={looks}
            onMoodChange={handleMoodChange}
            onNavigate={setActiveTab}
            plannerEntries={planner}
            garments={garments}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActivePage()}
    </Layout>
  );
};

export default App;
