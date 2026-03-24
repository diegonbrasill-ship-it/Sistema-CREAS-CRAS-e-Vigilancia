// frontend/src/utils/dateUtils.ts

/**
 * Calcula a idade com base na data de nascimento.
 */
export const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

/**
 * Adiciona um número de meses a uma data e retorna no formato de exibição.
 */
export const addMonthsToDate = (dateString: string, months: number): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('pt-BR');
};

const formatDateParts = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formata uma data para o input HTML (YYYY-MM-DD) sem deslocar o dia por UTC.
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';

    if (typeof date === 'string') {
        const trimmed = date.trim();
        if (!trimmed) return '';

        const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (dateOnlyMatch) return dateOnlyMatch[1];

        const isoLikeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
        if (isoLikeMatch) return isoLikeMatch[1];

        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? '' : formatDateParts(parsed);
    }

    return Number.isNaN(date.getTime()) ? '' : formatDateParts(date);
};
