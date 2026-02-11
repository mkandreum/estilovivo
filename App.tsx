import React, { useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import CreateLook from './pages/CreateLook';
import Planner from './pages/Planner';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Suitcase from './pages/Suitcase';
import { UserState, Garment, Look, PlannerEntry } from './types';

// Initial Mock Data
const initialGarments: Garment[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `g-${i}`,
  imageUrl: `https://picsum.photos/seed/${i + 100}/300/400`,
  type: i % 4 === 0 ? 'top' : i % 4 === 1 ? 'bottom' : i % 4 === 2 ? 'shoes' : 'outerwear',
  color: 'varios',
  season: 'all',
  usageCount: Math.floor(Math.random() * 10),
  forSale: false,
  price: 0
}));

const initialLooks: Look[] = [
  { id: 'l-1', name: 'Oficina Casual', garmentIds: ['g-0', 'g-1', 'g-2'], tags: ['work'], createdAt: new Date().toISOString() },
  { id: 'l-2', name: 'Domingo Relax', garmentIds: ['g-4', 'g-5'], tags: ['chill'], createdAt: new Date().toISOString() }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  
  // GLOBAL STATE
  const [user, setUser] = useState<UserState>({
    name: 'Sofia',
    mood: null,
    cycleTracking: false,
    musicSync: false,
    bio: 'Amante de la moda sostenible 🌱'
  });

  const [garments, setGarments] = useState<Garment[]>(initialGarments);
  const [looks, setLooks] = useState<Look[]>(initialLooks);
  const [planner, setPlanner] = useState<PlannerEntry[]>([
    { date: '2023-10-12', lookId: 'l-1', eventNote: 'Reunión Marketing' }
  ]);

  // HANDLERS
  const handleMoodChange = (mood: string) => setUser({ ...user, mood });
  
  const addGarment = (garment: Garment) => setGarments([garment, ...garments]);
  const removeGarment = (id: string) => setGarments(garments.filter(g => g.id !== id));
  
  // Update a garment (e.g., mark as for sale)
  const updateGarment = (updatedGarment: Garment) => {
    setGarments(garments.map(g => g.id === updatedGarment.id ? updatedGarment : g));
  };

  const saveLook = (look: Look) => {
    setLooks([look, ...looks]);
    setActiveTab('wardrobe'); // Or stay? Let's go to wardrobe/looks view usually
  };

  const updatePlanner = (entry: PlannerEntry) => {
    const existing = planner.findIndex(p => p.date === entry.date);
    if (existing >= 0) {
      const newPlanner = [...planner];
      newPlanner[existing] = entry;
      setPlanner(newPlanner);
    } else {
      setPlanner([...planner, entry]);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home user={user} onMoodChange={handleMoodChange} onNavigate={setActiveTab} />;
      case 'wardrobe':
        return (
            <Wardrobe 
                garments={garments} 
                onAddGarment={addGarment} 
                onRemoveGarment={removeGarment}
                onUpdateGarment={updateGarment}
            />
        );
      case 'create':
        return <CreateLook garments={garments} onSaveLook={saveLook} />;
      case 'planner':
        return <Planner looks={looks} plannerEntries={planner} onUpdateEntry={updatePlanner} />;
      case 'community':
        return <Community />;
      case 'profile':
        return (
            <Profile 
                user={user} 
                onUpdateUser={setUser} 
                garmentCount={garments.length} 
                lookCount={looks.length}
                plannerEntries={planner}
                looks={looks}
                onNavigate={setActiveTab}
            />
        );
      case 'suitcase':
        return <Suitcase />;
      default:
        return <Home user={user} onMoodChange={handleMoodChange} onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;