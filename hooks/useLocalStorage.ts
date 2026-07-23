import { useEffect } from 'react';

/**
 * Hook para guardar datos automáticamente a localStorage
 */
export const useLocalStorage = <T,>(key: string, value: T) => {
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to localStorage (${key}):`, error);
    }
  }, [key, value]);
};

/**
 * Cargar datos de localStorage con fallback
 */
export const loadFromLocalStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Failed to load from localStorage (${key}):`, error);
    return fallback;
  }
};

/**
 * Limpiar datos de localStorage
 */
export const clearLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear localStorage (${key}):`, error);
  }
};
