export interface Garment {
  id: string;
  imageUrl: string;
  type: string;
  color: string;
  season: 'summer' | 'winter' | 'all' | 'transition';
  usageCount: number;
  lastWorn?: string;
  forSale?: boolean;
  price?: number;
}

export interface Look {
  id: string;
  name: string;
  garmentIds: string[]; // IDs of garments in this look
  tags: string[];
  mood?: string;
  createdAt: string;
  isPublic?: boolean;
}

export interface PlannerEntry {
  date: string; // "YYYY-MM-DD"
  lookId: string | null;
  eventId?: string;
  eventNote?: string;
}

export interface UserState {
  id?: string;
  email?: string;
  name: string;
  mood: string | null;
  cycleTracking: boolean;
  musicSync: boolean;
  bio: string;
  avatar?: string;
}

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  colorClass: string;
}

export interface TripItem {
  id: string;
  label: string;
  checked: boolean;
  isEssential: boolean;
}

export interface Trip {
  id: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  items: TripItem[];
}