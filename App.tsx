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
          const savedUser = localStorage.getItem('beyour_user');
          if (savedUser) setUser(JSON.parse(savedUser));

          // Fetch data with individual error handling
          try {
            const fetchedGarments = await api.getGarments();
            setGarments(fetchedGarments);
          } catch (error) {
            console.warn("Could not load garments:", error);
            setGarments([]);
          }

          try {
            const fetchedLooks = await api.getLooks();
            setLooks(fetchedLooks);
          } catch (error) {
            console.warn("Could not load looks:", error);
            setLooks([]);
          }

          try {
            const fetchedPlanner = await api.getPlanner('me');
            setPlanner(fetchedPlanner);
          } catch (error) {
            console.warn("Could not load planner:", error);
            setPlanner([]);
          }

          try {
            const fetchedTrips = await api.getTrips('me');
            setTrips(fetchedTrips);
          } catch (error) {
            console.warn("Could not load trips:", error);
            setTrips([]);
          }
        } catch (error) {
          console.error("Critical error during initialization:", error);
          // Only logout on critical errors (like invalid user data)
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
  const handleMoodChange = (mood: string) => {
    if (user) {
      setUser({ ...user, mood: mood as any });
    }
  };

  const addGarment = async (garment: Garment) => {
    setGarments([garment, ...garments]);
  };

  const saveLook = async (look: Look) => {
    try {
      const savedLook = await api.saveLook(look, user.id || 'me');
      setLooks([savedLook, ...looks]);
      setActiveTab('wardrobe');
    } catch (error) {
      console.error("Error saving look:", error);
    }
  };

  const updatePlanner = (entry: PlannerEntry) => {
    const newPlanner = [...planner.filter(e => e.date !== entry.date), entry];
    setPlanner(newPlanner);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <Home user={user} looks={looks} onMoodChange={handleMoodChange} onNavigate={setActiveTab} plannerEntries={planner} garments={garments} />;
      case 'wardrobe':
        return (
          <Wardrobe
            garments={garments}
            onAddGarment={addGarment}
            onRemoveGarment={async (id) => {
              // TODO: api call for delete
              setGarments(prev => prev.filter(g => g.id !== id));
            }}
            onUpdateGarment={async (g) => {
              // TODO: api call for update
              setGarments(prev => prev.map(item => item.id === g.id ? g : item));
            }}
            looks={looks}
            planner={planner}
            onUpdatePlanner={updatePlanner}
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
            onUpdateEntry={async (entry) => {
              const saved = await api.updatePlanner('me', entry);
              setPlanner(prev => {
                const filtered = prev.filter(p => p.date !== entry.date);
                return [...filtered, saved];
              });
            }}
          />
        );
      case 'community':
        return <Community />;
      case 'profile':
        return <Profile user={user} plannerEntries={planner} looks={looks} onUpdateUser={setUser} garments={garments} />;
      case 'suitcase':
        return (
          <Suitcase
            trips={trips}
            onAddTrip={async (newTrip) => {
              const saved = await api.saveTrip('me', newTrip);
              setTrips(prev => [saved, ...prev]);
            }}
            onDeleteTrip={async (id) => {
              // api.deleteTrip(id)
              setTrips(prev => prev.filter(t => t.id !== id));
            }}
            onUpdateTrip={async (trip) => {
              // api.updateTrip(trip)
              setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
            }}
          />
        );
      default:
        return <Home user={user} looks={looks} onMoodChange={handleMoodChange} onNavigate={setActiveTab} plannerEntries={planner} garments={garments} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActivePage()}
    </Layout>
  );
};

export default App;