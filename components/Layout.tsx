import React, { useMemo } from 'react';
import { Home, Shirt, PlusSquare, Users, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'wardrobe', icon: Shirt, label: 'Armario' },
    { id: 'create', icon: PlusSquare, label: 'Crear' },
    // Planner moved to Profile
    { id: 'community', icon: Users, label: 'Social' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  // Calculate index for the sliding animation
  const activeIndex = useMemo(() => navItems.findIndex(item => item.id === activeTab), [activeTab, navItems]);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 shadow-2xl overflow-hidden relative border-x border-gray-200 font-sans">
      {/* Main Content Area - Increased bottom padding for floating nav */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {children}
      </main>

      {/* Floating Glass Navigation */}
      <div className="absolute bottom-6 left-0 right-0 px-3 z-50 flex justify-center">
        <nav className="relative w-full max-w-[390px] h-[80px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] rounded-[32px] flex items-center p-1.5">
            
            {/* Sliding Pill Indicator - Only visible if active tab is in the menu */}
            {activeIndex !== -1 && (
                <div 
                    className="absolute top-1.5 bottom-1.5 rounded-[26px] bg-primary shadow-lg shadow-primary/25 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{
                        left: `calc(0.375rem + ${activeIndex * (100 / navItems.length)}% - ${(activeIndex * 0.75) / navItems.length}rem)`, 
                        width: `calc((100% - 0.75rem) / ${navItems.length})`
                    }}
                />
            )}

            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className="relative z-10 flex-1 h-full flex flex-col items-center justify-center group outline-none gap-1.5"
                    >
                        <div className={`transition-all duration-300 transform ${isActive ? '-translate-y-0.5' : 'translate-y-0.5'}`}>
                            <Icon 
                                size={22} 
                                strokeWidth={isActive ? 2.5 : 2} 
                                className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary/70'}`} 
                            />
                        </div>
                        
                        <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${isActive ? 'text-white/95' : 'text-gray-400'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;