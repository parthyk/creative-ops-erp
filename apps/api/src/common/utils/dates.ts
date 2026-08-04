export type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7; // Monday start
  return startOfDay(addDays(d, -day));
};

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
export const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
export const endOfQuarter = (d: Date) => endOfMonth(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 2, 1));
export const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

export function periodRange(period: Period, ref: Date = new Date()): { from: Date; to: Date } {
  switch (period) {
    case 'today':
      return { from: startOfDay(ref), to: endOfDay(ref) };
    case 'week': {
      const s = startOfWeek(ref);
      return { from: s, to: endOfDay(addDays(s, 6)) };
    }
    case 'month':
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case 'quarter':
      return { from: startOfQuarter(ref), to: endOfQuarter(ref) };
    case 'year':
      return { from: startOfYear(ref), to: endOfYear(ref) };
  }
}

export function periodLabel(period: Period): string {
  switch (period) {
    case 'today': return 'Today';
    case 'week': return 'This week';
    case 'month': return 'This month';
    case 'quarter': return 'This quarter';
    case 'year': return 'This year';
  }
}

export function isIsoDate(v: string): boolean {
  return !isNaN(Date.parse(v));
}
