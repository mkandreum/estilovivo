import { useMemo } from 'react';
import { Garment, Look } from '../types';

export interface DailyRecommendation {
  occasion: string;
  emoji: string;
  suggestions: Look[];
  reasoning: string;
}

export const useLookRecommender = (looks: Look[], garments: Garment[]) => {
  const recommendations = useMemo((): DailyRecommendation[] => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Ocasiones según hora del día
    const timeOfDay = 
      hour < 9 ? 'morning' :
      hour < 12 ? 'work' :
      hour < 17 ? 'afternoon' :
      hour < 20 ? 'evening' :
      'night';

    const isWeekend = day === 0 || day === 6;

    const recommendations: DailyRecommendation[] = [];

    // 1. Por hora del día
    if (timeOfDay === 'morning') {
      recommendations.push({
        occasion: '☀️ Buenos días',
        emoji: '☀️',
        suggestions: looks.filter(l => l.mood && ['casual', 'cómodo', 'daily'].some(m => l.mood.toLowerCase().includes(m))),
        reasoning: 'Looks cómodos y prácticos para empezar el día'
      });
    } else if (timeOfDay === 'work') {
      recommendations.push({
        occasion: '💼 Trabajo',
        emoji: '💼',
        suggestions: looks.filter(l => l.mood && ['profesional', 'trabajo', 'elegante'].some(m => l.mood.toLowerCase().includes(m))),
        reasoning: 'Looks profesionales para tu jornada laboral'
      });
    } else if (timeOfDay === 'evening') {
      recommendations.push({
        occasion: '🎉 Noche',
        emoji: '🎉',
        suggestions: looks.filter(l => l.mood && ['fiesta', 'noche', 'elegante'].some(m => l.mood.toLowerCase().includes(m))),
        reasoning: 'Looks sofisticados para una noche especial'
      });
    }

    // 2. Patrón por fin de semana
    if (isWeekend) {
      recommendations.push({
        occasion: '🛍️ Fin de semana',
        emoji: '🛍️',
        suggestions: looks.filter(l => l.mood && ['casual', 'cómodo', 'relajado'].some(m => l.mood.toLowerCase().includes(m))),
        reasoning: 'Looks relajados y cómodos para disfrutar el fin de semana'
      });
    }

    // 3. Por prendas más usadas
    if (garments.length > 0) {
      const mostUsed = [...garments].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
      if (mostUsed && looks.length > 0) {
        const looksWithMostUsed = looks.filter(l => 
          l.garments && l.garments.some(g => g.id === mostUsed.id)
        );
        if (looksWithMostUsed.length > 0) {
          recommendations.push({
            occasion: '⭐ Con tu favorita',
            emoji: '⭐',
            suggestions: looksWithMostUsed,
            reasoning: `Combina con "${mostUsed.name}", tu prenda más usada`
          });
        }
      }
    }

    // 4. Looks sin usar
    const unusedLooks = looks.filter(l => !l.createdAt || 
      (Date.now() - new Date(l.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    ).slice(0, 3);
    
    if (unusedLooks.length > 0) {
      recommendations.push({
        occasion: '💡 Retro',
        emoji: '💡',
        suggestions: unusedLooks,
        reasoning: 'Revive estos looks que no has usado recientemente'
      });
    }

    return recommendations.slice(0, 3); // Max 3 recomendaciones
  }, [looks, garments]);

  return { recommendations };
};
