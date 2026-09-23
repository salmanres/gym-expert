/**
 * Consistent Date Formatter for Gym Chalak Application
 * Ensures all dates are formatted strictly as DD/MM/YYYY without UTC day-shifts
 */

export function formatDate(dateInput, fallback = '') {
    if (!dateInput) return fallback;
    try {
        if (typeof dateInput === 'string') {
            const trimmed = dateInput.trim();
            // If already formatted as DD/MM/YYYY, return as is
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
                return trimmed;
            }
            // If pure date string YYYY-MM-DD (e.g. from input type="date")
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [y, m, d] = trimmed.split('-');
                return `${d}/${m}/${y}`;
            }
        }
        // For Date objects, timestamps, or ISO strings (with T or Z), parse in local timezone
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

export function toInputDateFormat(dateInput) {
    if (!dateInput) return '';
    try {
        if (typeof dateInput === 'string') {
            const trimmed = dateInput.trim();
            // If already YYYY-MM-DD, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return trimmed;
            }
            // If DD/MM/YYYY, convert to YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
                const [d, m, y] = trimmed.split('/');
                return `${y}-${m}-${d}`;
            }
        }
        const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
        if (!d || isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
}

export function getTodayInputDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

export function formatTime(timeInput, fallback = '') {
    if (!timeInput) return fallback;
    try {
        if (typeof timeInput === 'string') {
            const trimmed = timeInput.trim();
            // Matches HH:mm or HH:mm:ss
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
                const parts = trimmed.split(':');
                let hours = parseInt(parts[0], 10);
                const minutes = parts[1];
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12; // 0 becomes 12
                const hoursStr = String(hours).padStart(2, '0');
                return `${hoursStr}:${minutes} ${ampm}`;
            }
        }
        const d = typeof timeInput === 'string' || typeof timeInput === 'number' ? new Date(timeInput) : timeInput;
        if (!d || isNaN(d.getTime())) return fallback;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return fallback;
    }
}

export default formatDate;
