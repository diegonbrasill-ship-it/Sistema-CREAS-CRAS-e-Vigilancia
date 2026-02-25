// backend/src/seed.ts
import pool from "./db";

// Gerador de dados fictícios para a tabela de casos
export function generateCasosMock(count: number) {
    const bairrosPatos = ["Jatobá", "Belo Horizonte", "Liberdade", "Santo Antônio", "Maternidade", "Centro"];
    const nomes = ["Maria Silva", "José Santos", "Ana Oliveira", "João Paulo", "Francisca Ferreira", "Antônio Carlos", "Luciana Lima"];
    const tecnicos = ["Fernanda Costa", "Carlos Souza", "Aline Mendes"];
    const tiposViolencia = ["Física", "Psicológica", "Negligência", "Patrimonial", "Sexual"];
    
    const casos = [];

    for (let i = 1; i <= count; i++) {
        // Gera CPF e NIS pseudo-aleatórios em formato de string
        const cpf = `123.${456 + i}.${789 - i}-${String(i).padStart(2, '0')}`;
        const nis = `123456789${String(i).padStart(2, '0')}`;

        const dados_completos = {
            data_cad: new Date().toISOString().split('T')[0], // Pega a data atual no formato YYYY-MM-DD
            tec_ref: tecnicos[i % tecnicos.length],
            tipo_violencia: tiposViolencia[i % tiposViolencia.length],
            local_ocorrencia: i % 2 === 0 ? "Residência" : "Via Pública",
            nome: nomes[i % nomes.length],
            cpf: cpf,
            nis: nis,
            idade: String(20 + (i % 40)), // Idades variando entre 20 e 59 anos
            sexo: i % 2 === 0 ? "Feminino" : "Masculino",
            corEtnia: i % 3 === 0 ? "Parda" : (i % 2 === 0 ? "Branca" : "Preta"),
            bairro: bairrosPatos[i % bairrosPatos.length],
            escolaridade: "Ensino Fundamental Incompleto",
            rendaFamiliar: "Até 1 Salário Mínimo",
            recebePBF: i % 2 === 0 ? "Sim" : "Não",
            recebeBPC: "Não",
            recebeBE: "Não",
            membrosCadUnico: "Sim",
            membroPAI: "Não",
            composicaoFamiliar: "Monoparental Feminina",
            tipoMoradia: "Própria",
            referenciaFamiliar: "Mãe",
            membroCarcerario: "Não",
            membroSocioeducacao: "Não",
            vitimaPCD: i % 10 === 0 ? "Sim" : "Não", // Aproximadamente 1 a cada 10
            vitimaPCDDetalhe: i % 10 === 0 ? "Deficiência Intelectual" : "",
            tratamentoSaude: "Sim",
            tratamentoSaudeDetalhe: "UBS local",
            dependeFinanceiro: "Sim",
            encaminhamento: "CRAS",
            encaminhamentoDetalhe: "Acompanhamento PAIF",
            qtdAtendimentos: String((i % 5) + 1), // Varia de 1 a 5 atendimentos
            encaminhadaSCFV: "Sim",
            inseridoPAEFI: "Sim",
            confirmacaoViolencia: "Sim",
            canalDenuncia: "Disque 100",
            notificacaoSINAM: "Sim",
            reincidente: i % 4 === 0 ? "Sim" : "Não"
        };

        casos.push({
            data_cad: dados_completos.data_cad,
            tec_ref: dados_completos.tec_ref,
            nome: dados_completos.nome,
            status: "Ativo",
            dados_completos: JSON.stringify(dados_completos), // Necessário converter para string para a coluna JSONB
            user_id: 1, // Fixado conforme solicitado
            unit_id: 1  // Fixado conforme solicitado
        });
    }

    return casos;
}

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🌱 Iniciando o seed exclusivo da tabela Casos...");

        // Defina a quantidade de casos que deseja gerar aqui
        const casosParaInserir = generateCasosMock(20); 
        
        for (const caso of casosParaInserir) {
            await client.query(`
                INSERT INTO casos (data_cad, tec_ref, nome, status, dados_completos, user_id, unit_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                caso.data_cad, 
                caso.tec_ref, 
                caso.nome, 
                caso.status, 

                caso.dados_completos, 
                caso.user_id, 
                caso.unit_id
            ]);
        }
        console.log(`✅ Foram inseridos ${casosParaInserir.length} casos fictícios.`);

        console.log("🚀 Seed finalizado com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao rodar o seed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

seed();