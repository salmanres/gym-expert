/**
 * Consistent Date Formatter for Gym Chalak Application
 * Ensures all dates are formatted strictly as DD/MM/YYYY
 */

export function formatDate(dateInput, fallback = '') {
    if (!dateInput) return fallback;
    try {
        const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
        if (!d || isNaN(d.getTime())) return fallback;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return fallback;
    }
}

export function formatDateTime(dateInput, fallback = '') {
    if (!dateInput) return fallback;
    try {
        const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
        if (!d || isNaN(d.getTime())) return fallback;
        const dateStr = formatDate(d);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} ${timeStr}`;
    } catch {
        return fallback;
    }
}

export default formatDate;
