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

/**
 * Formata uma data para o input HTML (YYYY-MM-DD).
 */
export const formatDateForInput = (date: Date | string): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};