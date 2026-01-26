import { format, parseISO } from 'date-fns';

/**
 * Standard timezone for the system: America/Sao_Paulo (UTC-3)
 */
const SYSTEM_TIMEZONE = 'America/Cuiaba';

/**
 * Formats an ISO date string or Date object to a standardized display string
 * in the system's fixed timezone (Brasilia/Sao Paulo).
 * 
 * @param date ISO string or Date object
 * @param formatStr date-fns compatible format string
 * @returns Formatted string
 */
export function formatInSystemTime(date: string | Date, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? parseISO(date) : date;

    // Check if valid
    if (isNaN(d.getTime())) return '-';

    // Use Intl to get the date in the specific timezone
    // Note: We format to a parts object to reconstruct exactly as formatStr requires
    // But since date-fns format is powerful, we can also just use a helper to shift the time
    // For a cleaner solution without external libs, we use Intl.DateTimeFormat

    try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: SYSTEM_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(d);
        const map: Record<string, string> = {};
        parts.forEach(p => map[p.type] = p.value);

        // Simple mapping for common formats
        if (formatStr === 'dd/MM/yyyy HH:mm') {
            return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}`;
        }
        if (formatStr === 'dd/MM/yyyy') {
            return `${map.day}/${map.month}/${map.year}`;
        }
        if (formatStr === 'HH:mm') {
            return `${map.hour}:${map.minute}`;
        }

        // Fallback to simple format if complex string provided
        return format(d, formatStr);
    } catch (e) {
        console.error("Error formatting date in system timezone", e);
        return format(d, formatStr);
    }
}
