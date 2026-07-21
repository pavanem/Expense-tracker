import { format, parseISO } from 'date-fns';

export const formatDate = (isoDate, pattern = 'dd MMM yyyy') => {
  if (!isoDate) return '';
  try {
    const date = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
    return format(date, pattern);
  } catch {
    return isoDate;
  }
};

export const toIsoDate = (date) => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return format(date, 'yyyy-MM-dd');
};

export const todayIso = () => format(new Date(), 'yyyy-MM-dd');
