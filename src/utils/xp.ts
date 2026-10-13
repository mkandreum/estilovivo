/**
 * Progreso de nivel: misma fórmula que el servidor (server/src/gamificationSystem.ts).
 * XP acumulado para completar el nivel n = 100 * n * (n + 1) / 2.
 */
const cumulativeXpForLevel = (level: number) => (100 * level * (level + 1)) / 2;

export const xpProgress = (xp: number = 0, level: number = 1) => {
  const start = level <= 1 ? 0 : cumulativeXpForLevel(level - 1);
  const end = cumulativeXpForLevel(level);
  const needed = Math.max(1, end - start);
  const current = Math.min(needed, Math.max(0, xp - start));
  return { current, needed, percentage: Math.round((current / needed) * 100), toNext: needed - current };
};
