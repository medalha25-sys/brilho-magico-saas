export type DurationUnit = 'MINUTOS' | 'HORAS' | 'DIAS';

/**
 * Converte um valor com unidade (Minutos, Horas, Dias) para a quantidade total de minutos inteiros.
 */
export function durationToMinutes(value: number | string, unit: DurationUnit): number {
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num) || num <= 0) return 0;

  switch (unit) {
    case 'HORAS':
      return Math.round(num * 60);
    case 'DIAS':
      return Math.round(num * 1440);
    case 'MINUTOS':
    default:
      return Math.round(num);
  }
}

/**
 * Converte minutos armazenados no banco para o par { value, unit } mais amigável na interface.
 * Exemplos:
 * - 1440 min -> { value: 1, unit: 'DIAS' }
 * - 2880 min -> { value: 2, unit: 'DIAS' }
 * - 60 min -> { value: 1, unit: 'HORAS' }
 * - 120 min -> { value: 2, unit: 'HORAS' }
 * - 240 min -> { value: 4, unit: 'HORAS' }
 * - 45 min -> { value: 45, unit: 'MINUTOS' }
 * - 75 min -> { value: 75, unit: 'MINUTOS' }
 */
export function minutesToDuration(minutes: number): { value: number; unit: DurationUnit } {
  if (!minutes || minutes <= 0) {
    return { value: 30, unit: 'MINUTOS' };
  }

  // Se for múltiplo exato de 1440 minutos (1 dia completo ou mais)
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'DIAS' };
  }

  // Se for múltiplo exato de 60 minutos (1 hora completa ou mais)
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'HORAS' };
  }

  // Caso padrão em minutos (ex: 30, 45, 75 min)
  return { value: minutes, unit: 'MINUTOS' };
}

/**
 * Formata a duração em minutos para uma string legível na interface (ex: cards, agendamento, resumo).
 * Exemplos:
 * - 30 -> "30 min"
 * - 45 -> "45 min"
 * - 60 -> "1h" ou "1 hora"
 * - 75 -> "1h 15min"
 * - 120 -> "2h" ou "2 horas"
 * - 240 -> "4h" ou "4 horas"
 * - 1440 -> "1 dia"
 * - 2880 -> "2 dias"
 */
export function formatDurationDisplay(minutes: number, verbose: boolean = false): string {
  if (!minutes || minutes <= 0) return '0 min';

  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? '1 dia' : `${days} dias`;
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (remaining === 0) {
      if (verbose) {
        return hours === 1 ? '1 hora' : `${hours} horas`;
      }
      return `${hours}h`;
    }
    return `${hours}h ${remaining}min`;
  }

  if (verbose) {
    return minutes === 1 ? '1 minuto' : `${minutes} min`;
  }
  return `${minutes} min`;
}

/**
 * Retorna o rótulo da unidade com pluralização correta de acordo com o valor informado.
 */
export function getUnitLabel(unit: DurationUnit, value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  const isSingular = !isNaN(num) && num === 1;

  switch (unit) {
    case 'HORAS':
      return isSingular ? 'Hora' : 'Horas';
    case 'DIAS':
      return isSingular ? 'Dia' : 'Dias';
    case 'MINUTOS':
    default:
      return isSingular ? 'Minuto' : 'Minutos';
  }
}
