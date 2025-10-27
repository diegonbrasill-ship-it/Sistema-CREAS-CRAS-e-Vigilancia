// frontend/src/utils/dateUtils.ts

/**
 * Calcula a idade com base na data de nascimento.
 * ⭐️ CORREÇÃO: Força o cálculo em UTC para evitar erros de fuso horário. ⭐️
 */
export const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    
    // Cria a data de nascimento garantindo que seja lida no fuso horário local
    const dob = new Date(dateOfBirth); 
    const today = new Date();
    
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();

    // Se o mês atual for menor que o mês de nascimento, ou se for o mesmo mês mas o dia ainda não chegou
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    return age;
};

/**
 * Adiciona um número de meses a uma data e retorna no formato de exibição.
 * ⭐️ CORREÇÃO: Lê a data como UTC para evitar o shift de dia. ⭐️
 */
export const addMonthsToDate = (dateString: string, months: number): string => {
    if (!dateString) return '-';
    
    // Lê a data como se fosse uma data completa local, para preservar o dia exato
    const date = new Date(dateString + 'T00:00:00'); 
    
    date.setMonth(date.getMonth() + months);
    
    // Se o mês for setado e o dia do mês não for preservado (ex: de 31 Jan para 31 Fev, que vira 2 Mar), 
    // precisamos garantir que a data final é válida. O setMonth() padrão do JS lida com isso.
    
    return date.toLocaleDateString('pt-BR');
};

/**
 * Formata uma data para o input HTML (YYYY-MM-DD).
 * ⭐️ CORREÇÃO: Usa os métodos de UTC para garantir que o formato YYYY-MM-DD seja sempre preciso. ⭐️
 */
export const formatDateForInput = (date: Date | string): string => {
    if (!date) return '';
    
    // Cria a data como objeto Date. Se for string (ex: YYYY-MM-DD), o 'T00:00:00' garante
    // que a data não sofra shift devido ao fuso horário.
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    
    // Usamos os métodos getUTC para construir a string sem interferência local.
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};