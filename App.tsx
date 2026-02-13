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

          if (fetchedGarments.status === 'fulfilled') setGarments(fetchedGarments.value);
          if (fetchedLooks.status === 'fulfilled') setLooks(fetchedLooks.value);
          if (fetchedPlanner.status === 'fulfilled') setPlanner(fetchedPlanner.value);
          if (fetchedTrips.status === 'fulfilled') setTrips(fetchedTrips.value);
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
    try {
      const saved = await api.addGarment({
        file,
        name: garment.name || garment.type,
        category: garment.type,
        color: garment.color,
        season: garment.season,
      });
      setGarments([saved, ...garments]);
    } catch (error) {
      console.error("Error adding garment:", error);
      // Fallback: add locally
      setGarments([garment, ...garments]);
    }
  };

  const removeGarment = async (id: string) => {
    setGarments(prev => prev.filter(g => g.id !== id));
    try {
      await api.deleteGarment(id);
    } catch (error) {
      console.error("Error deleting garment:", error);
    }
  };

  const updateGarment = async (g: Garment) => {
    setGarments(prev => prev.map(item => item.id === g.id ? g : item));
    try {
      await api.updateGarment(g.id, g);
    } catch (error) {
      console.error("Error updating garment:", error);
    }
  };

  const saveLook = async (look: Look) => {
    try {
      const savedLook = await api.saveLook(look);
      setLooks([savedLook, ...looks]);
      setActiveTab('wardrobe');
    } catch (error) {
      console.error("Error saving look:", error);
    }
  };

  const deleteLook = async (id: string) => {
    setLooks(prev => prev.filter(l => l.id !== id));
    try {
      await api.deleteLook(id);
    } catch (error) {
      console.error("Error deleting look:", error);
    }
  };

  const updatePlannerEntry = async (entry: PlannerEntry) => {
    try {
      const saved = await api.updatePlanner(entry);
      setPlanner(prev => {
        const filtered = prev.filter(p => p.date !== entry.date);
        return [...filtered, saved];
      });
    } catch (error) {
      console.error("Error updating planner:", error);
      // Fallback local
      setPlanner(prev => [...prev.filter(e => e.date !== entry.date), entry]);
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
            onAddTrip={async (newTrip) => {
              try {
                const saved = await api.saveTrip(newTrip);
                setTrips(prev => [saved, ...prev]);
              } catch (error) {
                console.error("Error saving trip:", error);
                setTrips(prev => [newTrip, ...prev]);
              }
            }}
            onDeleteTrip={async (id) => {
              setTrips(prev => prev.filter(t => t.id !== id));
              try {
                await api.deleteTrip(id);
              } catch (error) {
                console.error("Error deleting trip:", error);
              }
            }}
            onUpdateTrip={async (trip) => {
              setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
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
