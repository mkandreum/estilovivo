/**
 * Fecha local en formato YYYY-MM-DD.
 * No usar `toISOString().split('T')[0]`: convierte a UTC y en España
 * devuelve el día anterior para fechas a medianoche / primeras horas.
 */
export const toLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Parsea YYYY-MM-DD como fecha local (mediodía, inmune a cambios de horario). */
export const parseLocalDate = (s: string): Date => new Date(`${s}T12:00:00`);
