// mockData.ts
type Caso = {
  id: string;
  nome: string;
  idade: string;
  sexo: string;
  escolaridade: string;
  bairro: string;
  tipoViolencia: string;
  confirmacaoViolencia: string;
  reincidente: string;
  encerrado: string;
  dataCad: string;
  tecnico: string;
  recebePBF: string;
  dependeRendaAgressor: string;
  inseridoPAEFI: string;
  familiarBPC: string;
  familiarBE: string;
  familiarPAI: string;
  origemEncaminhamento: string;
  destinoEncaminhamento: string;
};

const STORAGE = "vigilancia_cases_v1";

// Valores possíveis
const nomes = ["Maria", "João", "Ana", "Carlos", "Fernanda", "Pedro", "Juliana", "José", "Clara", "Roberto"];
const sobrenomes = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida"];
const sexos = ["Masculino", "Feminino"];
const escolaridade = [
  "Ensino fundamental incompleto", "Ensino fundamental completo",
  "Ensino Médio incompleto", "Ensino Médio completo",
  "E.J.A", "Superior", "Pós Graduação", "Mestrado"
];
const bairros = ["Centro", "Bela Vista", "Liberdade", "Alto da Boa Vista", "São José", "Santo Antônio", "Mutirão"];
const tiposViolencia = ["Física", "Psicológica", "Sexual", "Negligência", "Financeira"];
const tecnicos = ["Téc. Ana", "Téc. João", "Téc. Beatriz", "Téc. Marcos"];
const encaminhamentos = ["Saúde", "Justiça", "Conselho Tutelar", "Delegacia", "Escola", "Não"];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gerarMockCasos(qtd: number = 40): Caso[] {
  const casos: Caso[] = [];

  for (let i = 0; i < qtd; i++) {
    const nome = `${random(nomes)} ${random(sobrenomes)}`;
    const idade = String(Math.floor(Math.random() * 70) + 5); // 5 a 75 anos
    const sexo = random(sexos);
    const bairro = random(bairros);
    const tipoViolencia = random(tiposViolencia);
    const tecnico = random(tecnicos);

    // Datas dos últimos 6 meses
    const hoje = new Date();
    const diasAtras = Math.floor(Math.random() * 180);
    const dataCad = new Date(hoje.getTime() - diasAtras * 24 * 60 * 60 * 1000).toISOString();

    casos.push({
      id: `${i + 1}`,
      nome,
      idade,
      sexo,
      escolaridade: random(escolaridade),
      bairro,
      tipoViolencia,
      confirmacaoViolencia: Math.random() > 0.3 ? "Confirmada" : "Em apuração",
      reincidente: Math.random() > 0.8 ? "Sim" : "Não",
      encerrado: Math.random() > 0.7 ? "Sim" : "Não",
      dataCad,
      tecnico,
      recebePBF: Math.random() > 0.6 ? "Sim" : "Não",
      dependeRendaAgressor: Math.random() > 0.8 ? "Sim" : "Não",
      inseridoPAEFI: Math.random() > 0.5 ? "Sim" : "Não",
      familiarBPC: Math.random() > 0.7 ? "Sim" : "Não",
      familiarBE: Math.random() > 0.8 ? "Sim" : "Não",
      familiarPAI: Math.random() > 0.85 ? "Sim" : "Não",
      origemEncaminhamento: random(encaminhamentos),
      destinoEncaminhamento: random(encaminhamentos),
    });
  }

  return casos;
}

// 🚀 Executa para salvar no localStorage
export function seedMockData() {
  const casos = gerarMockCasos(40);
  localStorage.setItem(STORAGE, JSON.stringify(casos));
  alert("✅ 40 cadastros fictícios inseridos no localStorage!");
}

// 🚮 Limpa os cadastros simulados
export function clearMockData() {
  localStorage.removeItem(STORAGE);
  alert("🗑️ Cadastros fictícios removidos!");
}
